import { test1 } from '../env/test1';

export const appConfig = test1;

export function requirePassword(value: string, envName: string): string {
  if (!value) {
    throw new Error(`Missing required env var ${envName}. Copy .env.example and set a local value.`);
  }
  return value;
}
