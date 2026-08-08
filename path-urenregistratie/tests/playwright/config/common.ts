import type { PlaywrightAppConfig, PlaywrightStage } from './types';

function readEnv(stage: PlaywrightStage, key: string, fallback: string): string {
  const stageKey = `${stage.toUpperCase()}_${key}`;
  const stageValue = String(process.env[stageKey] || '').trim();
  if (stageValue) return stageValue;

  const sharedValue = String(process.env[key] || '').trim();
  if (sharedValue) return sharedValue;

  return fallback;
}

export function createStageConfig(stage: PlaywrightStage): PlaywrightAppConfig {
  return {
    stage,
    baseUrl: readEnv(stage, 'PATH_APP_BASE_URL', 'http://localhost:8000'),
    adminEmail: readEnv(stage, 'PLAYWRIGHT_ADMIN_EMAIL', 'admin@example.invalid'),
    employeeEmail: readEnv(stage, 'PLAYWRIGHT_EMPLOYEE_EMAIL', 'stasjo@example.invalid'),
    adminPassword: readEnv(stage, 'PLAYWRIGHT_ADMIN_PASSWORD', ''),
    employeePassword: readEnv(stage, 'PLAYWRIGHT_EMPLOYEE_PASSWORD', ''),
  };
}
