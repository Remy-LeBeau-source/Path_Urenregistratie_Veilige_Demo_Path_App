@regressie
@ui
@desktop
@fase:19
Feature: Vormgevingsschakelaar (klassiek / nieuw)

  # Native Playwright-uitvoering: tests/playwright/skin.spec.ts
  # Fase D — increment 1. "classic" laat de bestaande app volledig ongemoeid;
  # "new" activeert assets/styles-new.css (alles gescoped onder
  # html[data-skin="new"]). Wisselen via Voorkeuren -> Vormgeving; de keuze
  # zit in state.preferences.skin en wordt lokaal bewaard. In deze increment
  # verandert er nog niets aan het uiterlijk.

  @happy
  Scenario: [SKIN-H-001] de app start standaard in de klassieke vormgeving
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een verse browser op de loginpagina
    When er nog geen vormgeving is gekozen
    Then blijft de app ook na inloggen in de klassieke vormgeving

  @happy
  Scenario: [SKIN-H-002] Vormgeving op "Nieuw" zetten schakelt de skin en blijft na herladen staan
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een ingelogde administrator
    When Voorkeuren - Vormgeving op "Nieuw" wordt gezet en opgeslagen
    Then draait de app door in de nieuwe skin en overleeft die een herlading

  @happy
  Scenario: [SKIN-H-003] terug naar "Klassiek" herstelt de klassieke vormgeving en bewaart die
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de app staat in de nieuwe skin
    When Vormgeving weer op "Klassiek" wordt gezet
    Then is de klassieke vormgeving terug, ook na herladen

  @happy
  Scenario: [SKIN-H-004] de nieuwe skin activeert uitsluitend zijn eigen visuele fundament
    # Testtechniek: Equivalentieklassen classic/new + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een ingelogde administrator in de klassieke vormgeving
    When de gebruiker de nieuwe vormgeving activeert
    Then zijn de 1414/1919-tokens, grotere radius en lokale serif alleen daar actief

  @happy
  Scenario: [SKIN-H-005] de topbar wisselt licht/donker en klassiek/nieuw direct en persistent
    # Testtechniek: Toestandsovergang + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 16
    Given een ingelogde administrator met de standaardvoorkeuren
    When beide directe schakelaars eenmaal worden gebruikt
    Then zijn donker en nieuw actief en blijven beide na herladen bewaard

  @happy @mobile
  Scenario: [SKIN-H-006] de echte medewerkerroute toont de live bento en blijft mobiel bedienbaar
    # Testtechniek: Responsive equivalentieklassen + end-to-end UI-contract
    # Aantoonbare Playwright-assertions in deze case: 12
    Given de medewerker de nieuwe vormgeving opent
    When het echte dashboard de bento met live invoervelden en gezamenlijke versie-footer tekent
    Then blijven op telefoon weekinvoer, klanturenstaat en stappen binnen het scherm

  @negative @security
  Scenario: [SKIN-N-007] productie forceert Klassiek en verbergt de redesignschakelaar
    # Testtechniek: Beslissingstabel LOCAL / TEST / PROD + negatieve equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een gebruiker heeft de nieuwe vormgeving in een pilotomgeving gekozen
    When dezelfde voorkeur onder het productiebeleid wordt toegepast
    Then blijft productie klassiek zonder zichtbare pilotschakelaar en blijft TEST wel beschikbaar
