@regressie
@ui
@desktop
@fase:9
Feature: Correcties en goedkeuringen behandelen

  # Native Playwright-uitvoering: tests/playwright/timesheet-review-ui.spec.ts
  # Navigatiemapping: tests/playwright/steps/timesheets-review-ui.steps.ts

  @happy
  Scenario: [TS-REV-UI-H-008] browserflow: correctie, herindiening, goedkeuring en heropening blijven servergestuurd
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 29
    Given de medewerker een urenstaat indient in de browser
    When de administrator een correctieverzoek plaatst
    Then ziet de medewerker het correctieverzoek en dient opnieuw in
    And de administrator keurt de herindiening goed
    Then ziet de medewerker de eindstatus Goedgekeurd
    When de administrator de goedkeuring met reden intrekt
    Then opent de medewerker de dashboardcorrectie en kan opnieuw indienen

  @happy
  Scenario: [TS-REV-UI-H-009] ingediende urenstaat blijft vergrendeld tot Backoffice een correctie vraagt
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given medewerker opent een ingediende urenstaat
    When de flow voor TS-REV-UI-H-009 wordt uitgevoerd
    Then zijn invoer en indienactie vergrendeld en wacht de medewerker op Backoffice

  @happy
  Scenario: [TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 3
    Given medewerker opent een goedgekeurde urenstaat
    When de flow voor TS-REV-UI-H-010 wordt uitgevoerd
    Then is de indienknop verborgen en staat er een statusmelding

  @negative
  Scenario: [TS-REV-UI-N-011] localhost kan demo-uren zonder serverversie voor correctie terugsturen
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de ingelogde localhostomgeving een lokaal demo-record zonder serverversie toont
    When Backoffice Marc met een concrete toelichting terugstuurt
    Then wordt de lokale status bijgewerkt zonder ongeldige serverwrite

  @negative
  Scenario: [TS-REV-UI-N-012] gefactureerde goedkeuring blijft bij serverweigering vergrendeld
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 6
    Given Backoffice een goedgekeurde maand met definitieve factuur bekijkt
    When de server heropenen wegens facturatie weigert
    Then blijft de maand goedgekeurd en krijgt Backoffice een duidelijke blokkade

  @happy
  Scenario: [TS-REV-UI-H-011] urencontrole toont dag/week-uitsplitsing vóór goedkeuren
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given medewerker opent een ingediende urenstaat
    When de administrator de urencontrole opent
    Then ziet de administrator de exacte dag- en weektotalen van de medewerker

  @negative
  Scenario: [TS-REV-UI-N-013] Goedkeuringen toont een laadtoestand tot de serverwerkvoorraad binnen is
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de beheerder opent Goedkeuringen terwijl de eerste serverwerkvoorraad-sync nog loopt
    When de sync binnenkomt
    Then toont Goedkeuringen eerst een neutrale laadtekst zonder voorlopige kaarten of teller en daarna de echte controlestand
