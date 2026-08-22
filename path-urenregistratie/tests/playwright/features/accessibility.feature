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
    # Aantoonbare Playwright-assertions in deze case: 6
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
