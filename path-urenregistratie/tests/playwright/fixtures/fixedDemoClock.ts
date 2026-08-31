import type { Page } from '@playwright/test';

// De hersteldata is een expliciete acceptatiebaseline van augustus 2026. Houd
// alleen tests die die exacte baseline controleren op die kalendermaand; anders
// voegt de app bij een echte maandwisseling terecht nieuwe werkacties toe.
export async function useFixedDemoClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date('2026-08-31T12:00:00.000Z'));
}
