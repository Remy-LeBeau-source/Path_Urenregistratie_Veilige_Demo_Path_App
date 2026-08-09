@roles @api
Feature: Role enforcement op read-only API endpoints
# Step definitions mapping: tests/playwright/steps/roles-api.steps.ts
# Dit featurebestand controleert API-autorisatie en gegevensscope per rol.
# Hash-overzicht testcase-doel:
# [ROLE-N-001] Anonieme calls krijgen 401 op protected read-endpoints.
# [ROLE-H-001] Administrator kan volledige read-only data uitlezen.
# [ROLE-H-002] Medewerker krijgt alleen eigen data.
# [ROLE-N-002] Medewerker ziet geen brede medewerkers-/recipientdata.

  # Happy flows

  Scenario: [ROLE-H-001] Administrator heeft volledige read-only inzage
    Given de administrator is ingelogd met beheerrechten
    Then kan de administrator bootstrap dashboard en invoices volledig uitlezen zodat operationele sturing mogelijk is

  Scenario: [ROLE-H-002] Medewerker ziet alleen eigen afgebakende gegevens
    Given de medewerker is ingelogd met employee-rol
    Then ziet de medewerker alleen eigen user employee assignment en invoice data zodat least-privilege behouden blijft

  # Negative flows

  Scenario: [ROLE-N-001] Protected read-only endpoints blokkeren anonieme toegang
    Given er is geen actieve sessie zodat de call anoniem blijft
    Then geven bootstrap dashboard en invoices een 401 not-authenticated response zodat ongeauthenticeerde toegang wordt geblokkeerd

  Scenario: [ROLE-N-002] Medewerker krijgt geen brede medewerkers- of mailingdata
    Given de medewerker is ingelogd met employee-rol
    Then krijgt de medewerker geen volledige medewerkerslijst of brede recipient data terug zodat privacy en scope-afbakening afdwingbaar blijven
