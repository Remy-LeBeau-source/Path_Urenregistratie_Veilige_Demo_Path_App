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
