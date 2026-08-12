@regressie
@security
@fase:5
Feature: CSRF en authenticatiebeveiliging in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/security.spec.ts
  # Navigatiemapping: tests/playwright/steps/security.steps.ts

  @happy
  Scenario: [SEC-H-001] csrf token endpoint werkt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given er is geen bestaande sessie nodig voor csrf-opvraag
    When de client een csrf-token opvraagt
    Then ontvangt de client een geldige csrf-token payload

  @happy
  Scenario: [SEC-H-002] login met csrf werkt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given geldige administrator-inloggegevens beschikbaar zijn
    When de administrator inlogt met csrf-bescherming
    Then ontstaat een geldige administrator-sessie

  @happy
  Scenario: [SEC-H-003] logout met csrf werkt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde administrator-sessie
    When de gebruiker uitlogt met csrf-token
    Then wordt de sessie netjes afgesloten

  @negative
  Scenario: [SEC-N-001] login zonder csrf faalt netjes
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een loginpoging zonder csrf-header
    When login zonder csrf wordt verstuurd
    Then geeft de server csrf-invalid met status 403 terug

  @negative
  Scenario: [SEC-N-002] logout zonder csrf faalt netjes
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een logoutpoging zonder csrf-header
    When logout zonder csrf wordt verstuurd
    Then geeft de server csrf-invalid met status 403 terug

  @negative
  Scenario: [SEC-N-003] invalid login payload geeft nette error
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een geldige csrf-token met ongeldige loginpayload
    When de flow voor SEC-N-003 wordt uitgevoerd
    Then geeft de server invalid-payload met status 400 terug

  @negative
  Scenario: [SEC-N-004] zonder sessie protected API blijft 401
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given er is geen actieve sessie
    When protected read-endpoints worden opgevraagd
    Then wordt met Playwright-assertions bevestigd dat zonder sessie protected API blijft 401

  @happy
  Scenario: [SEC-H-004] csrf-token blijft stabiel binnen dezelfde sessie
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-H-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat csrf-token blijft stabiel binnen dezelfde sessie

  @negative
  Scenario: [SEC-N-005] csrf-endpoint weigert POST
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-N-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat csrf-endpoint weigert POST

  @negative
  Scenario: [SEC-N-006] login-endpoint weigert GET
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-N-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat login-endpoint weigert GET

  @negative
  Scenario: [SEC-N-007] logout-endpoint weigert GET
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-N-007 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat logout-endpoint weigert GET

  @happy
  Scenario: [SEC-H-005] sessiecode bevat expliciete timeout-check en sliding expiration
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-H-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat sessiecode bevat expliciete timeout-check en sliding expiration

  @happy
  Scenario: [SEC-H-006] herhaalde mislukte loginpogingen maken security-audit event
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-H-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat herhaalde mislukte loginpogingen maken security-audit event

  @happy
  Scenario: [SEC-H-007] config voorbeeld bevat voorbereide CSP/CORS/HSTS flags
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given cSRF en authenticatiebeveiliging is voorbereid
    When de flow voor SEC-H-007 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat config voorbeeld bevat voorbereide CSP/CORS/HSTS flags
