Feature: Role enforcement op read-only API endpoints
# Step definitions mapping: tests/playwright/steps/roles-api.steps.ts

  Scenario: Protected read-only endpoints blokkeren anonieme toegang
    Given er is geen actieve sessie
    Then geven bootstrap dashboard en invoices een 401 not-authenticated response

  Scenario: Administrator heeft volledige read-only inzage
    Given de administrator is ingelogd
    Then kan de administrator bootstrap dashboard en invoices volledig uitlezen

  Scenario: Medewerker ziet alleen eigen afgebakende gegevens
    Given de medewerker is ingelogd
    Then ziet de medewerker alleen eigen user employee assignment en invoice data

  Scenario: Medewerker krijgt geen brede medewerkers- of mailingdata
    Given de medewerker is ingelogd
    Then krijgt de medewerker geen volledige medewerkerslijst of brede recipient data terug
