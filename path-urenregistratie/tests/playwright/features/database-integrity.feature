@regressie
@db
@fase:16
Feature: Database-integriteit en CRUD-smoke in Path Uren & Facturatie

  # SQL-bron: database/queries/crud-smoke.sql
  # Runner: scripts/run-db-crud-smoke.mjs

  @happy
  Scenario: [DB-H-001] CRUD smoke test werkt in een geïsoleerde tijdelijke tabel
    Given de database CRUD smoke is voorbereid
    When het SQL-script wordt uitgevoerd via de DB smoke runner
    Then wordt het verwachte cleanup-result bevestigd
