import { appRuntimeConfig } from '../config';

export const appConfig = appRuntimeConfig;

export function requirePassword(value: string, envName: string): string {
  if (!value) {
    throw new Error(`Missing required env var ${envName}. Copy .env.example and set a local value.`);
  }
  return value;
}
