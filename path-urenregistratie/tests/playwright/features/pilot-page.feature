@regressie
@gui
@fase:18
Feature: Losstaande designpilots naast de app

  # Native Playwright-uitvoering: tests/playwright/pilot-page.spec.ts

  @happy
  Scenario: [PILOT-H-001] de 1919-pilot leeft als losse URL naast een ongewijzigde app
    # Testtechniek: Toestandsovergang + data-integriteit
    # Aantoonbare Playwright-assertions in deze case: 14
    Given de webroot met de app op /
    When de losstaande pilot-URL wordt opgevraagd
    Then toont hij de 1919-storyline-inhoud met de pilot-vlag
    And de echte app blijft er onaangeroerd naast draaien
