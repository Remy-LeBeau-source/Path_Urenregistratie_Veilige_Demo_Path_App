import type { Page } from '@playwright/test';

export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(String(error));
  });
  return errors;
}

export function clearConsoleErrors(errors: string[]): void {
  errors.length = 0;
}
