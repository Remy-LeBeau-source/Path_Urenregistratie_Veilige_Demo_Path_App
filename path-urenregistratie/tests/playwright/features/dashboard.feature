@dashboard @ui
Feature: Dashboardweergave in Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/dashboard.steps.ts
# Dit featurebestand controleert rolafhankelijke dashboardweergave en stabiliteit.
# Hash-overzicht testcase-doel:
# [DASH-H-001] Administrator ziet backoffice werkvoorraad.
# [DASH-H-002] Medewerker ziet alleen eigen dashboardscope.
# [DASH-N-003] Dashboard blijft bruikbaar met API/fallbackgedrag.
# [DASH-N-004] Dashboard laadt zonder console/page errors.
# [DASH-H-005] Dashboard toont consistente kernsamenvatting na login.
# [DASH-N-006] Medewerker ziet geen administratoracties op dashboard.
# [DASH-N-007] Gecachete oude open-acties teller wordt niet als actuele teller getoond.
# [DASH-N-008] Voorbeeldgegevens herstellen overschrijft in auth-modus de DB teller niet.

  # Happy flows

  Scenario: [DASH-H-001] Administrator ziet open werkvoorraad en beheeropties
    Given de administrator is ingelogd zodat backofficegegevens geladen mogen worden
    Then ziet de administrator open werkvoorraad en backoffice-navigatie zodat beheertaken direct zichtbaar zijn

  Scenario: [DASH-H-002] Medewerker ziet alleen eigen dashboardinformatie
    Given de medewerker is ingelogd zodat alleen medewerkerdata opgehaald mag worden
    Then ziet de medewerker het eigen dashboard zonder backoffice-overzicht zodat rolafbakening duidelijk blijft

  Scenario: [DASH-H-005] Dashboard toont consistente kernsamenvatting na login
    Given een geldige Path login met werkende dashboard-API
    When de gebruiker het dashboard opent
    Then zijn de kerntegels en samenvatting zichtbaar zonder lege hoofdsectie zodat operationele status direct leesbaar is

  # Negative flows

  Scenario: [DASH-N-003] Dashboard gebruikt API-data met veilige fallback
    Given de dashboardweergave van Path Uren & Facturatie met read-only databronnen
    Then gebruikt het dashboard API-data wanneer beschikbaar en fallback-data wanneer nodig zodat de pagina bruikbaar blijft bij storingen

  Scenario: [DASH-N-004] Dashboard laadt zonder console of page errors
    Given een geldige Path login in auth-modus
    Then laadt het dashboard zonder console- of page-errors na inloggen zodat frontendstabiliteit aantoonbaar is

  Scenario: [DASH-N-006] Medewerker ziet geen administratoracties op dashboard
    Given de medewerker is ingelogd met employee-rol
    Then ontbreken administratorgerichte controle-acties op het dashboard zodat least-privilege ook in UI zichtbaar blijft

  Scenario: [DASH-N-007] Oude open-acties teller wordt tijdens startup niet als actuele waarde getoond
    Given een oude gecachete teller en een vertraagde dashboard-API
    When de dashboard-API klaar is met laden
    Then toont het dashboard direct de serverwaarde zonder stale eindstatus

  Scenario: [DASH-N-008] Voorbeeldgegevens herstellen houdt in auth-modus de DB teller leidend
    Given de gebruiker werkt in auth-modus met serverwerkvoorraad
    When de gebruiker voorbeeldgegevens herstelt
    Then blijft de serverwaarde leidend en wordt geen oude lokale teller getoond

