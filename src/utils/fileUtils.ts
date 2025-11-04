import { promises as fs } from 'node:fs';
import { logger } from './logger';

export async function readJsonFile<T>(
  filePath: string,
  defaultValue: T,
): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    // If file doesn't exist or is invalid, return the default value
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return defaultValue;
    }
    logger.error(`Error reading or parsing JSON file at ${filePath}:`, error);
    return defaultValue;
  }
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
): Promise<void> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf-8');
  } catch (error) {
    logger.error(`Error writing JSON file to ${filePath}:`, error);
  }
}
