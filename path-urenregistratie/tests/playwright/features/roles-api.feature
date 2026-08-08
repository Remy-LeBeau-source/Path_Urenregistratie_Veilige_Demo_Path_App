Feature: Role enforcement op de read-only API van Path Uren & Facturatie

  Scenario: Zonder sessie geeft protected read-only API 401
    Gegeven er is geen actieve sessie
    Dan geven bootstrap, dashboard en invoices een nette 401 not-authenticated response

  Scenario: Admin ziet bootstrap dashboard invoices
    Gegeven de administrator is ingelogd
    Dan kan de administrator bootstrap, dashboard en invoices volledig uitlezen

  Scenario: Employee ziet alleen eigen user employee assignment invoices
    Gegeven de medewerker is ingelogd
    Dan ziet de medewerker alleen de eigen user-, employee-, assignment- en invoice-data

  Scenario: Employee ziet geen volledige medewerkerlijst
    Gegeven de medewerker is ingelogd
    Dan krijgt de medewerker geen volledige medewerkerslijst of brede mail recipient data terug
