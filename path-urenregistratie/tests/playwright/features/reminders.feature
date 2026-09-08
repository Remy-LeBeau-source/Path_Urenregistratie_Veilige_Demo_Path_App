@regressie
@api
@fase:15
Feature: Serverplanning herinneringen

  # Native Playwright-uitvoering: tests/playwright/reminders.spec.ts
  # Navigatiemapping: tests/playwright/steps/reminders.steps.ts

  @happy
  Scenario: [REM-H-001] wekelijkse herinnering verstuurt eenmalig een reminder-mail aan medewerkers zonder uren deze week
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de wekelijkse herinnering staat aan voor nu (vandaag, huidige tijd, Europe/Amsterdam)
    When de scheduler voor het eerst draait
    Then staat er minstens één reminder-mail in de queue voor de medewerker
    And een tweede run binnen dezelfde week verstuurt niets extra (idempotent)
    And cleanup
