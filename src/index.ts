import express from 'express';
import helmet from 'helmet';
import { envs } from './config/envs';
import { createApiRoutes } from './routes/apiRoutes';
import { DataUpdateService } from './services/dataUpdateService';
import { SetaApiService } from './services/SetaApiService';
import { TransformationService } from './services/transformationService';
import { logError, returnError } from './utils/errorHandler';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const app = express();
  const port = envs.PORT || 5001;

  // --- Services Initialization ---
  const transformationService = new TransformationService();
  await transformationService.initialize();

  const setaApiService = new SetaApiService(transformationService);

  // Initialize and start the background data update service
  const dataUpdateService = new DataUpdateService(transformationService);
  dataUpdateService.initialize();

  // --- Middleware ---
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
    }),
  );
  app.use(express.json());

  // --- Routes ---
  app.use('/api', createApiRoutes(setaApiService));

  // --- Global Error Handling ---
  app.use(logError);
  app.use(returnError);

  // --- Server Startup ---
  app.listen(port, () => {
    logger.log(`API active on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap the application', error);
  process.exit(1);
});
