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
- 04:05 · Visuele controle op de live TEST-pagina (telefoon licht en donker, desktop donker) leverde twee vondsten op: het derde tabblad viel op 390px buiten beeld, en een kale URL uit GIO-WENSEN kwam ongefilterd in een Confluence-kop terecht. Beide opgelost in 2.0.119 en vastgelegd met assertions in PIPE-N-001 (alle drie de tabbladen binnen beeld) en PIPE-H-001 (geen kale URL in de leesbare projectie). Zes van zes groen.

## Verificatie voor de livegang (16 sep, nacht)

Gio gaat mogelijk live en vroeg om een regressie en een impactregressie op wat main oplevert. Afgestemd met de herontwerp-sessie: zij draaien de volledige suite op hun branch (waar main in is gemerged), main draait de volledige suite in CI, en ik doe hier de impactset en de veiligheidscontroles.

**Wat main oplevert, raakt geen productiecode.** Diff sinds 02be7367 (2.0.116): alles in `pilot/`, de tests en de documentatie. Daarbuiten alleen versienummers in index.html, smoke-test.mjs en auth.spec.ts.

**Aangetoond dat de demo niet op PROD kan komen.** `scripts/deploy-production-transip.sh` bouwt het archief met `git archive ... -- . ':(exclude)pilot'` en breekt daarna af als er toch een pilot-bestand in zit ("Production archive unexpectedly contains TEST-only pilot pages"). De TEST-uitrol doet dat bewust niet, want daar hoort de demo juist wel.

**Lokaal groen op 2.0.119, elk op een eigen poort en database zodat de parallelle suite geen last had:**
- Impactset (pipeline-demo + auth, want de versiewijziging raakt die): 23 van 23.
- Volledige smoke-test: geslaagd, geen uncaught errors.
- Productieveiligheid en beveiliging (production-safety + security): 44 van 44. Daarin onder meer: geen plaintext demo-wachtwoorden in de frontend, demo-migraties standaard uit op productie, productieguards in health.php, install.php en migrate.php, writes zonder CSRF geblokkeerd, en een in localStorage vervalste rol geeft geen beheerscherm.
- Poorten: version:check, test:design, test:bdd:design, contrast en de feedcontrole.

**Let op bij het aanhouden van de releasewachtrij:** pushen terwijl er een release loopt, annuleert de wachtende run en stelt de TEST-uitrol uit. Tijdens deze nacht is daarom bewust gewacht met verder pushen tot de lopende run klaar was.

## Wat er gebeurt als Gio op de productieknop drukt (nagelezen 16 sep, nacht)

Het pad is nog nooit gelopen, dus nagelezen in `scripts/deploy-production-remote.sh` en `server/scripts/normalize-production-golive-baseline.php`:

1. **Eenmalig go-live-pad.** Omdat productie nog op 0.x draait, ziet het script de eerste 1.x-uitrol als nulmeting: eerst een databaseback-up, dan de database naar de afgesproken go-live-baseline (alle medewerkers starten in de go-live-maand, operationele tabellen leeg), dan een strenge read-only controle. Dit is precies de "verse migratie/reset bij de livegang" uit besluit R44.
2. **Die nulmeting weigert bij echte data.** Staat er al operationele data (urenstaten, dagregels) of een onverwacht account, dan stopt hij. Hij vereist bovendien `--confirm=NORMALIZE_PRODUCTION_GOLIVE_BASELINE` en draait alles in één transactie met een controle achteraf; bij twijfel volgt rollback.
3. **Daarna migraties en opnieuw een preflight**, beide fail-closed.
4. **Omschakeling met terugval.** De draaiende versie gaat eerst naar een rollback-map. Faalt daarna de publieke live-controle (index met het juiste versienummer, app.js, styles.css en een gezonde health.php), dan zet het script automatisch de vorige versie terug.
5. **PROD krijgt nooit `pilot/`**: het archief sluit die map uit en de uitrol breekt af als er toch zo'n bestand in zit.

## Loket zonder GitHub-klik (16 sep, avond) — 2.0.132 en 2.0.134

Tijden zijn Nederlandse tijd (CEST).

**18:58 — 2.0.132 (f110c48f), `reminder_log` bij het testherstel.** Aanleiding: CI-run 35118175923 van de herontwerp-lane viel om op `e2eIsolation` met precies één weesrij. `reminder_log` bleek de enige tabel met een verwijzing naar een andere tabel die het baselineherstel niet leegmaakte (migratie 031, nooit aan de lijst toegevoegd). Gemeten met een tijdelijk script: zonder de fix blijft na het herstel 1 weesrij staan, met de fix 0. **Niet bewezen: dat dit de oorzaak van die run was.** De tegenproef discrimineerde niet — dezelfde specs slaagden lokaal met én zonder de fix — en de herontwerp-sessie mat daarna nog 1 op 4 rood mét de fix. Run 35127448517 (2.0.133, met de fix) was groen; dat is één groene run, geen bewijs. Staat zo bij de code en in GIO-WENSEN.

**19:09–19:45 — bouwen en meten.** Gio's wens via de herontwerp-sessie: indienen mag geen klik in GitHub meer kosten. Keuze: eigen wachtrij in `pilot/` (`path-pipeline-intake.php` + `-lib.php`), niet in de app-database, want een tabel is een migratie en die draait ook op productie. Lokaal gemeten:
- POST → 201 met `PATH-200`, GET toont hem zonder `ip_hash`.
- 422 zonder criterium, 400 bij onleesbare invoer, 413 boven 4 kB, 405 bij DELETE met `Allow: GET, POST`.
- Vijf keer achter elkaar 201, de zesde 429 met de kwartiermelding.
- Productieslot: lokale config tijdelijk op `production` gezet → 404 op GET én POST; teruggezet, md5 gelijk (`50d68958…`). Daarna ook via `PATH_APP_ENVIRONMENT=production php pilot/path-pipeline-intake.php` (weigert) tegenover `=test` (levert de wachtrij).
- Ondertussen kwamen Gio's aanscherpingen binnen: loket in Confluence, landing en tabvolgorde Confluence → Jira → Zephyr, formulier vanuit de stakeholderrol, laatste tien overal, Living Doc meteen mee. Alles in dezelfde slag gebouwd.
- Gio's waarschuwing "kijk uit voor gevoelige info": de "Nieuw in de app"-regel bij 2.0.124 herschreven omdat hij verried dat het scherm eerder facturatiegegevens binnenkreeg; regel vastgelegd in PIPELINE-INTAKE.md 5b.
- Gio's besluit: openbaar, nog geen inlog, op voorwaarde dat er geen persoons- of klantgegevens in komen. Die zin staat nu vetgedrukt naast het formulier en wordt door PIPE-H-002 afgedwongen.

**19:48 — 2.0.134 (d3088ece) gepusht.** PIPE-H-002 herschreven (github.com wordt afgebroken en geteld: 0; geen tweede tabblad; schone browser ziet dezelfde wens), PIPE-N-002 nieuw. 8 van 8 groen op desktop-chromium, `npm run check` groen. Vóór de push de herontwerp-sessie tegengehouden die in hetzelfde bestand wilde beginnen; zij wachten nu op deze stand en bouwen daar het slepen binnen "Te doen" en het versienummer in de voettekst bovenop.

**Nog te controleren zodra CI-run 35130507463 op TEST staat:** `GET https://uren-test.pathconsultancy.nl/pilot/path-pipeline-intake.php` moet 200 geven met `"environment":"test"` — dan werkt de wachtrij daar echt, en niet alleen lokaal.
