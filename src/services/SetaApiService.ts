import axios from 'axios';
import { envs } from '../config/envs';
import type {
  SetaArrivalResponse,
  SetaVehicleResponse,
} from '../types/seta-api.types';
import { logger } from '../utils/logger';
import type { TransformationService } from './transformationService';

// This could be a class, but static methods work well for a stateless service.
export class SetaApiService {
  // Pass the initialized transformationService instance
  constructor(private transformationService: TransformationService) {}

  public async fetchArrivals(stopId: string) {
    try {
      const url = `${envs.SETA_ARRIVAL_URL}/${stopId}`;
      const { data } = await axios.get<SetaArrivalResponse>(url);

      if (data.arrival.error || !data.arrival.services) {
        return data;
      }

      // 1. Apply transformation rules
      for (const service of data.arrival.services) {
        this.transformationService.transformArrival(service);
      }

      // 2. Filter out planned arrivals if a realtime one exists
      const plannedMap = new Map();
      const realtimeMap = new Map();
      for (const service of data.arrival.services) {
        if (service.type === 'planned') {
          plannedMap.set(service.codice_corsa, service);
        }
        if (service.type === 'realtime') {
          realtimeMap.set(service.codice_corsa, service);
        }
      }

      const filteredServices = data.arrival.services.filter((service) => {
        return (
          service.type === 'realtime' || !realtimeMap.has(service.codice_corsa)
        );
      });

      // 3. Calculate and add delay
      for (const service of filteredServices) {
        if (service.type === 'realtime') {
          const planned = plannedMap.get(service.codice_corsa);
          if (planned) {
            service.delay = this.computeDelay(planned.arrival, service.arrival);
          }
        }
      }

      data.arrival.services = filteredServices;
      return data;
    } catch (error) {
      logger.error(`Error fetching arrivals for stop ${stopId}:`, error);
      return {
        arrival: {
          error: 'no arrivals scheduled in next 90 minutes or API error',
          services: [],
        },
      };
    }
  }

  public async fetchBusesInService() {
    try {
      const { data } = await axios.get<SetaVehicleResponse>(
        envs.SETA_VEHICLES_URL,
      );

      // Apply transformations to each bus
      for (const busFeature of data.features) {
        this.transformationService.transformBus(busFeature.properties);
      }

      // Sorting logic
      data.features.sort((a, b) => {
        const getNum = (linea?: string) =>
          parseInt((linea || '').match(/\d+/)?.[0] || '0', 10);
        const numA = getNum(a.properties.linea);
        const numB = getNum(b.properties.linea);
        if (numA !== numB) return numA - numB;
        return (a.properties.linea || '').localeCompare(
          b.properties.linea || '',
          'it',
        );
      });

      return data;
    } catch (error) {
      logger.error('Error fetching buses in service:', error);
      // Let the error handler manage the response
      throw new Error('Could not fetch buses in service');
    }
  }

  private computeDelay(plannedTime: string, realtimeTime: string): number {
    const [pHour, pMin] = plannedTime.split(':').map(Number);
    const [rHour, rMin] = realtimeTime.split(':').map(Number);
    return rHour * 60 + rMin - (pHour * 60 + pMin);
  }

  // ... Add other methods like fetchVehicleInfo, scrapeAllNews etc. here
}
