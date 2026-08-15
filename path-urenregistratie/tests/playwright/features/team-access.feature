@regressie
@api
@fase:13
Feature: Team en toegang beheren

  # Native Playwright-uitvoering: tests/playwright/user-management.spec.ts
  # Navigatiemapping: tests/playwright/steps/user-management.steps.ts

  @happy
  Scenario: [USR-H-001] admin ziet alle gebruikers van het bedrijf
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een ingelogde admin
    When de userlijst wordt opgehaald
    Then wordt met Playwright-assertions bevestigd dat admin ziet alle gebruikers van het bedrijf

  @happy
  Scenario: [USR-H-002] admin kan medewerker deactiveren en heractiveren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een ingelogde admin
    When de admin een medewerker deactiveert
    Then is de medewerker daarna inactief
    And heractiveren werkt ook

  @happy
  Scenario: [USR-H-003] admin kan force_password_change instellen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde admin
    When force_password_change wordt ingesteld voor een medewerker
    Then wordt met Playwright-assertions bevestigd dat admin kan force_password_change instellen

  @negative
  Scenario: [USR-N-004] anonieme gebruiker krijgt 401 op user-list
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given geen sessie
    When GET users.php wordt aangeroepen
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op user-list

  @negative
  Scenario: [USR-N-005] medewerker mag geen gebruikersbeheer uitvoeren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde medewerker
    When GET users.php wordt aangeroepen als medewerker
    Then wordt met Playwright-assertions bevestigd dat medewerker mag geen gebruikersbeheer uitvoeren

  @negative
  Scenario: [USR-N-006] admin kan zichzelf niet deactiveren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When de admin zichzelf probeert te deactiveren
    Then wordt met Playwright-assertions bevestigd dat admin kan zichzelf niet deactiveren

  @negative
  Scenario: [USR-N-007] dubbel deactiveren geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een reeds gedeactiveerde medewerker
    When de admin dezelfde medewerker nogmaals probeert te deactiveren
    Then wordt met Playwright-assertions bevestigd dat dubbel deactiveren geeft 409

  @happy
  Scenario: [USR-H-008] inactieve medewerker zonder historie kan definitief worden verwijderd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een nieuwe medewerker zonder uren- of documenthistorie
    When de admin het account deactiveert en daarna definitief verwijdert
    Then zijn account, medewerkersprofiel en lege opdracht niet meer aanwezig

  @negative
  Scenario: [USR-N-009] medewerker met zakelijke historie kan niet definitief worden verwijderd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een medewerker met bestaande urenhistorie inactief is
    When de admin definitief verwijderen probeert
    Then blijft het account inactief en blijft de historie bewaard

  @happy
  Scenario: [USR-H-010] inactieve beheerder zonder historie kan definitief worden verwijderd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een extra beheerder zonder login- of zakelijke historie
    When het beheeraccount wordt gedeactiveerd en definitief verwijderd
    Then komt het lege beheeraccount niet meer in de userlijst voor

  @happy
  Scenario: [USR-H-011] beheerder verstuurt vanuit Teambeheer een resetlink voor medewerker en beheerder
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given Teambeheer resetacties toont voor andere actieve accounts maar niet voor het eigen account
    When de beheerder voor beide rollen een persoonlijke resetlink bevestigt
    Then verstuurt de GUI exact twee force_password_change serveracties
