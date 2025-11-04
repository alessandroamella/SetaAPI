import express from 'express';
import helmet from 'helmet';
import { envs } from './config/envs';
import { createApiRoutes } from './routes/apiRoutes';
import { createStaticFilesRoutes } from './routes/staticFilesRoutes';
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
  // print static info about routes
  app.get('/', (_req, res) => {
    res.json({
      message: 'SetaAPI/fork',
      routes: {
        ...(envs.ENABLE_SETA_API_ROUTES ? { api: '/api' } : {}),
        ...(envs.ENABLE_STATIC_FILE_ROUTES ? { staticFiles: '/static' } : {}),
      },
    });
  });

  if (envs.ENABLE_SETA_API_ROUTES) {
    logger.info('Enabling Seta API routes');
    app.use('/api', createApiRoutes(setaApiService));
  } else {
    logger.warn('Seta API routes are disabled');
  }
  if (envs.ENABLE_STATIC_FILE_ROUTES) {
    logger.info('Enabling Static Files routes');
    app.use('/static', createStaticFilesRoutes());
  } else {
    logger.warn('Static Files routes are disabled');
  }

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
