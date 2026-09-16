# Proef van de pipeline-intake: van wens op de pagina tot TEST

Logboek van echte wensen die via de demo-pagina (`pilot/path-pipeline.html`) zijn ingediend en door de
keten uit `PIPELINE-INTAKE.md` zijn gelopen. Elke wens krijgt hier een kop met tijdstippen, zodat Gio kan
zien dat de straat echt loopt en waar het eventueel hapert. De agentdefinitie staat in
`.claude/agents/pipeline-intake.md`.

Legenda per stap: tijdstip · wat · bewijs (commit, run-id, URL).

## #43 — Confluence-tekst in de demo op het Atlassian-lettertype (16 sep)

- 02:18 · Wens ingevuld in het formulier van de pagina (lokaal geserveerd, echte formulierlogica). De pagina zette de kaart op "Wacht op VS Code" en bouwde de issue-URL met label `pipeline-intake`.
- 02:20 · Issue aangemaakt met exact die titel en body: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/issues/43. Tegelijk #44 ingediend (1-op-1 Atlassian-opmaak), op te pakken ná #43.
- 02:21 · GIO-WENSEN.md: regel onder "Open en bezig" (main, bezig). Geen productbesluit nodig: het acceptatiecriterium is meetbaar (letterstapel, 16px, 24px, licht en donker).
- 02:24 · Gebouwd: `pilot/path-pipeline.css` (token `--atlassian-font`, Kennisbank-tekst 16px/24px) en case **PIPE-H-003** in `pipeline-demo.feature` / `pipeline-demo.spec.ts` / steps (meting van berekende stijl in licht en donker, 10 assertions).
- 02:26 · Tegenproef met dezelfde meting: oude CSS → "IBM Plex Sans 15px/25.5px" ROOD (licht en donker), nieuwe CSS → "-apple-system 16px/24px" GROEN (beide). Wachten op "vrij" van herontwerp voor de gerichte Playwright-run (één testrun tegelijk op deze machine).
