@regressie
@api
@fase:15
Feature: Notificaties via API in Path Uren & Facturatie

  # Native Playwright-uitvoering: tests/playwright/notifications.spec.ts
  # Navigatiemapping: tests/playwright/steps/notifications.steps.ts

  @happy
  Scenario: [NOT-H-001] ingelogde gebruiker kan notificaties ophalen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [NOT-H-002] mark_all_read werkt zonder fouten
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [NOT-N-003] anonieme gebruiker krijgt 401 op notificaties
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [NOT-N-004] unknown action geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [NOT-H-005] notificatielimiet wordt op minimaal een begrensd
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [NOT-H-006] unread-filter retourneert uitsluitend ongelezen meldingen
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @negative
  Scenario: [NOT-N-007] mark_read zonder notification_id geeft 400
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd

  @happy
  Scenario: [NOT-H-008] mark_read voor onbekende melding wijzigt nul records
    Given de uitvoerbare Playwright-case is voorbereid
    When de beschreven businessflow wordt uitgevoerd
    Then wordt het verwachte resultaat aantoonbaar gevalideerd
