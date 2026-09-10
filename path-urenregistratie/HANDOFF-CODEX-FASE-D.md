# HANDOFF — Codex, Fase D vervolg (herontwerp)

## 10 september (ochtend) — overdracht: gebruiker live meegekeken op TEST (mobiel)

De gebruiker testte live mee op TEST (mobiel, Chrome) en gaf vier stuks
directe feedback. Klaar/gefixt (herontwerp, `a438525`/`8169a8d`):

1. **Logo bijna onzichtbaar in donker** — `.mobile-brand-home` heeft
   overal een hardcoded donkere achtergrond (ongeacht licht/donker-
   thema); het "Path"-woordmerk in `assets/path-logo.png` is zelf ook
   donkernavy en versmolt ermee. Lichte chip achter het logobeeld
   toegevoegd (`8169a8d`).
2. **Groene lijn raakte de stap-bolletjes niet** in de admin-storyline
   ("Verhalen per medewerker") — `.new-admin-track-segment` had
   `margin: 0 7px`. Margin weg (`a438525`).
3. **"Voltooid"-label klopte niet met de stap-bolletjes** (Marc de Roon
   toonde "Voltooid" terwijl UREN- en laatste bolletje nog open stonden;
   vergeleken met Shawn-Douglas Nahar, wiens rij wél overal consistent
   groen was). Root cause: het label checkte alleen
   `record.invoiceStatus === "simulated"`, het bolletje (juist) de volle
   `hoursDone && invoiceDone && customerDone`. Label gebruikt nu
   dezelfde bron (`a438525`).

**Nog niet opgepakt, expliciet door de gebruiker gevraagd:**

4. **"Maak elk menu qua design unieker"** — de gebruiker vindt dat de
   New-skin-schermen (Cockpit/Goedkeuringen/Facturen/Instellingen/...)
   nu te veel op elkaar lijken (1-op-1), en wil zowel meer onderlinge
   variatie in New als een duidelijker verschil met Classic. Groot,
   smaakgevoelig ontwerptraject -- niet blind aangepakt zonder
   richting/goedkeuring. Voorstel: per scherm één kenmerkend visueel
   accent (kleur/icoon/heldere kop) bedenken en dat als plan voorleggen
   voor er wordt gebouwd.
5. **PWA/"webapp"-criteria check** (installability) voor zowel Classic
   als New — nog niet gedaan. Concreet: manifest.json (name, short_name,
   icons incl. maskable, start_url, display, theme_color,
   background_color), service worker, apple-touch-icon, viewport-meta
   nalopen tegen de standaardcriteria en gaten dichten in beide skins.
6. **Diepere datadesync onder de "Mailvoorbeeld"-toast**
   ("Deze verzending staat niet meer als beheeractie open" bij een rij
   die zelf status "ready" toont) -- zelfde soort bug als punt 3, maar
   dieper: in `syncInvoiceStatusesFromApi()` (assets/app.js, rond regel
   3508) kan `record.invoiceStatus` naar "simulated" gaan zodra er
   leverbewijs is, onafhankelijk van of `record.timesheetStatus` in
   dezelfde ronde al "approved" volgde -- de knop-render (`item.status`,
   serverbron) en de klik-guard (`info.record`, lokale state) kunnen dan
   uit de pas lopen. NIET aangepast: financiële/facturatielogica, met
   veel bestaande edge-case-commentaar -- eerst dieper begrijpen/testen
   voor een gerichte fix, niet blind patchen.
7. **UI Desktop (159) vs. UI Mobile (24) in Living Docs** -- de
   gebruiker wees op het grote verschil. Root cause: `playwright.config.ts`
   se `mobile-chrome`/`mobile-safari`-projects hebben een testMatch-
   allowlist van maar 3 patronen (mobile-ui/skin/business-workflows-*);
   de overige 8 "UI Desktop"-bestanden draaien nooit op mobiel.
   Feasibility-experiment (ongewijzigd `dashboard.spec.ts` +
   `help-widget.spec.ts` tegen `mobile-chrome`): **41/44 (93%) slaagt al
   zonder aanpassing** -- de overgebleven 3 falen allemaal op hetzelfde
   patroon (een element dat op smalle viewport niet zichtbaar is, bv.
   een instellingen-toggle). Dit is dus grotendeels haalbaar, maar een
   volledige uitrol over alle 8 bestanden (~159 cases × 2 extra browser-
   projects) is een forse CI-tijdimpact en vraagt een besluit van de
   gebruiker: in één keer alles uitrollen, gefaseerd per bestand, of
   hierbij laten. Niet zelf doorgezet zonder die keuze.

## 10 september — volledige schermcontrole en dubbele medewerkerweergave

- Gebruiker heeft main plus alle beheer- en medewerkersschermen toegewezen.
  Schone werkkopie: `tmp/schermherstel`, gebaseerd op remote `37905e8` en daarna
  met main `97f3168` samengevoegd. De oude dirty herontwerpwerkboom is intact.
- Schermaudit van 9 hoofdschermen × 2 skins × 2 breedtes leverde 36 screenshots.
  Echte fout: Nieuw zette `#view-employee-dashboard` onvoorwaardelijk op flex,
  waardoor het hele dashboard ook boven Mijn uren en Mededelingen verscheen.
- `SKIN-H-009` eerst rood bewezen (dashboard verwacht verborgen, was zichtbaar).
  Selector beperkt tot `.is-active`; daarna desktop/Chrome/Safari 3/3 groen.
  `SKIN-H-008/009` eisen nu precies één zichtbare hoofdweergave bij navigatie.
- Main-versiescriptfix is opgenomen. Brede regressie, screenshothercontrole en
  CI/TEST voor de nieuwe kop volgen nog. Geen PROD-promotie uitvoeren.

## (tijdelijk) 10 september — plan voor de komende ~8 uur, zonder de gebruiker

Vastgelegd zodat er een concrete, verifieerbare volgorde is i.p.v. losjes
"iets oppakken" -- wordt hierboven vervangen/verwijderd zodra de nacht om is
en er een echte samenvatting voor komt.

1. ✅ **Screenshot-audit New-skin vs. mockups** (10 september, nacht).
   Wegwerpscript (niet meegecommit) maakte screenshots van Dashboard, Mijn
   uren, Goedkeuringen, Instellingen en Facturen in `skin=new`, met
   `animations: 'disabled'` nodig om de fullPage-screenshots niet te laten
   hangen op een lopende CSS-animatie. Geen concrete visuele fouten
   gevonden -- alle vijf schermen zien er consistent en op stijl uit; de
   "Open detail"-knop op Facturen leidde in dit scenario (alle maanden
   geblokkeerd) niet ergens zichtbaars heen, verder onderzoek daarvan is
   losstaand van deze audit blijven liggen. Kleine losse observatie (niet
   aangeraakt, buiten scope): de vaste "Hulp & contact"-bubble rechtsonder
   overlapt op een lange pagina soms een statuslabel eronder (bv. een rij in
   Verhalen per medewerker) -- normaal gedrag voor een fixed-position widget,
   geen regressie, geen actie ondernomen.
2. ~~Fijnslijpen uit §5~~ — bij het oppakken bleek 3 van de 4 genoemde
   punten al eerder gedaan (`2dea2dd`/`4a015e5`/`1c74c64`, zie §5 hieronder
   voor de geverifieerde details): factuurdetail-modal + PDF-preview,
   Goedkeuringen-lijst, en het klanturenstaat-/veiligheidsregel-deel van
   Instellingen. Alleen "Mijn uren"-layout en de resterende Instellingen-
   tabs (Organisatie/Facturatie/Mailroutes/Teksten/Herinneringen) zijn nog
   niet expliciet tegen de mockups gelegd, en de screenshot-audit liet daar
   niets stuk zien -- dus geen bekende concrete fout om blind te "fixen".
   Geen tijd verspild aan dubbel werk; verder gegaan met de resterende
   punten hieronder.
3. Tussen elke stap: herontwerp/main-divergentie en CI-status checken (§8b:
   nooit wachten op de handmatige PROD-poort, wel op echte rode shards
   reageren).
4. Bij twijfel over een visuele keuze die de gebruiker zelf zou moeten zien:
   niet gokken en niet blokkeren -- kort noteren in dit bestand en
   doorgaan met het volgende punt.

**Vervolg (10 september, later die nacht): de twee resterende punten uit
stap 2 bekeken, geen concrete fout gevonden om te fixen.**

- **Instellingen, resterende tabs.** Het zijn geen losse tabbladen die
  wisselen (`data-scroll-target`-ankers naar secties op één doorlopende
  pagina, geen tab-switch). De Organisatie-sectie (al eerder gescreenshot)
  zag er consistent uit; een tweede poging om de hele pagina te
  screenshotten liep vast op dezelfde bekende lokale hangende-click-flake op
  `#quick-skin-toggle` (§8a-patroon, twee keer geprobeerd inclusief
  zombie-`chrome.exe`'s killen, beide keren dezelfde timeout) -- geen
  productcode aangeraakt op basis van een vermoeden. Er is ook geen
  Instellingen-mockup in `design-mockups/` om tegenaan te leggen (alleen
  `medewerker-dashboard.jpg` en `beheerder-maandoverzicht.jpg` bestaan).
- **"Mijn uren"-layout vs. `medewerker-dashboard.jpg`.** Hero-kaart
  ("Begin met je uren" + pijl) en weekkaart komen overeen. Getoonde dagen
  wijken af van de mockup (Di-Vr i.p.v. Ma-Zo), maar dat is databepaald: de
  eerste week van september 2026 begint midden in de week, en het weekend
  toont sowieso geen werkdagen -- geen layoutfout. Eén echt verschil: de
  mockup toont een **urengauge** ("20 / 160 uur"), de app een
  **wekengauge** ("5 / 5 weken", `isTimesheetWeekComplete`). Dat is geen
  bug maar een eerder bewust genomen productbeslissing waar de hele
  Standaardweek-vullen/voltooiingslogica van vanavond op leunt (zie
  hierboven) -- niet blind "terugzetten" naar de mockup zonder de
  gebruiker, wél hier vastgelegd zodat het een bewuste keuze blijft i.p.v.
  een vergeten afwijking.

Conclusie: geen van beide punten leverde een concrete, verifieerbare fout
op om te fixen. Niet geforceerd iets bedacht om "iets" te doen -- verder
met de standaard CI/divergentie-bewaking.

Buiten scope zonder de gebruiker: mobiele doorloop op een echt toestel (§5
punt 2) en de merge naar `main` (§5 punt 4, beslist de gebruiker).

## 10 september (nacht) — codereview van de avond ervoor: "Standaardweek vullen" deed stiekem niets

Op verzoek ("kijk weer naar de code") een codereviewpas gedaan op de twee
commits van de avond ervoor (`d04de7c` Standaardweek/-maand vullen, `b36f202`
Volgende actie). Twee dingen gevonden en gefixt in `7c54af2`, zie §8a
hieronder voor de aanpak die daarbij is vastgelegd:

1. Cosmetisch: `fillDefaultPatternForWeek` telde het herschrijven van een
   al-0-dag met de patroonwaarde 0 (bv. "vrijdag altijd vrij") mee als
   "gevuld". Nu telt alleen een echte waardewijziging mee.
2. Een echte bug die dat cosmetische verschil blootlegde:
   `applyDayHoursDefaultsToRecord` gebruikte `newEmployeeBentoWeekIndex` (de
   week die de medewerker toevallig bekijkt) i.p.v. `todaysWeekIndexInPeriod`
   (de week van vandaag) als doelweek voor de auto-voorvulling. Omdat
   `recordFor()` deze functie bij elke aanroep opnieuw uitvoert, vulde het
   enkel bekijken van een andere week die week al zelf voor voor iedereen met
   een eigen werkpatroon (dayHours) — de "Standaardweek vullen"-knop had dan
   niets meer te doen, ongeacht welke week. Nu volgt de auto-voorvulling
   altijd de echte week van vandaag, net als de "spring naar vandaag"-pijl.

Ook de drie aanroepplekken van "Standaardweek/-maand vullen" samengevoegd tot
één `applyFillDefaultPattern(weekIndex, rerender)`. SKIN-H-023 kreeg dezelfde
race als de bug zelf (achtergrond-sync kon de teststartwaarden alvast
voorvullen); de teststap zet de startwaarden nu opnieuw vlak vóór de klik, in
dezelfde `page.evaluate` als de klik zelf.

CI-run [34419044888](https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/34419044888)
op `7c54af2` volledig groen (8/8).

## 9 september — merge-wachtrij blokkeerde op handmatige PROD-poort

Na overname vanaf de avondhandoff is een schone worktree op de actuele
`origin/herontwerp` (`89190ea`) gemaakt, omdat de oude lokale worktree nog een
stale diff en `node_modules`-ruis had. `SKIN-H-008` is op de actuele kop 12 keer
gericht herhaald op desktop Chromium en bleef 12/12 groen; zonder faalbeeld is
geen productfix gedaan.

De CI-monitoring vond wel een echte wachtrijbug: de nieuwste main Release
Pipeline (`34392011626`) had Validate 8/8, Promote Test 8/8, Publish Live Docs
en Deploy Test to TransIP groen, maar stond daarna bewust te wachten op de
handmatige `Promote Prod`-environmentpoort. `pilot-merge-queue.yml` keek alleen
naar `r.status !== 'completed'` en bleef daardoor nieuwe groene
`herontwerp`-promoties blokkeren tot maximaal drie uur, ook al was TEST al
afgerond en PROD juist bedoeld handmatig.

De wachtrij inspecteert nu de jobs van actieve Release Pipeline-runs. Een run
blokkeert niet meer wanneer `Deploy Test to TransIP` succesvol is en alle nog
open jobs `Promote Prod*` zijn. Actieve Validate/TEST/Live Docs/deploy-stappen
blijven wel blokkeren. `deployment-contract-check.mjs` bewaakt dit patroon.

## 9 september (avond) — beheer-New-skin, Storyline-voetstrip, een echte databug, en drie UX-fixes op de medewerker-bento

Gepusht naar `herontwerp` en CI-groen (8/8), commits `73104c9..97bd3b1`:

1. **Klanturenstaat klapt inline open op het Dashboard** (`73104c9`) — het
   bestaande paneel van Mijn uren verhuist (echte DOM-node, niet gedupliceerd)
   naar het Klanturenstaat-blokje en weer terug, i.p.v. wegnavigeren.
2. **Pijl "uren invullen" sprong altijd naar vandaag** (`69e39b3`).
3. **Beheer (fase 1)**: alle 6 beheerschermen (Cockpit/Goedkeuringen/
   Facturen/Mededelingen/Medewerkers/Instellingen) consequent in Nieuw —
   bleek grotendeels een kwestie van de bestaande `:has(#view-dashboard...)`-
   selectors uit te breiden naar de andere 5 views, plus een
   `.topbar`/`.topbar-actions`-wrap-fix voor de overflow die daardoor ontstond
   (geen sidebar meer die ruimte reserveerde). Nieuwe test `SKIN-H-019`.
4. **Storyline-voetstrip** (`a24b2ca`) onder "Verhalen per medewerker":
   periode, "laatst vernieuwd", een legenda die dezelfde kleuren hergebruikt
   als de statusbolletjes ernaast, en een echte csv-export van de zichtbare
   wachtrij. Bewust géén verzonnen "synchronisatie actief"-status uit de
   1919-beheerderpilot overgenomen — deze app pollt niet. `SKIN-H-020`.
5. **Echte databug gevonden en gefixt** (`b953b5c`, belangrijkste van de
   sessie): `server/api/timesheets.php::timesheet_write_entries()` deed bij
   élke opslag een blinde "verwijder alle uren van de hele maand, zet dan
   alleen terug wat in déze opslag zit". Onschadelijk zolang Klassiek altijd
   de hele maand ineens opsloeg, maar de nieuwe bento slaat per week op en
   stuurt van niet-actieve weken alleen dagen met uren > 0 mee — een bewust
   opgeslagen 0-uur-dag in een andere week werd zo bij de eerstvolgende
   opslag stilletjes gewist. Zichtbaar als een flikkerende "weken
   ingevuld"-teller; gemeld door Gio tijdens handmatig testen op
   `localhost:8000`. Fix: upsert per dag i.p.v. delete-then-insert.
   Regressietest `TS-API-H-017` bewijst het met een echte tweede-opslag.

Daarna nog **drie bevindingen uit dezelfde handmatige testronde, lokaal
geverifieerd maar op moment van schrijven nog niet gecommit/gepusht** (zit in
de werkboom, zie `git status` voordat je verdergaat):

6. **Skin wisselen terwijl Mijn uren open staat, liet de bento-kaartjes
   ongestyled staan tot een F5.** Oorzaak: `applySkin()` zette alleen het
   `data-skin`-attribuut en hertekende niets; Mijn uren bouwt bij één week
   ofwel bento-kaartjes ofwel de klassieke tabel in dezelfde container, dus
   zonder hertekening bleef de oude markup staan zonder dat een van beide
   stylesheets er nog regels voor had. `SKIN-H-017`'s laatste stap verhulde
   dit toevallig door na de wissel nog een weekscope-klik te doen. Fix:
   `applySkin()` roept nu `renderHoursGrid()` als Mijn uren actief is.
7. **De pijl-knop in de bento navigeerde weg naar de losse Mijn uren-pagina**
   — Gio wil zoveel mogelijk in 1 menu blijven, en het weekkaartje toont de
   week al inline. De pijl blijft nu op het Dashboard, springt naar de week
   van vandaag en zet de cursor in de dag van vandaag.
8. **"Stel je hebt 2 maanden open, waar staat het dan?"** — het bestaande
   "Open acties per maand"-overzicht (`#employee-open-overview`,
   `employeeOpenMonthSummaries` in app.js) stond er al helemaal, maar viel in
   Nieuw onbedoeld onder de blanket-regel die de rest van het klassieke
   Dashboard verbergt. Nu expliciet uitgezonderd en zichtbaar; leunt al op
   `--vlak`/`--line`/`--navy-tekst` die het donkere thema (standaard in
   Nieuw) al passend herdefinieert, dus geen aparte Nieuw-CSS nodig. Een
   actie erin blijft nu ook op het Dashboard i.p.v. wegnavigeren (skin-aware:
   Klassiek navigeert nog gewoon zoals voorheen). Nieuwe test `SKIN-H-021`
   dekt alle drie punten 6–8 in één scenario.

Kleine bijkomstige styling-fixes uit dezelfde ronde: de knopkleuren in het
inline-geopende Klanturenstaat-blok leunden op donkere-thema-tokens die op
het crème kaartje raar oogden (nu expliciet lichte kleuren), en de
"Goedenavond, Stasjo / SEPTEMBER 2026"-tekst bovenin de hero was te klein.

**Volgende stap voor wie dit oppakt**: commit + push punt 6–8 als
`npm run check` en de skin-suite lokaal groen zijn (was aan het draaien op
het moment van schrijven), dan CI bevestigen. Peer-sessie
(`path-urenregistratie-veilige-demo-path-a-40`, werkt parallel op `main`/
klassiek) is op de hoogte van punt 5 en trekt 'm zelf binnen op main.

## 8 september — New-medewerkerroute lokaal hersteld en driebrowserdekking

De ontbrekende lokale runtime is hersteld met de bestaande, genegeerde
`config.local.php` en `.env.local` uit de main-werkboom; de geïsoleerde database
`path_urenregistratie_test` is opnieuw opgebouwd. De eerste echte run vond dat
de nieuwe `#view-dashboard`-flexregel ook gold wanneer het dashboard niet actief
was. Daardoor stond onder `Mijn uren` de volledige beheerder-storyline zichtbaar
voor een medewerker. De selector geldt nu uitsluitend voor
`#view-dashboard.is-active`. Omdat de New-route de klassieke sidebar verbergt,
toont `Mijn uren` daarnaast de bestaande homeknop als zichtbare terugweg.

`SKIN-H-009` bewaakt nu beide punten en navigeert via die zichtbare knop. De
skin-suite is aan de twee mobiele Playwright-projecten toegevoegd. `SKIN-H-006`
onderdrukt het onafhankelijke PWA-installatieaanbod tijdens zijn urenflow, zodat
die case alleen de bento en indienbevestiging meet. Gericht bewijs:
`SKIN-H-006` en `SKIN-H-009` zijn 6/6 groen op desktop Chromium, mobiel Chrome
en mobiel Safari.

De eerste volledige driebrowserrun vond daarnaast dat de lokale mailstatusbadge
op telefoon over de New-hoofdnavigatie lag. De navigatie heeft nu een eigen
volledige gridrij met horizontale bediening. `SKIN-H-008` is daarna 2/2 groen
op mobiel Chrome en mobiel Safari. De volledige 30-uitvoeringenmatrix is na de
reparatie met de CI-achtige projectrunner herhaald: **27 groen, 3 bewust
datagedreven skips en 0 fouten** op desktop Chromium, mobiel Chrome en mobiel
Safari. `docs:sync`, JavaScript-syntax, taalcontrole, licht/donker-contrast,
`test:design` (447/447), `test:bdd:design`, DB-configprecedence en
`git diff --check` zijn groen. `npm run check` komt niet voorbij de bestaande
`smoke-test.mjs`: die blijft lokaal zonder uitvoer lopen en is na een begrensde
poging gestopt; de losse vervolggates zijn wel groen. Niets is gecommit, gepusht
of gedeployed; PROD is ongemoeid.

## 8 september — expliciete app-readiness voor Mobile Safari

CI-run `34246396130` bewees dat de eerdere deactivatiefout opgelost was, maar
shard 4 vond een tweede race: zichtbare statische login/resetknoppen konden op
een trage WebKit-run al worden aangeklikt voordat `app.js` de handlers had
gekoppeld. `E2E-H-024` faalde definitief en drie andere loginchecks slaagden
pas bij retry. De app publiceert nu na het registreren van de handlers
`data-app-interactive=true`; de LoginPage en de GUI-resetflow wachten daarop.
Dit verandert geen bedrijfslogica en voorkomt klikken in de korte laadkloof.

## 8 september — Mobile Safari-flake bij medewerker deactiveren

Release-run `34241982684` faalde uitsluitend op `E2E-N-021` in de
Mobile-Safari-shard: de test las kort het standaardlabel `Bevestigen` voordat
het bevestigingsvenster als deactiveringsdialoog was geconfigureerd. Dezelfde
case was lokaal op alle drie browserprojecten 3/3 groen. De page object wacht
nu eerst expliciet op een verborgen beginsituatie, daarna op een zichtbaar
venster en pas dan op het label `Deactiveren`. Dit wijzigt geen productgedrag.
Een gerichte run vanuit het actieve herontwerp-worktree werd lokaal geblokkeerd
doordat dat worktree geen eigen `server/config.local.php` en opgebouwde
testdatabase heeft; CI is daarom de beslissende verificatie. PROD blijft
onaangeraakt.

## 8 september — versienummer zichtbaar in New-footer

Het versienummer stond al in de gezamenlijke footer, maar werd in de nieuwe
desktopweergave door `margin-left:auto` naar de uiterste rechterrand geduwd,
waar de zwevende hulpknop het aan het zicht kon onttrekken. De New-skin zet de
versiebadge nu direct naast copyright en beheercredit. De skintest vereist
voortaan dat de badge zichtbaar is, een semantisch versienummer toont en niet
meer automatisch naar rechts wordt geduwd.

## 8 september — Living Docs-hang begrensd

Release-run `34228064646`, job `102083259574`, bleef meer dan twee uur hangen
in `Run E2E tests for docs`. De laatste PHP-regels waren succesvolle requests
en dus geen foutdiagnose; het browserproces gaf alleen geen einde terug. De
oude run is geannuleerd om de releaseconcurrency vrij te maken. Zowel de
ingebouwde `Publish Live Docs`-releasejob als de los handmatig startbare Living
Docs-workflow hebben nu een harde jobgrens van 35 minuten. Daardoor kan een
browserhang de wachtrij niet opnieuw uren blokkeren. De vier gesharde TEST-
validaties blijven de functionele releasepoort; PROD blijft handmatig.

## 8 september — TEST-login beheer handmatig, medewerker ongewijzigd

Alleen het beheeraccount op TEST gebruikt voortaan het door de gebruiker
gekozen TEST-environment-wachtwoord. De beheer-login kiest nog wel het
e-mailadres, maar toont en vult geen beheerwachtwoord meer automatisch in.
De medewerker houdt het bestaande repository-secret én de bestaande
automatische invulling ongewijzigd. De publieke smoke logt beide rollen echt
in, maar vereist expliciet dat de beheerhint leeg blijft. PROD is niet
gewijzigd.

## 15:25 8 september — stand van zaken: pijplijn werkt, visueel bevestigd op TEST

**De volledige keten is nu aantoonbaar rond, van commit tot echte TEST-deploy:**
groene `herontwerp`-CI → automatische fast-forward naar `main` → Promote Test
(4/4) → Deploy Test to TransIP (incl. retry op transiënte netwerkuitval) →
live. Geverifieerd op jobniveau (niet alleen de algehele run-conclusie, zie de
les hieronder), en **visueel bevestigd door de gebruiker** met een incognito-
screenshot van `uren-test.pathconsultancy.nl` in `skin=new`: de admin-
verhaallijn ("Verhalen per medewerker") rendert volledig zoals bedoeld —
donkere Storyline-look, medewerkerrijen met avatars en statustracks,
verhaalkaarten per geselecteerde medewerker. Twee eerdere screenshots van de
gebruiker die er kapot/ongestileerd uitzagen (losse pilot-topnav-knoppen,
kale stappenlijst zonder medewerkerdata) bleken een **verouderde PWA-cache**
in de gewone browser te zijn, geen echte bug — in incognito (dus zonder
cache) was alles meteen correct. Les: bij een "ziet er kapot uit"-melding op
TEST eerst een incognito-/hard-refresh-check laten doen voor je in code gaat
zoeken.

**Laatste kleine commit:** `98f2846` — de +/-knoppen en de 8/9-snelkeuze in de
mobiele Mijn-uren-bento iets compacter gemaakt op verzoek van de gebruiker
(puur maatvoering binnen de bestaande `@media (max-width: 720px)`-regels;
de layout zelf — min/plus naast het veld, snelkeuze eronder — stond al
goed). Mobiele skin-suite 47/47 groen.

**Openstaand:** zie de secties hieronder voor de nog niet afgeronde/optionele
punten (handmatige mobiele doorloop op een echt toestel, verdere
portal-restyling van de overige hoofdschermen). Niets daarvan blokkeert op
dit moment iets.

## 8 september — TEST-deploysmoke bestand tegen korte netwerkuitval

Release-run `34222747174` heeft TEST zelf succesvol gedeployed, inclusief
migraties, baselineherstel, preflight, cutover en healthcheck. Alleen de
publieke login-smoke erna faalde doordat de GitHub-runner tweemaal een
`ETIMEDOUT` naar `uren-test.pathconsultancy.nl:443` kreeg. De smoke gebruikt
nu maximaal vier begrensde verbindingspogingen met oplopende wachttijden van
10, 20 en 30 seconden. Functionele HTTP-fouten worden niet verborgen. PROD is
niet aangeraakt en blijft achter de handmatige reviewerpoort.

## Geleerde les (voor Claude én Codex): nooit "gelukt" melden zonder jobstatus te checken

Vannacht is twee keer ten onrechte gemeld dat een automatische merge "TEST
heeft bijgewerkt", puur op basis van de algehele run-conclusie ("Success") van
een `workflow_dispatch`-run. Die conclusie zegt alleen iets over de jobs die
wél draaiden (hier: `Validate`) — een job die stil `skipped` wordt telt niet
mee in dat oordeel en verandert niets aan de algehele "Success"-status. Pas
een screenshot van de gebruiker maakte zichtbaar dat `Promote Test`/
`Deploy Test to TransIP` steeds waren overgeslagen.

**Regel vanaf nu, voor iedere melding over een deploy/release-uitkomst:**
controleer altijd de status van de **individuele jobs** die er echt toe doen
(`gh run view <id> --json jobs --jq '.jobs[] | {name, conclusion}'`), niet
alleen de algehele run-conclusie. Meld een deploy pas als "gelukt" als de
concrete job (bv. `Deploy Test to TransIP`) zelf `success` toont — nooit op
basis van "de run was groen".

## 8 september — herstel automatische releasehandoff naar TEST

Run `34217114031` valideerde vier shards groen, maar sloeg TEST en PROD over.
De queue gaf `inputs.ref=main` correct mee; de oorzaak was GitHub Actions'
skip-doorgifte vanaf de bij `workflow_dispatch` bewust overgeslagen pushmelding.
De releaseworkflow gebruikt daarom vanaf deze fix expliciet `always()` plus
groene `needs.*.result`-voorwaarden voor TEST, TEST-deploy, Living Docs en de
handmatige PROD-poort. Gewenste keten blijft: automatische uitrol tot TEST;
alleen de gebruiker keurt daarna PROD goed.

De onderstaande notitie werd gelijktijdig geschreven. De daarin genoemde
PAT-route is niet nodig zolang de expliciete `always()`-voorwaarden de echte
run bevestigen; de hierboven beschreven contractfix is de primaire oplossing.

## 13:00 8 september — wachtrij bereikte TEST niet echt (Codex lost dit al op)

**Ontdekt via een screenshot van de gebruiker van GitHub Actions-run #413**
(`https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/34217114031`).
Claude had dit vannacht **verkeerd gerapporteerd als geslaagde TEST-deploys** —
dat klopt niet, zie hieronder. **Codex is dit al aan het oplossen** (bevestigd
door de gebruiker, live gezien in de Codex-sessie) met een preciezere diagnose
dan Claude's eerste hypothese: de skip ontstaat via GitHub Actions'
"skipped dependency"-doorgifte in de dependency-graph — `Notify team on
commit push` wordt bij een `workflow_dispatch`-run bewust overgeslagen,
`pilot-awareness` en `Validate` vangen dat al expliciet op met `always()`,
maar `Promote Test` (en alles erna) nog niet. Codex voegt daar dezelfde
expliciete "groene voorganger"-voorwaarde aan toe en dekt dit in een
workflow-contracttest. **Volg die aanpak; onderstaande PAT-route is alleen
een terugvaloptie als Codex' fix het probleem niet volledig oplost.**

Claude's oorspronkelijke (bredere) hypothese, voor de volledigheid:

**Het probleem, exact:** `pilot-merge-queue.yml` start de Release Pipeline na
de fast-forward met `actions.createWorkflowDispatch` (`workflow_dispatch`),
omdat een push met het standaard `GITHUB_TOKEN` geen nieuwe workflow-run
triggert (bekende, bewuste GitHub-anti-loopbescherming). Maar
`workflow_dispatch`-runs slaan de jobs die een GitHub Environment met
deployment-branch-policy gebruiken (`environment: test`, `environment: prod`
in `release-pipeline.yml`) stil **over** — geen foutmelding, gewoon
`conclusion: "skipped"`, terwijl de totale run toch "Success" toont omdat
`validate` wel slaagt. Geverifieerd met `gh run view <id> --json jobs` op
**alle vier** de wachtrij-runs van vannacht (`40ad8b1`, `6b859d6`, `87c5e86`,
`cae3a42`): overal identiek — `Promote Test`, `Deploy Test to TransIP`,
`Promote Prod`, `Deploy Prod to TransIP` allemaal `skipped`. **Er is dus
vannacht geen enkele keer echt naar TEST gedeployed via de wachtrij**, ondanks
dat Claude dat meermaals ten onrechte meldde als gelukt.

Dit gedrag stond overigens al in een oudere handoff-notitie (28 augustus,
Claude Code): *"Pipeline-trigger: alleen een push naar main draait de
deploy-jobs. `gh workflow run` (workflow_dispatch) laat Promote Test / Deploy
Test skippen."* — een bekend, bestaand GitHub-gedrag; de wachtrij-workflow
van vannacht liep er gewoon opnieuw tegenaan omdat hij noodgedwongen
`workflow_dispatch` gebruikt voor de trigger.

**Gevraagde oplossing (expliciet zo besloten door de gebruiker):** laat de
fast-forward-push gebeuren met een **Personal Access Token (PAT)** in plaats
van het standaard `GITHUB_TOKEN`. Een push die geauthenticeerd is met een PAT
(geen Actions-intern token) triggert wél gewoon de normale `push`-workflow-run
op `main` — dan is de `workflow_dispatch`-omweg in `pilot-merge-queue.yml`
niet meer nodig en verdwijnt het skip-probleem vanzelf, want dan draait
`release-pipeline.yml` weer via zijn eigen `on: push: branches: [main]`-pad
zoals vroeger.

**Concreet voor Codex:**
1. Een PAT kan alleen de gebruiker zelf aanmaken (GitHub staat dat niet via
   API toe) — Claude heeft de gebruiker hierover al twee opties voorgelegd
   (nieuwe smal-geschoolde fine-grained PAT met alleen "Contents: Read and
   write" op deze ene repo, of het bestaande `gh`-CLI-sessietoken hergebruiken).
   De gebruiker koos ervoor dit door **Codex** te laten inregelen — stem dus
   zelf met de gebruiker af welke PAT-variant en vraag 'm aan te maken.
2. Zet de PAT als repository-secret (bv. `PILOT_MERGE_PUSH_TOKEN`).
3. In `.github/workflows/pilot-merge-queue.yml`: de fast-forward-pushstap
   (`git push origin "<sha>:refs/heads/main"`) moet die PAT gebruiken i.p.v.
   het standaard checkout-token — bv. via een tweede remote-URL met de PAT
   erin (`https://x-access-token:${PAT}@github.com/...`) of
   `actions/checkout` met `token: ${{ secrets.PILOT_MERGE_PUSH_TOKEN }}` bij
   de checkout-stap zodat de latere `git push` die credentials hergebruikt.
4. De losse `createWorkflowDispatch`-stap voor `release-pipeline.yml` kan dan
   weg — een PAT-geauthenticeerde push triggert de bestaande
   `on: push: branches: [main]` vanzelf.
5. Test dit expliciet: push via de wachtrij en controleer met
   `gh run view <id> --json jobs -q '.jobs[] | {name, conclusion}'` dat
   `Promote Test` en `Deploy Test to TransIP` nu écht `success` tonen, niet
   `skipped`. Herhaal dat op minstens één echte wachtrij-run voor je dit als
   opgelost meldt.
6. PROD blijft ongewijzigd: die gate hoort een aparte, bewuste handeling van
   de gebruiker te blijven (reviewer-approval op de `prod`-environment). Deze
   fix mag dat niet raken of omzeilen.

## 12:15 8 september — Backoffice-bevestiging klanturenstaat afgerond

De taak uit de sectie hieronder is uitgevoerd. `mark_skipped` door de
medewerker blijft oranje en blokkeert factuurafronding en mailqueue. Alleen een
goedgekeurd document, of `confirm_external` door Backoffice met reden, maakt de
klanturenstaat gereed. Browser, invoice-API en mailqueue hanteren hetzelfde
contract. Bewijs: `invoice-lock.spec.ts` 10/10 groen; zes geraakte
business-workflows 27/27 groen op desktop, mobile-chrome en mobile-safari;
living docs 446 unieke cases; design-, BDD-, DB-config- en operationele gates
groen. Nieuwe regressiecase: `INV-N-026`.

Volgende stap: CI op `herontwerp`; bij groen verzorgt de merge-queue de
fast-forward naar `main` en de release-handoff naar TEST. PROD blijft handmatig.

**Voor Codex. Geschreven door Claude, 2026-09-07, vanuit `C:\Path-herontwerp`.**
Evergreen doc zoals `HANDOFF-PILOT-DESIGN.md` — bijwerken per increment.

## 06:20 8 september — nieuwe taak voor Codex: Backoffice-bevestiging klanturenstaat (opdracht van de gebruiker)

`herontwerp`-CI is inmiddels groen (commit `36c8e53`, zie sectie hieronder) en
automatisch naar `main` doorgestroomd. Dit is een **aparte, nog openstaande
taak**, expliciet aan Codex toegewezen door de gebruiker.

**Wat er ontbreekt:** `path-urenregistratie/HANDOFF-CODEX.md` (door Copilot
geschreven, ondanks de bestandsnaam getiteld "Overdracht aan Claude") legt in
§2.1 de bedoelde regel vast: de medewerker die "Al rechtstreeks gemaild"
registreert (`mark_skipped`) blijft **oranje** en blokkeert afronding — alleen
een aparte Backoffice-actie ("Extern bevestigd", `confirm_external`) mag
groen maken. Zie ook de beslissingstabel in §3 van dat document.

**Waarom dat nu niet klopt, exact:** gecontroleerd in `server/api/
customer-timesheets.php` op zowel `main` als `herontwerp` — de acties
`mark_skipped` (medewerker) én `confirm_external` (Backoffice) schrijven
**dezelfde** `customer_timesheets.status = 'skipped'` weg. Het enige verschil
zit in het `review_note`-tekstprefix ("Extern bevestigd: ...") en wie de rij
zette (`reviewed_by`). De guard die vannacht in `6e2543d` is toegevoegd
(`server/api/invoices.php` + `server/mail/queue.php`,
`customerTimesheetReady`) checkt alleen of de status in
`['received','approved','sent','sent_to_broker','skipped']` staat — hij kan
dus niet onderscheiden of het de medewerker was of Backoffice. Op `main`
bestaat deze guard trouwens helemaal nog niet (nul regels, gecontroleerd);
die staat alleen op `herontwerp`.

**Voor Codex, concreet:**
1. Een manier om medewerker-skip en Backoffice-bevestigd te onderscheiden op
   database-niveau (bv. een eigen status-waarde `skipped_pending_confirmation`
   vs. `skipped_confirmed`, of een boolean/kolom naast `reviewed_by IS NOT
   NULL` die de guard expliciet checkt — `reviewed_by` bestaat al en wordt al
   gezet door `confirm_external`, dus dat is vermoedelijk de kleinste wijziging).
2. `customerTimesheetReady` in `invoices.php` én `queue.php` aanscherpen zodat
   kale `skipped` (medewerker, geen `reviewed_by`) **niet** meer voldoet.
3. De 9 testfixtures die ik vannacht repareerde (zie sectie "test: registreer
   klanturenstaat..." hieronder) moeten dan een stap erbij: na `mark_skipped`
   als medewerker, ook `confirm_external` als Backoffice vóór het factureren.
   Dat is dezelfde volgorde als `HANDOFF-CODEX.md` §2.1 beschrijft.
4. UI-kant: de klanturenstaat-status moet oranje blijven tonen totdat Backoffice
   bevestigt — controleer of dat al zo weergeeft of dat de frontend ook nog
   uitgaat van kale `skipped` = groen.
5. Rest van `HANDOFF-CODEX.md` (§2.2–2.5: week/maand-UX, ontvangstmails,
   goedkeuringsmail, herinneringen) is een groter, apart traject — deze taak
   hier is alleen het klanturenstaat-onderscheid uit §2.1.

## 02:04 8 september — CI rood op `7c52e23`, root cause gevonden (Claude)

`herontwerp`-CI faalt breed (shards 1/2/4 rood) met overal dezelfde kern:

```
Error: definitief maken hoort te slagen: {"ok":false,"error":"customer-timesheet-required",
"message":"De klanturenstaat moet eerst zijn ingediend of als rechtstreeks gemaild
geregistreerd voordat de factuur kan worden afgerond."}
```

Komt rechtstreeks uit `6e2543d` ("verplicht klanturenstaat en veilig
maandindienen"): die nieuwe regel wordt nu overal afgedwongen bij het
afronden van een factuur, maar veel bestaande testopstellingen
(business-workflows-failure/idempotency/mail*, invoice-lock, email-queue,
INV-*, EQ-*) zetten nog geen klanturenstaat klaar voordat ze een factuur
proberen af te ronden. Raakt geen van Claude's CSS/test-commits — puur
gevolg van de nieuwe regel zelf, nog niet doorgevoerd naar de testfixtures.

**Niet zelf gepatcht** — dit is Codex' eigen nieuwe business-regel; welke
testopstellingen bewust een uitzondering horen te zijn (bv. AVI/salaris-only
routes zonder klanturenstaat) weet ik niet zeker genoeg om blind te wijzigen.
De wachtrij (§0a) laat dit terecht niet naar `main` doorstromen zolang het
rood staat — dat is precies de bedoelde bescherming.

## Nacht 7→8 september 2026 — Claude's kant van de nacht, kort

Codex en Claude werkten deze nacht gelijktijdig op `herontwerp`; hieronder
alleen Claude's kant, in commitvolgorde met de laatste bovenaan bij het lezen
van `git log`. Elke sync met Codex' commits ging schoon, zonder conflicten.

- `0c581eb` — nieuwe regressietest `[SKIN-H-010]` (`tests/playwright/
  skin.spec.ts` + `features/skin.feature`): bewijst dat de admin-verhaallijn
  (`.new-admin-employee-row`, al verbonden aan echte medewerker-/periodedata)
  daadwerkelijk van medewerker wisselt — geselecteerde rij, verhaalkop-naam en
  vier statuskaarten kloppen na een klik. Dit was letterlijk een van de 7
  openstaande punten in Codex' eigen portal-lijst ("nieuwe Playwright-cases
  voor de storyline en de acties"). Design-audit groen.
- `2dea2dd`/`4a015e5`/`1c74c64` — drie kleine CSS-only polish-increments,
  puur additief onder `html[data-skin="new"]`, classic ongewijzigd:
  factuurdetail-modal + PDF-preview (radius/schaduw/serif op koppen en
  eindbedrag), goedkeuringenkaarten (schaduw + groene hover-ring),
  klanturenstaat-stappenblok en veiligheidsregel-kaarten (radius naar 16px/
  14px, in lijn met de rest van het fundament). Gerichte hertest 202/0 en
  350/31 gedraaid (die 31 faalden op dat moment op ongerelateerde email-
  queue/invoice-lock-cases tijdens Codex' eigen tussentijdse commits — geen
  van de CSS-wijzigingen zelf raakte die bestanden).
- `8900100` — `origin/main` (`6a8dffc`) teruggehaald in `herontwerp` nadat de
  automatische merge-wachtrij (zie hieronder) een main-commit had gemist;
  standaard sync-onderhoud, geen inhoudelijke wijziging.

**Belangrijke observatie over de CI-cyclus vannacht:** bij snel na elkaar
pushen (van beide agents) annuleert elke nieuwe push de vorige lopende
`CI`-run (`cancel-in-progress: true` in `ci.yml`). Een "failure"/"cancelled"
in de Actions-lijst hoeft dus geen echte testfout te zijn — check altijd de
laatste run op de laatste commit voor je concludeert dat iets rood staat.

**De automatische merge-wachtrij (`pilot-merge-queue.yml`, zie eerdere sectie
hieronder) werkt intussen echt**: hij heeft vannacht zelfstandig `herontwerp`
naar `main` gemerged (o.a. via `40ad8b1`) en de Release Pipeline gestart. PROD
is niet aangeraakt.

**Wat ik bewust niet heb opgepakt:** de grote functionele portal-uitbreiding
(storyline als volwaardige route verder afmaken, overige hoofdschermen in de
nieuwe stijl) — dat is precies waar Codex al middenin zat (`6e2543d` "verplicht
klanturenstaat en veilig maandindienen" e.v.). Tegelijk aan dezelfde
functionele kern werken zonder overleg zou onnodig conflictrisico geven.

## Actuele gezamenlijke werkafspraak (Claude en Codex)

Deze paragraaf gaat vóór oudere, beperktere overdrachtsregels verderop in dit
document. Claude en Codex lezen vóór ieder nieuw increment zowel `origin/main`
als `herontwerp`, nemen de nieuwste `main` eerst op in `herontwerp` en bewaren
de werkende klassieke app. De PWA-, hydratie- en dialoogfixes horen bij de
gedeelde klassieke code; de verdere visuele uitwerking van 1414/1919 hoort bij
`skin=new`. Functionele pilotbediening mag gedeelde HTML/JavaScript gebruiken
als beide skins en beide rollen aantoonbaar blijven werken.

**Beide agents kijken per wijziging kritisch naar ontwerp én gedrag.** Ze vullen
zelf ontbrekende positieve, negatieve, mobiele en regressiecases aan waar het
risico dat vraagt. Bestaande tests worden niet alleen passend gemaakt aan de
implementatie: iedere case moet het bedoelde gebruikersgedrag bewijzen. Minimaal
worden bij de huidige pilot bewaakt: Classic start licht, Nieuw start donker,
thema's worden per skin onthouden, weekinvoer en presets schrijven echte data,
alleen de laatste week kan de maand indienen, indienen vraagt een bewuste
bevestiging, de beheerderstoryline houdt alle hoofdschermen bereikbaar en
`SKIN-N-007` houdt Nieuw op PROD fail-closed verborgen.

Werk in korte Nederlandse commits zonder `Co-Authored-By`. Stage uitsluitend
expliciete paden en gebruik nooit `git add -A`. Een agent mag na groene controle
zelfstandig `herontwerp` bijwerken en naar TEST integreren volgens
`COPILOT_HANDOFF.md`; PROD blijft altijd achter de handmatige reviewerpoort.

## 0. Actuele voortgang 7 september 2026

De basisregressie is afgerond: desktop 375/375, Android/Chrome 45/45 en
iPhone/WebKit 45/45 groen; `npm run build`, `npm run check` en GitHub CI-run
`34118945695` zijn groen. De combinatie met main-kop `c37fd23` is daarna zonder
conflict opgenomen en door CI-run `34126046882` groen bevestigd. Tijdens die
run verschoof main met een PWA-hydratiefix; de herstelde kop `ac7ca6c` is
vervolgens zonder conflict opgenomen. Nu volgen gerichte controles en opnieuw
groene branch-CI vóór de merge naar main voor deployment op TEST. Gerichte
controle is groen voor `DASH-N-010`, `DASH-N-026`, `MOB-H-024` en alle negen
`SKIN-*`-cases, inclusief functionele parity van beide skins voor beide rollen.
PROD blijft Classic-only en achter de verplichte reviewerpoort.

De pilot-CI draait vanaf deze integratie in vier parallelle shards en faalt als
`herontwerp` commits van `main` mist. De main-release bevat daarnaast het
zichtbare, informerende blok `Inspect pilot branch`, zodat beide werkstromen
bij iedere release worden vergeleken zonder een gewone hotfix te blokkeren.

## 0a. Nieuw 7 september 2026 (avond) — automatische merge-wachtrij naar `main`

Er is een GitHub Actions-workflow gebouwd die de merge `herontwerp` → `main`
**zelf** doet, zodat niemand dat nog handmatig hoeft te pushen. Status en
regel hieronder — dit vervangt **niet** de regel "raak `main` niet aan" in
§1: die blijft gelden voor mensen/agents zelf; dit is de ene bewuste
automatisering die de gebruiker hiervoor heeft goedgekeurd.

**Bestand:** `.github/workflows/pilot-merge-queue.yml`, moet op de default
branch (`main`) staan om te kunnen reageren op de `workflow_run`-event van
`CI` (die op `herontwerp` draait) — dat is een GitHub-beperking, geen keuze.
**Stand bij schrijven:** het bestand staat klaar in PR
[#41](https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/pull/41)
op een losse branch `ci/pilot-merge-queue`; de gebruiker merget die PR zelf
(agents mogen niet naar `main` pushen of daar een PR op mergen — dat wordt
door de omgeving zelf geblokkeerd, niet alleen door afspraak). Controleer of
PR #41 gemerged is voordat je op de automatische wachtrij rekent; zo niet,
blijft de oude regel gelden dat de gebruiker de uiteindelijke merge doet.

**Wat de workflow doet, exact:**

1. Draait bij elke afronding van de `CI`-workflow op `herontwerp`.
2. Gaat alleen verder als die CI-run **groen** eindigde.
3. Controleert of `herontwerp` de actuele `main` al bevat (dezelfde check als
   `ci.yml` al doet). Zo niet: geen merge, alleen een waarschuwing — dan moet
   eerst iemand `main` in `herontwerp` opnemen (dat blijft mensen-/agentwerk,
   zie §1 vierde bullet).
4. Zo ja: wacht (poll elke 60s, max 3 uur) tot `main` **geen actieve** Release
   Pipeline-run meer heeft — **ongeacht of die rood of groen eindigde**, alleen
   de status (`in_progress`/`queued` vs. `completed`) telt.
5. Zodra `main` vrij is: fast-forwardt `main` naar de groene `herontwerp`-commit.

**Wat dit niet doet:** PROD promoten. Die stap blijft achter de handmatige
GitHub-environment-reviewerpoort op `prod`, ongeacht deze workflow.

**Enige resterende voorwaarde voor een storingsvrije, volautomatische
doorstroom:** houd `herontwerp` synchroon met `main`. Zolang dat zo is en de
CI groen is, gebeurt de rest zonder tussenkomst.

## 1. Waar je bent / wat je NIET aanraakt

Je werkt in een **git worktree**: `C:\Path-herontwerp`, vast op branch
**`herontwerp`**. Dit is een aparte checkout naast de hoofdmap
`C:\Path_Urenregistratie_Veilige_Demo_Path_App` (die staat vast op `main` —
de go-live/PROD-lijn, in een andere chat/sessie). Zolang de worktree bestaat
kan de hoofdmap niet naar `herontwerp` overschakelen; dat hoeft ook niet, jij
werkt gewoon in `C:\Path-herontwerp`.

- **Raak `main` niet aan.** Geen merge, geen cherry-pick naar `main`, geen
  Promote Prod — dat is een expliciete, bewuste actie van de gebruiker zelf,
  nooit van een agent.
- Werk alleen op **`herontwerp`**. Alles wat je hier commit/pusht raakt
  PROD niet: een push van `herontwerp` triggert geen Release Pipeline (die
  is `main`-getriggerd).
- `herontwerp` is afgetakt van `1.0.0` en heeft `1.0.1–1.0.3` (main) er
  periodiek in gemerged, om de latere `herontwerp` → `main`-merge klein te
  houden. Als jij lang doorwerkt: merge af en toe `main` erin, net als tot nu
  toe gedaan.
- **Pilot-bestandseigendom blijft staan**: `pilot/1919-medewerker.*` en
  `pilot/1919-beheerder.*` zijn van Claude — daar niet aankomen. Dit handoff
  gaat over iets anders: de **in-app skin** (`assets/styles-new.css`), niet
  de losse pilotpagina's.

## 2. Wat dit werk is (kort)

Fase D = een tweede vormgeving ("nieuw", 1414 Bento × 1919 Storyline) naast
de bestaande ("klassiek"), omschakelbaar via Voorkeuren → Vormgeving
(`state.preferences.skin`, toegepast door `applySkin()` in `assets/app.js`,
zet `html[data-skin]`). **Alles** zit in **`assets/styles-new.css`**, **elke
regel gescoped onder `html[data-skin="new"]`**. Classic (het bestaande
uiterlijk) mag nooit veranderen — geen JS-wijzigingen, geen HTML-wijzigingen,
puur additieve CSS. Op PROD is `skin=new` fail-closed verborgen
(`[SKIN-N-007]`); die guard niet aanraken.

De schermen-inventaris (increment 1–11, zie `HANDOFF-PILOT-DESIGN.md` §3–4)
is **compleet**: login, mededelingen, goedkeuringen, mijn uren, facturen,
medewerkers, instellingen, modals, mobiel — allemaal op het fundament
aangesloten. Wat nu rest is **fijnslijpen**, geen nieuw fundament.

## 3. Exacte stand bij overdracht

- Branch `herontwerp`, laatste commit: `acd8cf0` "handoff — worktree-opzet
  vastgelegd". Daarvoor `2fd78e7` (main/1.0.3 erin gemerged), en increment
  3–11 (`ccad481` t/m `6df5414`).
- Versie: `1.0.3` (package.json). Er is nog geen aparte `0.11.x`-lijn voor
  Fase D gestart op deze branch — bepaal dat in overleg met de gebruiker, of
  laat het nummer met rust tot de merge (zie `HANDOFF-PILOT-DESIGN.md` §5.4).
- `assets/styles-new.css`: 875 regels, alles onder `html[data-skin="new"]`.
  Niets hiervan is in deze sessie gewijzigd — ik heb alleen getest, niet
  geschreven.
- **Wat ik wél heb gedaan in deze sessie:** de worktree miste drie
  machine-lokale, gitignored bestanden die de e2e-runner nodig heeft. Die
  heb ik gekopieerd vanuit de hoofdmap (`C:\Path_Urenregistratie_Veilige_Demo_Path_App`):
  - `path-urenregistratie/.env.local`
  - `path-urenregistratie/server/.php-path`
  - `path-urenregistratie/server/config.local.php`

  Ze staan nu in de worktree en zijn (terecht) niet gecommit — check
  `git status` niet nodig, ze zitten in `.gitignore`. **Als jij in een andere
  worktree/machine werkt en ze ontbreken: kopieer ze opnieuw, of maak ze aan
  volgens `dev-environment-this-machine`-opzet (native MySQL 8.0.40 op
  127.0.0.1:3306, root/root, db `path_urenregistratie_test`, PHP 8.4 via
  winget).**

## 4. EERSTE TAAK: de volledige desktop-e2e afmaken

Ik heb `node scripts/run-playwright-e2e.mjs --project=desktop-chromium`
(375 tests) gestart om increment 3–11 in één keer te bevestigen. De run
kwam ~80 van de 375 tests ver **zonder één mislukking** voordat de sessie
werd afgebroken (de achtergrondtaak stopte met de vorige Claude Code-sessie,
niet door een testfout). **Dit is dus nog niet bevestigd 100% groen** — dat
is letterlijk de eerste taak in `HANDOFF-PILOT-DESIGN.md` en die staat nog
open. Draai 'm opnieuw en laat 'm volledig doorlopen:

```
cd path-urenregistratie
node scripts/run-playwright-e2e.mjs --project=desktop-chromium
```

Moet 100% groen. Als er iets rood is: repareer het (styles-new.css of, als
het aan een gedeeld component ligt, met uiterste terughoudendheid ook
classic — overleg eerst met de gebruiker voor je classic aanraakt). Daarna
pas verder met fijnslijpen.

## 5. Wat daarna rest (fijnslijpen)

Uit `HANDOFF-PILOT-DESIGN.md` §→WAT ER NOG MOET, in volgorde:

1. ✅ (deze sessie, deels) volledige desktop-e2e — **rond dit af, zie §4**.
2. **Handmatige mobiele doorloop** op een echt toestel (iOS + Android PWA)
   van elk scherm in `skin=new`. Kan niet door een agent alleen — vraag de
   gebruiker om mee te testen of terugkoppeling te geven.
3. **Verdere fijnslijping per scherm** waar de 1414/1919-mockups
   (`design-mockups/1414-path-bento-space/*.jpg`) dat nog vragen. Puur
   voorbeelden, geen uitputtende lijst — vergelijk zelf tegen de mockups:
   - ✅ factuurdetail-modal + PDF-preview (`2dea2dd`/`4a015e5`/`1c74c64`,
     zie de nacht-van-7→8-september-episode hieronder) -- geverifieerd
     10 september: `.invoice-document-card`/`.invoice-branded-template`/
     serif koppen/`.invoice-preview-total` staan nog in `styles-new.css`.
   - ✅ lijst-polish in Goedkeuringen (zelfde commits, `.approval-card` +
     hover-ring) -- geverifieerd 10 september, staat nog in `styles-new.css`.
   - ✅ (deels) Instellingen: klanturenstaat-stappenblok en
     veiligheidsregel-kaarten al gedaan (zelfde commits). Niet expliciet
     nagelopen: de overige tabs (Organisatie, Facturatie, Mailroutes,
     Teksten, Herinneringen) — vergelijk die zelf nog tegen de mockups voor
     je ze afvinkt.
   - week/maand-layout van "Mijn uren" — geen aparte polish-commit voor
     gevonden. De screenshot-audit van 10 september (zie hierboven) liet in
     de huidige bento-opzet niets stuk zien, dus dit is optioneel verder
     fijnslijpen, geen bekende fout.
4. Als de gebruiker het herontwerp accepteert: **de gebruiker** beslist over
   de merge `herontwerp` → `main` (= `1.1.0`). Dat doe jij niet zelf.

## 6. Werkregels (verplicht, ongewijzigd t.o.v. eerdere increments)

1. Werk op **`herontwerp`**, nooit op `main`.
2. Wijzig alleen `assets/styles-new.css`, altijd onder
   `html[data-skin="new"]`. Classic blijft bit-voor-bit ongewijzigd.
3. Lokaal verifiëren: `php -S 127.0.0.1:8000 -t path-urenregistratie` en
   bekijk met `skin=new` (Voorkeuren → Vormgeving of `localStorage`). Draai
   `npm run check` + de relevante specs; vóór een grotere wijziging de
   volledige suite (§4) in **beide** skins 100% groen.
4. Gebruik een korte Nederlandse commitboodschap zonder
   `Co-Authored-By`-trailer.
5. `git add` met **expliciete paden**, **nooit** `-A` (sweept anders
   halfklaar werk van andere agents/sessies mee).
6. `git push origin herontwerp` na elke increment.
7. Werk `HANDOFF-PILOT-DESIGN.md` bij per increment (zoals increment 1–11
   deden) — dit bestand (`HANDOFF-CODEX-FASE-D.md`) alleen bij grote
   overdrachtsmomenten, niet per increment.
8. Versie via `npm run version:set` — nooit met de hand (13 plekken).

## 7. Valkuilen (uit `HANDOFF-PILOT-DESIGN.md` §6, blijven gelden)

- `set-version.mjs` is een kale string-replace — kies geen versie die
  substring is van een IP/getal (`0.0.1` botste met `127.0.0.1`).
- Windows/Bash: CWD kan tussen tool-calls terugvallen naar de repo-root —
  gebruik bij twijfel het absolute pad
  `cd /c/Path-herontwerp/path-urenregistratie && ...`.
- Poort 8000 vrij maken: `taskkill //F //IM php.exe`.
- `--grep "A|B"` breekt op de shell-pipe onder Windows.
- `<select>` in een modal wordt opgewaardeerd naar een keuzemenu-widget
  (`initializeStandardChoiceMenus`) — bedien via `#<id>-trigger` +
  `[data-standard-choice-*]`.
- Geen harde time-outs op transiënte UI-meldingen; toets de blijvende
  uitkomst.
- `skin=new` op PROD moet fail-closed verborgen blijven (`SKIN-N-007`) —
  die guard niet aanraken.

## 8. Als je vastloopt

`git fetch && git checkout herontwerp` (of werk gewoon door in
`C:\Path-herontwerp`, die staat er al op), lees `HANDOFF-PILOT-DESIGN.md`
vanaf het begin, dan dit bestand, dan §4 hierboven als eerste actie.

### 8a. Walkthrough: een test die "toevallig" slaagt/faalt grondig uitzoeken

Vastgezet na de nacht van 9→10 september (SKIN-H-023 faalde na een puur
cosmetische opschoning van `fillDefaultPatternForWeek`, zonder dat de echte
functionaliteit veranderd leek). Gebruik deze stappen zodra een test omslaat
na een wijziging die er zelf onschuldig uitziet — niet meteen de test
aanpassen om hem weer groen te krijgen, en niet meteen de wijziging
terugdraaien:

1. **Isoleer de wijziging.** `git stash` de eigen diff, draai de falende
   test opnieuw tegen de ongewijzigde code. Slaagt hij daar wél? Dan is de
   wijziging niet zomaar "toevallig" fout — er zat een aanname in de oude
   code (of test) die nu wordt blootgelegd. `git stash pop` daarna meteen
   terug; nooit een test-run draaien terwijl de working tree niet overeenkomt
   met wat je denkt dat er staat.
2. **Injecteer gerichte debug-logging in de test zelf**, niet in de
   app-code: een `page.evaluate(() => ({...}))` die de relevante state
   (record.entries, confirmedEntries, employee.dayHours, weekIndex, …)
   teruggeeft vlak vóór en vlak ná de actie, geprint met `console.log` zodat
   het in de Playwright-output verschijnt. Dat laat in één run zien wat de
   state écht is, i.p.v. te gokken.
3. **Volg elke functie-aanroep terug tot zijn bijwerkingen.** Een
   "read-only" ogende getter (`recordFor`, `currentPeriod`, …) kan zelf weer
   functies aanroepen die state muteren (`ensurePeriodRecords` ->
   `applyDayHoursDefaultsToRecord`). Grep op de aanroepende functienaam door
   het hele bestand, niet alleen op de plek waar je zelf iets wijzigde.
4. **Vergelijk het doel van twee soortgelijke helpers** als er twee bestaan
   die net iets anders lijken te doen (hier: `newEmployeeBentoWeekIndex`,
   wat de gebruiker toevallig bekijkt, vs. `todaysWeekIndexInPeriod`, de
   week van vandaag). Lees hun eigen commentaar/herkomst — vaak verraadt dat
   welke van de twee semantisch bedoeld was op de plek waar de bug zit.
5. **Verwijder de debug-logging weer** zodra de oorzaak vaststaat, en fix de
   oorzaak (niet het symptoom) tenzij de test zelf een race bevat — corrigeer
   dan de test zodat de setup deterministisch is (bv. state direct zetten
   én de actie triggeren in dezelfde `page.evaluate`, zonder async gat
   waarin een achtergrondproces ertussen kan komen).
6. **Verifieer breed voor je committeert**: de specifiek geraakte tests
   los, dan het hele bestand waar ze in staan. Losse `TimeoutError`s op
   `#quick-skin-toggle` over veel ongerelateerde tests tegelijk zijn de
   bekende lokale hangende-click-flake (zombie `chrome.exe`'s, killen met
   `Get-Process chrome | Stop-Process -Force`) — niet een regressie; laat CI
   daar het laatste woord over hebben, met concrete assertion-failures op de
   geraakte tests als het echte signaal.

Dit is geen eenmalige aanpak voor deze ene bug: gebruik 'm standaard zodra
een wijziging die er onschuldig uitziet een test omslaat, in plaats van de
makkelijkste route (test versoepelen of wijziging terugdraaien) te nemen
zonder te snappen waarom.

### 8b. De handmatige PROD-poort is geen blokkade om op te wachten

Een Release Pipeline-run die verder overal groen is (Validate, Promote Test,
Publish Live Docs, Deploy Test to TransIP) en daarna blijft "hangen" op de
handmatige `Promote Prod*`-environmentpoort is **geen fout en geen taak om
op te wachten**. Die poort is bewust handmatig — alleen de gebruiker beslist
over promotie naar PROD (zie §1 hierboven en de standaardregel "nooit PROD
aanraken"). Zie ook de episode van 9 september bovenaan: `pilot-merge-queue`
liep hier eerder wél op vast doordat hij zulke runs als "nog bezig"
beschouwde en nieuwe groene `herontwerp`-promoties tot drie uur blokkeerde;
dat is gerepareerd, maar het onderliggende gedrag (de poort staat gewoon
open te wachten) is bedoeld en blijft zo.

Dus: zodra een pipeline-check laat zien dat alles vóór de PROD-poort groen
is en alleen die poort nog open staat, is dat een afgeronde toestand — niet
"nog bezig". Niet blijven pollen of erop wachten; meld het kort (of laat het
zoals het is als niemand ernaar vraagt) en ga gewoon door met de volgende
openstaande taak. Dit geldt voor elke pipeline-run, niet alleen voor
`herontwerp` zelf.

Aanvulling vanuit main's kant (Codex, 10 september): een wachtende
`Promote Prod*`-job kan ook als **"failure"** in de run-status verschijnen,
niet alleen als eeuwig "in_progress" — namelijk zodra een latere push de
wachtende poort overschrijft via de concurrency-lock. Ook dát is geen echte
fout: check of de eerdere, overschreven run zelf tot aan de PROD-poort groen
was voor je een "failure" als regressie behandelt.
