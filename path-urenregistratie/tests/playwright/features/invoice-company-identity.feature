@regressie
@integration
@fase:11
Feature: Facturerende onderneming en handelsnaam

  # Native Playwright-uitvoering: tests/playwright/invoice-company-identity.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoice-company-identity.steps.ts

  @happy
  Scenario: [INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat handelsnaam en juridische naam staan samen op de factuurpreview

  @happy
  Scenario: [INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat alleen juridische naam is als factuurweergave te kiezen

  @happy
  Scenario: [INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen

  @negative
  Scenario: [INV-ID-N-004] settings API weigert een onbekende factuurweergave
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-N-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat settings API weigert een onbekende factuurweergave

  @happy
  Scenario: [INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given facturerende onderneming en handelsnaam is voorbereid
    When de flow voor INV-ID-H-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus

  @happy
  Scenario: [INV-ID-H-006] bedrijfsgegevens uit het instellingenformulier blijven bewaard en komen op de factuur
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 5
    Given facturerende onderneming en handelsnaam is voorbereid
    When de beheerder de bedrijfsgegevens aanpast en opslaat
    Then staan ze na een herlaad nog steeds in het formulier
    And staat het opgeslagen IBAN op de betaalregel van de factuur

  @happy
  Scenario: [INV-ID-H-007] de klanturenstaat-mailteksten blijven na opslaan bewaard
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given facturerende onderneming en handelsnaam is voorbereid
    When de vier teksten worden aangepast en opgeslagen
    Then staan ze na een herlaad nog steeds in het formulier

  @happy
  Scenario: [INV-ID-H-008] typen in een instelling bevriest de rest van het formulier niet
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de cursor staat in een van de instellingen
    When een ander veld verouderd raakt en het scherm opnieuw wordt opgebouwd
    Then wordt het verouderde veld hersteld en blijft het getypte veld staan

  @happy
  Scenario: [INV-ID-H-009] website en slogan blijven bewaard en komen onder de mail
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 3
    Given facturerende onderneming en handelsnaam is voorbereid
    When website en slogan worden ingevuld en opgeslagen
    Then staan ze na een herlaad nog steeds in het formulier

  @happy
  Scenario: [INV-ID-H-010] instellingen tonen de standaardtekst die de ontvanger werkelijk krijgt
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 17
    Given facturerende onderneming en handelsnaam is voorbereid
    When de lijst met vaste ontvangers wordt geopend
    Then staat bij elke ontvanger de tekst van de server
    And geeft elke ontvanger dezelfde uitleg
    And heeft de boekhouder werkelijk de soort boekhouding
    And staat de broker er ook bij, ook al is hij geen vaste ontvanger

  @happy
  Scenario: [INV-ID-H-011] een gekozen merkkleur wordt echt zichtbaar toegepast en overleeft een herlading
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 8
    Given de beheerder is ingelogd en opent Instellingen
    When de beheerder een eigen primaire kleur en accentkleur instelt en opslaat
    Then staan de kleuren als CSS-variabelen op de pagina en oogt de opslaanknop er echt naar
    Then blijven de kleuren staan na een echte paginaherlading

  @happy
  Scenario: [INV-ID-H-012] een gekozen betalingstermijn komt echt terug in de betalingstekst op de factuurpreview
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 3
    Given de beheerder wijzigt de betalingstermijn naar 14 dagen
    When de flow voor INV-ID-H-012 wordt uitgevoerd
    Then noemt de factuurpreview 14 dagen, niet de standaard 30
