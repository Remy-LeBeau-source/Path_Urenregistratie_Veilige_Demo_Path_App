@regressie
@integration
@ui
@desktop
@fase:16
Feature: Bedrijfsketens van medewerker tot Backoffice

  # Native Playwright-uitvoering: tests/playwright/business-workflows-e2e.spec.ts
  # Navigatiemapping: tests/playwright/steps/end-to-end-workflows.steps.ts

  @happy
  Scenario: [E2E-H-001] herstelbasis houdt globale werkvoorraad stabiel bij maand- en filterwissels
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 11
    Given Backoffice de vaste herstelbasis met twaalf open acties opent
    When Backoffice van augustus naar juli en terug naar augustus wisselt
    Then blijven totaal, eigenaarschap en taakidentiteiten ongewijzigd
    And de eigenaarfilters tonen uitsluitend hun zeven en vijf concrete acties

  @happy
  Scenario: [E2E-H-002] rolwissel werkt zonder F5 en herstel blijft beschikbaar voor iedere rol op LOCAL/TEST
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given de TEST-login met accountkeuzes zichtbaar is
    When Stasjo via de medewerkerskeuze wordt geselecteerd
    Then staan zijn testcredentials direct klaar en blijft Herstel ook voor hem beschikbaar op LOCAL/TEST
    When naar Joyce als beheerder wordt gewisseld zonder pagina-herlaad
    Then wisselen de credentials direct en krijgt Backoffice de herstelbediening

  @happy
  Scenario: [E2E-H-003] herindiening verplaatst dezelfde actie van medewerker naar Backoffice
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de herstelbasis Stasjo een correctieactie en Backoffice zeven acties geeft
    When Stasjo zijn correctie opent en opnieuw indient
    Then krijgt Backoffice direct de vervolgcontrole zonder verlies van het globale totaal

  @happy
  Scenario: [E2E-H-004] goedkeuring vervangt urencontrole door factuurverzending voor hetzelfde dossier
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given Backoffice een ingediende urenstaat uit de vaste herstelbasis opent
    When Backoffice die urenstaat goedkeurt
    Then verdwijnt alleen de urencontrole en verschijnt een factuuractie voor hetzelfde dossier

  @happy
  Scenario: [E2E-H-005] klanturenstaatcontrole wordt een brokeractie zonder taakverlies
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given Backoffice een ontvangen klanturenstaat in de vaste herstelbasis heeft
    When Backoffice het ontvangen klantdocument goedkeurt
    Then staat hetzelfde dossier klaar voor de broker en blijft het globale totaal stabiel

  @happy
  Scenario: [E2E-H-006] eenmalige wachtwoordlink geeft toegang en blokkeert hergebruik
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een actieve medewerker een resetlink aanvraagt
    When de medewerker via de link een sterk nieuw wachtwoord instelt
    Then werkt het nieuwe wachtwoord en is dezelfde link niet opnieuw bruikbaar

  @happy
  Scenario: [E2E-H-007] taakgestuurde goedkeuring blijft na serververversing afgerond
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een servergestuurde urencontrole in de Backoffice-werkvoorraad staat
    When Backoffice via de taakmodal goedkeurt
    Then blijft de controle na volledige server-readback weg en staat de factuurtaak open
