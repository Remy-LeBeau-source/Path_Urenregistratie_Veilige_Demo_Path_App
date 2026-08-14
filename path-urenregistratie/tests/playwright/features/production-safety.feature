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

  @happy
  Scenario: [SAFE-H-012] TEST toont accountkeuze met autofill en een afgeschermde gedeelde reset
    # Testtechniek: Beslissingstabel + equivalentieklassen + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 19
    Given lokale, TEST- en PROD-hosts als aparte equivalentieklassen worden beoordeeld
    When de exacte TEST-presentatie zonder lokale resetrechten wordt getoond
    Then blijven TEST-bediening en presentatie zichtbaar zonder PROD-rechten te verruimen

  @happy
  Scenario: [SAFE-H-014] gedeelde TEST-reset herstelt alleen de exacte veilige 12-actiebaseline
    # Testtechniek: Beslissingstabel + equivalentieklassen + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 12
    Given TEST, PROD, verkeerde host en ontbrekend demorecht als beslissingstabel zijn gedefinieerd
    When alle toegestane en verboden resetovergangen niet-mutatief worden doorgerekend
    Then seed, accounts, auditrelatie en exact twaalf open acties herstelbaar blijven

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
    # Aantoonbare Playwright-assertions in deze case: 7
    Given het healthbeleid voor productie en test wordt uitgevoerd
    When de flow voor SAFE-H-009 wordt uitgevoerd
    Then vereist alleen de testomgeving demodata en blijven echte fouten zichtbaar
    And maakt de migratie de state-afhankelijkheid gereed vóór de eerste healthcheck

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
    # Aantoonbare Playwright-assertions in deze case: 25
    Given de transport-, dispatch- en productiepreflightbron wordt gelezen
    When de flow voor SAFE-H-005 wordt uitgevoerd
    Then zijn TLS, dry-run, private storage, HSTS en niet-mutatieve checks afgedwongen

  @happy
  Scenario: [SAFE-H-010] echte TEST-mail vereist opt-in en een ontvangers-whitelist
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 12
    Given het uitvoerbare TEST-mailbeleid wordt gecontroleerd
    When de productie-, test- en developmentconfiguraties worden doorgerekend
    Then blijft TEST gesloten zonder whitelist en kan alleen de toegestane ontvanger door

  @happy
  Scenario: [SAFE-H-013] TEST-mailsandbox opent atomisch voor één vaste mailsink en twee TEST-accounts
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 26
    Given één vaste TEST-mailsink en twee bijbehorende accounts zijn gedefinieerd
    When de TEST-mailsandboxconfigurator zonder uitvoerbevestiging wordt gestart
    Then blijft de check niet-mutatief en scheidt hij de mailsink van de TEST-accounts
    And zijn bevestiging, accounttransactie, backup, atomische write en deployguard aantoonbaar afgedwongen

  @happy
  Scenario: [SAFE-H-006] eerste productieorganisatie wordt gevalideerd en zonder overschrijven ingericht
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de CLI-only productiebedrijfs-bootstrap wordt gelezen
    When de flow voor SAFE-H-006 wordt uitgevoerd
    Then vereist de bootstrap productie, expliciete bevestiging en geldige bedrijfsgegevens
    And maakt hij alleen een lege database aan, logt de handeling en overschrijft nooit afwijkende data

  @happy
  Scenario: [SAFE-H-011] groene main-pipeline rolt exact dezelfde release veilig uit naar productie
    # Testtechniek: Toestandsovergang + foutinjectie + beslissingstabel
    # Aantoonbare Playwright-assertions in deze case: 23
    Given het automatische TransIP-deploycontract wordt ingelezen
    When validatie, TEST, PROD-regressie en Living Docs groen zijn
    Then wordt alleen main met checksum, backup, migratie en live-smoke uitgerold
    And blijft mail gesloten en wordt bij een fout automatisch teruggerold
