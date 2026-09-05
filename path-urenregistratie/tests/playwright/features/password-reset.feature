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
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de resetservice de verzendfunctie beschikbaar heeft
    When de flow voor PWD-H-012 wordt uitgevoerd
    Then wordt een gequeuede reset direct gedispatcht, na de commit en zonder de token ongeldig te maken

  @happy
  Scenario: [PWD-H-013] nieuwe beheerder of medewerker wordt aangemaakt, krijgt een verzonden uitnodiging, stelt een wachtwoord in en kan inloggen
    # Testtechniek: Toestandsovergang (doorlopen voor beide rollen: beheerder en medewerker)
    # Aantoonbare Playwright-assertions in deze case: 19
    Given de administrator een nieuwe medewerker aanmaakt met uitnodiging
    When de uitgenodigde persoon de eenmalige link opent en een wachtwoord instelt
    Then verschijnt een duidelijke bevestiging met een knop om in te loggen
    And die knop brengt de persoon naar het inlogscherm
    And de nieuwe medewerker kan daarna echt inloggen met dat wachtwoord

  @happy
  Scenario: [PWD-H-020] de accountuitnodiging krijgt een opgemaakte HTML-tegenhanger met logo en dezelfde link als de platte tekst
    # Testtechniek: Broncontract
    # Aantoonbare Playwright-assertions in deze case: 7
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When de flow voor PWD-H-020 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat de accountuitnodiging een opgemaakte HTML-tegenhanger met logo en dezelfde link als de platte tekst krijgt

  @happy
  Scenario: [PWD-H-021] "wachtwoord vergeten" krijgt dezelfde opgemaakte handtekening als de uitnodiging
    # Testtechniek: Broncontract
    # Aantoonbare Playwright-assertions in deze case: 5
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When de flow voor PWD-H-021 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat "wachtwoord vergeten" dezelfde opgemaakte handtekening krijgt als de uitnodiging

  @happy
  Scenario: [PWD-H-022] website en slogan komen, als ze zijn ingevuld, terug in zowel de platte als de HTML-handtekening
    # Testtechniek: Broncontract
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de beheerder een website en slogan instelt
    When de flow voor PWD-H-022 wordt uitgevoerd
    Then staan website en slogan in de platte tekst en als eigen regels in de HTML

  @negative
  Scenario: [PWD-N-017] elk ander mailkanaal dan wachtwoordherstel blijft platte tekst, zonder html_snapshot
    # Testtechniek: Beslissingstabel
    # Aantoonbare Playwright-assertions in deze case: 4
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When de flow voor PWD-N-017 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat elk ander mailkanaal dan wachtwoordherstel platte tekst blijft, zonder html_snapshot

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

  @negative
  Scenario: [PWD-N-016] productie toont nooit dry-run-jargon aan iemand die zijn wachtwoord kwijt is
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 7
    Given wachtwoordherstel en misbruikbeveiliging is voorbereid
    When iemand op productie een resetverzoek doet
    Then krijgt die een bruikbare instructie zonder jargon of nep-token

  @happy
  Scenario: [PWD-H-017] een uitnodigingslink opent het wachtwoordscherm, ook als er al iemand is ingelogd
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een uitgenodigde collega met een geldige eenmalige link
    When de beheerder ingelogd blijft en de link in dezelfde browser opent
    Then verschijnt het wachtwoordscherm en niet het dashboard

  @happy
  Scenario: [PWD-H-018] de accountuitnodiging gebruikt een aanpasbare welkomsttekst met een vaste afzender-handtekening
    # Testtechniek: broncontract
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de uitnodigingstekst als kanaalsjabloon "account_invitation" bestaat
    When een beheerder de tekst bij Instellingen wil aanpassen
    Then staat de meegeleverde welkomsttekst met de link erin klaar en wordt de handtekening "Robot Path IT" altijd toegevoegd

  @happy
  Scenario: [PWD-H-019] een beheerder mag dezelfde persoon meerdere keren achter elkaar uitnodigen, de publieke wachtwoord-vergeten blijft begrensd
    # Testtechniek: grenswaarde + broncontract
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een nieuwe medewerker met een verstuurde uitnodiging
    When de beheerder de uitnodiging vier keer achter elkaar opnieuw verstuurt
    Then lukt elke poging en blijft de misbruikbegrenzing alleen op de publieke aanvraag staan
