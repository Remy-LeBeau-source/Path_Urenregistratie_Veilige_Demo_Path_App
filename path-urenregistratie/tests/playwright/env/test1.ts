export const test1 = {
  baseUrl: process.env.PATH_APP_BASE_URL ?? 'http://localhost:8000',
  adminEmail: process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@example.invalid',
  employeeEmail: process.env.PLAYWRIGHT_EMPLOYEE_EMAIL ?? 'stasjo@example.invalid',
  adminPassword: process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? '',
  employeePassword: process.env.PLAYWRIGHT_EMPLOYEE_PASSWORD ?? '',
} as const;
