@regressie
@ui
@desktop
@fase:19
Feature: Vormgevingsschakelaar (klassiek / nieuw)

  # Native Playwright-uitvoering: tests/playwright/skin.spec.ts
  # Navigatiemapping: tests/playwright/steps/skin.steps.ts

  @happy
  Scenario: [SKIN-H-001] de app start standaard in de klassieke vormgeving
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een verse browser op de loginpagina
    When er nog geen vormgeving is gekozen
    Then blijft de app ook na inloggen in de klassieke vormgeving

  @happy
  Scenario: [SKIN-H-002] Vormgeving op "Nieuw" zetten schakelt de skin en blijft na herladen staan
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een ingelogde administrator
    When de flow voor SKIN-H-002 wordt uitgevoerd
    Then draait de app door in de nieuwe skin en overleeft die een herlading

  @happy
  Scenario: [SKIN-H-003] terug naar "Klassiek" herstelt de klassieke vormgeving en bewaart die
    # Testtechniek: Herstelbaarheid + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de app staat in de nieuwe skin
    When de flow voor SKIN-H-003 wordt uitgevoerd
    Then is de klassieke vormgeving terug, ook na herladen

  @happy
  Scenario: [SKIN-H-004] de nieuwe skin activeert uitsluitend zijn eigen visuele fundament
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een ingelogde administrator in de klassieke vormgeving
    When de gebruiker de nieuwe vormgeving activeert
    Then zijn de 1414/1919-tokens en lokale serif alleen daar actief

  @happy
  Scenario: [SKIN-H-005] Klassiek start licht en Nieuw donker en onthoudt daarna elk eigen thema
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given een ingelogde administrator met de standaardvoorkeuren
    When Nieuw voor het eerst direct wordt geopend
    Then bewaart iedere skin zijn eigen keuze bij heen en weer schakelen

  @happy
  Scenario: [SKIN-H-006] de echte medewerkerroute toont de live bento en blijft mobiel bedienbaar
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 24
    Given de medewerker de nieuwe vormgeving opent
    When het echte dashboard de bento met live invoervelden en gezamenlijke versie-footer tekent
    And eerdere weken niet indienen en de laatste week eerst bevestiging vraagt
    Then blijven op telefoon weekinvoer, klanturenstaat en stappen binnen het scherm

  @happy
  Scenario: [SKIN-H-008] Nieuw houdt dezelfde beheergegevens vast tijdens navigatie en terugschakelen
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 11
    Given Backoffice is ingelogd en de dashboardgegevens zijn geladen
    When Nieuw wordt geactiveerd en Backoffice alle hoofdschermen bezoekt
    Then dezelfde gegevens blijven staan in Nieuw en na terugschakelen naar Klassiek

  @happy
  Scenario: [SKIN-H-009] medewerker houdt dezelfde urenstatus in Nieuw, Mijn uren en Klassiek
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given een medewerkerdashboard met geladen urenstatus
    When de medewerker Nieuw activeert en via de bento naar Mijn uren navigeert
    Then de dashboardstatus gelijk blijft en Klassiek dezelfde gegevens toont

  @happy
  Scenario: [SKIN-H-010] de admin-verhaallijn wisselt van medewerker en toont bijbehorende status
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 7
    Given Backoffice in de nieuwe skin met minstens twee medewerkers in de verhaallijn
    When Backoffice de tweede medewerker in de wachtrij aanklikt
    Then wordt die medewerker geselecteerd en toont het verhaal zijn naam en vier statuskaarten

  @happy
  Scenario: [SKIN-H-011] een bewust opgeslagen 0 uur telt mee voor de weekvoortgang in Mijn uren
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de medewerker de nieuwe vormgeving opent op de huidige week
    When alle werkdagen op deze week uren krijgen behalve de laatste, die bewust leeg blijft, en de week wordt opgeslagen
    Then heeft de server na een herlaad een eigen dagregel voor de laatste dag bewaard, ook al bleef die op 0 uur

  @happy
  Scenario: [SKIN-H-012] Mededelingen valt niet terug op de klassieke sidebar in Nieuw
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de medewerker de nieuwe vormgeving opent
    When de medewerker naar Mededelingen navigeert
    Then blijft Nieuw actief en blijft de klassieke sidebar verborgen

  @happy
  Scenario: [SKIN-H-013] de medewerkerroute blijft op elk scherm consequent Nieuw, ook op telefoonbreedte
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de medewerker inlogt en Nieuw activeert
    When de medewerker naar Mijn uren gaat
    And de medewerker naar Mededelingen gaat (bereikbaar via de bel)
    Then brengt de eigen Home-knop terug naar het dashboard, nog altijd in Nieuw

  @happy
  Scenario: [SKIN-H-015] de theme-snelknop staat niet meer op de medewerker-startpagina, Voorkeuren blijft werken
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de medewerker Nieuw activeert
    When de flow voor SKIN-H-015 wordt uitgevoerd
    Then staat de theme-snelknop niet meer op het dashboard
    And blijft de onderliggende voorkeur bereikbaar en werkend via Voorkeuren

  @negative
  Scenario: [SKIN-N-007] productie forceert Klassiek en verbergt de redesignschakelaar
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een gebruiker heeft de nieuwe vormgeving in een pilotomgeving gekozen
    When dezelfde voorkeur onder het productiebeleid wordt toegepast
    Then blijft productie klassiek zonder zichtbare pilotschakelaar en blijft TEST wel beschikbaar
