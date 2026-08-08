Feature: Role enforcement op de read-only API van Path Uren & Facturatie
# Step definitions mapping: tests/playwright/steps/roles-api.steps.ts

  Scenario: Zonder sessie geeft protected read-only API 401
    Given er is geen actieve sessie
    Then geven bootstrap, dashboard en invoices een nette 401 not-authenticated response

  Scenario: Admin ziet bootstrap dashboard invoices
    Given de administrator is ingelogd
    Then kan de administrator bootstrap, dashboard en invoices volledig uitlezen

  Scenario: Employee ziet alleen eigen user employee assignment invoices
    Given de medewerker is ingelogd
    Then ziet de medewerker alleen de eigen user-, employee-, assignment- en invoice-data

  Scenario: Employee ziet geen volledige medewerkerlijst
    Given de medewerker is ingelogd
    Then krijgt de medewerker geen volledige medewerkerslijst of brede mail recipient data terug
