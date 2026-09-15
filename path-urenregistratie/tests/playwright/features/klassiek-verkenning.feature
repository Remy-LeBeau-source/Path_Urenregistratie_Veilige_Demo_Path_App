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
  Scenario: [KLV-N-005] op geen enkel medewerkerscherm valt inhoud buiten de rechterrand rond de breekpunten
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + toestandsovergang + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een medewerker in Klassiek
    When de flow voor KLV-N-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat op geen enkel medewerkerscherm valt inhoud buiten de rechterrand rond de breekpunten

  @negative
  Scenario: [KLV-N-006] op geen enkel beheerscherm valt inhoud buiten de rechterrand rond de breekpunten
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + toestandsovergang + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een beheerder in Klassiek
    When de flow voor KLV-N-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat op geen enkel beheerscherm valt inhoud buiten de rechterrand rond de breekpunten

  @negative
  Scenario: [KLV-N-007] elk scherm heeft een paginatitel, ook Klanturenstaten bij de beheerder
    # Testtechniek: Monkey testing (seeded) + negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een beheerder op het dashboard
    When de beheerder de klanturenstaten opent vanaf het dashboard
    Then staat er een paginatitel
    And heeft ieder scherm in de app een eigen titel

  @negative
  Scenario: [KLV-N-008] meer dan 24 uur op een dag wordt direct in het vak gemeld en niet naar de server gestuurd
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + negatieve equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 9
    Given een medewerker op Mijn uren van een open maand
    When de medewerker 25 uur op een dag intypt
    Then is het vak ongeldig, staat er een duidelijke melding en gaat er niets naar de server
    And geldt 24,5 ook als te veel, maar 24 precies niet

  @negative
  Scenario: [KLV-N-009] in Klassiek staat het klanturenstaatlabel niet op Mijn uren maar op het eigen Klanturenstaat-scherm
    # Testtechniek: Beslissingstabel vormgeving en scherm + regressiebewaking
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een medewerker in Klassiek
    When de medewerker Mijn uren opent
    Then staat er op Mijn uren geen klanturenstaatlabel of -paneel
    And staat het label wel op het Klanturenstaat-scherm

  @happy
  Scenario: [KLV-H-010] op TEST staat alleen Herstel bovenin; thema, vormgeving en versie staan in het profielmenu
    # Testtechniek: Responsive viewport + toegankelijkheidsinspectie (44px, toetsenbord) + end-to-end use-case
    # Aantoonbare Playwright-assertions in deze case: 12
    Given vondsten uit de monkey-verkenning op Klassiek is voorbereid
    When de flow voor KLV-H-010 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat op TEST staat alleen Herstel bovenin; thema, vormgeving en versie staan in het profielmenu

  @negative
  Scenario: [KLV-N-011] de mailgeschiedenis in Instellingen blijft binnen beeld, ook met lange regels en een herstelknop
    # Testtechniek: Monkey testing (seeded) + grenswaardenanalyse + responsive viewport
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een beheerder op Instellingen met drie mailregels in de geschiedenis
    When de flow voor KLV-N-011 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de mailgeschiedenis in Instellingen blijft binnen beeld, ook met lange regels en een herstelknop

  @negative
  Scenario: [KLV-N-001] snel achter elkaar uren invullen botst nooit met de eigen, net opgeslagen versie
    # Testtechniek: Monkey testing (seeded) + concurrency + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 11
    Given een medewerker op Mijn uren van een open maand
    And de urenstaat staat al met een versie op de server
    When de eerste invoer onderweg is en er intussen twee nieuwe invoeren volgen
    Then slaagt elke opslag en staan alle drie de waarden daarna op de server
