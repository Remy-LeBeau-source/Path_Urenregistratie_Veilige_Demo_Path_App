repo: Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App
branch: main
path: path-urenregistratie

## Last sync
date: 2026-09-14T04:00:00Z

### Ronde 14 sep (tweede) — vervangt de zip-ronde van eerder vandaag
Zeven punten in `OPDRACHT.md`. Stand per punt aan de repo-kant:

1. **Lopende maand start open en leeg; een week kan niet ingediend zijn terwijl
   de maand open staat.** Niets te bouwen: dat was een onmogelijke demostand in
   het artefact. De app kent geen weekstatus -- `timesheetStatus` hangt aan het
   maandrecord, dus alle weken van een maand delen die status al.
2. **Elke lege werkdag telt als ontbrekend, ook in de toekomst; een bewuste 0
   telt als ingevuld.** Gebouwd, zie hieronder.
3. **Indienlabel -- gecorrigeerd en goedgekeurd door Gio.** "Nog N dagen" liet het
   werkwoord weg en brak `TS-REV-UI-H-015` ("Hele maand toont altijd Maand
   indienen"); CI viel daardoor op `TS-REV-UI-H-013`. Goedgekeurd en in de
   referentie doorgevoerd: **"Maand indienen · nog 14 dagen"**, gedempt zolang er
   gaten zijn; bij nul gaten alleen "Maand indienen". Bij een correctie "Maand
   opnieuw indienen", want dat onderscheid leggen DASH-N-015/016 en de zakelijke
   E2E-keten vast en de referentie noemt het niet. TS-REV-UI-H-013 is niet
   aangepast.

   **Open, en dit vraagt een keuze van Gio:** de goedkeuring zegt ook "niet
   aanklikbaar zolang er gaten zijn" én "pas geen test aan". Die twee sluiten
   elkaar hier uit. De zakelijke E2E-keten dient in 13 spec-bestanden de
   correctiemaand augustus in via deze knop, en augustus heeft in de demodata
   4,0 uur met 20 lege werkdagen. Op slot zetten laat die hele keten omvallen,
   tenzij die cases eerst de maand vullen -- en dat is een testaanpassing. De knop
   is daarom nog klikbaar (de indienbevestiging blijft de poort) tot Gio kiest:
   (a) klikbaar en gedempt zoals nu, of (b) op slot, en de E2E-cases vullen
   eerst de maand.
4. **GUI Maanden start dichtgeklapt.** Klopt al: het maandverloop in Mijn maanden
   staat standaard dicht.
5. **Kopbalk, paginakop en inhoud gecentreerd op `--pagina` (1060px).** Mijn
   eerdere versie lijnde links uit; nu gecentreerd, met de tokennaam uit de bron,
   op dashboard, Mijn uren en Mijn maanden. De topbalk is van de hele app en blijft
   ongemoeid.
6. **Web app Mijn uren: vijf gelijke weekchips, geen onderbalk, geen vullijn per
   dagrij.** De weekchips zijn gebouwd met de waarden uit de bron (regels 236-240:
   flex 1 1 0, gap 6px, min-height 52px, padding 7px 4px, radius 12px, label
   9.5px/.06em als "W36"), zonder horizontale scroll; het volle "Week 36" staat
   in de aria-label. [SKIN-H-037] meet het op 360px -- op deze strook stond nog
   geen enkele case. De onderbalk en de vullijn per dagrij bestaan in de app niet,
   dus daar valt niets weg te halen.
7. **`OPDRACHT-CLAUDE-CODE.md` en `BRIEF.md` verwijderen.** Gedaan.

### Twee besluiten van Gio die via main binnenkwamen (14 sep)

**Goedkeurkaart, op telefoon.** Goedkeuren bovenaan, mint met donkere tekst;
Correctie vragen eronder met alleen een rand; 10px ertussen; volle breedte;
minimaal 44px. De volgorde zit in de markup en niet alleen in CSS `order`, want
`order` verplaatst het beeld maar niet de tabvolgorde. Op desktop is niets
gevraagd; daar zet `order` het bestaande beeld terug (Bekijken, Correctie vragen,
Goedkeuren, rechts uitgelijnd). Twee keuzes die het besluit niet specificeerde:
Bekijken staat onderaan met dezelfde randstijl als Correctie vragen, anders oogt de
zijweg zwaarder dan de correctie; en in Modern blijft de hoofdknop amber, want
mint afdwingen breekt daar het eigen palet. Open punt voor Gio: op desktop loopt
de tabvolgorde nu van rechts naar links door deze groep. [SKIN-H-035] meet op
360px, in licht én donker, toetst de DOM-volgorde en controleert dat desktop
ongewijzigd is.

**iOS-toetsenbord in dialogen.** Elke dialoog blijft met open toetsenbord
volledig bruikbaar. `dvh` volgt het toetsenbord niet en `100vh` is op mobiel
Safari juist te hoog, dus de dialoog past zich nu aan `window.visualViewport`
aan -- alleen als de browser die kent, zodat oudere browsers hun huidige gedrag
houden. Analyse deels van de main-sessie. [SKIN-H-036] geeft de functie een
zichtbaar deel van 300px en toetst beide kanten.

Bijvangst die bij dat iOS-punt hoort en nog openstaat: iOS Safari zet `:active`
alleen als er een touchstart-luisteraar hangt. De indrukgloed (glanslaag 5) is op
een echte iPhone daardoor waarschijnlijk onzichtbaar.

## Sync history

### Ronde 14 sep — aangeleverd als zip, niet via links
date: 2026-09-14T02:35:00Z

Deze ronde kwam als `App 2026.zip` in plaats van via signed URLs. De zip bevatte
meer dan de vier bestanden, waaronder drie documenten die hier nog niet lagen:
`KLASSIEK-MEDEWERKER.md` (leidend voor de vormgeving), `AGENTS-AANVULLING.md` en
drie extra referentie-HTML's (`medewerker-klassiek.html`,
`medewerker-telefoon.html`, `weekstaat-vergelijking.html`).

Twee bestanden uit de zip zijn op aanwijzing van Gio verwijderd:
`OPDRACHT-CLAUDE-CODE.md` en `BRIEF.md`. Die waren verouderd — de eerste ging
over het Klassiek-artefact en niet over de app, de tweede over de 1919-pilots.
`handoff/OPDRACHT.md` is de enige geldige opdracht.

**Besluit van 14 sep, en het is een terugdraaiing:** elke lege werkdag in de
maand telt als ontbrekend, óók dagen die nog moeten komen. Een eerdere ronde
sloeg toekomstige dagen over; dat is teruggedraaid omdat je de hele maand
indient en niet de dagen tot vandaag. Een dag die bewust op 0,0 is gezet telt
wél als ingevuld.

Daarmee is het openstaande punt uit de vorige ronde beslist: de app hoeft
`isTimesheetWeekComplete` niet aan te passen, want die rekent al precies zo.

### Terugmelding uit de repo (14 sep)

**Het verouderde `OPDRACHT-CLAUDE-CODE.md` beschreef het artefact, niet de app.**
Punt 1 daarvan ("Mijn uren desktop bestaat niet, de zijbalkknoppen zijn dood,
`naarDashboard: () => {}`") is voor deze repo onjuist: `naarDashboard` komt in
`index.html` en `app.js` niet voor, de zijbalkknop is `data-view="timesheet"` met
een volledig `#view-timesheet` erachter, en de 0/8/9-knoppen staan op
`styles.css:887` zonder breedtevoorwaarde en dus ook op desktop. Ook "zeven dagen
op één scherm" past niet: `periodFromKey` slaat het weekend over. Gio heeft dat
bevestigd en het bestand verwijderd.

**Niet gebouwd: de indienknop vergrendelen zolang er gaten zijn.** Het ontwerp
vraagt "Nog N dagen invullen" met een vergrendelde knop. Dat is geen opmaak maar
een workflowpoort: `#submit-timesheet` wordt op 21 plekken in 15 spec-bestanden
aangeklikt, en de bestaande indienbevestiging waarschuwt al over niet volledig
ingevulde weken en laat je bewust doorgaan. Vergrendelen zou dat gedrag
omkeren. Vraagt een besluit.

### Wat er is nagebouwd (14 sep)

- Blok met **concrete ontbrekende werkdagen** bij "Hele maand"
  (`#hours-missing-days`), conform `TS-REV-UI-H-015`: nooit een kaal aantal maar
  de dagen zelf als amberchips die naar hun week springen. Maximaal zes chips,
  daarna "en nog N dagen deze maand". Bij nul gaten wordt hetzelfde blok mint met
  "Geen ontbrekende werkdagen." — zelfde plek, zodat het scherm niet verspringt.
- Alleen zichtbaar in de maandweergave: kijk je naar één week, dan is de
  weekkaart zelf al het overzicht.
- Eén bewuste afwijking van de bron: de chips tonen "Di 15 sep" en niet
  "Di 15-09", omdat ze pal boven een raster staan dat de eerste notatie al
  gebruikt. Twee datumnotaties op één scherm is een eigen fout.
- `[DASH-H-032]` legt het vast, inclusief de terugdraaiing: een toekomstige lege
  werkdag telt mee, een bewust op 0,0 gezette dag niet.

### Ronde 13 sep (nacht) — vastgesteld uit de diff van de exports
date: 2026-09-14T00:30:00Z

GUI: 254 gewijzigde regels, Wild: 10.

**De GUI-weekstaat volgt nu de bestaande app.** Het handoff-document zegt het
expliciet: schakelaar Hele maand / per week, alleen Ma–Vr, datum boven het veld,
0/8/9 klein onder elk veld, weektotaal rechts, vul- en terugzetknoppen die met
de modus meebewegen — "bewust géén nieuw ontwerp, controleer of de bestaande
implementatie al zo werkt en neem alleen de opmaak over".

**De dashboardbreedte is begrensd.** In de bron:
`<div data-kolom="" style="gap:18px;max-width:1060px">`.

**GUI: 0/8/9 één keer in plaats van per dag**, in een balk onderaan die op de
dag met focus werkt. Dat wijkt af van de vastgelegde app-eis "0/8/9 altijd
zichtbaar per dag", die voor de web app blijft gelden. Vraagt bevestiging.

**Wild:** de onderbalk toont nu altijd "Automatisch opgeslagen" met het
weektotaal, in plaats van om te schakelen naar "Maandtotaal" zodra de maand vol
is.

### Terugmelding uit de repo (13 sep, nacht)

**De weekstaat werkt al precies zo. Niets te bouwen.** Nagelopen punt voor
punt:
- Schakelaar Hele maand / per week: `#hours-week-filter` met
  `[data-hours-week-scope]`-knoppen (`index.html:673`, gevuld in `app.js:8993`).
- Alleen Ma–Vr: `periodFromKey` (`app.js:128`) slaat zaterdag en zondag over, en
  `WEEKDAY_SHORT` (`app.js:56`) heeft vijf dagen.
- Datum boven het veld, 0/8/9 eronder: `.hours-day-entry` is een grid met
  `justify-items: center` (`styles.css:853`) en de dagcel zet ze in die volgorde
  neer (`app.js:8965`).
- Weektotaal rechts: de tabel heeft een eigen Totaal-kolom.
- Vul- en terugzetknoppen bewegen mee: `standardHoursButtonLabel()` en
  `standardHoursScopeLabel()` schakelen tussen "maand" en "week".

**De breedtebegrenzing is gebouwd**, zie hieronder.

**0/8/9 in één balk in plaats van per dag: niet gebouwd, en dat is bewust.**
Dit vraagt om bevestiging én het botst met een vastgelegde eis. De web app moet
de snelkeuze per dag houden ("harde eis van de medewerkers", designcontract punt
6), en in deze repo is dat één component: dezelfde `.hours-day-entry` rendert op
telefoon én desktop. Een balk-variant voor breed scherm betekent dus twee
weergaven van hetzelfde veld naast elkaar. Dat is te doen, maar het is een
productbeslissing en geen opmaakwijziging.

### Wat er is nagebouwd (13 sep, nacht)

- `#view-employee-dashboard` krijgt in Klassiek `max-width: 1060px`, exact de
  waarde uit de desktopreferentie. Geen media query nodig: onder die breedte
  doet de regel niets, en op het desktop-testproject (1280px) blijft er na de
  zijbalk en padding 962px over, dus daar verandert niets. Hij bijt pas boven
  ongeveer 1378px vensterbreedte.
- `[SKIN-H-033]` bewaakt dat, met de viewport expliciet op 1800px — geen van de
  vier bestaande projecten komt anders ooit langs die grens. Tegenproef: zonder
  de regel meet hij 1482px.

### Ronde 13 sep (laat) — vastgesteld uit de diff van de exports
date: 2026-09-13T20:34:50Z

Wild: 103 gewijzigde regels, GUI: 134.

**Statusketen van vier naar vijf stappen.** "Uren goedgekeurd" komt er als
eigen stap tussen indienen en de klanturenstaat. De bron (`stapLijst`):
`stap("Uren goedgekeurd", ingediend ? "Bij de Backoffice" : "Volgt na indienen", ingediend ? "nu" : "wacht")`,
en Klanturenstaat en Afgerond staan op `wacht` zolang er niet is ingediend.
Bij Maanden krijgt elke opengeklapte maand zijn eigen vijf stappen; een
afgeronde maand staat vijf keer op groen met "De Backoffice heeft alles
verwerkt".

**Geen stap groen terwijl een eerdere nog open is.** Dat is de regel achter de
`wacht`-standen hierboven.

**Het woord "bedragen" verdwijnt uit medewerkercopy**, ook als "zonder
bedragen" — dat suggereert dat er ergens wél bedragen spelen.

**Alleen dagen tot en met vandaag gelden als ontbrekend.** In de bron:
`const vandaag = new Date(); vandaag.setHours(23,59,59,999); if (d > vandaag) return;`
in de gatenberekening.

**Maandnavigatie besloten: de pijlen blijven.** Het alternatief met één link
"← augustus bekijken" is gebouwd en teruggedraaid.

Verder: demo-startsituatie staat nu standaard op `leeg`, de localStorage-sleutel
is `pathWildStand3`, en schermwissels lopen via één `naar()` die een bewaarde
stand terugzet.

### Terugmelding uit de repo (13 sep, laat)

**"bedragen" — niets te doen.** `index.html` heeft nul treffers. In `app.js`
staat het twee keer, beide aan de beheerderskant: een label bij de
mailroutering over de salarisadministratie (`app.js:12055`) en een comment.
De medewerkerteksten zijn dus al schoon.

**De vijfstappenketen is gebouwd, inclusief de regel.** Zie hieronder bij
"Wat er deze ronde is nagebouwd".

**"Alleen dagen tot en met vandaag" — de app kent deze regel NIET, en dit
vraagt een besluit van Gio voordat ik hem inbouw.** De app rekent niet met
gaten per dag maar met hele weken: `isTimesheetWeekComplete`
(`app.js:5379`) noemt een week volledig zodra elke werkdag uren > 0 heeft óf
bewust is opgeslagen. Toekomst speelt daar geen rol in. Gevolg: op de eerste
van de maand staan alle weken als "niet volledig ingevuld" in de
indienbevestiging, inclusief weken die nog niet geweest zijn.

Waarom ik dit niet zelf doorvoer: de regel raakt `isTimesheetWeekComplete` en
daarmee ook `completedTimesheetWeeks` en `incompleteTimesheetWeekLabels`. Die
drie voeden de voortgangsring, "Volledig ingevuld: X van 5 weken", "Nog
controleren" en nu ook de eerste stap van de keten. Met die regel erin wordt de
lopende maand ineens "compleet" zodra de dagen tot vandaag gevuld zijn — dat
verandert zichtbaar gedrag op elk medewerkerscherm en raakt bestaande cases.
Dat is een productbeslissing, en het handoff-document zet hem zelf onder "vraagt
een besluit van de opdrachtgever".

Twee vragen die bij dat besluit horen: gaat de app mee naar gaten per dag (zoals
de bron), of blijft het per week met alleen de toekomstregel erop? En geldt
"tot en met vandaag" ook voor de voortgangsring, of alleen voor de meldingen?

**Maandkiezer — ongewijzigd antwoord.** De pijlen zitten in
`#global-period-control` in de topbalk en gelden voor de hele app,
beheerschermen incluis; `shiftPeriodKey` (`app.js:161`) stapt vrij door zonder
vergrendeling op de lopende maand. Het besluit "pijlen blijven, terug springt
naar Maanden, vooruit vergrendeld" is dus niet in te bouwen zonder een globale
besturing te veranderen. Het handoff-document zegt zelf: ligt het in de repo
vast, dan heeft de repo voorrang.

### Wat er is nagebouwd (13 sep, laat)

- `#new-bento-steps` gaat van vier naar vijf stappen: Uren ingevuld · Maand
  ingediend · Uren goedgekeurd · Klanturenstaat · Afgerond. De koptekst heet nu
  "Jouw uren in 5 stappen".
- De stapregels zijn niet langer statische uitleg maar live detail, met de
  teksten uit de bron ("Volgt na indienen", "Nog niet aangeleverd",
  "De Backoffice verwerkt de maand", ...). Eén bewuste afwijking: waar de bron
  "N dagen open" zegt staat hier "N weken open", omdat de app met hele weken
  rekent — zie de terugmelding hierboven.
- De regel "geen stap groen terwijl een eerdere nog open is" is afgedwongen via
  één doorloop van de keten in plaats van per stap. Dat was nodig: "Afgerond"
  hing aan de factuurstatus en de klanturenstaat zat niet in de keten, dus een
  maand die nog concept was kon een groene eindstap tonen. `[SKIN-H-031]`
  bewaakt dat, tegenproef gedaan.
- De laatste stap heet "Afgerond" en niet meer "Uren afgerond" met de regel
  "Facturatie kan worden verwerkt" — dat noemde facturatie tegen de medewerker.
- Vier verouderde knoptitels bijgewerkt: "Week terugzetten" beschreef nog het
  oude gedrag ("terug naar je standaardpatroon") terwijl die knop sinds deze
  ontwerpronde op 0,0 zet. Stond in `index.html` twee keer en in `app.js` twee
  keer.

### Ronde 13 sep (avond) — vastgesteld uit de diff van de exports
date: 2026-09-13T19:01:00Z

Deze regel is aan de repo-kant geschreven: de vorige export is bewaard, de
nieuwe ernaast gelegd en het verschil beschreven. Wild: 162 gewijzigde regels,
GUI: 287.

**`medewerker-wild.html` — vormgeving**
- Salie-palet doorgevoerd in licht: `--bg:#dfe9e4`, `--surface:rgba(255,255,255,.66)`,
  `--ink:#16241f`, `--muted:#5c6d66`, `--line:rgba(22,36,31,.09)`, `--line-zacht:rgba(22,36,31,.05)`
- Twee nieuwe tokens: `--kaart-schaduw:0 1px 1px rgba(22,52,42,.03),0 6px 18px rgba(22,52,42,.055)`
  en `--veld:linear-gradient(176deg,#d3e5dd 0%,#e4efea 34%,#f4f9f6 72%,#fbfdfc 100%)`
  (in donker `--veld:none`). De shell krijgt `background-image:var(--veld)`.
- Hero-verloop lichter: `linear-gradient(146deg,#e7f1ec 0%,#dceae5 46%,#c8ded7 100%)`
- Kop herzien: Path-logo per thema, scheidingslijntje van 1px, titel en label op
  één regel; themaknop van 40 naar 36px, radius 12 → 11
- De statuspil boven het maandcijfer is **weg**
- De spreuk staat er nu altijd, in de displayserif (14.5px, cursief); de
  toelichting alleen nog als er echt iets te doen is (`heeftToelichting`)
- Kaartschaduwen lopen via `var(--kaart-schaduw)` in plaats van een eigen
  `0 10px 26px rgba(5,12,20,.14)`

**`medewerker-wild.html` — gedrag**
- **Geen "Week opslaan" meer.** De onderbalk toont tijdens invullen
  "Automatisch opgeslagen" + weektotaal en de knop "Nog N dagen"; zodra de maand
  vol is "Maandtotaal" + "Maand indienen"
- Dagen die buiten de gekozen maand vallen verdwijnen uit de weekrijen
- De maandbevestiging noemt nu ook de dagen die je **bewust** op 0,0 zette
- "Vul de rest"-knop staat op `display:none`
- Klanturenstaat per maand (`staatVoor`, `afgerond`, `oudsteOpen`) in plaats van
  één status voor alles
- Dashboardtitel is "September 2026" in plaats van "Path · september"
- PDF-onderschrift: "je uren per week" (bedragen worden niet meer genoemd)
- De "Wijzigen"-link bij "Afgerond — zelf gemaild" is weg

**`medewerker-gui.html`** — dezelfde `--veld`/`Afgerond`/`Maand indienen`-lijn
doorgetrokken naar de desktopvariant. Niet nagebouwd: de GUI komt per opdracht
in een aparte ronde.

### Terugmelding uit de repo (13 sep, avond)

Het handoff-document vraagt op twee punten om verificatie in de repo. Hier de
uitkomst, met vindplaats, zodat het na te trekken is.

**Punt 0 — "Verifieer of de bestaande autosave dit al dekt." Ja, volledig.**
`#hours-grid` slaat bij elke toetsaanslag op: `assets/app.js:13741` hangt een
`input`-listener op die `updateHoursTotal(true)` aanroept, en die functie
eindigt in `persistState()`. De app heeft er zelfs al een statusregel voor,
`#hours-autosave-status` in `index.html:649`, die standaard "Wijzigingen worden
automatisch opgeslagen" toont en na een wijziging "Automatisch opgeslagen om
HH:MM" (`app.js:9073`). In servermodus wordt dat "Gesynchroniseerd met server om
HH:MM" of "Niet gesynchroniseerd: ..." (`app.js:2665` en `2676`).

Wat "Week opslaan" (`#save-timesheet`) daar bovenop doet is precies niets aan
opslaan: de handler op `app.js:14024` roept `updateHoursTotal(true)` nog een
keer aan en toont een toast. De knop weghalen kost dus geen functionaliteit.
De winst van het ontwerp zit elders: die statusregel staat nu weggestopt in het
blok "Invoerweergave", terwijl het ontwerp hem in de onderbalk zet waar je hem
ziet. Dat is de echte verbetering, niet het autosaven zelf.

**Punt "onzeker" — wat de maandkiezer doet. Dit ligt vast, en breder dan
gedacht.** De pijlen zijn geen dashboardpijlen: ze zitten in
`#global-period-control` in de topbalk (`index.html:229` en `244`) en gelden voor
de hele app. `changePeriod(delta)` (`app.js:14300`) zet de periode via
`shiftPeriodKey` en doet een volledige `renderAll()`, met een toast "Periode
gewijzigd naar ...". Ook beheerschermen hangen eraan — `index.html:874` zegt
letterlijk "De getoonde werkstatussen horen bij <maand>".

Twee gevolgen voor het ontwerpvoorstel:
- "Vorige maand springt naar Maanden met die maand opengeklapt" kan niet zomaar:
  dezelfde knop bedient ook Facturen, Goedkeuringen en Teambeheer. Een
  scherm-wisselend gedrag zou daar onverklaarbaar zijn.
- "Volgende maand vergrendeld op de lopende maand" bestaat nu niet:
  `shiftPeriodKey` (`app.js:161`) stapt vrij door en begrenst alleen het jaartal.

Verder zijn deze twee knoppen vastgelegd door minstens acht testaanroepen in
`dashboard-medewerker.spec.ts` en `business-workflows-e2e.spec.ts`. Het advies
uit het handoff-document ("haal de pijlen bij Mijn uren weg") is daarmee wel
uitvoerbaar, maar het is een wijziging aan een globale besturing en geen
detail van het medewerkerscherm. Dat vraagt een besluit van Gio, niet van mij.

### Ronde 13 sep (namiddag)
- `Medewerker GUI.dc.html`: dashboard-ledger herzien (KPI-tegels, één groene actieknop, "Afgerond"-stap met reden), "vul alle gaten"-knop, gemaild-status ontkoppeld van goedgekeurd-tekst (dashboard + Maanden-pil)
- Naamgeving vastgelegd: New-skin heet voortaan "Modern" i.p.v. "Nieuw", ook in de app zelf
- Werkwijze overdracht vastgelegd: bij elke wijziging aan Wild/GUI volgt automatisch een verse export naar `handoff/`

### Updated in this project
- Medewerker GUI.dc.html: hero-ring vervangen door KPI-rij (voltooid/weken/contracturen), "Verloop van de maand" van inklapbare accordion naar vaste horizontale stappenbalk — desktop-eigen in plaats van telefoonlayout uitgerekt
- `assets/styles-new.css` gelezen: de New-skin landingspagina voor medewerkers is `.new-employee-bento`, met één `:not()`-regel die alle klassieke dashboardinhoud verbergt — vastgelegd in `CLAUDE.md`
- Vier overgebleven blokken en hun `order` beschreven (bento, open-overzicht, correctie, historie-deur)
- Appkeuzes genoteerd die onze artefacten raken: bento altijd donker, themaknop juist verborgen, zijbalk weg, klanturenstaat via `#new-bento-customer`, primaire knop amber
- `Medewerker Wild.dc.html` — volledige functieset in een eigen visuele laag (geen hero-kaart, driftwolken, veegbare weekkaarten)

### Ronde 12 sep
- Maanden doorgeschoven naar september; maandnaam nu overal dynamisch
- "Hele maand"-blok met **concrete ontbrekende werkdagen** overgenomen uit de app (`TS-REV-UI-H-015`, `HANDOFF-CODEX.md`): chips per dag, knop vergrendeld tot alles ingevuld is
- Statuspil per week (open / ingediend / goedgekeurd) in Mijn uren
- Beslissingen bijgewerkt in `CLAUDE.md`

### Eerdere ronde (12 sep)
- `Medewerker Telefoon.dc.html`: mobiel medewerkerscherm (Nu / Mijn uren / Maanden / Berichten)
- Factuurinformatie verwijderd — medewerkers zien alleen goedkeuring en klanturenstaat
- Downloadknop hernoemd naar "Urenoverzicht (PDF)", gelijk aan de jspdf-PDF uit de app (uren, geen bedragen)
- Beslissingen vastgelegd in `CLAUDE.md` voor overdracht aan Claude Code

### Eerdere ronde (12 sep)
- Medewerkerdashboard Klassiek nagebouwd als artifact, licht + donker, responsive tot 360px
- Klassieke tokens en componentstijlen gelezen uit `assets/styles.css` (navy/mint, --kaart, metric-card, status-pill)
- CSS-patch `handoff/styles-new-patch.css` voor de New-skin: stappenlijn, uitklap-kopband, formuliervelden op crème, hero-bladeren

### Eerdere ronde
- Vier medewerker-richtingen ontworpen: 1919 Storyline, Kaarten, Maandstaat en de mix
- Editoriale richting "Urenstaat Editie" op je eigen documentfont (`path-invoice-*.ttf`)
- Echte merkassets overgenomen: `path-logo.png`, `path-logo-wit.png`, 1919-beelden en display-serif
- Kleuren, teksten en layout-spec gelezen uit `design-mockups/1919-medewerkers/CODEX-BRIEF.md`
- Mockups beoordeeld en Pakket B (warm menselijk) nagebouwd als werkend scherm
- Designverfijning 1414/1919-pilots: beide pilotpagina's herzien in `handoff/`

## Screen map
| Screen | Repo files |
| --- | --- |
| Medewerker Dashboard 1919.dc.html | pilot/1919-medewerker.html, design-mockups/1919-medewerkers/CODEX-BRIEF.md, pilot/assets/1919/* |
| Medewerker Dashboard Kaarten.dc.html | pilot/assets/1919/document.jpg, assets/path-logo-wit.png |
| Medewerker Maandstaat.dc.html | pilot/assets/1919/*, assets/path-logo-wit.png |
| Medewerker Mix.dc.html | pilot/1919-medewerker.html, pilot/assets/1919/*, assets/path-logo-wit.png |
| Medewerker Pakket B.dc.html | design-mockups/redesign-packages-2026-09/pakket-B-warm-menselijk/B1-medewerker-dashboard.jpg, assets/path-invoice-*.ttf, assets/path-logo-wit.png, pilot/assets/1919/hero.jpg |
| handoff/pilot/1919-medewerker.html | pilot/1919-medewerker.html, pilot/1919-medewerker-ui.js, design-mockups/1414-path-bento-space/medewerker-dashboard.jpg, pilot/assets/1919/bento-*.png |
| handoff/pilot/1919-beheerder.html | pilot/1919-beheerder.html, design-mockups/1414-path-bento-space/beheerder-maandoverzicht.jpg |
| Medewerker Klassiek.dc.html | index.html (#view-employee-dashboard), assets/styles.css |
| handoff/styles-new-patch.css | assets/styles-new.css, index.html |
| Medewerker Telefoon.dc.html | index.html (#view-employee-dashboard), assets/app.js, assets/jspdf.umd.min.js, COPILOT_HANDOFF.md, HANDOFF-CODEX.md |
| Medewerker Wild.dc.html | index.html (#view-employee-dashboard), assets/styles-new.css, assets/app.js |
| Medewerker Wild Studie.dc.html | eigen ontwerp, geen repo-bron |
| Urenstaat Editie.dc.html | assets/path-invoice-regular.ttf, assets/path-invoice-bold.ttf, assets/path-logo.png, pilot/assets/1919/* |
