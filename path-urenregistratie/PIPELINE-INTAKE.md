# Pipeline-intake: van wens op TEST tot Living Doc

Gio dient een wens in op de demo-pagina op TEST (`pilot/path-pipeline.html`,
https://uren-test.pathconsultancy.nl/pilot/path-pipeline.html). Die pagina is het loket; de agent in VS Code
(Claude Code of Codex, wie het stokje op `main` heeft) doet het werk. Dit bestand is de afspraak hoe zo'n
wens door de molen gaat, zodat elke agent hem hetzelfde oppakt.

## 1. Intake (de pagina)

- "Start de flow" maakt een voorgevuld GitHub-issue met label `pipeline-intake`
  (titel `PATH-nnn <wens>`, body met stakeholder, gewenste waarde, acceptatiecriterium en Gherkin).
  Gio klikt zelf op "Submit new issue" — de pagina bevat geen sleutels.
- Op de pagina staat de wens intussen in "Te doen" met "Wacht op VS Code".

## 2. Oppakken (VS Code)

```
gh issue list --label pipeline-intake --state open
gh issue view <nr>
```

Per issue, in deze volgorde (elk punt is een bestaande afspraak uit de MD's):

1. **GIO-WENSEN.md** — regel toevoegen onder "Open en bezig" (Wie = main, Status = bezig), met het issue-nummer.
2. **Productbesluit nodig?** Dan eerst Gio vragen en vastleggen in **BESLISTABEL.md** (R-nummer).
3. **Bouwen** volgens de werkwijze: feature-bestand (`tests/playwright/features/*.feature`, case-ID's, techniek,
   Given/When/Then), spec met harde assertions, steps-bestand, en het specbestand **aanmelden in de
   `definitions` van `scripts/sync-living-docs.mjs`** (anders faalt `test:design`). Tegenproef: rood op de oude code.
4. **Impactregressie** lokaal: de geraakte specs, `npm run docs:sync`, `npm run test:design`, `npm run test:bdd:design`,
   `node scripts/pipeline-demo-data.mjs --check`. Eén testrun tegelijk op deze machine (zie CODEX_HANDOFF.md).
5. **LIVING-DOC.md** volgt uit `docs:sync`.
5b. **"Nieuw in de app" bijwerken — geldt ook voor main, niet alleen voor de herontwerp-lane.** Merkt een
   medewerker iets van deze versie, dan hoort er een regel bij in `index.html` (`#nieuw-in-de-app-lijst`):
   bovenaan, met versienummer, korte kop, één zin en het commit-tijdstip
   (`<time datetime="YYYY-MM-DDTHH:MM">16 sep · 17:25</time>`). Hooguit twintig regels, de oudste valt eraf.
   Nooit namen, bedragen of woorden als "tarief" of "euro" — **KLV-H-018 keurt dat af**, en dat is precies hoe
   het op 16 sep gevonden werd: de versies 2.0.121 tot en met 2.0.129 stonden er niet in, terwijl de lijst wél
   het versienummer in de voettekst toonde. Gio merkte het zelf op. Niet elke versie hoeft erin: een wijziging
   aan de demo-pagina in `pilot/` of aan de testset ziet een medewerker niet.
6. **Versie**: `git fetch`, hoogste nummer op origin/main en origin/herontwerp + 1, `npm run version:set -- 2.0.x`.
7. **Commit + push** naar `main` (stokjesregel), CI afwachten, TEST controleren.
8. **GIO-WENSEN.md** — regel naar "Klaar" met versie en case-ID('s). Daarna `npm run pipeline:data` (de pagina
   op TEST leest dat bestand) en committen. Issue sluiten met een korte samenvatting en de TEST-URL.

## 3. Wat de pagina daarna toont

`scripts/pipeline-demo-data.mjs` bouwt `pilot/path-pipeline-data.json` uit GIO-WENSEN.md (laatste 10 "Klaar",
laatste 5 "Open en bezig"), de feature-bestanden (Gherkin, techniek, assertions) en LIVING-DOC.md. De pagina
toont daaruit de laatste 5 opleveringen op het bord, de bijbehorende cases in Testbeheer en de laatste 10 in de
Living Doc. `npm run check` faalt als dat bestand achterloopt.

## Grenzen

- Alleen TEST, nooit PROD: `pilot/` is demo-inhoud.
- "Simuleer de flow" op een kaart is een animatie met een dobbelsteen, geen echte testrun; de echte molen is stap 2.
