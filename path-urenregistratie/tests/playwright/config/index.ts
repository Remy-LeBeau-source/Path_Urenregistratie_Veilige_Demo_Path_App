import { accConfig } from './acc';
import { devConfig } from './dev';
import { prodConfig } from './prod';
import { tst1Config } from './tst1';
import type { PlaywrightAppConfig, PlaywrightStage } from './types';

export const stageConfigs: Record<PlaywrightStage, PlaywrightAppConfig> = {
  dev: devConfig,
  tst1: tst1Config,
  acc: accConfig,
  prod: prodConfig,
};

function resolveStage(rawStage: unknown): PlaywrightStage {
  const stage = String(rawStage || 'dev').trim().toLowerCase();
  if (stage === 'tst1' || stage === 'acc' || stage === 'prod') {
    return stage;
  }
  return 'dev';
}

export const activeStage = resolveStage(process.env.PLAYWRIGHT_STAGE);
export const appRuntimeConfig = stageConfigs[activeStage];
