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
