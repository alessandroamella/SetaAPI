import path from 'node:path';
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { readJsonFile } from '../utils/fileUtils';

export function createStaticFilesRoutes(): Router {
  const router = Router();

  // print static info about routes
  router.get('/', async (_req, res) => {
    res.json({
      message: 'Static Files API',
      routes: {
        routeCodes: '/static/route-codes',
        routeNumbers: '/static/route-numbers',
        stopList: '/static/stop-list',
      },
    });
  });

  router.get(
    '/route-codes',
    asyncHandler(async (_req, res) => {
      const filePath = path.join(process.cwd(), 'output', 'route-codes.json');
      const data = await readJsonFile(filePath, {});
      res.json(data);
    }),
  );

  router.get(
    '/route-numbers',
    asyncHandler(async (_req, res) => {
      const filePath = path.join(process.cwd(), 'output', 'route-numbers.json');
      const data = await readJsonFile(filePath, {});
      res.json(data);
    }),
  );

  router.get(
    '/stop-list',
    asyncHandler(async (_req, res) => {
      const filePath = path.join(process.cwd(), 'output', 'stop-list.json');
      const data = await readJsonFile(filePath, {});
      res.json(data);
    }),
  );

  return router;
}
