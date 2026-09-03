@regressie
@ui
@desktop
@fase:15
Feature: Toegankelijkheid en toetsenbordbediening

  # Native Playwright-uitvoering: tests/playwright/accessibility.spec.ts
  # Navigatiemapping: tests/playwright/steps/accessibility.steps.ts

  @happy
  Scenario: [A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld
    # Testtechniek: Toegankelijkheidsinspectie + toetsenbord-use-case
    # Aantoonbare Playwright-assertions in deze case: 7
    Given de loginpagina is geopend
    Then hebben e-mail, wachtwoord en inlogknop een programmatisch gekoppeld label
    When er met Tab door het formulier wordt genavigeerd

  @happy
  Scenario: [A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen
    # Testtechniek: Toegankelijkheidsinspectie + toetsenbord-use-case
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de administrator is ingelogd
    Then heeft elke hoofdnavigatieknop een herkenbare, unieke naam
    When de eerste hoofdnavigatieknop via het toetsenbord wordt bediend

  @happy
  Scenario: [A11Y-H-003] lopende tekst blijft op een breed scherm leesbaar van regellengte
    # Testtechniek: Toegankelijkheidsinspectie + toetsenbord-use-case
    # Aantoonbare Playwright-assertions in deze case: 2
    Given toegankelijkheid en toetsenbordbediening is voorbereid
    When de flow voor A11Y-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat lopende tekst blijft op een breed scherm leesbaar van regellengte

  @happy
  Scenario: [A11Y-H-004] een geopende dialoog is met het toetsenbord te bedienen en te sluiten
    # Testtechniek: Toestandsovergang + toetsenbordbediening
    # Aantoonbare Playwright-assertions in deze case: 6
    Given de administrator opent de voorbeeld-herstel-dialoog
    When Escape wordt ingedrukt
    Then sluit de dialoog met een gelabelde sluitknop en blijft de focus behouden

  @happy
  Scenario: [A11Y-H-005] elke interactieve elementsoort krijgt een zichtbare focusring
    # Testtechniek: Broncontract + gerenderde stijl
    # Aantoonbare Playwright-assertions in deze case: 4
    Given de administrator is ingelogd
    When de focusregels worden gelezen en een navigatieknop wordt gefocust
    Then dekt de basisregel button, input, select, textarea, a, summary en tabindex, en toont een gefocuste knop een outline
