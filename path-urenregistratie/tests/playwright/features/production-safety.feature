@regressie
@security
@fase:14
Feature: Veilige productieconfiguratie en deployment

  # Native Playwright-uitvoering: tests/playwright/production-safety.spec.ts
  # Navigatiemapping: tests/playwright/steps/production-safety.steps.ts

  @happy
  Scenario: [SAFE-H-001] login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de lokale login-hints worden gecontroleerd
    When de gebruiker de admin-loginkeuze opent
    Then wordt alleen in lokale hintmodus een demo-wachtwoord voorgeselecteerd

  @negative
  Scenario: [SAFE-N-001] frontend source bevat geen plaintext demo-credentials
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de frontend source wordt opgehaald
    When de flow voor SAFE-N-001 wordt uitgevoerd
    Then bevat de frontend geen plaintext demo-credentials

  @negative
  Scenario: [SAFE-N-002] writes zonder csrf blijven geblokkeerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde medewerker
    When een write-call zonder csrf-header wordt verstuurd
    Then wordt met Playwright-assertions bevestigd dat writes zonder csrf blijven geblokkeerd

  @happy
  Scenario: [SAFE-H-002] timesheet writeflow blijft werkend (draft + submit)
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een ingelogde medewerker met schrijfbare periode
    When de medewerker save_draft uitvoert
    Then submit met expected_version blijft werkend

  @negative
  Scenario: [SAFE-N-003] productieconfig zet demo-migraties standaard uit
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de productieconfig-templatebestanden worden ingelezen
    When de flow voor SAFE-N-003 wordt uitgevoerd
    Then staan demo-migraties standaard uit in productieconfig

  @happy
  Scenario: [SAFE-H-003] health.php bevat productieguard die technische details onderdrukt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de health.php broncode wordt gelezen
    When de flow voor SAFE-H-003 wordt uitgevoerd
    Then bevat health.php een productieguard die host en databasenaam wegfiltert

  @happy
  Scenario: [SAFE-H-009] productie-health accepteert een schone database zonder demodata
    # Testtechniek: Equivalentieklassen + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given het healthbeleid voor productie en test wordt uitgevoerd
    When de flow voor SAFE-H-009 wordt uitgevoerd
    Then vereist alleen de testomgeving demodata en blijven echte fouten zichtbaar

  @negative
  Scenario: [SAFE-N-004] install.php en migrate.php bevatten productieguards
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given install.php en migrate.php worden gelezen
    When de flow voor SAFE-N-004 wordt uitgevoerd
    Then bevatten beide bestanden een HTTP-blokkering voor productieomgeving

  @negative
  Scenario: [SAFE-N-008] lokale productieconfig is via HTTP expliciet geblokkeerd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given de Apache-beveiliging voor de servermap wordt gelezen
    When de flow voor SAFE-N-008 wordt uitgevoerd
    Then zijn alle configvarianten inclusief config.local.php fail-closed geblokkeerd

  @happy
  Scenario: [SAFE-H-004] config.example.php bevat mail.enabled=false als standaard
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 5
    Given config.example.php wordt gelezen
    When de flow voor SAFE-H-004 wordt uitgevoerd
    Then staat mail.enabled standaard op false en is SMTP relay voorbereid zonder activering

  @negative
  Scenario: [SAFE-N-005] live login verbergt lokale accountkeuze en valt gesloten uit zonder authservice
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 11
    Given de loginpagina als productiepresentatie wordt opgebouwd
    When de flow voor SAFE-N-005 wordt uitgevoerd
    Then zijn demoaccounts en lokale uitleg niet zichtbaar
    And zonder authservice blijft productie fail-closed

  @negative
  Scenario: [SAFE-N-006] destructieve DB-testsetup weigert productie en niet-testdatabases
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 15
    Given de Playwright-bootstrap en directe DB-smoke worden gecontroleerd
    When de flow voor SAFE-N-006 wordt uitgevoerd
    Then vereist de bootstrap een herkenbare testdatabase of geïsoleerde lokale CI-database
    And gebruikt de CRUD-smoke dezelfde fail-closed scheiding

  @negative
  Scenario: [SAFE-N-007] productieconfigurator verwerkt DB-secret uitsluitend interactief en fail-closed
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 14
    Given de CLI-only productieconfigurator wordt gelezen
    When de flow voor SAFE-N-007 wordt uitgevoerd
    Then vereist configuratie expliciete uitvoering, bevestiging en verborgen invoer
    And valideert hij DB en private storage vóór een atomische 0600-write met mail uit

  @happy
  Scenario: [SAFE-H-005] SMTP-dispatch en operationele scripts blijven fail-closed
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 23
    Given de transport-, dispatch- en productiepreflightbron wordt gelezen
    When de flow voor SAFE-H-005 wordt uitgevoerd
    Then zijn TLS, dry-run, private storage, HSTS en niet-mutatieve checks afgedwongen

  @happy
  Scenario: [SAFE-H-006] eerste productieorganisatie wordt gevalideerd en zonder overschrijven ingericht
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de CLI-only productiebedrijfs-bootstrap wordt gelezen
    When de flow voor SAFE-H-006 wordt uitgevoerd
    Then vereist de bootstrap productie, expliciete bevestiging en geldige bedrijfsgegevens
    And maakt hij alleen een lege database aan, logt de handeling en overschrijft nooit afwijkende data
