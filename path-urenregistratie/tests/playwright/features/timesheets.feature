Feature: Uren schrijven en indienen via API
# Step definitions mapping: tests/playwright/steps/timesheets.steps.ts

  Scenario: Medewerker slaat uren als concept op
    Given een ingelogde medewerker met een schrijfbare testperiode
    When de medewerker save_draft uitvoert met geldige daguren
    Then wordt de urenstaat als draft opgeslagen

  Scenario: Medewerker leest opgeslagen concepturen terug
    Given een bestaande draft urenstaat in de testperiode
    When de medewerker de urenstaat terugleest
    Then ziet de medewerker de opgeslagen draftstatus en laatste audit-event

  Scenario: Medewerker dient eigen uren in
    Given een draft urenstaat van de ingelogde medewerker
    When de medewerker submit uitvoert
    Then wordt de urenstaat submitted met submitted_at

  Scenario: Medewerker kan geen uren van een ander wijzigen
    Given een ingelogde medewerker
    When de medewerker een andere employee_id probeert te schrijven
    Then krijgt de medewerker een forbidden response

  Scenario: Indienen schrijft een audit-event
    Given een medewerker dient een draft urenstaat in
    When de urenstaat opnieuw wordt uitgelezen
    Then is het laatste audit-event timesheet.submitted

  Scenario: Afgesloten urenstaat kan niet opnieuw worden gewijzigd
    Given een ingediende urenstaat
    When de medewerker opnieuw save_draft of submit probeert
    Then krijgt de medewerker een conflictresponse
