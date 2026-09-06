@regressie
@ui
@desktop
@mobile
@fase:18
Feature: 1414/1919-pilotpagina's naast de bestaande app

  # Native Playwright-uitvoering: tests/playwright/pilot-page.spec.ts
  # Medewerker-pilot = statische 1-op-1 reproductie van de 1414-mockup.
  # Backoffice-pilot = nog servergestuurd; flows met gemockte endpoints.

  @happy
  Scenario: [PILOT-H-001] beide pilotpagina's leven naast een ongewijzigde app
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 10
    Given de webroot met de app op /
    When de medewerker- en Backoffice-pilot als eigen URL worden opgevraagd
    Then dragen ze de pilot-vlag/marker, delen ze geen code met de app en blijft / onaangeroerd

  @happy
  Scenario: [PILOT-H-002] medewerker-pilot toont de 1414-mockup 1-op-1
    # Testtechniek: Visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 14
    Given de statische medewerker-pilot
    When de pagina is geladen
    Then staan alle mockup-onderdelen met de vaste mockup-data in beeld

  @happy
  Scenario: [PILOT-H-003] Backoffice: rechtstreeks gemaild blijft oranje tot externe bevestiging, terugdraaien vraagt bevestiging
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een dossier waarvan de klanturenstaat rechtstreeks is gemaild
    When Backoffice extern bevestigt met een verplichte reden
    Then wordt de stap groen en kan de bevestiging alleen na een tweede bevestiging terug

  @happy
  Scenario: [PILOT-H-004] Backoffice: geuploade PDF komt ter controle en kan worden goedgekeurd
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een dossier met een ontvangen klanturenstaat-PDF
    When Backoffice het document beoordeelt en goedkeurt
    Then staat de klanturenstaat-stap op gereed

  @happy
  Scenario: [PILOT-H-005] Backoffice: correctie vragen zet de ingediende maand terug in de wachtrij
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingediende maand die Backoffice beoordeelt
    When Backoffice een correctie vraagt zonder reden en daarna met reden
    Then wacht het dossier zichtbaar op gecorrigeerde uren

  @negative
  Scenario: [PILOT-N-001] rollen blijven ook op de pilot-URLs strikt gescheiden
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een medewerkersessie
    When de Backoffice-pilot met die sessie wordt geopend
    Then blokkeert de Backoffice-pilot en toont de medewerker-pilot geen Backoffice-onderdelen

  @negative
  Scenario: [PILOT-N-002] beide pilots blijven zonder horizontale overflow op telefoon
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een telefoonviewport
    When beide pilots worden geopend
    Then past alles binnen de breedte en zijn tapdoelen minimaal 42px
