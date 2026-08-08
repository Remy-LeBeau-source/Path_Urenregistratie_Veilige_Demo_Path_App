Feature: Uren schrijven en indienen via API
# Step definitions mapping: tests/playwright/steps/timesheets.steps.ts

  Scenario: Medewerker slaat uren als concept op
    Gegeven een ingelogde medewerker met een schrijfbare testperiode
    Als de medewerker save_draft uitvoert met geldige daguren
    Dan wordt de urenstaat als draft opgeslagen

  Scenario: Medewerker leest opgeslagen concepturen terug
    Gegeven een bestaande draft urenstaat in de testperiode
    Als de medewerker de urenstaat terugleest
    Dan ziet de medewerker de opgeslagen draftstatus en laatste audit-event

  Scenario: Medewerker dient eigen uren in
    Gegeven een draft urenstaat van de ingelogde medewerker
    Als de medewerker submit uitvoert
    Dan wordt de urenstaat submitted met submitted_at

  Scenario: Medewerker kan geen uren van een ander wijzigen
    Gegeven een ingelogde medewerker
    Als de medewerker een andere employee_id probeert te schrijven
    Dan krijgt de medewerker een forbidden response

  Scenario: Indienen schrijft een audit-event
    Gegeven een medewerker dient een draft urenstaat in
    Als de urenstaat opnieuw wordt uitgelezen
    Dan is het laatste audit-event timesheet.submitted

  Scenario: Afgesloten urenstaat kan niet opnieuw worden gewijzigd
    Gegeven een ingediende urenstaat
    Als de medewerker opnieuw save_draft of submit probeert
    Dan krijgt de medewerker een conflictresponse
