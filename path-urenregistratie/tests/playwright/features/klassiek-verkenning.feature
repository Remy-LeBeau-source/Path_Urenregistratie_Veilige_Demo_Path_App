@regressie
@ui
@desktop
@fase:19
Feature: Vondsten uit de monkey-verkenning op Klassiek

  # Native Playwright-uitvoering: tests/playwright/klassiek-verkenning.spec.ts
  # Navigatiemapping: tests/playwright/steps/klassiek-verkenning.steps.ts

  @negative
  Scenario: [KLV-N-002] het maandkeuzepaneel valt op geen enkele breedte buiten het scherm
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een medewerker in Klassiek
    And is de maandkeuze op minstens de desktopbreedtes van Mijn uren echt gemeten
    When de flow voor KLV-N-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat het maandkeuzepaneel valt op geen enkele breedte buiten het scherm

  @negative
  Scenario: [KLV-N-003] in de menubalk van de medewerker overlapt niets elkaar, op geen enkele desktopbreedte
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een medewerker in Klassiek met de testbalk in de menubalk
    When de flow voor KLV-N-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat in de menubalk van de medewerker overlapt niets elkaar, op geen enkele desktopbreedte

  @negative
  Scenario: [KLV-N-004] een trage opslag die pas na herladen aankomt, blokkeert de volgende invoer niet
    # Testtechniek: Monkey testing (seeded) + concurrency + herstelbaarheid
    # Aantoonbare Playwright-assertions in deze case: 7
    Given een medewerker op Mijn uren met een urenstaat die al een serverversie heeft
    When een opslag onderweg is, de pagina herlaadt en die opslag pas daarna aankomt
    And de medewerker daarna gewoon verder invult
    Then wordt die invoer zonder foutmelding opgeslagen en staat hij na nog een herlading op de server

  @negative
  Scenario: [KLV-N-001] snel achter elkaar uren invullen botst nooit met de eigen, net opgeslagen versie
    # Testtechniek: Monkey testing (seeded) + concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 11
    Given een medewerker op Mijn uren van een open maand
    And de urenstaat staat al met een versie op de server
    When de eerste invoer onderweg is en er intussen twee nieuwe invoeren volgen
    Then slaagt elke opslag en staan alle drie de waarden daarna op de server
