@regressie
@db
@fase:16
Feature: Database-integriteit en CRUD-controle

  # SQL-bron: database/queries/crud-smoke.sql
  # Runner: scripts/run-db-crud-smoke.mjs

  @happy
  Scenario: [DB-H-001] CRUD smoke test werkt in een geïsoleerde tijdelijke tabel
    # Testtechniek: CRUD-keten, toestandsovergang en data-integriteit
    # Aantoonbare SQL-assertions in deze case: 3
    Given de database CRUD smoke is voorbereid
    When het SQL-script wordt uitgevoerd via de DB smoke runner
    Then wordt het verwachte cleanup-result bevestigd

  @happy
  Scenario: [DB-H-002] geen enkele kerntabel bevat een weesverwijzing
    # Testtechniek: Data-integriteit / invariantcontrole
    # Aantoonbare SQL-assertions in deze case: 17
    Given de geïsoleerde testdatabase met de demo-seed
    When elke child-tabel tegen zijn parent wordt gecontroleerd
    Then wijst geen enkele verwijzing naar een ontbrekende rij

  @happy
  Scenario: [DB-H-003] de afhankelijke tabellen hebben de beloofde ON DELETE CASCADE
    # Testtechniek: Broncontract op het schema
    # Aantoonbare SQL-assertions in deze case: 4
    Given het databaseschema met foreign keys
    When de REFERENTIAL_CONSTRAINTS worden gelezen
    Then cascaden time_entries, corrections en assignment_mail_routes met hun parent en de factuur niet

  @negative
  Scenario: [DB-N-005] een verwijderde medewerker zonder historie laat geen weesrijen achter
    # Testtechniek: Toestandsovergang + data-integriteit
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een net aangemaakte medewerker met opdracht en mailroute
    When de beheerder de medewerker deactiveert en definitief verwijdert
    Then bestaat er geen rij meer die naar die medewerker verwijst en staat het in het auditlog
