@regressie
@ui
@desktop
@fase:19
Feature: Avatarkiezer in het profielmenu

  # Native Playwright-uitvoering: tests/playwright/avatar-picker.spec.ts
  # Navigatiemapping: tests/playwright/steps/avatar-picker.steps.ts

  @happy
  Scenario: [AVATAR-H-001] een medewerker met een vaste naam krijgt automatisch zijn toegewezen avatar, zonder zelf te kiezen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de medewerker inlogt zonder ooit een avatar gekozen te hebben
    When de flow voor AVATAR-H-001 wordt uitgevoerd
    Then toont het profielmenu meteen zijn vaste, toegewezen avatar (nummer 1)

  @happy
  Scenario: [AVATAR-H-002] een beheerder met een vaste naam krijgt automatisch zijn toegewezen avatar
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 1
    Given de beheerder inlogt zonder ooit een avatar gekozen te hebben
    When de flow voor AVATAR-H-002 wordt uitgevoerd
    Then toont het profielmenu meteen zijn vaste, toegewezen avatar (nummer 96)

  @happy
  Scenario: [AVATAR-H-003] de avatarkiezer opent naast de ongewijzigde menu-items en testfunctiebalk
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 12
    Given avatarkiezer in het profielmenu is voorbereid
    Then bestaan alle bestaande menu-onderdelen nog steeds, ongewijzigd
    When op de knopkop (avatar, naam, rol) wordt getikt
    Then klapt een raster van twaalf avatars open, met paginateller 1/10

  @happy
  Scenario: [AVATAR-H-004] bladeren eindigt op precies vijf avatars met een uitgeschakelde volgende-knop
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 7
    Given avatarkiezer in het profielmenu is voorbereid
    When negen keer op volgende wordt getikt (113 avatars = 9x12 + 5)
    Then staat de teller op 10/10, met precies vijf avatars en een uitgeschakelde volgende-knop
    And gaat één stap terug weer naar een volle pagina van twaalf

  @happy
  Scenario: [AVATAR-H-005] een avatar kiezen is direct zichtbaar, sluit het menu niet, en blijft staan na een echte paginaherlading
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 6
    Given avatarkiezer in het profielmenu is voorbereid
    When een andere avatar dan de huidige wordt aangetikt
    Then verschijnt de keuze meteen, blijft het menu open, en is er geen aparte opslaan-knop nodig
    And staat dezelfde avatar er nog na een echte paginaherlading

  @happy
  Scenario: [AVATAR-H-008] het openen van de avatarkiezer overleeft een scroll-event dat de eigen hoogtewijziging veroorzaakt
    # Testtechniek: Grenswaardenanalyse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given avatarkiezer in het profielmenu is voorbereid
    When de avatarkiezer wordt geopend en dat, net als op mobiel, meteen een scroll-event oplevert
    Then blijven het profielmenu en de avatarkiezer open

  @negative
  Scenario: [AVATAR-N-001] het vinkje op de gekozen avatar is navy op mint, nooit wit
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given avatarkiezer in het profielmenu is voorbereid
    When de flow voor AVATAR-N-001 wordt uitgevoerd
    Then is de achtergrond van het vinkje mint en de tekstkleur navy, geen wit

  @happy
  Scenario: [AVATAR-H-006] namen buiten de vaste lijst krijgen elk een eigen, stabiele avatar, zonder geslacht te raden
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given avatarkiezer in het profielmenu is voorbereid
    When de flow voor AVATAR-H-006 wordt uitgevoerd
    Then geeft dezelfde naam altijd dezelfde avatar-index terug, ook bij afwijkende spatiëring/hoofdletters
    And blijven de zeven vaste collega-namen op hun afgesproken avatar staan, ook met afwijkende spatiëring/hoofdletters

  @happy
  Scenario: [AVATAR-H-007] de avatarkiezer werkt identiek in de Nieuw-vormgeving (Modern)
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de vormgeving op Nieuw staat
    When het profielmenu en de avatarkiezer worden geopend
    Then werkt de kiezer identiek: twaalf avatars, teller 1/10, en hetzelfde vinkje mint-op-navy
    And blijft het menu open, net als in Klassiek
