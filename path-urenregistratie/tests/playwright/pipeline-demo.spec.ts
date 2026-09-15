import { expect, test } from '@playwright/test';

test.describe('Path Pipeline TEST-demo', () => {
  test('[PIPE-H-001] de demo verbindt backlog, kennisbank en testbeheer met vijf echte opleveringen', async ({ page }) => {
    await test.step('Given de zelfstandige TEST-only pipelinepagina', async () => {
      expect((await page.goto('/pilot/path-pipeline.html'))?.status()).toBe(200);
    });

    await test.step('When de pagina is geladen, staan de vier afgesproken fasen en vijf vaste tickets klaar', async () => {
      await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'path-pipeline');
      await expect(page.locator('[data-phase]')).toHaveCount(4);
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(5);
      await expect(page.locator('[data-ticket-list="done"] .issue-key')).toHaveText([
        'PATH-196', 'PATH-194', 'PATH-197', 'PATH-188', 'PATH-191',
      ]);
      await expect(page.locator('[data-ticket-list="done"] .gherkin')).toHaveCount(5);
      await expect(page.getByRole('button', { name: 'Jira Backlog' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confluence Kennisbank' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zephyr Testbeheer' })).toBeVisible();
    });

    await test.step('And Kennisbank en Testbeheer projecteren dezelfde traceerbare inhoud', async () => {
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
      await expect(page.locator('[data-living-doc] li')).toHaveCount(5);
      await expect(page.locator('[data-living-doc] li').first()).toContainText('PATH-196');
      await expect(page.locator('[data-doc-tree] li')).toHaveCount(5);
      await expect(page.locator('[data-doc-page]')).toContainText('FUNCTIONEEL ONTWERP');
      await expect(page.locator('[data-doc-page]')).toContainText('TECHNISCH ONTWERP');

      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      await expect(page.locator('[data-test-table] tr')).toHaveCount(5);
      await expect(page.locator('[data-testcase="TC-NOT-H-012"]')).toContainText('Ingetrokken mededeling');
      await expect(page.locator('[data-test-table] .gherkin')).toHaveCount(5);
      await expect(page.locator('[data-test-metrics]')).toContainText('Geslaagd5');
    });
  });

  test('[PIPE-H-002] een nieuw ticket loopt door vier fasen naar Zephyr en de Living Doc', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/pilot/path-pipeline.html');

    await test.step('Given een nieuwe vraag met acceptatiecriterium', async () => {
      await page.getByLabel('Samenvatting').fill('Maandtotalen blijven gelijk na filterwissel');
      await page.getByLabel('Stakeholder').selectOption('Backoffice');
      await page.getByLabel('Type').selectOption('bug');
      await page.getByLabel('Gewenste waarde').fill('Backoffice altijd dezelfde betrouwbare maandtotalen ziet');
      await page.getByLabel('Acceptatiecriterium').fill('de gebruiker wisselt tussen Backoffice en medewerkers');
      await page.getByRole('button', { name: 'Ticket maken & hele flow starten' }).click();
      await expect(page.locator('[data-ticket="PATH-198"]')).toHaveClass(/is-running/);
      await expect(page.locator('[data-flow-monitor]')).toContainText('PATH-198');
    });

    await test.step('When de volledige pipeline automatisch wordt uitgevoerd', async () => {
      await expect(page.locator('[data-phase].is-active')).toHaveCount(1);
      await expect(page.locator('[data-checkpoint].is-active')).toHaveCount(1);
    });

    await test.step('Then komt de testcase in Zephyr en de oplevering in de begrensde Living Doc', async () => {
      await expect(page.getByRole('tab', { name: /Kennisbank/ })).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
      await expect(page.locator('[data-living-doc] li').first()).toContainText('PATH-198');
      await expect(page.locator('[data-living-doc] li').first()).toHaveClass(/is-new/);
      await expect(page.locator('[data-living-doc] li')).toHaveCount(5);
      await expect(page.locator('[data-living-doc]')).not.toContainText('PATH-191');
      await expect(page.locator('[data-flow-monitor]')).toContainText('volledig verwerkt');
      await expect(page.locator('[data-doc-title]')).toContainText('PATH-198');
      await expect(page.locator('[data-doc-story]')).toContainText('Als Backoffice');
      await expect(page.locator('[data-doc-story]')).toContainText('betrouwbare maandtotalen');
      await expect(page.locator('[data-doc-fo]')).toContainText('Maandtotalen blijven gelijk');
      await expect(page.locator('[data-doc-to]')).toContainText('TC-DEMO-H-001');
      await expect(page.locator('[data-doc-tree] li')).toHaveCount(5);
      await expect(page.locator('[data-doc-tree]')).not.toContainText('PATH-191');

      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      await expect(page.locator('[data-test-table] tr')).toHaveCount(5);
      await expect(page.locator('[data-testcase="TC-DEMO-H-001"]')).toContainText('Maandtotalen blijven gelijk');
      await expect(page.locator('[data-testcase="TC-DEMO-H-001"] .status-pill')).toHaveText(/Geslaagd|Aandacht/);
      await expect(page.locator('[data-test-table]')).not.toContainText('TC-AUTH-H-025');

      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator('[data-ticket-list="done"] [data-ticket="PATH-198"]')).toBeVisible();
      await expect(page.locator('.ticket-card')).toHaveCount(5);
      await expect(page.locator('[data-ticket="PATH-191"]')).toHaveCount(0);
    });
  });

  test('[PIPE-N-001] de demo blijft lokaal, begrenst de Living Doc op tien en past op een telefoon', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('path-pipeline-demo-v1', JSON.stringify({
        schemaVersion: 2,
        sequence: 198,
        customTickets: [],
        customTests: [],
        activePhase: 0,
        activeTicket: '',
        livingDoc: Array.from({ length: 14 }, (_, index) => ({
          key: `PATH-${300 + index}`,
          text: `Lokale demoregel ${index + 1}`,
          result: 'Geslaagd',
          time: '15 sep · 20:00',
        })),
      }));
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pilot/path-pipeline.html');

    await test.step('When de Kennisbank op de telefoon wordt geopend', async () => {
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
    });

    await test.step('Then worden alleen de laatste vijf lokale regels getoond en tien lokaal bewaard', async () => {
      await expect(page.locator('[data-living-doc] li')).toHaveCount(5);
      await expect(page.locator('[data-living-doc] li').first()).toContainText('PATH-300');
      const storedLength = await page.evaluate(() => JSON.parse(localStorage.getItem('path-pipeline-demo-v1') || '{}').livingDoc.length);
      expect(storedLength).toBe(10);
    });

    await test.step('And de pagina heeft geen horizontale overflow of gedeelde appcode', async () => {
      const breedte = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        buitenBeeld: Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .map(element => ({ element: element.tagName.toLowerCase(), className: element.className, rect: element.getBoundingClientRect() }))
          .filter(item => item.rect.right > window.innerWidth + 1 || item.rect.left < -1)
          .slice(0, 12)
          .map(item => `${item.element}.${String(item.className)} [${Math.round(item.rect.left)}, ${Math.round(item.rect.right)}]`),
      }));
      expect(breedte.document, `Elementen buiten beeld: ${breedte.buitenBeeld.join(', ')}`).toBeLessThanOrEqual(breedte.viewport + 1);
      await expect(page.locator('script[src*="assets/app.js"], link[href*="assets/styles.css"]')).toHaveCount(0);
      await expect(page.locator('footer')).toContainText('geen koppeling met een bestaand Jira-, Confluence- of Zephyr-account');
    });
  });
});
