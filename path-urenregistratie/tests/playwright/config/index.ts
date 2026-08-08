import { accConfig } from './acc';
import { devConfig } from './dev';
import { prodConfig } from './prod';
import { testConfig } from './test';
import type { PlaywrightAppConfig, PlaywrightStage } from './types';

export const stageConfigs: Record<PlaywrightStage, PlaywrightAppConfig> = {
  dev: devConfig,
  test: testConfig,
  acc: accConfig,
  prod: prodConfig,
};

function resolveStage(rawStage: unknown): PlaywrightStage {
  const stage = String(rawStage || 'dev').trim().toLowerCase();
  if (stage === 'test' || stage === 'acc' || stage === 'prod') {
    return stage;
  }
  return 'dev';
}

export const activeStage = resolveStage(process.env.PLAYWRIGHT_STAGE);
export const appRuntimeConfig = stageConfigs[activeStage];
