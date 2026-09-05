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

  @happy
  Scenario: [HELP-H-003] contact opnemen toont precies één mailknop en een kopieer-vangnet, geen dubbele keuze
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de medewerker opent Hulp & contact
    When de medewerker het onderwerp Contact opnemen kiest
    Then staat er precies één mailto-knop en één kopieerknop, geen los Gmail-alternatief

  @happy
  Scenario: [HELP-H-004] het hulpantwoord over verlof/ziekte volgt de beheerderschakelaar
    # Testtechniek: Beslissingstabel (schakelaar aan/uit)
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de schakelaar staat uit (standaard) en de medewerker vraagt naar verlof
    When de beheerder verlof/ziekte handmatig invullen aanzet
    Then krijgt de medewerker nu het antwoord dat wél naar de maandsamenvatting verwijst

  @happy
  Scenario: [HELP-H-002] het paneel opent en sluit met een vloeiende overgang, en meteen zonder animatievoorkeur
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de medewerker heeft geen voorkeur voor verminderde beweging ingesteld
    When de medewerker Hulp & contact opent
    Then krijgt het paneel de is-open-klasse en telt op als daadwerkelijk zichtbaar
    When de medewerker het paneel sluit
    Then verdwijnt het paneel weer volledig, ook na de sluitovergang

  @negative
  Scenario: [HELP-N-002] met een voorkeur voor verminderde beweging sluit het paneel direct, zonder op een animatie te wachten
    # Testtechniek: Negatieve equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given de medewerker heeft verminderde beweging ingesteld en het paneel staat open
    When de medewerker het paneel sluit
    Then is het paneel direct verborgen, niet pas na de normale overgangsduur
