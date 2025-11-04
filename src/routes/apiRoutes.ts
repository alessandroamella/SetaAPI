import { Router } from 'express';
import { BusController } from '../controllers/busController';
import type { SetaApiService } from '../services/SetaApiService';
import { asyncHandler } from '../utils/asyncHandler';

export function createApiRoutes(setaApiService: SetaApiService): Router {
  const router = Router();
  const busController = new BusController(setaApiService);

  // print static info about routes
  router.get('/', async (_req, res) => {
    res.json({
      message: 'Seta Bus API',
      routes: {
        arrivals: '/api/arrivals/:stopId',
        busesInService: '/api/buses-in-service',
      },
    });
  });

  router.get('/arrivals/:stopId', asyncHandler(busController.getArrivals));

  router.get(
    '/buses-in-service',
    asyncHandler(busController.getBusesInService),
  );

  return router;
}
