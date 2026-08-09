Feature: Factuurweergave in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/invoices.steps.ts
# Dit featurebestand valideert factuurinzage, periodefiltering en rolafbakening.
# Hash-overzicht testcase-doel:
# [INV-H-001] Administrator ziet facturen per periode.
# [INV-H-002] Periodefilter ververst factuurdata correct.
# [INV-H-003] Open facturen rekenen server-side vanuit uren x uurtarief.
# [INV-N-001] Medewerker ziet geen facturen van collega's.
# [INV-N-002] Facturenscherm produceert geen console/page errors.

  # Happy flows

  Scenario: [INV-H-001] Administrator ziet facturen per gekozen periode
    Given de administrator is ingelogd zodat volledige factuurinzage mogelijk is
    When de administrator het facturenscherm opent
    Then ziet de administrator facturen voor de geselecteerde periode zodat de maandcontrole uitgevoerd kan worden

  Scenario: [INV-H-002] Periodefilter wisselt correct tussen juli en augustus 2026
    Given de administrator is ingelogd en het factuuroverzicht staat open
    When de administrator wisselt tussen juli 2026 en augustus 2026
    Then past het facturenoverzicht zich aan op de gekozen periode zodat maandvergelijking betrouwbaar blijft

  Scenario: [INV-H-003] Open facturen gebruiken server-side berekende bedragen
    Given de administrator is ingelogd met toegang tot factuur-API data
    When de administrator vraagt factuurdata op voor augustus 2026
    Then komen subtotal btw en totaal voor open facturen uit uren en uurtarief zodat berekening niet alleen op statische demo-output leunt

  # Negative flows

  Scenario: [INV-N-001] Medewerker ziet alleen eigen facturen en geen collega-data
    Given de medewerker is ingelogd met een afgebakende rol
    Then ziet de medewerker alleen eigen facturen en geen facturen van collega's zodat datasegregatie aantoonbaar is

  Scenario: [INV-N-002] Facturenscherm laadt zonder console of page errors
    Given een geldige Path login in auth-modus
    Then laadt het facturenscherm zonder console- of page-errors na inloggen zodat frontendkwaliteit aantoonbaar is
