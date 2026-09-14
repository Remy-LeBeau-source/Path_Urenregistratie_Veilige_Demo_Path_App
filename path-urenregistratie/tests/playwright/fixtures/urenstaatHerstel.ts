import type { Page } from '@playwright/test';

// Bewaart de urenstaat van de gedeelde demomedewerker en geeft een functie
// terug die hem terugzet.
//
// Nodig voor cases die een hele maand vullen, leegzetten of indienen. Die
// toestand blijft anders staan en verandert wat latere cases in dezelfde run
// zien. Dat is geen theoretisch risico maar drie keer gemeten in de nacht van
// 13 op 14 september: [DASH-N-023] viel om op een maand die al ingediend was,
// [DASH-N-021] kreeg een open-actieteller van 1, en [SKIN-H-028] struikelde
// over een dinsdag die door een andere case op 0 was gezet.
//
// Eén implementatie voor alle spec-bestanden. Twee kopieën van dezelfde
// opruiming lopen uit elkaar zodra er één wordt aangepast, en dan ruimt de ene
// wél op wat de andere laat staan.
//
// Aanroepen ná het inloggen (de helper leest de huidige medewerker en periode)
// en het herstel in een `finally` zetten, zodat het ook gebeurt als de case
// faalt.
export async function bewaarUrenstaat(page: Page): Promise<() => Promise<void>> {
  type Runtime = {
    currentEmployee: () => { id: number };
    currentPeriod: () => { key: string };
    recordFor: (id: number, key?: string) => Record<string, unknown>;
    persistState: () => void;
    renderAll: () => void;
  };
  const vooraf = await page.evaluate(() => {
    const runtime = window as unknown as Runtime;
    const record = runtime.recordFor(runtime.currentEmployee().id, runtime.currentPeriod().key);
    return JSON.stringify({
      entries: record.entries,
      confirmedEntries: record.confirmedEntries,
      timesheetStatus: record.timesheetStatus,
      invoiceStatus: record.invoiceStatus,
    });
  });
  return async () => {
    await page.evaluate(bewaard => {
      const runtime = window as unknown as Runtime;
      const record = runtime.recordFor(runtime.currentEmployee().id, runtime.currentPeriod().key);
      Object.assign(record, JSON.parse(bewaard));
      runtime.persistState();
      runtime.renderAll();
    }, vooraf);
  };
}
