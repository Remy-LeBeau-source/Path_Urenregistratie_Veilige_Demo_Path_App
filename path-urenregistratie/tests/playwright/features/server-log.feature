@regressie
@api
@fase:16
Feature: Serverfoutenlog inzien

  # Native Playwright-uitvoering: tests/playwright/server-log.spec.ts
  # Navigatiemapping: tests/playwright/steps/server-log.steps.ts

  @happy
  Scenario: [LOG-H-001] beheerder kan recente serverfouten ophalen, meest recente eerst
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-H-001 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat beheerder kan recente serverfouten ophalen, meest recente eerst

  @happy
  Scenario: [LOG-H-002] bladeren (offset) toont de volgende regels ervoor, zonder duplicaten
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 11
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-H-002 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat bladeren (offset) toont de volgende regels ervoor, zonder duplicaten

  @happy
  Scenario: [LOG-H-003] een leeg of ontbrekend logbestand levert een schone lege staat op
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 5
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-H-003 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een leeg of ontbrekend logbestand levert een schone lege staat op

  @negative
  Scenario: [LOG-N-004] medewerker mag serverfouten niet inzien
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-N-004 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker mag serverfouten niet inzien

  @negative
  Scenario: [LOG-N-005] anonieme gebruiker krijgt 401 op serverfouten
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-N-005 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op serverfouten

  @negative
  Scenario: [LOG-N-006] serverfoutenlog weigert POST
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 1
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-N-006 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat serverfoutenlog weigert POST

  @happy
  Scenario: [LOG-H-007] Instellingen > Systeem toont serverfouten en kan verder terugladen
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een beheerder is beveiligd ingelogd
    When de beheerder Instellingen > Systeem opent
    Then staat de nieuwste regel bovenaan en is Meer laden zichtbaar
    And Meer laden voegt de volgende regels toe zonder de eerdere te verliezen

  @happy
  Scenario: [LOG-H-008] een leeg foutenlog toont de rustige lege staat
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 3
    Given serverfoutenlog inzien is voorbereid
    When de flow voor LOG-H-008 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat een leeg foutenlog toont de rustige lege staat
