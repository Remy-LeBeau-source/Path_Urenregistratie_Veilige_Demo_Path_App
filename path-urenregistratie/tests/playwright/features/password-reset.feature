@regressie
@security
@fase:13
Feature: Wachtwoordherstel en rate limiting in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/password-reset.spec.ts
  # Navigatiemapping: tests/playwright/steps/password-reset.steps.ts

  @happy
  Scenario: [PWD-H-001] request-reset retourneert token in demo-modus
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 12
    Given een geldig e-mailadres van een actieve gebruiker
    When request-reset wordt aangeroepen
    Then kan het token worden gebruikt om wachtwoord te resetten

  @happy
  Scenario: [PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een niet-bestaand e-mailadres
    When request-reset wordt aangeroepen
    Then wordt met Playwright-assertions bevestigd dat onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)

  @happy
  Scenario: [PWD-H-003] me.php bevat force_password_change veld
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde admin
    When de flow voor PWD-H-003 wordt uitgevoerd
    Then bevat me.php het force_password_change veld

  @happy
  Scenario: [PWD-H-004] ingelogde gebruiker kan het eigen wachtwoord veilig wijzigen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een ingelogde beheerder
    When het huidige en een sterk nieuw wachtwoord worden verstuurd
    Then kan het wachtwoord via dezelfde beveiligde flow worden teruggezet

  @negative
  Scenario: [PWD-N-004] reset-password met ongeldig token geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en rate limiting is voorbereid
    When reset-password wordt aangeroepen met neptoken
    Then wordt met Playwright-assertions bevestigd dat reset-password met ongeldig token geeft 400

  @negative
  Scenario: [PWD-N-005] reset-password met te kort wachtwoord geeft 400
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een geldig reset-token
    When reset-password wordt aangeroepen met wachtwoord korter dan 8 tekens
    Then wordt met Playwright-assertions bevestigd dat reset-password met te kort wachtwoord geeft 400

  @negative
  Scenario: [PWD-N-006] hergebruik van al-gebruikt token geeft 409
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een geldig token dat al gebruikt is
    When hetzelfde token nogmaals wordt gebruikt
    Then wordt met Playwright-assertions bevestigd dat hergebruik van al-gebruikt token geeft 409

  @negative
  Scenario: [PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit)
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een account met 5+ mislukte loginpogingen
    When de flow voor PWD-N-007 wordt uitgevoerd
    Then wordt de 6e poging geblokkeerd met 429

  @negative
  Scenario: [PWD-N-008] request-reset weigert GET
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en rate limiting is voorbereid
    When de flow voor PWD-N-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat request-reset weigert GET

  @negative
  Scenario: [PWD-N-009] request-reset met leeg e-mailadres geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en rate limiting is voorbereid
    When de flow voor PWD-N-009 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat request-reset met leeg e-mailadres geeft 400
