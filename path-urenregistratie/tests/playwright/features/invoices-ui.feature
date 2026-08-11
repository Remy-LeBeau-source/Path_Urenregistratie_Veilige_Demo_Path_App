@regressie
@ui
@desktop
@fase:11
Feature: Factuurweergave in de desktop-UI in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/invoices.spec.ts
  # Navigatiemapping: tests/playwright/steps/invoices-ui.steps.ts

  @happy
  Scenario: [INV-H-001] admin facturen zichtbaar en console errors 0
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-005] employee facturen zichtbaar maar beperkt en console errors 0
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-H-002] periodefilter juli en augustus werkt
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-H-003] server berekent bedrag uit uren en uurtarief voor open facturen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-H-006] admin kan het gekozen maanddetail inklappen en weer uitklappen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [INV-H-007] navigatie onderscheidt medewerkerwachtwerk en factuurmaanden met oranje en groen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [INV-N-007] ongeldige periodefilter geeft nette 400-fout
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
