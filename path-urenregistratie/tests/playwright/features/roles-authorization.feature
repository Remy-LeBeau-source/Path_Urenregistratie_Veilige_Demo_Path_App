@regressie
@security
@fase:4
Feature: Rollen, rechten en gegevensafscherming

  # Native Playwright-uitvoering: tests/playwright/roles-api.spec.ts
  # Navigatiemapping: tests/playwright/steps/roles-api.steps.ts

  @negative
  Scenario: [ROLE-N-003] zonder sessie geeft protected API 401
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given er is geen actieve sessie
    When bootstrap dashboard en invoices anoniem worden opgevraagd
    Then wordt met Playwright-assertions bevestigd dat zonder sessie geeft protected API 401

  @happy
  Scenario: [ROLE-H-001] admin ziet volledige data
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de administrator is ingelogd
    When de administrator bootstrapdata opvraagt
    And de administrator dashboarddata opvraagt
    Then de administrator ziet volledige invoice-data

  @happy
  Scenario: [ROLE-H-002] employee ziet alleen eigen data
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de medewerker is ingelogd
    When de medewerker bootstrapdata opvraagt
    Then de medewerker ziet alleen eigen invoice-data

  @negative
  Scenario: [ROLE-N-004] een medewerker krijgt 403 op elke beheerder-only schrijfactie
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een ingelogde medewerker
    When elke beheerder-only schrijfactie en beheerdersbron wordt aangeroepen
    Then weigert de server steeds met 401 of 403
