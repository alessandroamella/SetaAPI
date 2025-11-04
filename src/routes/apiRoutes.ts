import { Router } from 'express';
import { BusController } from '../controllers/busController';
import type { SetaApiService } from '../services/SetaApiService';
import { asyncHandler } from '../utils/asyncHandler';

export function createApiRoutes(setaApiService: SetaApiService): Router {
  const router = Router();
  const busController = new BusController(setaApiService);

  router.get('/arrivals/:stopId', asyncHandler(busController.getArrivals));

  router.get('/busesinservice', asyncHandler(busController.getBusesInService));

  return router;
}
