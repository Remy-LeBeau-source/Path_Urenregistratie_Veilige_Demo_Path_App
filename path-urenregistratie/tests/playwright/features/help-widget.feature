@regressie
@gui
@fase:17
Feature: Hulp en contact

  # Native Playwright-uitvoering: tests/playwright/help-widget.spec.ts

  @happy
  Scenario: [HELP-H-001] medewerker zoekt een bekende vraag en krijgt het juiste antwoord met werkende knop
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de medewerker opent Hulp & contact
    When de medewerker "verlof" intypt en verstuurt
    Then verschijnt de eigen vraag en het juiste standaardantwoord met een knop naar Mijn uren
    When de medewerker op de knop klikt
    Then opent daadwerkelijk Mijn uren

  @negative
  Scenario: [HELP-N-001] het hulpgesprek overleeft geen paginaherlading, alleen "Gesprek wissen" binnen de sessie
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 9
    Given de medewerker heeft binnen het gesprek een vraag gesteld
    When de medewerker Gesprek wissen gebruikt
    Then blijft alleen de begroeting over, met een melding dat het is gewist
    When de medewerker opnieuw een vraag stelt en de pagina daarna echt herlaadt
    Then is het gesprek net zo leeg als bij een eerste opening, niet ergens onthouden
