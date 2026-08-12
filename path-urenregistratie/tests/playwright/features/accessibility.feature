@regressie
@ui
@desktop
@fase:15
Feature: Basistoegankelijkheid en toetsenbordbediening in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/accessibility.spec.ts
  # Navigatiemapping: tests/playwright/steps/accessibility.steps.ts

  @happy
  Scenario: [A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
