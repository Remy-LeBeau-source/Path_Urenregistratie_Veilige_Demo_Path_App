Feature: Facturen in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/invoices.steps.ts

  Scenario: Admin ziet facturen per periode
    Gegeven de administrator is ingelogd
    Als de administrator het facturenscherm opent
    Dan ziet de administrator facturen per geselecteerde periode

  Scenario: Medewerker ziet alleen eigen facturen
    Gegeven de medewerker is ingelogd
    Dan ziet de medewerker alleen eigen facturen en geen facturen van collega's

  Scenario: Periodefilter juli en augustus werkt
    Gegeven de administrator is ingelogd
    Als de administrator wisselt tussen juli 2026 en augustus 2026
    Dan past het facturenoverzicht zich aan op de gekozen periode

  Scenario: Facturen laden zonder console errors
    Gegeven een geldige Path login
    Dan laadt het facturenscherm zonder console- of page-errors na login
