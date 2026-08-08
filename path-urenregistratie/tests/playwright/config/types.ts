export type PlaywrightStage = 'dev' | 'test' | 'acc' | 'prod';

export type PlaywrightAppConfig = {
  stage: PlaywrightStage;
  baseUrl: string;
  adminEmail: string;
  employeeEmail: string;
  adminPassword: string;
  employeePassword: string;
};
