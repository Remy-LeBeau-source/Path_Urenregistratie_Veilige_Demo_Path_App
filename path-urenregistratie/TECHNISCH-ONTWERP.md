# Technisch Ontwerp — Path Uren & Facturatie

## 1. Architectuurprincipes

1. MySQL is in AUTH/TEST/PROD de bron voor bedrijfsdata; `localStorage` bewaart daar alleen UI-voorkeuren.
2. De browser leidt geen globale telling af uit toevallig bezochte maanden.
3. Iedere schrijfactie retourneert de nieuwe serverstatus; daarna wordt de betrokken workflow opnieuw gelezen.
4. Autorisatie wordt zowel in de UI als op ieder API-endpoint afgedwongen.
5. Omgevingsconfiguratie en secrets staan buiten de documentroot en buiten Git.
6. Deployments vervangen de inhoud van een stabiele documentroot en bewaren een herstelbare rollback.

## 2. Componenten

| Laag | Verantwoordelijkheid |
|---|---|
| `index.html` / `assets/app.js` | presentatie, navigatie, lokale demomodus, serverstatus projecteren |
| `server/api/bootstrap.php` | organisatie, accounts, medewerkers, opdrachten, perioden en mailroutes |
| timesheet/customer-timesheet API's | statusovergangen en detail-readback |
| invoice/mail API's | factuurstatus, queue, dispatch en acceptatieconsole |
| MySQL | gezaghebbende records, relaties, audit en mailhistorie |
| Playwright + featurebestanden | executable specificatie en releaseblokkades |
| GitHub Actions + deployscripts | build, regressie, TEST-deploy, productiecutover en smoke |

## 3. Frontend-statusmodel

`state.records[periode][medewerker]` bevat de geprojecteerde uren-, document-, factuur- en salarisstatus. In servermodus wordt na bootstrap voor een beheerder de volledige bekende combinatie van perioden en actieve medewerkers gehydrateerd voordat de globale werkvoorraad als gezaghebbend geldt.

Belangrijke regels:

- `selectedPeriodKey` bestuurt alleen detailweergaven;
- `adminOpenTasks()` gebruikt alle gehydrateerde perioden;
- detailreads mogen één record actualiseren, maar niet ongerelateerde records verwijderen;
- `adminTaskPanelExpanded` is uitsluitend UI-status;
- rolwissel in TEST behoudt de volledige democatalogus; productie gebruikt uitsluitend serveraccounts;
- resetbediening wordt na iedere render opnieuw gekoppeld aan omgeving én rol.

## 4. Taakprojectie

Per medewerker/periode worden taken deterministisch afgeleid:

- `draft` → `hours-draft`, eigenaar medewerker;
- `correction` → `hours-correction`, eigenaar medewerker;
- `submitted` → `hours-review`, eigenaar Backoffice;
- klanturenstaat `missing|draft|resubmit` → eigenaar medewerker;
- klanturenstaat `received` → controle door Backoffice;
- klanturenstaat `approved` met brokerroute → brokercontrole door Backoffice;
- goedgekeurde/gefactureerde uren zonder volledig verzendbewijs → factuur-/verzendcontrole door Backoffice.

Taak-ID's zijn stabiel opgebouwd uit type, periode en medewerker. Hierdoor kunnen filters, tellingen en tests dezelfde actie eenduidig volgen.

## 5. Cache- en synchronisatiecontract

- Bootstrap levert de complete lijst van geldige periodekeys.
- Na beheerlogin worden uren, klanturenstaten en factuurstatussen voor alle geldige combinaties opgehaald.
- De hydratatie heeft één in-flight guard en een korte TTL tegen dubbele requests.
- Na hydratatie volgt één volledige render.
- Na medewerker- of beheerwrite wordt minimaal het betrokken record geforceerd herlezen.
- Een maandwissel start hoogstens een detailrefresh en verandert geen globale totalen zonder een echte serverstatuswijziging.
- Elke timesheetmutatie verhoogt een epoch per `periode + medewerker`. Een GET die vóór die mutatie
  begon, mag na de write niet meer op de record worden toegepast.
- Autosave wordt tijdens indienen gepauzeerd en hervat alleen als na de submit nog een aantoonbare
  nieuwe conceptwijziging bestaat.
- Serverpayloads worden aan de grens genormaliseerd; optionele arrays zoals announcement-
  ontvangers zijn nooit impliciet verplicht voor een volledige render.

### Render- en schrijfvolgorde

1. valideer rol, periode, recordversie en invoer;
2. markeer de mutatie als in-flight;
3. wacht een al lopende conceptwrite af;
4. voer precies één statuswrite uit;
5. pas response en versienummer atomisch toe;
6. forceer gerichte readback indien nodig;
7. projecteer alle vervolgacties opnieuw;
8. render teller, detailstatus en navigatie in één cyclus;
9. beëindig de in-flight guard, ook bij fout.

## 6. Mailveiligheid

- `mail.enabled`, testvenster en acceptance guard moeten alle drie passen bij de omgeving.
- TEST gebruikt `test_redirect_all` en een expliciete allowlist.
- De envelope/from-identiteit blijft Backoffice; de functionele ontvanger wordt in TEST naar de sink herschreven.
- Een factuurlock schrijft standaard drie gescheiden `email_deliveries`: `broker`, `accountant` en
  `payroll`. TEST verandert bij dispatch alleen de effectieve ontvanger; kanaal, oorspronkelijke
  ontvanger, onderwerp en attachment policy blijven auditbaar.
- Bijlagen worden server-side op routebeleid gevalideerd. De acceptatiestatus publiceert uitsluitend
  een veilige bestandsnaam en index. Een geautoriseerde beheerder kan met scenario + index dezelfde
  server-side gegenereerde PDF inline openen; de endpoint valideert opnieuw het routebeleid en de
  PDF, gebruikt `no-store` en accepteert nooit een clientpad of vrije bestandsnaam.
- SMTP-succes wordt pas getoond na bevestigde dispatch; fouten blijven met pogingenteller in `email_deliveries`.
- Databasetijden zonder tijdzone worden als reeds lokale servertijd weergegeven en krijgen niet nogmaals
  de Amsterdam-offset; expliciete ISO-tijden worden wel naar `Europe/Amsterdam` omgerekend.

### Wachtwoordbeheer

- `force_password_change` is uitsluitend beschikbaar voor een beheerder binnen hetzelfde bedrijf.
- De API weigert het eigen account en de UI toont de actie alleen bij andere actieve serveraccounts.
- Een nieuwe reset maakt eerdere ongebruikte tokens ongeldig, zet de resetverplichting en queue't een
  link die twee uur geldig en eenmaal bruikbaar is.
- Een beheerder leest of kiest nooit het wachtwoord van een andere gebruiker.

## 7. Teststrategie en traceerbaarheid

Iedere featurecase heeft een unieke ID en verwijst via het stepbestand naar een Playwright-test. Kritieke ketens gebruiken echte statusovergangen of deterministische API-mocks, nooit uitsluitend zichtbaarheid van losse componenten.

Gebruikte testtechnieken:

- toestandsovergang: uren, klanturenstaat, factuur en mail;
- beslissingstabellen: rollen, verwijderbaarheid, bijlagen en mailomgevingen;
- equivalentieklassen en grenswaarden: uren, wachtwoorden, retry en datum/periode;
- pairwise: rol × omgeving × actie;
- use-case/ketentest: medewerker → Backoffice → medewerker → Backoffice;
- regressie-invariant: sommen en taak-ID's vóór/na maand- en rolwissel;
- negatieve autorisatie: medewerker op beheer/reset/mail-endpoints;
- herstelbaarheid: reset en deploymentrollback.

De GUI-smoke bevat de kortste complete bedrijfsketen. De volledige regressie bevat daarnaast foutpaden, concurrency, grenzen, toegankelijkheid, mobiel en servercontracten.

### Testlagen

| Laag | Bewijst | Mag niet vervangen worden door |
|---|---|---|
| statische contractcheck | configuratie, syntax, fail-closed defaults | alleen handmatige inspectie |
| API/DB-integratie | echte statusovergang, versie, autorisatie en audit | uitsluitend UI-mocks |
| browsercomponent | zichtbaarheid, locks, validatie en navigatie | losse DOM-snapshots |
| ketentest | eigenaar- en taakoverdracht tussen rollen | vijf geïsoleerde happy-flowtests |
| TEST-host smoke | vhost, echte config, aparte DB en veilige sink | localhostresultaten |
| menselijke acceptatie | ontvangen mail, leesbare PDF en werkproces | technische SMTP-acceptatie |

De ketentests voeren bedrijfsstappen in de natuurlijke volgorde uit. Zij controleren na iedere write
minimaal status, eigenaar/vervolgtaak, globale sommen en zichtbare actie. Een test die alleen de
eindstatus controleert is voor een bedrijfskritieke overgang onvoldoende.

De expliciete ketenspecificatie `end-to-end-workflows.feature` wordt uit
`business-workflows-e2e.spec.ts` gegenereerd. De eerste releaseblokkades bewijzen: (1) stabiele
12/7/5-herstelbasis bij maand- en filterwissels, (2) rolwissel en autorisatie zonder F5 en (3)
correctieherindiening waarbij dezelfde open actie van medewerker naar Backoffice verhuist zonder dat
het globale totaal verandert.

### Omgevingspariteit

`seed-demo-data.sql`, demo-alignments, browserdemo en TEST-reset beschrijven dezelfde basis van
12 acties (7 Backoffice, 5 medewerkers). Een regressietest vergelijkt niet alleen een hardcoded
responseveld, maar ook de werkelijke geprojecteerde taakregels. Verschillen zijn alleen toegestaan
voor URL, sessiecookie, secrets, database-instantie, resettransport en mailtransport.

## 8. Releasecontract

Een release mag pas door wanneer:

1. syntax/static checks groen zijn;
2. database- en API-contracttests groen zijn;
3. GUI-smoke met de hoofdketen groen is;
4. volledige Playwright-regressie groen is;
5. omgevingspreflight groen is;
6. deploychecksum en versie overeenkomen;
7. publieke health- en login-smoke groen zijn;
8. bij fout automatisch de vorige inhoud naar dezelfde stabiele documentroot wordt teruggezet.

Wijzigingen aan bedrijfslogica vereisen in dezelfde commit een update van FO/TO, featurecase en uitvoerbare assertion.
# Fail-closed TEST-mailschakelaar

De bron van waarheid blijft `server/config.local.php`. De webinterface kan uitsluitend op de exacte TEST-origin een reeds volledig geconfigureerde SMTP-sandbox pauzeren of hervatten. Dit gebeurt met een bestand `test-mail-paused.flag` in de private opslag buiten de webroot. De schakelactie vereist een administratorsessie, CSRF en de expliciete bevestiging `SET_TEST_MAIL_STATE`. De endpoint retourneert `mail_mode`, `delivery_allowed`, `test_toggle_available` en het vaste sink-adres. LOCAL en PROD kunnen deze schakelactie niet uitvoeren.

Op loopbackhosts is daarnaast een afzonderlijke lokale previewmodus beschikbaar. De UI-keuze staat
onder `path-local-mail-preview-enabled` in `localStorage` en is geen transportconfiguratie. De server
staat preview uitsluitend toe bij `environment=local`, een loopbackhost en uitgeschakelde echte
mail. `mail-acceptance.php` retourneert dan `preview_only=true`; POST maakt alleen een droge
queue-/previewregistratie en opent geen netwerkverbinding. TEST gebruikt nooit deze browserkeuze en
PROD toont uitsluitend status. `EQ-H-025` bewaakt badge- en instellingenbediening, onderwerp, tekst,
PDF-links en de geen-SMTP-grens; `mail-acceptance-policy-check.php` bewijst daarnaast nul writes en
nul netwerkverbindingen tijdens de beleidscontrole.
