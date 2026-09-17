# Pipeline-intake: van wens op TEST tot Living Doc

Gio dient een wens in op de demo-pagina op TEST (`pilot/path-kwaliteitsstraat.html`,
https://uren-test.pathconsultancy.nl/pilot/path-kwaliteitsstraat.html). Die pagina is het loket; de agent in VS Code
(Claude Code of Codex, wie het stokje op `main` heeft) doet het werk. Dit bestand is de afspraak hoe zo'n
wens door de molen gaat, zodat elke agent hem hetzelfde oppakt.

## 1. Intake (de pagina)

Het loket is **Confluence**, niet het Jira-bord: daar hoort de vraag achter de wens thuis. Op het bord staat
alleen een wegwijzer ernaartoe.

- Gio vult het formulier in (Samenvatting, Stakeholder, Type, Gewenste waarde, Acceptatiecriterium, met het
  uitklapbare Gherkin-voorbeeld dat meedenkt) en klikt "Start de flow". **Dat is alles wat hij doet.**
- Opslaan zet de wens in de eigen intakewachtrij: `pilot/path-kwaliteitsstraat-intake.php` schrijft hem weg onder
  `storage.private_root`, dus buiten de webroot. De wens krijgt een `PATH-nnn`-nummer en de status
  `aangenomen`, en staat meteen in "Te doen" met "Wacht op VS Code" — ook voor iemand anders die de pagina
  opent, want de wachtrij staat op de server en niet in de browser.
- Er staat geen sleutel in de pagina en er gaat niets naar GitHub. Het issue maakt de agent zelf aan (stap 2),
  zodat het spoor in GitHub blijft bestaan zonder token op een publieke pagina.
- Grenzen die overeind blijven: hooguit 5 wensen per kwartier per adres, 30 per uur totaal, 50 in de wachtrij
  (oudste valt eraf), 4 kB per verzoek en lengtegrenzen per veld. Het IP-adres wordt **niet** bewaard, alleen
  een korte hash om mee te tellen. De pagina waarschuwt zichtbaar dat er geen namen, adressen of bedragen in
  een wens horen, want de demo-omgeving is open.
- Het endpoint weigert alles zodra de omgeving `production` is, en dat is ook de uitkomst als er geen omgeving
  is ingesteld (PIPE-N-002 bewijst beide kanten). Daar bovenop sluit het productie-archief `pilot/` sowieso uit.

## 2. Oppakken (VS Code)

```
npm run intake                 # de wachtrij op TEST, met per wens wat je nodig hebt
npm run intake -- --lokaal     # dezelfde wachtrij op de lokale server
npm run intake:watch           # blijft kijken en maakt bij een nieuwe wens zelf het issue aan
npm run intake:watch -- --droog --eenmalig   # één ronde, zonder iets aan te maken
```

**De wachter (17 sep).** Tot nu toe gebeurde er na het indienen niets tot iemand
handmatig `npm run intake` draaide — voor de PO voelde dat als "ik heb ingediend
en het blijft stil". `scripts/pipeline-intake-watch.mjs` dicht dat gat: hij kijkt
periodiek in de wachtrij en maakt bij een nieuwe wens meteen het GitHub-issue aan,
zodat het spoor bestaat en het werk zichtbaar klaarstaat. Hij schrijft **bewust
niet** in de repository: geen regel in GIO-WENSEN.md, geen commit, geen push. Dat
blijft werk met een beoordeling erbij — een wachter die ongezien in een repository
schrijft is precies het soort automatisering dat je later niet meer kunt navertellen.

Daarna maak je zelf het issue aan, zodat het spoor in GitHub blijft:

```
gh issue create --label pipeline-intake --title "PATH-nnn <wens>" --body "<stakeholder, waarde, criterium, Gherkin>"
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
5b. **"Nieuw in de app" bijwerken — geldt ook voor main, niet alleen voor de herontwerp-lane.** Besluit Gio
   (16 sep): **elke versie krijgt een regel, zonder uitzondering** — ook een versie die alleen Backoffice,
   de demo-pagina in `pilot/` of de testset raakt en die een medewerker dus niet rechtstreeks ziet. Eerder
   stond hier dat zo'n versie mocht worden overgeslagen; dat is verlaten. Regel bij in `index.html`
   (`#nieuw-in-de-app-lijst`): bovenaan, met versienummer, korte kop, één zin en het commit-tijdstip
   (`<time datetime="YYYY-MM-DDTHH:MM">16 sep · 17:25</time>`). Hooguit twintig regels, de oudste valt eraf.
   Raakt de versie alleen Backoffice of de testset, schrijf de zin dan zo dat hij ook voor een medewerker
   die het scherm niet gebruikt klopt en niets weglekt (geen interne bestandsnamen, geen testjargon) — bijvoorbeeld
   "De tellers boven de openstaande taken bij Backoffice blijven kloppen bij het wisselen van filter" in plaats
   van te verwijzen naar een testcase-ID of een schermnaam die de medewerker niet kent.
   **Een release-notitie mag nooit verraden dat er iets dichtgezet is dat eerder openstond.** Gio wees hier op
   16 sep op, en terecht: medewerkers lezen deze lijst. Mijn regel bij 2.0.124 luidde "Facturatiegegevens
   blijven bij Backoffice — je eigen scherm haalt alleen nog op wat je zelf nodig hebt". Daar staat geen bedrag
   en niet het woord tarief in, dus KLV-H-018 liet hem door, maar een oplettende lezer leidt eruit af dat zijn
   scherm die gegevens eerder wél binnenkreeg. Dat is een aanwijzing die je niet uitdeelt. Herschreven naar
   "Je scherm laadt alleen je eigen gegevens — bij het inloggen haalt de app voortaan alleen op wat je in je
   eigen scherm gebruikt": waar, nuttig, en zonder wijzer naar het gat. Schrijf de notitie dus vanuit wat er nu
   goed gaat, niet vanuit wat er mis was. Het volledige verhaal hoort in GIO-WENSEN.md, de commit en de
   testcase — daar hoort het thuis en daar leest geen medewerker mee.
   Nooit namen, bedragen of woorden als "tarief" of "euro" — **KLV-H-018 keurt dat af**, en dat is precies hoe
   het op 16 sep gevonden werd: de versies 2.0.121 tot en met 2.0.129 stonden er niet in, terwijl de lijst wél
   het versienummer in de voettekst toonde. Gio merkte het zelf op, en scherpte de regel diezelfde dag verder
   aan tot "elke versie, zonder uitzondering" (zie boven).
6. **Versie**: `git fetch`, hoogste nummer op origin/main en origin/herontwerp + 1, `npm run version:set -- 2.0.x`.
7. **Commit + push** naar `main` (stokjesregel), CI afwachten, TEST controleren.
8. **GIO-WENSEN.md** — regel naar "Klaar" met versie en case-ID('s). Daarna `npm run pipeline:data` (de pagina
   op TEST leest dat bestand) en committen. Issue sluiten met een korte samenvatting en de TEST-URL.

## 3. Wat de pagina daarna toont

`scripts/pipeline-demo-data.mjs` bouwt `pilot/path-kwaliteitsstraat-data.json` uit GIO-WENSEN.md, de
feature-bestanden (Gherkin, techniek, assertions) en LIVING-DOC.md. **Sinds 17 sep staat de volledige
projecthistorie in dat bestand** (opdracht Gio: dit is onze eigen administratie, geen etalage met de laatste
tien). Eerder stonden hier caps van 10 "Klaar" en 5 "Open en bezig"; die werden vóór het filteren toegepast,
waardoor de zoekbalk aantoonbaar alleen in de nieuwste tien zocht en oudere opleveringen onvindbaar waren.
De pagina toont nu alles in alle drie de werkruimtes — Jira-bord, Confluence-paginaboom en Testbeheer — en
tekent per keer een deel met een "Toon meer"-knop eronder. Het Gherkin-blok wordt alleen bij de nieuwste 25
opleveringen meegeschreven, zodat het bestand niet groeit voor historie die niemand meer uitklapt. Dat blijft
staan na F5, want het komt uit dit bestand en niet uit de browser. `npm run check` faalt als dat bestand
achterloopt.

**De kaart verschuift mee met de echte stand, niemand sleept hem daarheen.** Een wens staat in "Te doen" zolang
hij alleen in de wachtrij staat; zodra hij in GIO-WENSEN.md onder "Open en bezig" verschijnt komt hij uit de
projectstand en schuift hij naar "In uitvoering"; na oplevering staat hij bij "Opgeleverd". De pagina ruimt de
wachtrijkaart dan op, anders zou dezelfde wens twee kaarten krijgen. Zelf slepen tussen kolommen kan bewust
niet: dan kun je een kaart op "Opgeleverd" zetten die nooit is opgeleverd, en juist dat ondergraaft de demo.

## Grenzen

- Alleen TEST, nooit PROD: `pilot/` is demo-inhoud.
- "Simuleer de flow" op een kaart is een animatie met een dobbelsteen, geen echte testrun; de echte molen is stap 2.
