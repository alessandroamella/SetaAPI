import { bool, cleanEnv, str, url } from 'envalid';

// Load environment variables from .env file
import 'dotenv/config';

export const envs = cleanEnv(process.env, {
  NODE_ENV: str(),
  PORT: str(),
  SETA_ROUTES_URL: url(),
  SETA_VEHICLES_URL: url(),
  SETA_NEWS_URL: url(),
  SETA_WAYPOINT_ARRIVAL_URL: url(),
  SETA_ARRIVAL_URL: url(),
  ENABLE_SETA_API_ROUTES: bool(),
  ENABLE_STATIC_FILE_ROUTES: bool(),
});
