import type { Page } from '@playwright/test';

// pwa-install.js toont de "Zet op je startscherm"-installatiebanner altijd
// na 3s op een smalle (mobiele) viewport, ook zonder een beforeinstallprompt
// -event (iOS/Safari kent die niet, dus daar is de banner de enige uitleg).
// Tests die de banner zelf niet testen (zie mobile-ui.spec.ts daarvoor) laten
// hem op mobiel anders storend overlappen: hij intercepte pointer-events op
// elementen eronder (bv. de uitlogknop) op mobile-safari specifiek. Dezelfde
// onderdrukking die skin.spec.ts al per test doet, hier herbruikbaar.
export async function suppressInstallBanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });
}
