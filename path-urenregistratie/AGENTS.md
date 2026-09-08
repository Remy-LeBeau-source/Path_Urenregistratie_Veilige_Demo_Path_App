# Vaste werkwijze voor wijzigingen

## Vaste branchvolgorde

- `main` is de bron voor functionele wijzigingen, beveiligingsfixes en releases.
- `herontwerp` is de bron voor de New-skin en uitsluitend bijbehorende visuele tests.
- Na iedere nieuwe commit op `main`: neem eerst de actuele `main` op in
  `herontwerp` voordat nieuw design wordt gepusht. Los conflicten op
  `herontwerp` op en draai daar de gerichte controles opnieuw.
- Alleen een `herontwerp`-kop die de actuele `main` bevat én volledig groene CI
  heeft, mag via de merge-queue naar `main` fast-forwarden.
- Werk niet gelijktijdig op beide branches aan hetzelfde bestand. Leg tijdelijk
  eigenaarschap vast in `COPILOT_HANDOFF.md`.
- PROD blijft altijd achter de handmatige reviewerpoort.

De CI-guard controleert technisch dat `herontwerp` de actuele `main` bevat. De
zin "nog niet pushen" in een handoff is alleen een tijdelijke blokkade tijdens
een actieve main-hotfix en vervangt deze permanente volgorde niet.

Lees vóór product- of testwijzigingen altijd volledig:

1. `WERKWIJZE-PATROON.md`
2. `FUNCTIONEEL-ONTWERP.md`
3. `TECHNISCH-ONTWERP.md`
4. de betrokken feature in `tests/playwright/features/`
5. de bijbehorende Playwright-spec en API/servercode

Volg daarna de wijzigingslus uit `WERKWIJZE-PATROON.md`. Nieuwe productlogica is pas klaar als
code, positieve en negatieve tests, GUI-smoke, living documentation en traceerbaarheid samen zijn
bijgewerkt. Commit en push pas nadat de vereiste lokale controles groen zijn.
