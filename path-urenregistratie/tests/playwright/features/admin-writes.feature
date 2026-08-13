@regressie
@api
@fase:2
Feature: Beheer- en instellingenwijzigingen via API

  # Native Playwright-uitvoering: tests/playwright/admin-writes.spec.ts
  # Navigatiemapping: tests/playwright/steps/admin-writes.steps.ts

  @happy
  Scenario: [ADM-WR-H-001] admin kan company/settings server-led opslaan
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given beheer- en instellingenwijzigingen via API is voorbereid
    When de flow voor ADM-WR-H-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin kan company/settings server-led opslaan

  @happy
  Scenario: [ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given beheer- en instellingenwijzigingen via API is voorbereid
    When de flow voor ADM-WR-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin kan beheerder server-led aanmaken en wijzigen

  @happy
  Scenario: [ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given beheer- en instellingenwijzigingen via API is voorbereid
    When de flow voor ADM-WR-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin kan medewerker server-led aanmaken en bootstrap ziet deze terug

  @happy
  Scenario: [ADM-WR-H-004] admin slaat medewerker zonder SMTP veilig op met toegang in afwachting
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given beheer- en instellingenwijzigingen via API is voorbereid
    When de flow voor ADM-WR-H-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat admin slaat medewerker zonder SMTP veilig op met toegang in afwachting
