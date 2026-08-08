Feature: Factuurweergave in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/invoices.steps.ts

  Scenario: Administrator ziet facturen per gekozen periode
    Given de administrator is ingelogd
    When de administrator het facturenscherm opent
    Then ziet de administrator facturen voor de geselecteerde periode

  Scenario: Medewerker ziet alleen eigen facturen en geen collega-data
    Given de medewerker is ingelogd
    Then ziet de medewerker alleen eigen facturen en geen facturen van collega's

  Scenario: Periodefilter wisselt correct tussen juli en augustus 2026
    Given de administrator is ingelogd
    When de administrator wisselt tussen juli 2026 en augustus 2026
    Then past het facturenoverzicht zich aan op de gekozen periode

  Scenario: Facturenscherm laadt zonder console of page errors
    Given een geldige Path login
    Then laadt het facturenscherm zonder console- of page-errors na inloggen
