Feature: Klanturenstaat lifecycle via API
# Step definitions mapping: tests/playwright/steps/customer-timesheets.steps.ts

  Scenario: [CTS-API-001] Medewerker uploadt klanturenstaat als concept
    Given een ingelogde medewerker met een schrijfbare klanturenstaatperiode
    When de medewerker een PDF als save_draft uploadt
    Then wordt de klanturenstaat als draft met bestandsmetadata opgeslagen

  Scenario: [CTS-API-001] Medewerker dient klanturenstaat in en leest terug
    Given een bestaande draft klanturenstaat in de testperiode
    When de medewerker submit uitvoert zonder nieuw bestand
    Then wordt de klanturenstaat received en downloadbaar teruggegeven

  Scenario: [CTS-API-001] Administrator keurt goed en vraagt daarna resubmit
    Given een ingediende klanturenstaat met bekende employee en assignment
    When de administrator approve en request_resubmit uitvoert
    Then wordt de status eerst approved en daarna resubmit met review_note

  Scenario: [CTS-API-001] Ongeldig bestandstype wordt geblokkeerd
    Given een medewerker met een open klanturenstaatperiode
    When de medewerker een tekstbestand probeert te uploaden
    Then krijgt de medewerker invalid-upload met status 400

  Scenario: [CTS-API-002] Medewerker kan geen andere employee scope forceren
    Given een ingelogde medewerker
    When de medewerker save_draft uitvoert met een andere employee_id
    Then krijgt de medewerker een forbidden-employee-scope response
