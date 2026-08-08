Feature: Facturen in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/invoices.steps.ts

  Scenario: Admin ziet facturen per periode
    Given de administrator is ingelogd
    When de administrator het facturenscherm opent
    Then ziet de administrator facturen per geselecteerde periode

  Scenario: Medewerker ziet alleen eigen facturen
    Given de medewerker is ingelogd
    Then ziet de medewerker alleen eigen facturen en geen facturen van collega's

  Scenario: Periodefilter juli en augustus werkt
    Given de administrator is ingelogd
    When de administrator wisselt tussen juli 2026 en augustus 2026
    Then past het facturenoverzicht zich aan op de gekozen periode

  Scenario: Facturen laden zonder console errors
    Given een geldige Path login
    Then laadt het facturenscherm zonder console- of page-errors na login
