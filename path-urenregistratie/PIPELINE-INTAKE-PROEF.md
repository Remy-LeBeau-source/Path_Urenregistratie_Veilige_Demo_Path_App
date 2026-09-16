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
- 02:52 · Lokaal groen: `node scripts/run-playwright-e2e.mjs --project=desktop-chromium tests/playwright/pipeline-demo.spec.ts` — 5 van 5 (PIPE-H-001 t/m H-004, PIPE-N-001).
- 03:05 · Herontwerp 2.0.116 binnengehaald op main (conflicten in GIO-WENSEN, de gegenereerde docs en een dubbele definitie in sync-living-docs opgelost). Versie 2.0.117 gezet, poorten groen (version:check, test:design, test:bdd:design, feedcontrole, contrast, node --check), en 23 van 23 groen met notifications erbij.

## #44 — Jira, Confluence en Zephyr Scale 1-op-1 in opmaak (16 sep)

- 02:20 · Ingediend als issue #44, na #43.
- 03:00 · Gebouwd: productbalk die per werkruimte meewisselt, projectzijbalk, Jira-bord met kolommen en kaarten, Confluence-pagina met paginaboom en FO/TO, Zephyr met mappenboom, tegels en sorteerbare tabel. Geen merklogo's.
- 03:00 · Alles bedienbaar gemaakt: zoeken, filteren op type en bron, detailpaneel met doorklik naar Kennisbank of Testbeheer, sorteren op elke kolom, filteren op status, scenario's in één klik uitklappen, deeplinks in de URL en toetsenbordbediening. Bewaakt met **PIPE-H-004** (24 assertions).
- 03:00 · Gevonden en opgelost tijdens het testen: de productbalk liep op een telefoon 64px buiten beeld (454 bij een scherm van 390). Create werd een compacte plusknop, de productnaam verdwijnt en de tabbladenrij schuift. Nu 390 van 390, bewaakt in PIPE-N-001.

## Telefoon en weergave (16 sep, wens van Gio tijdens het meekijken)

- 03:30 · Gio: "ik moet ook lokaal iets kunnen invoeren en maak het menu duidelijk op mijn telefoon". Gemeten op 390px: het invoerveld stond op 1547px onder het bord, het menu was een naamloos rasterknopje.
- 03:35 · Opgelost: menu heet "Menu" en opent met "Nieuwe wens invoeren" boven de drie werkruimtes; op een telefoon staat het invoerformulier boven het bord (978px) en de balkknop springt met de cursor direct in het veld. Gecontroleerd op een echt telefoonprofiel: indienen werkt, kaart komt op "Wacht op VS Code".
- 03:36 · Ook gecontroleerd zonder server, rechtstreeks vanaf schijf (file://): valt netjes terug op voorbeelddata, meldt dat, en invoeren werkt daar ook (5 kaarten wordt 6).
- 03:45 · Weergaveknop toegevoegd (licht / donker / systeem), met **PIPE-H-005**: een eigen keuze wint van de systeeminstelling, de keuze blijft na herladen staan, en "systeem" laat het attribuut weer los. Zes van zes groen op een eigen poort en database, zodat de parallelle verkenning geen last had.

## Afronding: de keten is rond (16 sep, 03:45)

- 03:29 · 2.0.118 staat op TEST. Gecontroleerd vanaf een telefoonprofiel op https://uren-test.pathconsultancy.nl/pilot/path-pipeline.html: status 200, feed geladen (app 2.0.118), bord toont de nieuwste opleveringen (PIPE-H-004, PIPE-H-003, NOT-H-018, MOB-H-024), 390 van 390 breed, weergaveknop aanwezig, negen testcases in Zephyr. Een wens indienen levert het juiste GitHub-issue op (label pipeline-intake) en de kaart komt op "Wacht op VS Code". Geen JS-fouten, geen serverfouten.
- 03:43 · Issues #43 en #44 gesloten met versie, case-ID en de TEST-URL. Daarmee is de keten uit PIPELINE-INTAKE.md één keer volledig doorlopen: wens op de pagina → issue → GIO-WENSEN → feature + spec + steps → impactregressie → LIVING-DOC → versie → CI → TEST → issue dicht.
- Opgemerkt onderweg: de release van 2.0.117 staat op "cancelled" zonder gestarte jobs. Dat is geen fout maar de wachtrij: GitHub houdt hooguit één wachtende run per concurrency-groep, en 2.0.118 kwam ertussen. Alles van 2.0.117 zit in 2.0.118.
- De stap naar productie is onaangeroerd gebleven en blijft een handmatige keuze van Gio.
