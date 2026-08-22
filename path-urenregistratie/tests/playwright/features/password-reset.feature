@regressie
@security
@fase:13
Feature: Wachtwoordherstel en misbruikbeveiliging

  # Native Playwright-uitvoering: tests/playwright/password-reset.spec.ts
  # Navigatiemapping: tests/playwright/steps/password-reset.steps.ts

  @happy
  Scenario: [PWD-H-001] request-reset retourneert token in demo-modus
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 12
    Given een geldig e-mailadres van een actieve gebruiker
    When request-reset wordt aangeroepen
    Then kan het token worden gebruikt om wachtwoord te resetten

  @happy
  Scenario: [PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een niet-bestaand e-mailadres
    When request-reset wordt aangeroepen
    Then wordt met Playwright-assertions bevestigd dat onbekend e-mailadres retourneert ook ok=true (geen email-enumeration)

  @happy
  Scenario: [PWD-H-003] me.php bevat force_password_change veld
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een ingelogde admin
    When de flow voor PWD-H-003 wordt uitgevoerd
    Then bevat me.php het force_password_change veld

  @happy
  Scenario: [PWD-H-004] ingelogde gebruiker kan het eigen wachtwoord veilig wijzigen
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een ingelogde beheerder
    When het huidige en een sterk nieuw wachtwoord worden verstuurd
    Then kan het wachtwoord via dezelfde beveiligde flow worden teruggezet

  @happy
  Scenario: [PWD-H-005] medewerker stelt via een eenmalige e-maillink zelf een wachtwoord in
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een resetlink voor een actieve medewerker is aangemaakt
    When de medewerker de link opent en tweemaal hetzelfde sterke wachtwoord invult
    Then is het wachtwoord gewijzigd en kan dezelfde link niet opnieuw worden gebruikt

  @happy
  Scenario: [PWD-H-006] TEST-links zijn herhaalbaar zonder normale misbruikbegrenzing te verzwakken
    # Testtechniek: Beslissingstabel + equivalentieklassen + toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 16
    Given gewone en speciale TEST-beveiligingsmails als aparte equivalentieklassen gelden
    When herhaling, foutafhandeling en omgevingsscheiding volgens de beslissingstabel worden doorgerekend
    Then alleen de twee vaste TEST-accounts een nieuwe linkcyclus mogen starten

  @negative
  Scenario: [PWD-N-010] twee verschillende wachtwoorden worden in de GUI niet verstuurd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een syntactisch geldige eenmalige resetlink is geopend
    When twee verschillende sterke wachtwoorden worden ingevuld
    Then blijft de gebruiker op het formulier met een duidelijke validatiemelding

  @negative
  Scenario: [PWD-N-011] elf tekens ligt onder de wachtwoordgrens van twaalf
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When de flow voor PWD-N-011 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat elf tekens ligt onder de wachtwoordgrens van twaalf

  @negative
  Scenario: [PWD-N-004] reset-password met ongeldig token geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When reset-password wordt aangeroepen met neptoken
    Then wordt met Playwright-assertions bevestigd dat reset-password met ongeldig token geeft 400

  @negative
  Scenario: [PWD-N-005] reset-password onder twaalf tekens geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een geldig reset-token
    When reset-password wordt aangeroepen met een wachtwoord onder twaalf tekens
    Then wordt met Playwright-assertions bevestigd dat reset-password onder twaalf tekens geeft 400

  @negative
  Scenario: [PWD-N-006] hergebruik van al-gebruikt token geeft 409
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een geldig token dat al gebruikt is
    When hetzelfde token nogmaals wordt gebruikt
    Then wordt met Playwright-assertions bevestigd dat hergebruik van al-gebruikt token geeft 409

  @negative
  Scenario: [PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit)
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een account met 5+ mislukte loginpogingen
    When de flow voor PWD-N-007 wordt uitgevoerd
    Then wordt de 6e poging geblokkeerd met 429

  @negative
  Scenario: [PWD-N-008] request-reset weigert GET
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When de flow voor PWD-N-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat request-reset weigert GET

  @negative
  Scenario: [PWD-N-009] request-reset met leeg e-mailadres geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When de flow voor PWD-N-009 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat request-reset met leeg e-mailadres geeft 400

  @happy
  Scenario: [PWD-H-012] een aangevraagde reset wordt ook echt verzonden, niet alleen in de wachtrij gezet
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 24
    Given de resetservice de verzendfunctie beschikbaar heeft
    Then wordt een gequeuede reset direct gedispatcht, na de commit en zonder de token ongeldig te maken
    When de uitgenodigde persoon de eenmalige link opent en een wachtwoord instelt
    Then verschijnt een duidelijke bevestiging met een knop om in te loggen
    And die knop brengt de persoon naar het inlogscherm

  @happy
  Scenario: [PWD-H-014] wachtwoord-vergeten op het inlogscherm verraadt niet welke e-mailadressen bestaan
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 11
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When een bestaand adres een resetverzoek doet
    And een onbekend adres exact hetzelfde verzoek doet
    Then is de melding woordelijk gelijk en noemt die het adres niet

  @negative
  Scenario: [PWD-N-015] het resetscherm neemt het ingevulde adres over, weigert een leeg adres en laat terugkeren naar inloggen
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een ingevuld inlogadres
    When de gebruiker op Wachtwoord vergeten klikt
    Then is het adres overgenomen zodat het niet opnieuw getypt hoeft te worden
    When het adres wordt gewist en het formulier toch wordt verstuurd
    Then komt er een expliciete melding en wordt er niets verstuurd
    And brengt Terug naar inloggen de gebruiker terug bij het inlogformulier zonder oude melding
