export type PlaywrightStage = 'dev' | 'tst1' | 'acc' | 'prod';

export type PlaywrightAppConfig = {
  stage: PlaywrightStage;
  baseUrl: string;
  adminEmail: string;
  employeeEmail: string;
  adminPassword: string;
  employeePassword: string;
};
