# Vaste werkwijze voor wijzigingen

Lees vóór product- of testwijzigingen altijd volledig:

1. `WERKWIJZE-PATROON.md`
2. `FUNCTIONEEL-ONTWERP.md`
3. `TECHNISCH-ONTWERP.md`
4. de betrokken feature in `tests/playwright/features/`
5. de bijbehorende Playwright-spec en API/servercode

Volg daarna de wijzigingslus uit `WERKWIJZE-PATROON.md`. Nieuwe productlogica is pas klaar als
code, positieve en negatieve tests, GUI-smoke, living documentation en traceerbaarheid samen zijn
bijgewerkt. Commit en push pas nadat de vereiste lokale controles groen zijn.
