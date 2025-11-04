import { promises as fs } from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import cron from 'node-cron';
import { envs } from '../config/envs';
import customNames from '../data/custom-route-names.json';
import type { RouteCodes, StopData } from '../types/data-files.types';
import type {
  FeatureCollection,
  SetaVehicleProperties,
} from '../types/seta-api.types';
import { readJsonFile, writeJsonFile } from '../utils/fileUtils';
import { logger } from '../utils/logger';
import type { TransformationService } from './transformationService';

export class DataUpdateService {
  private readonly outputDataDir = path.join(process.cwd(), 'output');
  private readonly stopListPath = path.join(
    this.outputDataDir,
    'stop-list.json',
  );
  private readonly routeCodesPath = path.join(
    this.outputDataDir,
    'route-codes.json',
  );
  private readonly routeNumbersPath = path.join(
    this.outputDataDir,
    'route-numbers.json',
  );

  constructor(private readonly transformationService: TransformationService) {
    this.ensureDataDirectories();
  }

  public initialize(): void {
    logger.log('Initializing scheduled data updates...');

    // Run all tasks once on startup
    this.runAllTasks();

    // Schedule recurring tasks
    cron.schedule('*/20 * * * * *', () => this.updateStopAndRouteData()); // Every 20 seconds
    cron.schedule('0 */8 * * *', () => this.updateRouteNumbersList()); // Every 8 hours
  }

  private async runAllTasks(): Promise<void> {
    await this.updateStopAndRouteData();
    await this.updateRouteNumbersList();
  }

  private async ensureDataDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.outputDataDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create data directories:', error);
    }
  }

  /**
   * Fetches the main vehicle map data and updates both the stop list (enriched with line numbers)
   * and the list of route codes per line. This is the most important update task.
   */
  public async updateStopAndRouteData(): Promise<void> {
    logger.log('Updating stop list and route codes...');
    try {
      const { data } = await axios.get<
        FeatureCollection<SetaVehicleProperties>
      >(envs.SETA_VEHICLES_URL);
      const remoteFeatures = data.features;

      // --- Data Processing ---
      const stopsMap = new Map<
        string,
        { stopId: string; lines: Set<string> }
      >();
      const routesMap = new Map<string, Set<string>>();

      for (const feature of remoteFeatures) {
        const props = feature.properties;

        this.transformationService.transformBus(props);

        const stopCode = props.reached_waypoint_code;
        const stopName = props.wp_desc;
        const line = props.linea;
        const routeCode = props.route_code;

        // Update stops map
        if (stopCode && stopName) {
          if (!stopsMap.has(stopCode)) {
            stopsMap.set(stopCode, {
              stopId: this.getCustomStopName(stopCode, stopName),
              lines: new Set(),
            });
          }
          if (line) {
            // biome-ignore lint/style/noNonNullAssertion: ensured by if
            stopsMap.get(stopCode)!.lines.add(line);
          }
        }

        // Update routes map
        if (line && routeCode) {
          if (!routesMap.has(line)) {
            routesMap.set(line, new Set());
          }
          // biome-ignore lint/style/noNonNullAssertion: ensured by if
          routesMap.get(line)!.add(routeCode);
        }
      }

      // --- Merge and Save Stop List ---
      await this.mergeAndSaveStops(stopsMap);

      // --- Merge and Save Route Codes ---
      await this.mergeAndSaveRouteCodes(routesMap);

      logger.log('Stop list and route codes updated');
    } catch (error) {
      logger.error(
        'Failed to update stop and route data:',
        (error as Error).message,
      );
    }
  }

  /**
   * Fetches the list of all available route numbers (e.g., "1", "7A", "500").
   */

  public async updateRouteNumbersList(): Promise<void> {
    logger.log('Updating route numbers list...');
    try {
      const { data } = await axios.get<{ routesdata: { linea: string }[] }>(
        envs.SETA_ROUTES_URL,
      );

      // 1. Get raw route names
      const rawRemoteRoutes = data.routesdata.map((r) => r.linea);

      // 2. Transform each route name
      const transformedRemoteRoutes = rawRemoteRoutes.map((routeName) => {
        // Create a dummy bus object that the transformation service can understand
        const dummyBus: SetaVehicleProperties = {
          linea: routeName,
          // Add other required properties with dummy values
          vehicle_code: 0,
          route_desc: '',
          plate_num: '',
        };
        // Transform it
        this.transformationService.transformBus(dummyBus);
        // Return the (potentially modified) line name
        return dummyBus.linea;
      });

      // 3. Use the transformed list from now on
      const localRoutes = await readJsonFile<string[]>(
        this.routeNumbersPath,
        [],
      );

      const localRouteSet = new Set(localRoutes);
      let hasChanged = false;
      for (const route of transformedRemoteRoutes) {
        // Use the transformed list
        if (!localRouteSet.has(route)) {
          localRouteSet.add(route);
          hasChanged = true;
        }
      }

      if (hasChanged) {
        const sortedRoutes = Array.from(localRouteSet).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        );
        await writeJsonFile(this.routeNumbersPath, sortedRoutes);
        logger.log('Route numbers list updated');
      } else {
        logger.log('Route numbers list is already up-to-date');
      }
    } catch (error) {
      logger.error(
        'Failed to update route numbers list:',
        (error as Error).message,
      );
    }
  }

  private async mergeAndSaveStops(
    stopsMap: Map<string, { stopId: string; lines: Set<string> }>,
  ): Promise<void> {
    const localStops = await readJsonFile<StopData[]>(this.stopListPath, []);
    const localStopsMap = new Map(localStops.map((s) => [s.stopName, s]));
    let hasChanged = false;

    for (const [code, { stopId, lines }] of stopsMap.entries()) {
      const existing = localStopsMap.get(code);
      if (!existing) {
        // New stop found
        localStopsMap.set(code, {
          stopName: code,
          stopId,
          lines: Array.from(lines),
        });
        hasChanged = true;
      } else {
        // Existing stop, merge line numbers
        const combinedLines = new Set([...existing.lines, ...lines]);
        if (combinedLines.size !== existing.lines.length) {
          existing.lines = Array.from(combinedLines).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
          );
          hasChanged = true;
        }
      }
    }

    if (hasChanged) {
      const sortedStops = Array.from(localStopsMap.values()).sort((a, b) =>
        a.stopName.localeCompare(b.stopName),
      );
      await writeJsonFile(this.stopListPath, sortedStops);
    }
  }

  private async mergeAndSaveRouteCodes(
    routesMap: Map<string, Set<string>>,
  ): Promise<void> {
    const localRoutes = await readJsonFile<RouteCodes[]>(
      this.routeCodesPath,
      [],
    );
    const localRoutesMap = new Map(
      localRoutes.map((r) => [r.line, new Set(r.codes)]),
    );
    let hasChanged = false;

    for (const [linea, codes] of routesMap.entries()) {
      const existingCodes = localRoutesMap.get(linea);
      if (!existingCodes) {
        localRoutesMap.set(linea, codes);
        hasChanged = true;
      } else {
        const originalSize = existingCodes.size;
        for (const code of codes) {
          existingCodes.add(code);
        }
        if (existingCodes.size > originalSize) {
          hasChanged = true;
        }
      }
    }

    if (hasChanged) {
      const result: RouteCodes[] = Array.from(localRoutesMap.entries())
        .map(([line, codes]) => ({
          line,
          codes: Array.from(codes).sort(),
        }))
        .sort((a, b) =>
          a.line.localeCompare(b.line, undefined, { numeric: true }),
        );
      await writeJsonFile(this.routeCodesPath, result);
    }
  }

  /**
   * Centralizes the logic for hardcoded stop names from the original script.
   */
  private getCustomStopName(code: string, defaultName: string): string {
    return (customNames as Record<string, string>)[code] || defaultName;
  }
}
