@domain-customer-timesheets @layer-api @phase10 @priority-high
Feature: Klanturenstaat lifecycle via API
# Step definitions mapping: tests/playwright/steps/customer-timesheets.steps.ts
# Dit featurebestand dekt upload, reviewstatussen en foutafhandeling voor klanturenstaten.
# Hash-overzicht testcase-doel:
# [CTS-API-H-001] Medewerker uploadt concept en kan later indienen.
# [CTS-API-H-002] Submit maakt document received en downloadbaar.
# [CTS-API-H-003] Admin kan approve en daarna resubmit aanvragen.
# [CTS-API-H-004] Medewerker kan mark_skipped registreren en restore_missing terugzetten.
# [CTS-API-N-001] Ongeldig bestandstype wordt afgewezen.
# [CTS-API-N-002] Schrijven met andere employee_id wordt geblokkeerd.
# [CTS-API-N-003] Medewerker mag geen admin reviewactie uitvoeren.

  # Happy flows

  Scenario: [CTS-API-H-001] Medewerker uploadt klanturenstaat als concept
    Given een ingelogde medewerker met een schrijfbare klanturenstaatperiode zodat upload toegestaan is
    When de medewerker een PDF als save_draft uploadt
    Then wordt de klanturenstaat als draft met bestandsmetadata opgeslagen zodat later indienen mogelijk is

  Scenario: [CTS-API-H-002] Medewerker dient klanturenstaat in en leest terug
    Given een bestaande draft klanturenstaat in de testperiode
    When de medewerker submit uitvoert zonder nieuw bestand
    Then wordt de klanturenstaat received en downloadbaar teruggegeven zodat backofficecontrole gestart kan worden

  Scenario: [CTS-API-H-003] Administrator keurt goed en vraagt daarna resubmit
    Given een ingediende klanturenstaat met bekende employee en assignment
    When de administrator approve en request_resubmit uitvoert
    Then wordt de status eerst approved en daarna resubmit met review_note zodat het reviewtraject volledig traceerbaar blijft

  Scenario: [CTS-API-H-004] Medewerker markeert als rechtstreeks gemaild en herstelt daarna naar missing
    Given een ingelogde medewerker met een bestaande klanturenstaat in conceptstatus
    When de medewerker mark_skipped uitvoert met een reden en daarna restore_missing uitvoert
    Then staat de klanturenstaat weer op missing zodat opnieuw uploaden mogelijk is

  # Negative flows

  Scenario: [CTS-API-N-001] Ongeldig bestandstype wordt geblokkeerd
    Given een medewerker met een open klanturenstaatperiode
    When de medewerker een tekstbestand probeert te uploaden
    Then krijgt de medewerker invalid-upload met status 400 zodat alleen veilige bestandssoorten doorgaan

  Scenario: [CTS-API-N-002] Medewerker kan geen andere employee scope forceren
    Given een ingelogde medewerker
    When de medewerker save_draft uitvoert met een andere employee_id
    Then krijgt de medewerker een forbidden-employee-scope response zodat rol- en tenantgrenzen intact blijven

  Scenario: [CTS-API-N-003] Medewerker kan geen admin-reviewacties uitvoeren
    Given een ingelogde medewerker met een ingediende klanturenstaat
    When de medewerker approve of request_resubmit probeert uit te voeren
    Then krijgt de medewerker forbidden-action zodat reviewbesluiten alleen bij administrators liggen
