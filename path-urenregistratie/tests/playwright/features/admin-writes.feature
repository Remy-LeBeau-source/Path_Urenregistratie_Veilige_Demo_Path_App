@regressie
@ui
@desktop
@fase:6
Feature: Administratieve schrijfacties en goedkeuringsloop

  # Native Playwright-uitvoering: tests/playwright/admin-writes.spec.ts
  # Navigatiemapping: tests/playwright/steps/admin-ui.steps.ts

  @happy
  Scenario: [ADM-WR-H-009] goedkeuringsloop volgt logische maand/medewerker-volgorde
    # Testtechniek: Regressie-preventie + navigatielogica
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de administrator is ingelogd en reset naar vaste baseline
    When een eerste Backoffice-actie wordt geopend via werkstroom
    Then is de volgende taak bereikbaar en logisch
