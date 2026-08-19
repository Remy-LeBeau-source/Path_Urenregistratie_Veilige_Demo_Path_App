@bdd @regressie @auth @fase:15
Feature: Uitvoerbare authenticatie in Path Uren & Facturatie

  @happy
  Scenario: [BDD-AUTH-H-001] login toont veilige test- en productiepresentatie
    # Testtechniek: Toestandsovergang + visuele contractasserties
    # Native pariteitscase: AUTH-H-009
    Given de lokale Path loginpagina beschikbaar is
    Then heet het omgevingsveld Veilige testomgeving
    And heet de lokale titel Welkom bij Path Uren & Facturatie
    When dezelfde login als productiepresentatie wordt getoond
    Then heten omgeving en titel Beveiligde omgeving en Inloggen
