@invoices @api @ui @phase11
Feature: Factuurweergave in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/invoices.steps.ts
# Dit featurebestand valideert factuurinzage, periodefiltering en rolafbakening.
# Hash-overzicht testcase-doel:
# [INV-H-001] Administrator ziet facturen per periode.
# [INV-H-002] Periodefilter ververst factuurdata correct.
# [INV-H-003] Open facturen rekenen server-side vanuit uren x uurtarief.
# [INV-H-004] Administrator finaliseert approved urenstaat naar immutable factuur.
# [INV-N-005] Medewerker ziet geen facturen van collega's.
# [INV-N-006] Facturenscherm produceert geen console/page errors.
# [INV-N-007] Ongeldige periodefilter geeft een duidelijke validatiefout.
# [INV-N-008] Anonieme lock-aanvraag wordt geweigerd.
# [INV-N-009] Medewerker mag geen lock-actie uitvoeren.
# [INV-N-010] Niet-goedgekeurde urenstaat kan niet worden gefinaliseerd.
# [INV-N-011] Tweede lock-oproep op zelfde factuur wordt geblokkeerd.
# [INV-N-012] Gelijktijdige lock-oproepen leveren exact een winnaar.

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

  Scenario: [INV-H-004] Administrator finaliseert een approved urenstaat naar immutable factuur
    Given een medewerker heeft uren ingediend en een administrator heeft deze goedgekeurd
    When de administrator de factuur lockt via de API met action lock
    Then worden factuurnummer bedragen en locked_at server-side vastgezet en wordt de urenstaat invoiced

  # Negative flows

  Scenario: [INV-N-005] Medewerker ziet alleen eigen facturen en geen collega-data
    Given de medewerker is ingelogd met een afgebakende rol
    Then ziet de medewerker alleen eigen facturen en geen facturen van collega's zodat datasegregatie aantoonbaar is

  Scenario: [INV-N-006] Facturenscherm laadt zonder console of page errors
    Given een geldige Path login in auth-modus
    Then laadt het facturenscherm zonder console- of page-errors na inloggen zodat frontendkwaliteit aantoonbaar is

  Scenario: [INV-N-007] Ongeldige periodefilter wordt afgewezen met validatiefout
    Given de administrator is ingelogd met toegang tot de factuur-API
    When de administrator een ongeldige periode zoals 2026-13 opvraagt
    Then geeft de API invalid-period met status 400 terug zodat filtervalidatie expliciet en voorspelbaar blijft

  Scenario: [INV-N-008] Anonieme gebruiker kan geen lock-actie uitvoeren
    Given er is geen actieve sessie voor de factuur-API
    When een lock-aanvraag zonder geldige sessie wordt verstuurd
    Then antwoordt de API met not-authenticated en status 401

  Scenario: [INV-N-009] Medewerker mag geen factuur locken
    Given een medewerker is ingelogd
    When de medewerker action lock aanroept op invoices API
    Then antwoordt de API met forbidden-action en status 403

  Scenario: [INV-N-010] Niet-goedgekeurde urenstaat kan niet worden gelockt
    Given een urenstaat is submitted maar nog niet approved
    When een administrator action lock aanroept voor die urenstaat
    Then antwoordt de API met timesheet-not-approved en status 409

  Scenario: [INV-N-011] Tweede lock-aanvraag op dezelfde factuur wordt afgewezen
    Given een administrator heeft een approved urenstaat al succesvol gelockt
    When dezelfde administrator direct nogmaals action lock aanroept
    Then antwoordt de API met invoice-already-locked en status 409

  Scenario: [INV-N-012] Gelijktijdige lock-aanvragen concurreren veilig
    Given twee administrator-sessies roepen action lock tegelijk aan op dezelfde approved urenstaat
    Then slaagt exact een aanvraag met status 200 en krijgt de andere status 409

