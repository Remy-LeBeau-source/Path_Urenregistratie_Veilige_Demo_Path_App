# Handoff voor Claude Code

Bijgewerkt: 24 augustus 2026, Europe/Amsterdam.

## Actuele overdracht — v0.9.138 (24 augustus 2026)

Deze sectie vervangt alles hieronder; de rest van het bestand blijft als historische context staan.

### Waar het staat

| Omgeving | Versie | Toestand |
|---|---|---|
| TEST | `0.9.138` | uitgerold, https://uren-test.pathconsultancy.nl |
| PROD | `0.9.117` | wacht op de goedkeuringspoort van Gio; niet handmatig promoveren |

Werkwijze in deze periode: rechtstreeks op `main`, geen PR's. Elke wijziging krijgt een versienummer,
draait lokaal `npm run check` plus de volledige suite, en gaat daarna de pipeline in.

### Wat er in deze reeks is veranderd

De volledige verantwoording staat in `MASTERCHECKLIST.md` onder *v0.9.133 t/m v0.9.138*. De kern:

1. **Eén regel voor de begeleidende tekst.** Eigen tekst bij de ontvanger wint, anders de
   standaardtekst van zijn soort. De tussenlaag "tekst bij de opdracht" bestaat niet meer — dat is de
   eigen tekst van de broker geworden. Zie het TO, sectie *Welke begeleidende tekst een ontvanger
   krijgt*.
2. **Standaardteksten aanpasbaar** bij Instellingen → Teksten, per soort ontvanger. Tabel
   `mail_channel_templates` (migratie 024). Geen rij = de meegeleverde tekst uit `templates.php`.
3. **Twee bedieningselementen die logen** zijn rechtgezet: de soort ontvanger die stil werd
   overschreven bij opslaan (migratie 023), en het vinkje *Factuur meesturen* dat bij Overig werd
   genegeerd.
4. **E2E is een eigen, draaibare laag** (`npm run test:e2e:group:e2e`). De vier lagen en de
   naamgevingsregel staan in `TESTCOMMANDOS.md`.

### Wat een opvolger moet weten

**De migratieloper knipt op puntkomma, ook binnen commentaar.** Zet dus geen puntkomma in een
toelichting boven een migratie. Dat heeft al een keer een migratie laten falen.

**Kolomtypes volgen de bestaande tabellen, niet `001_core_schema.sql`.** Dat bestand zegt `INT`,
maar de werkelijke schema's gebruiken `BIGINT UNSIGNED`. Een verwijzing met het verkeerde type
weigert MySQL.

**Een test die alleen naar de uitkomst kijkt, kan een echte fout missen.** Bij de standaardteksten is
een opgeslagen tekst die gelijk is aan de meegeleverde aan de buitenkant niet te onderscheiden van
géén opgeslagen tekst — en juist dat verschil is het probleem. Daarom meldt `bootstrap.php` apart
welke kanalen een eigen rij hebben. Controleer bij dit soort werk altijd of je test ook faalt met de
fix eruit; dat is hier drie keer nuttig gebleken en heeft twee zwakke tests aan het licht gebracht.

**Een walkthrough vindt wat asserties niet vinden.** Drie schermfouten (labels naast in plaats van
boven de velden, te kleine tekstvakken, het blok onder het verkeerde tabblad) kwamen door de suite
heen. Schrijf zo'n ronde als schermafdrukken die je zelf bekijkt, niet als verwachtingen — een
assertie controleert alleen wat je al had bedacht.

**Wisselvallige tests hebben hier één terugkerende oorzaak:** wachten op iets wat er toevallig bij
staat in plaats van op wat werkt. Drie gevallen zijn opgelost via `tests/playwright/pages/TopbarMenu.ts`
(`openPaneel`). Het patroon is niet uitputtend nagelopen.

**De TEST-host begrenst verbindingen.** `Verify public TEST account logins` viel twee keer om op een
connect-time-out vanaf de GitHub-runner terwijl de site vanaf elders binnen een tiende seconde
antwoordde; na een kwartier lukte het wel. Het script heeft daarom een herkansing met een luide
`LET OP`-regel. Komt die regel vaker terug, dan is het een firewall- of rate-limitkwestie bij TransIP
— en dat is infrastructuur, dus niet zelf aanpassen.

### Wat openstaat

- **Drie waarnemingen van Gio zijn niet gereproduceerd:** na Herstel blijft een nieuw aangemaakte
  persoon staan, na aanmaken eerst opslaan en F5 voordat je iets kunt invullen, en verkeerde vinkjes
  na aanmaken. Op een schone database klopt alles, server én scherm. De verklaring die ervoor lag —
  een botsende ontvangersleutel na Herstel — is uitgelokt en **weerlegd**. Meest waarschijnlijke
  resterende verklaring is een oude `app.js` in de browsercache. Wacht op een harde ververs en de
  exacte klikvolgorde voordat je hier iets bouwt.
- **De suite sharden** (825s naar ~210s, zonder een assertie in te leveren). Afgesproken voor ná
  PROD, omdat het verborgen koppelingen tussen tests bloot zal leggen.
- **Fase 16** blijft de enige echte openstaande fase: echte mail op PROD, backup én restore, fysieke
  toestellen, monitoring, rollback en één echte maandronde.

### Vaste afspraken met Gio

- Versienummer ophogen zodra werk werkelijk uitgaat, niet eerder.
- Lokaal testen vóór pushen; geen infrastructuurwijziging zonder overleg.
- Per release vertellen wat er veranderd is en wat hij zelf kan nakijken — beginnend bij welke versie
  er **werkelijk** op TEST draait, en eindigend met wat er níet in zit.
- PROD gaat alleen via zijn eigen goedkeuring in GitHub.

## Startstatus

- Werkmap: `C:\Users\gchli\Documents\path site\Path_Urenregistratie_Veilige_Demo_Path_App`
- Applicatie: `path-urenregistratie`
- Lokale branch: `main`
- Applicatie-release-SHA vóór deze documentatiecommit: `543044d1a3682c750a3b63f11945f2bd9381e748`
- Actuele release in pipeline: `v0.9.101`
- Laatste PR: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/pull/27
- Actieve main-releasepipeline: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/32544919862
- Laatste PR-CI: https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/32544839548

PR #26 is gemerged en de PR-CI is groen. Releasepipeline `32541800789` is volledig afgerond met
conclusie `success` voor exact main-SHA `c703ee310455deec409a94a4245d35b761b1e497`. `Validate`,
`Promote Test`, `Deploy Test to TransIP`, `Publish Live Docs`, `Promote Prod` en
`Deploy Prod to TransIP` zijn allemaal groen. Versie `0.9.100` staat daardoor op TEST en PROD.
De TEST-migratie, publieke live-smoke, beide publieke TEST-logins, PROD-cutover en read-only
PROD-live-smoke zijn geslaagd. Onafhankelijke publieke controles geven op beide omgevingen HTTP 200
en versie `0.9.100`; PROD-health retourneert bewust alleen het afgeschermde `{"ok":true}`.
PR #27 is daarna gemerged op main-SHA `543044d1a3682c750a3b63f11945f2bd9381e748`; de bijbehorende
PR-CI is groen en versie `0.9.101` is gestart in releasepipeline `32544919862`. Op het moment van deze
handoff is `Validate` groen en draait `Promote Test`. Deze pipeline vervangt de eerder live gezette
`0.9.100` pas nadat de volgende gates en daadwerkelijke deployments slagen.

Dit handoffbestand wordt met `[skip ci]` als documentatie-only commit toegevoegd, zodat die push geen
extra releasepipeline naast `32544919862` start.

## Wat is opgelost

### Versie 0.9.114 — een stil mislukt wachtwoordherstel

- **`E2E-H-006`** wijzigt een gedeeld demo-wachtwoord. Het herstel in de `finally` was
  voorwaardelijk op een token dat de throttle (drie per kwartier) kan weigeren; dan werd er stil
  niets hersteld en viel alles daarna om met 401. Het herstel faalt nu hard.
- **Zelfde patroon, echte omgeving:** de TEST-uitrol strandde vandaag twee keer op
  `Public TEST login failed for administrator`. Wie een wachtwoord op TEST wijzigt, moet de
  CI-secret `PLAYWRIGHT_ADMIN_PASSWORD` meenemen — of het wachtwoord terugzetten.
- FO aangevuld met de drie nieuwste cases.

### Versie 0.9.109 — verkeerde naam na inloggen, en één begeleidende tekst

Door Gio gemeld: inloggen als Stasjo, daarna kwam hij terug in het menu en zag `Welkom Marc`.

- **Reproduceerbaar voor beide rollen.** `AUTH-H-020` en `AUTH-H-021` doorlopen alle medewerkers en
  beheerders van het bedrijf onder test. Vóór de fix toonde inloggen als Marc `Stasjo van Bakel` en
  inloggen als Joyce een andere beheerder. Het herstelde zichzelf niet, ook niet na 15 seconden.
- **Oorzaak.** Het profiel werd alleen aan de ingelogde gebruiker gekoppeld wanneer de
  servercatalogus leidend was. De demo-hosts (localhost, `uren-test`) houden die catalogus bewust in
  stand, dus daar sloeg de koppeling nooit aan en bleef de standaard demo-selectie staan.
- **Fix in twee delen.** Het profiel volgt nu op elke omgeving de sessie (op `dbUserId`, met het
  sessie-e-mailadres als terugval), en `profileForRole()` gebruikt bij verschil de naam uit de sessie.
  Die tweede regel is het vangnet: `currentEmployee()` viel bij een onbekend id terug op de eerste
  actieve medewerker, en zo werd "onbekend" andermans naam.
- **`AUTH-H-022`** legt vast dat productie niet geraakt werd, zodat het defect aantoonbaar tot de
  demo-hosts beperkt bleef in plaats van dat aan te nemen.
- **Dode verwijzing gevonden:** `employee.demo@example.invalid` krijgt in migratie 005 een
  wachtwoordhash, maar wordt nergens als gebruiker aangemaakt. `admin@example.invalid` hoort bij een
  tweede demobedrijf ("Demo BV"). Beide vallen buiten het bedrijf onder test.
- **Eén begeleidende tekst voor iedere ontvanger.** De opdrachttekst bereikte alleen de broker;
  boekhouding en salaris hielden bewoording die vastzat in `queue.php`. Eén factuur gaf zo drie
  verschillende teksten, waarvan er één aanpasbaar was. `$templateFor($channel)` laat de opdrachttekst
  nu voor elk kanaal winnen. `EQ-H-022` eist dat de drie mails hetzelfde onderwerp uit de opdracht
  dragen; tegencontrole gedaan.
- **Let op bij uitbreiden:** `mail_assert_vars()` laat verzenden falen op een onbekende variabele.
  Een vrij tekstveld zonder die controle kan de facturatie blokkeren.

### Versie 0.9.106 — dry-run-jargon op productie

Op productie waargenomen: wie een resetverzoek deed kreeg `Resetverzoek verstuurd (dry-run). Token:
(zie server) · Geldig tot: onbekend`.

- **Geen lek.** De server geeft op productie geen token terug en maakt er zelfs geen aan zolang
  verzending niet beschikbaar is; `(zie server)` was de fallbacktekst van de browser. De
  enumeratiebescherming bleef intact.
- **Oorzaak.** De frontend testte eerst op `dry_run`. Productie meldt dat óók — echte verzending
  staat daar bewust uit — maar zonder token, waardoor de juiste productietekst nooit werd bereikt.
  De conditie is nu `dry_run && token`.
- **`PWD-N-016`** bootst het productie-antwoord exact na. Tegencontrole gedaan: met de oude code valt
  de test om.
- **Blijft open, en is geen bug:** op productie kan niemand zelf een wachtwoord herstellen zolang
  echte SMTP-verzending daar uitstaat. Dat is Fase 16. Tot dan is doorverwijzen naar Backoffice het
  juiste antwoord, en dat is nu ook wat het scherm zegt.

### Versie 0.9.105 — bedieningselementen verwijderd die niets deden

PR #30 is gemerged. Daarna zijn twee bevindingen uit de scan opgeruimd.

- **Drie schakelaars in Instellingen deden niets.** `Goedkeuring verplicht`, `Factuurnummer
  vastzetten` en `Auditlog bijhouden` werden alleen in het formulier gezet en weer uitgelezen. De
  server heeft er geen kolommen voor en negeerde ze volledig; een beheerder kon `Auditlog bijhouden`
  uitzetten terwijl de server gewoon doorlogde. Vervangen door een read-only lijst. Ze alsnog bouwen
  zou betekenen: drie manieren toevoegen om veiligheidsmaatregelen uit te zetten.
- **Dode renderlaag opgeruimd.** `#open-periods-panel` is in v0.9.16 bewust uit `index.html` gehaald
  toen "Alle open acties per maand" het overnam; de JS en CSS bleven staan. `renderOpenPeriods()`,
  beide click-handlers, de weesknop `Toon volledig team` en de `attention`-scope zijn verwijderd.
  **`openPeriodSummaries()` blijft** — die voedt `adminOpenTasks()`, de opvolger.
- **Herinneringen bewust ongewijzigd.** Het blok is al gelabeld als `Voorbereiding · niet
  automatisch` en dat klopt: er is geen scheduler. Let op bij het alsnog bouwen daarvan: de
  week-, maandeinde-, achterstand- en goedkeuringsinstellingen hebben ook **geen serverkolommen**,
  dus dat vraagt zowel opslag als uitvoering.

### Versie 0.9.104 — instellingenformulier en wachtwoord-vergeten

PR #29 is gemerged. De scan is daarna voortgezet door elk element-id in `index.html` te vergelijken
met wat de tests aanraken. Dat legde één echte bug en één ongedekt scherm bloot.

- **Bedrijfsgegevens konden worden overschreven.** `populateSettings()` stond niet in `renderAll()`.
  Het instellingenformulier werd één keer bij het opstarten gevuld uit de lokaal herstelde state —
  dus vóór de server-bootstrap — en daarna nooit meer. Na een herlaad stonden er verouderde
  bedrijfsgegevens, en `Wijzigingen opslaan` verstuurde exact die verouderde waarden over de juiste
  serverdata heen. Dit verklaart het eerder waargenomen verlies van bedrijfsgegevens. Het formulier
  wordt nu bij elke render gevuld, met een guard die dat nooit doet terwijl iemand erin typt.
- **Waarom niets dit ving:** `INV-ID-H-003` dekte de settings-API, maar bouwde zijn payload uit de
  bestaande waarden. Die case slaagt dus ook als IBAN nooit bewaard blijft. Het formulier zelf werd
  door geen enkele test gebruikt.
- **`INV-ID-H-006`** loopt nu de route van de beheerder en zet de oorspronkelijke waarden in een
  `finally` terug.
- **Wachtwoord-vergeten had nul dekking** — het eerste scherm dat iemand zonder toegang opent.
  `PWD-H-014` bewijst dat een bestaand en een onbekend adres woordelijk dezelfde melding krijgen
  (de server had die enumeratie-guard al; niets bewees dat de UI hem nakwam). `PWD-N-015` dekt het
  overnemen van het inlogadres, het weigeren van een leeg adres en het terugkeren naar inloggen.

### Versie 0.9.103 — mobiele scan

PR #28 is gemerged. Daarna is de volledige applicatie ook op de mobiele weergave nagelopen. De
telefoonsuite dekte de dagelijkse keten al, maar twee schermen die een medewerker juist op een
telefoon opent hadden geen enkele mobiele case.

- **`MOB-H-006`** — een uitgenodigde collega stelt op de telefoon een wachtwoord in. Bewaakt geen
  zijwaartse scroll, tikdoelen van minimaal 40px, de bevestiging `Gelukt!` en de werkende knop
  `Nu inloggen`. Dit is exact het scherm dat in 0.9.102 is gewijzigd; die wijziging was tot nu toe
  alleen op desktop bewezen.
- **`MOB-H-007`** — een medewerker leest een lange mededeling op de telefoon; de volledige tekst moet
  aanwezig zijn en de pagina mag niet zijwaarts scrollen.
- **Let op bij nieuwe mobiele cases:** het mededelingenarchief van een medewerker wordt in
  auth-modus opgebouwd uit `notifications.php`, niet uit `announcements.php`. Een mock op het
  announcements-endpoint heeft daar geen effect.
- **Testrace, geen applicatiefout:** `MOB-H-007` slaagde los maar viel in de volledige suite om op
  een 401 van een urenophaling die met de verse sessie racete. De urenophaling wordt in die case nu
  gestubd. Daarna drie opeenvolgende volledige `mobile-chrome`-runs groen plus `mobile-safari` groen.

### Versie 0.9.102 — volledige applicatiescan

Na een scan van alle schermen bleek Mededelingen het grootste gat: nul geautomatiseerde cases,
terwijl de acceptatielijst er acht punten over bevat. Die scan legde twee echte bugs bloot.

- **Mededelingen versturen was volledig kapot.** `announcements.php` riep `mb_substr()` direct aan;
  op een PHP-installatie zonder de `mbstring`-extensie liep de hele actie stuk op
  `Call to undefined function`. Vervangen door `announcement_truncate()`, met dezelfde
  `function_exists`-guard die `simple_pdf.php` al gebruikte en een UTF-8-bewuste fallback die
  meerbyte-tekens niet halverwege afkapt.
- **Concept verwijderen crashte met een 500 inclusief stacktrace.** De actie wiste alleen de
  `announcements`-rij terwijl `announcement_recipients` en `notifications` foreign keys houden.
  Ruimt nu eerst de gekoppelde rijen op binnen één transactie; de oorzaak gaat naar het serverlog en
  de externe melding blijft generiek.
- De opslagactie ving fouten af en gooide de oorzaak weg, waardoor mislukte opslag niet te
  onderzoeken was. De oorzaak wordt nu gelogd.
- Nieuw `announcements.spec.ts` met `ANN-H-001` t/m `ANN-N-006`.
- `PWD-H-013` doorloopt voor **beide rollen** de volledige toegangsketen: account aanmaken met
  uitnodiging, uitnodiging daadwerkelijk verzonden, wachtwoord instellen via de eenmalige link,
  expliciete bevestiging, en daarna echt kunnen inloggen.
- Na het instellen van een wachtwoord verschijnt nu een duidelijke bevestiging met een knop
  `Nu inloggen`; het scherm schakelt niet meer vanzelf om. Een leeg formulier was voorheen het enige
  zichtbare resultaat van een geslaagde actie en las als "er gebeurde niets".
- Smoke-test uitgebreid met drie bewakingen; FO en TO bijgewerkt.

### PR #27 / versie 0.9.101

- Wachtwoordherstel en uitnodigingen worden nu daadwerkelijk via de maildispatch verzonden in plaats
  van alleen in de lokale queue klaargezet.
- De bijbehorende Playwright- en BDD-dekking en documentatie zijn bijgewerkt.

### PR #26 / versie 0.9.100

- Klanturenstaten accepteren PDF, JPG en PNG tot 2 MB.
- JPG/PNG worden server-side fail-closed naar een geldige PDF geconverteerd.
- Corrupte afbeeldingen, onveilige afbeeldingsdimensies en nep-PDF's worden geweigerd zonder een
  bestaand concept te vervangen.
- De medewerker krijgt de eigen klanturenstaat na login en maandwissel opnieuw uit de server.
- Een oudere GET kan een geslaagde upload niet meer overschrijven.
- De documentactie heet in de gewone klanturenstaatflow overal `Klanturenstaat bekijken`.
- De preview opent inline met een veilige `.pdf`-naam, `Cache-Control: private, no-store` en
  `X-Content-Type-Options: nosniff`.
- Historische ruwe JPG/PNG-records kunnen niet worden goedgekeurd of als PDF worden gemaild; eerst
  opnieuw uploaden is vereist.
- GD en fileinfo zijn toegevoegd aan alle CI-PHP-runtimes; de healthcheck bewaakt beeldconversie.
- De TEST-deployguard verwacht nu dezelfde gesloten mailsandbox als de canonieke configuratie:
  Giovanno als primaire sink en Kenrich als vaste CC.

## Waarom de vorige pipeline faalde

Run `32535972097` was inhoudelijk groen tot de daadwerkelijke TEST-deploy. Een tweede, verouderde
guard in `scripts/deploy-test-remote.sh` stond alleen Giovanno toe, terwijl de actuele TEST-sandbox
Giovanno plus Kenrich als CC vereist. De run stopte vóór cutover: TEST bleef ongewijzigd en er is
geen mail verstuurd. De guard en `scripts/deployment-contract-check.mjs` zijn nu gelijkgetrokken.

## Bewijs

- Volledige lokale Playwright-run: `238/238` groen.
- Volledige GUI-smoke: groen.
- `npm run check`: groen.
- `npm run build`: groen.
- `npm run docs:sync` en `npm run docs:bundle`: groen.
- `npm run test:db:crud`: groen.
- `npm run security:deps`: 0 kwetsbaarheden.
- PHP-lint en shell-syntaxcontrole: groen.

De twee tussentijdse rode tests waren testproblemen en zijn gericht hersteld:

- `MOB-H-003` wacht nu expliciet op de echte `action=submit`-response in WebKit.
- `DASH-N-009` mockt de nieuwe klanturenstaat-readback, zodat echte suitedata de geïsoleerde
  tellertest niet beïnvloeden.

## Belangrijkste bestanden

- `path-urenregistratie/server/api/customer-timesheets.php`
- `path-urenregistratie/server/mail/dispatch.php`
- `path-urenregistratie/server/health.php`
- `path-urenregistratie/assets/app.js`
- `.github/workflows/release-pipeline.yml`
- `path-urenregistratie/scripts/deploy-test-remote.sh`
- `path-urenregistratie/scripts/deployment-contract-check.mjs`
- `path-urenregistratie/tests/playwright/customer-timesheet-api.spec.ts`
- `path-urenregistratie/tests/playwright/dashboard.spec.ts`
- `path-urenregistratie/tests/playwright/mobile-ui.spec.ts`

## Directe volgende stap

1. Volg releasepipeline `32544919862` voor exact SHA `543044d1` tot een terminale status.
2. Ga alleen bij groen verder via de bestaande automatische TEST- en PROD-gates; start geen tweede
   run. Bij rood eerst de exacte job- en steplog lezen.
3. Controleer na een succesvolle deployment dat versie `0.9.101` publiek op TEST en PROD staat en
   dat de health- en read-only live-smokes slagen.
4. Daarna blijft de menselijke mailacceptatie open: controleer op TEST via Instellingen →
   mailacceptatieconsole de vijf routes, inclusief inhoud en bijlagen:

   - Broker: factuur (de klanturenstaat gaat via een eigen verzendflow, niet mee met de factuurmail).
   - Boekhouder: alleen factuur.
   - Salaris/EasySalary: geen bijlage.
   - Wachtwoordherstel.
   - Uitnodiging nieuw account.

**Twee dingen die tijd kosten als je ze niet weet.** De acceptatieconsole stuurt een *gegenereerde*
test-PDF mee (`ACCEPTATIETEST-NIET-BOEKEN-...pdf`), geen echte factuur - die knoppen bewijzen de
leidingen, niet de inhoud van een factuur. En de resetlink is juist wel echt: elke druk op die knop
wist eerst alle bestaande tokens van dat account, dus een tweede druk maakt de link uit de eerste mail
stil ongeldig terwijl die mail er identiek uitziet. Link is 2 uur geldig en eenmalig.

Echte TEST-mail mag uitsluitend naar Giovanno met Kenrich als vaste CC. PROD SMTP-real-delivery
blijft uitgeschakeld; dat is een bewuste veiligheidsinstelling en geen openstaande releasefout.

## Veiligheidsgrenzen

- Geen wachtwoorden, tokens of databasegeheimen in documentatie of logs opnemen.
- De PROD-deploy van exact `c703ee3` is met expliciete toestemming voltooid. Verbreed die toestemming
  niet automatisch naar latere functionele releases; controleer daarvoor opnieuw de actuele scope.
- PROD-mail en verbreding van de TEST-allowlist blijven buiten scope.
- Nieuwe documentatie-only commits bij voorkeur met `[skip ci]`; normale main-pushes starten een
  volledige releasepipeline.
- Verwijder of reset geen andere lokale wijzigingen als die later naast dit bestand verschijnen.
