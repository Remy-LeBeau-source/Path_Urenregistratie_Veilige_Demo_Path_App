# Living Doc - Path Uren & Facturatie

De native Playwright specs zijn de uitvoerbare waarheid. Deze Living Documentation maakt dezelfde 345 Playwright-cases leesbaar en voegt 1 directe DB/SQL-case(s) toe zonder een tweede testrunner te introduceren.

## Actuele regressiestatus

- Playwright executable cases: 345 unieke case-ID's
- SQL/DB executable cases: 1 unieke case-ID('s)
- Totaal executable cases: 346 unieke case-ID's
- Playwright features: 24
- Database features: 1
- Playwright steps mappings: 24
- Database steps mappings: 1
- Uitvoeringen: 363
- Niet-mobile projectuitvoeringen: 327
- Mobile functionele cases: 18
- Pixel 7 / Chromium-uitvoeringen: 18
- iPhone 13 / WebKit-uitvoeringen: 18

De 18 Mobile-cases worden op twee devices uitgevoerd. Daarom leveren 345 Playwright-functionele cases in totaal 363 resultaten op: 327 + (18 x 2) = 363.

## Documentatieketen

1. `.feature`: businessleesbaar gedrag en compacte KRPI-tags.
2. `.steps.ts`: eenvoudige F12-navigatie naar de leesbare stapzin; geen dubbele testcode.
3. `.spec.ts`: uitvoerbare Playwright-test.
4. SQL/DB smoke: `database/queries/crud-smoke.sql` en `scripts/run-db-crud-smoke.mjs` voor directe infrastructuurvalidatie.
5. Allure: functionele Suites en Behaviors, met project/device als metadata.

## Dekking

### Toegankelijkheid en toetsenbordbediening

- Feature: `tests/playwright/features/accessibility.feature`
- Source: `tests/playwright/accessibility.spec.ts`
- Cases: 3

- [A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld — Techniek: Toegankelijkheidsinspectie + toetsenbord-use-case · Assertions: 7
- [A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen — Techniek: Toegankelijkheidsinspectie + toetsenbord-use-case · Assertions: 4
- [A11Y-H-003] lopende tekst blijft op een breed scherm leesbaar van regellengte — Techniek: Toegankelijkheidsinspectie + toetsenbord-use-case · Assertions: 2

### Organisatie-instellingen beheren

- Feature: `tests/playwright/features/organization-settings.feature`
- Source: `tests/playwright/admin-writes.spec.ts`
- Cases: 25

- [ADM-WR-H-001] admin kan company/settings server-led opslaan — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 12
- [ADM-WR-H-014] een eigen tekst per ontvanger wordt bewaard en een leeg veld blijft erven — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [ADM-WR-H-013] onderwerp en begeleidende tekst van een opdracht blijven bewaard — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [ADM-WR-N-001] dubbel accountadres geeft veilige metadata van het bestaande bedrijfsaccount — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 8
- [ADM-WR-N-003] beheerder aanmaken met het e-mailadres van een bestaande medewerker wordt geweigerd — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 10
- [ADM-WR-N-004] beheerder aanmaken met het e-mailadres van een bestaande medewerker toont een duidelijke melding (geen silent failure) — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 13
- [ADM-WR-N-002] dubbel accountadres opent het bestaande account zonder duplicaat — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 14
- [ADM-WR-H-004] admin slaat medewerker zonder SMTP veilig op met toegang in afwachting — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [ADM-WR-H-005] productie toont uitsluitend serveraccounts en opent medewerkerformulier bovenaan — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 13
- [ADM-WR-H-006] deactiveren verplaatst medewerker direct en leeg account kan worden verwijderd — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 13
- [ADM-WR-H-007] serverwrite na Herstel verschijnt direct in Teambeheer — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 5
- [ADM-WR-H-008] bestaande beheerder en medewerker worden na Herstel direct terug in Teambeheer getoond — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 13
- [ADM-WR-H-009] goedkeuringsloop volgt logische maand/medewerker-volgorde — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [ADM-WR-H-010] server-led aangemaakte beheerder en medewerker overleven een echte paginaherlading — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [ADM-WR-H-011] een echte paginaherlading blijft op het geopende scherm i.p.v. terug te springen naar Dashboard — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [ADM-WR-N-005] een al bestaande naam blokkeert of waarschuwt niet: alleen het e-mailadres moet uniek zijn — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 5
- [ADM-WR-N-006] dubbele naam is toegestaan, maar een al gebruikt e-mailadres wordt hard geblokkeerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 8
- [ADM-WR-N-007] actief-accounttotaal klopt op elke stap: exact duplicaat verandert niets, uniek account telt precies 1 op — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 15
- [ADM-WR-H-012] na Herstel legt Teambeheer uit dat de telling lokaal is en kan de serverstand terug worden gehaald — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 8
- [ADM-WR-H-017] een ontvangerslijst terugsturen zoals hij binnenkwam verandert niets — Techniek: API-contract + equivalentieklasse · Assertions: 12
- [ADM-WR-H-018] een nieuwe ontvanger komt bij andere medewerkers ongevinkt binnen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [ADM-WR-H-015] onderwerp, tekst en een eigen tekst per ontvanger blijven na F5 in het scherm staan — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [ADM-WR-H-016] de routevinkjes van een opdracht blijven na opslaan en F5 staan zoals gezet — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 3

### Auditlog en traceerbaarheid

- Feature: `tests/playwright/features/audit-log.feature`
- Source: `tests/playwright/audit-log.spec.ts`
- Cases: 10

- [AUD-H-001] admin kan auditlog ophalen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [AUD-H-002] auditlog filtert op entity_type — Techniek: Equivalentieklassen · Assertions: 3
- [AUD-H-003] auditlog filtert op event_type — Techniek: Equivalentieklassen · Assertions: 3
- [AUD-H-004] auditlog bevat geen wachtwoorden of tokens in event_data — Techniek: API-contract + equivalentieklasse · Assertions: 1
- [AUD-N-005] anonieme gebruiker krijgt 401 op auditlog — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [AUD-N-006] medewerker mag auditlog niet lezen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [AUD-H-007] auditlog combineert entity- en eventfilter — Techniek: Equivalentieklassen · Assertions: 4
- [AUD-H-008] auditlog begrenst een nullimiet op een record — Techniek: Grenswaardenanalyse · Assertions: 2
- [AUD-H-009] auditlog begrenst een hoge limiet op tweehonderd records — Techniek: Grenswaardenanalyse · Assertions: 2
- [AUD-N-010] auditlog weigert POST — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2

### Inloggen, uitloggen en sessiebeheer

- Feature: `tests/playwright/features/auth.feature`
- Source: `tests/playwright/auth.spec.ts`
- Cases: 14

- [AUTH-H-001] Admin logt in en auth/me geeft de juiste gebruiker terug — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [AUTH-H-002] Medewerker logt in en auth/me geeft de juiste gebruiker terug — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [AUTH-H-003] Gebruiker logt uit en auth/me geeft authenticated false terug — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 4
- [AUTH-H-004] Lokale beheeraccount wordt automatisch ingevuld en opent na een klik — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 3
- [AUTH-N-005] onbekend account geeft dezelfde generieke loginfout — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [AUTH-N-006] ongeldig e-mailformaat wordt als invalid-payload geweigerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [AUTH-H-010] andere rol kiezen vult zonder herladen direct het juiste testaccount in — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 10
- [AUTH-N-007] vijf mislukte logins tonen een servergestuurde aftelling — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [AUTH-N-008] de inlogblokkade en aftelling blijven zichtbaar na herladen — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [AUTH-N-009] geen loginflits: login-scherm en app-shell blijven verborgen tijdens auth-bootstrap na F5 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 9
- [AUTH-H-009] lokale login benoemt de veilige testomgeving en productnaam — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 19
- [AUTH-H-020] elke medewerker ziet na inloggen de eigen naam, nooit die van een collega — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [AUTH-H-021] elke beheerder ziet na inloggen de eigen naam, nooit die van een collega — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [AUTH-H-022] in productiemodus toont de app de naam van de ingelogde gebruiker — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 2

### Bedrijfsketens van medewerker tot Backoffice

- Feature: `tests/playwright/features/end-to-end-workflows.feature`
- Source: `tests/playwright/business-workflows-*.spec.ts`
- Cases: 23

- [E2E-H-018] iedere beloofde factuurbijlage bestaat werkelijk als geldige en te openen PDF — Techniek: Equivalentieklassen · Assertions: 25
- [E2E-N-020] een medewerker kan de Backoffice-keten niet uitvoeren en een weigering verandert niets — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 26
- [E2E-N-018] documentlinks accepteren geen ongeautoriseerde gebruiker, clientpad of vrije bestandsnaam — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 19
- [E2E-H-001] herstelbasis houdt globale werkvoorraad stabiel bij maand- en filterwissels — Techniek: Equivalentieklassen · Assertions: 11
- [E2E-H-002] rolwissel werkt zonder F5 en herstel blijft beschikbaar voor iedere rol op LOCAL/TEST — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [E2E-H-003] herindiening verplaatst dezelfde actie van medewerker naar Backoffice — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 18
- [E2E-H-004] goedkeuring vervangt urencontrole door factuurverzending voor hetzelfde dossier — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 5
- [E2E-H-005] klanturenstaatcontrole wordt een brokeractie zonder taakverlies — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 13
- [E2E-H-006] eenmalige wachtwoordlink geeft toegang en blokkeert hergebruik — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 13
- [E2E-H-007] taakgestuurde goedkeuring blijft na serververversing afgerond — Techniek: Toestandsovergang · Assertions: 5
- [E2E-H-008] urencontrole vraagt na oude versie opnieuw op en maakt daarna toch goedkeuren af — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [E2E-N-019] een mislukte factuurpoging laat niets half achter en opnieuw proberen levert één factuur — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 19
- [E2E-H-016] ieder wijzigbaar Teambeheerveld heeft een aantoonbaar opslag- of uitzonderingscontract — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 32
- [E2E-H-019] dubbel klikken maakt nooit dubbele statussen, facturen of mails — Techniek: Toestandsovergang · Assertions: 23
- [E2E-H-022] iedere case laat database en private opslag aantoonbaar schoon achter — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 20
- [E2E-N-017] submitted, approved en invoiced blokkeren iedere verboden medewerkerwrite — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 30
- [E2E-H-026] de definitieve factuur-PDF bevat de juiste bedragen en identiteit en geen conceptwatermerk — Techniek: Equivalentieklassen · Assertions: 16
- [E2E-H-027] elk kanaal krijgt de standaardtekst van de server en geen enkele mail verlaat de machine — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 19
- [E2E-H-023] twee nieuw toegevoegde ontvangers krijgen via de volledige GUI-keten ieder hun eigen factuurmail — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 12
- [E2E-H-024] een nieuw account krijgt via de GUI toegang en zijn eigen tekst komt letterlijk in de verzonden mail — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 18
- [E2E-H-025] een aangepaste standaardtekst werkt in de echte mail en is via de GUI terug te zetten — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 15
- [E2E-N-021] een gedeactiveerd account met historie blijft veilig bewaard en legt de blokkeerreden uit — Techniek: Toestandsovergang · Assertions: 20
- [E2E-H-017] de volledige toegestane urenstatusketen bewaakt na iedere write status, eigenaar en taak — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 18

### Klanturenstaten en documentverwerking

- Feature: `tests/playwright/features/customer-timesheets.feature`
- Source: `tests/playwright/customer-timesheet-api.spec.ts`
- Cases: 11

- [CTS-API-H-012] admin kan een ontbrekende klanturenstaat extern bevestigen en terugzetten — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 15
- [CTS-API-H-009] brokerroute koppelt de officiële klanturenstaat aan dezelfde medewerker en periode — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 12
- [CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 28
- [CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 12
- [CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien — Techniek: Toestandsovergang · Assertions: 9
- [CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [CTS-API-H-005] JPG- en PNG-upload worden als inline bekijkbare PDF opgeslagen — Techniek: Equivalentieklassen · Assertions: 34
- [CTS-API-H-006] medewerker uploadt zichtbaar een afbeelding en kan die na nieuwe login bekijken — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 23
- [CTS-API-N-008] employee krijgt 400 bij een te grote klanturenstaat-upload — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [CTS-API-N-009] corrupte of te grote afbeelding en nep-PDF worden geweigerd zonder bestaand concept te vervangen — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 15

### Dashboard en open werkvoorraad

- Feature: `tests/playwright/features/dashboard.feature`
- Source: `tests/playwright/dashboard.spec.ts`
- Cases: 20

- [DASH-H-001] admin dashboard opent zonder console errors — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [DASH-H-002] employee dashboard opent zonder console errors — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 1
- [DASH-H-018] iedere login opent de actuele maand en bewaart daarna de handmatige keuze — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 23
- [DASH-N-007] afwijkend API-totaal overschrijft de concrete werkvoorraad niet — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 1
- [DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus — Techniek: Toestandsovergang · Assertions: 18
- [DASH-N-011] afgeronde Backoffice-taak en teller blijven na F5 stabiel, ongeacht het beginaantal — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 9
- [DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 24
- [DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 5
- [DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 35
- [DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 11
- [DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 10
- [DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 5
- [DASH-H-005] medewerker ziet open maanden compact en kan direct naar de juiste maand springen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [DASH-H-014] medewerker krijgt de eerstvolgende concrete actie met juiste maand en taakroute — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 22
- [DASH-N-015] medewerkerprioriteit kiest correctie boven document en toont niets als alles klaar is — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 14
- [DASH-N-016] correctieactie ververst een verborgen rooster uit een eerdere maand — Techniek: Toestandsovergang · Assertions: 11
- [DASH-H-006] vooruit bladeren maakt geen lege toekomstmaand zichtbaar als medewerkeractie — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [DASH-H-007] dashboardknop behoudt de geldige maand en medewerkeroverzichten — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [DASH-H-017] serverwerkvoorraad hydrateert volledig en blijft stabiel bij maand- en filterwissels — Techniek: Equivalentieklassen · Assertions: 30

### Mailroutering en aflevering

- Feature: `tests/playwright/features/mail-delivery.feature`
- Source: `tests/playwright/email-queue.spec.ts`
- Cases: 39

- [EQ-H-001] factuurlock maakt queue-items aan met dry_run=true — Techniek: Toestandsovergang · Assertions: 5
- [EQ-H-002] broker-channel stuurt alleen de factuur — Techniek: API-contract + equivalentieklasse · Assertions: 2
- [EQ-H-003] EasySalary-channel heeft attachment_policy none — Techniek: Equivalentieklassen · Assertions: 2
- [EQ-H-022] één factuuractie maakt drie functionele routes plus een invoice-only backoffice-archiefkopie — Techniek: API-contract + equivalentieklasse · Assertions: 14
- [EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan — Techniek: Toestandsovergang · Assertions: 6
- [EQ-H-005] action=list response bevat verplichte velden — Techniek: API-contract + equivalentieklasse · Assertions: 15
- [EQ-H-015] Backoffice ziet veilige verzendhistorie zonder berichtinhoud — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 25
- [EQ-H-031] mislukte mail blijft herstelbaar en verzonden mail heeft geen herhaalactie — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 6
- [EQ-H-032] handmatige herstart na maximale pogingen is auditbaar en eenmalig — Techniek: API-contract + equivalentieklasse · Assertions: 9
- [EQ-H-033] queue-API pagineert en zoekt server-side — Techniek: API-contract + equivalentieklasse · Assertions: 12
- [EQ-H-016] Backoffice verstuurt vanuit de acceptatieconsole precies één gekozen scenario — Techniek: API-contract + equivalentieklasse · Assertions: 18
- [EQ-H-025] localhost schakelt een veilige mailpreview in en controleert inhoud en PDF’s zonder SMTP — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 33
- [EQ-H-023] beheerder pauzeert en hervat uitsluitend de beveiligde TEST-mail — Techniek: Toestandsovergang · Assertions: 9
- [EQ-N-024] buiten de beveiligde TEST-sandbox is geen mailschakelaar beschikbaar — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [EQ-N-017] niet-beschikbare acceptatieconsole blijft volledig uit beeld — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [EQ-H-020] Backoffice finaliseert de branded serverfactuur en verzendt drie echte TEST-mails — Techniek: API-contract + equivalentieklasse · Assertions: 18
- [EQ-H-026] Backoffice verzendt de juiste officiële klanturenstaat via TEST naar Giovanno — Techniek: API-contract + equivalentieklasse · Assertions: 8
- [EQ-N-021] factuurverzending blijft dicht zolang de serveruren niet zijn goedgekeurd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [EQ-N-019] gesloten acceptatievenster toont waarom geen mail kan worden verstuurd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [EQ-N-018] afgewezen acceptatiemail blijft nooit achter voor automatische herverzending — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [EQ-N-006] anonieme gebruiker krijgt 401 op list — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2
- [EQ-N-007] medewerker krijgt 403 op list — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [EQ-N-008] action=enqueue zonder invoice_id geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [EQ-N-009] action=enqueue niet-bestaande factuur geeft 404 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [EQ-N-010] action=enqueue niet-gelockte factuur geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [EQ-N-011] action=retry op queued item geeft 409 — Techniek: Toestandsovergang · Assertions: 3
- [EQ-N-012] ongeldige status-filter geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [EQ-N-013] anonieme enqueue geeft 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [EQ-N-014] unknown action geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [EQ-N-015] localhost blijft preview-only en weigert POST zonder expliciete bevestiging — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 9
- [EQ-N-016] medewerker krijgt geen toegang tot de mailacceptatieconsole — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [E2E-H-009] twee nieuw toegevoegde ontvangers krijgen allebei echt een factuurmail — Techniek: API-contract + equivalentieklasse · Assertions: 26
- [E2E-H-010] nieuw account, eigen tekst, en die tekst komt terug in de verzonden mail — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 28
- [EQ-H-029] elke ontvanger krijgt de handtekening, ook onder een eigen tekst — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [E2E-H-011] een aangepaste standaardtekst komt werkelijk in de mail en is terug te zetten — Techniek: API-contract + equivalentieklasse · Assertions: 15
- [E2E-H-012] het vinkje Factuur meesturen bepaalt werkelijk of de bijlage meegaat — Techniek: API-contract + equivalentieklasse · Assertions: 6
- [E2E-H-013] een nieuwe medewerker houdt zijn gegevens en komt tot een factuur met de juiste mail — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 36
- [E2E-H-014] een nieuwe beheerder logt zelf in en kan de keten afmaken — Techniek: API-contract + equivalentieklasse · Assertions: 17
- [E2E-H-015] aanmaken, lezen, wijzigen en verwijderen van een medewerker houdt stand — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 18

### Facturen definitief maken en vergrendelen

- Feature: `tests/playwright/features/invoice-locking.feature`
- Source: `tests/playwright/invoice-lock.spec.ts`
- Cases: 8

- [INV-H-004] admin lockt approved timesheet naar definitieve immutable factuur — Techniek: Concurrency + toestandsovergang · Assertions: 26
- [INV-N-015] definitief gefactureerde uren kunnen niet voor correctie worden heropend — Techniek: Toestandsovergang · Assertions: 9
- [INV-N-008] anonieme gebruiker kan factuur niet locken — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [INV-N-009] medewerker mag factuur niet finaliseren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [INV-N-010] niet-goedgekeurde urenstaat kan niet worden gelockt — Techniek: Toestandsovergang · Assertions: 3
- [INV-N-011] tweede lock-oproep op dezelfde factuur wordt geblokkeerd — Techniek: Concurrency + toestandsovergang · Assertions: 5
- [INV-N-012] gelijktijdige lock-requests leveren exact één winnaar — Techniek: Concurrency + toestandsovergang · Assertions: 1
- [INV-N-013] anonieme gebruiker kan factuur-PDF niet downloaden — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2

### Facturerende onderneming en handelsnaam

- Feature: `tests/playwright/features/invoice-company-identity.feature`
- Source: `tests/playwright/invoice-company-identity.spec.ts`
- Cases: 10

- [INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen — Techniek: Equivalentieklassen · Assertions: 3
- [INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen — Techniek: API-contract + equivalentieklasse · Assertions: 2
- [INV-ID-N-004] settings API weigert een onbekende factuurweergave — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus — Techniek: API-contract + equivalentieklasse · Assertions: 8
- [INV-ID-H-006] bedrijfsgegevens uit het instellingenformulier blijven bewaard en komen op de factuur — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [INV-ID-H-007] de klanturenstaat-mailteksten blijven na opslaan bewaard — Techniek: API-contract + equivalentieklasse · Assertions: 4
- [INV-ID-H-008] typen in een instelling bevriest de rest van het formulier niet — Techniek: API-contract + equivalentieklasse · Assertions: 4
- [INV-ID-H-009] website en slogan blijven bewaard en komen onder de mail — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [INV-ID-H-010] instellingen tonen de standaardtekst die de ontvanger werkelijk krijgt — Techniek: API-contract + equivalentieklasse · Assertions: 17

### Facturen bekijken en beheren

- Feature: `tests/playwright/features/invoices.feature`
- Source: `tests/playwright/invoices.spec.ts`
- Cases: 18

- [INV-H-001] admin facturen zichtbaar en console errors 0 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [INV-H-013] documentarchief toont factuur en klanturenstaat zonder bestanden vooraf te laden — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 11
- [INV-N-014] ontbrekende klanturenstaat accepteert uitsluitend PDF JPG of PNG — Techniek: Toestandsovergang · Assertions: 5
- [INV-H-020] Backoffice kan een ontbrekende urenstaat extern bevestigen en terugdraaien — Techniek: Toestandsovergang en equivalentieklasse voor externe bevestiging · Assertions: 9
- [INV-H-018] externe factuur slaat PDF JPG en PNG via de factuur-API op — Techniek: Equivalentieklassen · Assertions: 5
- [INV-N-017] medewerker mag geen externe factuur uploaden — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [INV-H-016] factuurdataset met 32 records wordt in pagina’s van maximaal 25 getoond — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 19
- [INV-N-005] employee facturen zichtbaar maar beperkt en console errors 0 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [INV-H-002] periodefilter juli en augustus werkt — Techniek: Equivalentieklassen · Assertions: 4
- [INV-H-003] server berekent bedrag uit uren en uurtarief voor open facturen — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 8
- [INV-H-006] admin kan het gekozen maanddetail inklappen en weer uitklappen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [INV-H-007] factuurnavigatie onderscheidt geblokkeerde en controleklare maanden met oranje en groen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 10
- [INV-N-019] lege actuele maand met open medewerkeruren is geblokkeerd en nooit afgerond — Techniek: Negatieve toestandsovergang bij maandwissel · Assertions: 8
- [INV-H-009] server-PDF-content moet identiek zijn aan app-preview — Techniek: Equivalentieklassen · Assertions: 3
- [INV-N-007] ongeldige periodefilter geeft nette 400-fout — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [INV-H-010] gecontroleerde concept-PDF wordt als mailbijlage naar de server gestuurd — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [INV-H-011] beperkte factuur-inhoud: alle velden in server-PDF inclusief recipient/project/uren/betaling — Techniek: Equivalentieklassen · Assertions: 3
- [INV-H-012] gesloten factuur PDF bevat alle content sections (recipient, project, uren/tarief) — Techniek: Equivalentieklassen · Assertions: 9

### Mobiele gebruikerservaring

- Feature: `tests/playwright/features/mobile.feature`
- Source: `tests/playwright/mobile-ui.spec.ts`
- Cases: 18

- [MOB-H-001] mobiele login navigatie en dashboard blijven volledig bereikbaar — Techniek: Responsive viewport + end-to-end use-case · Assertions: 31
- [MOB-H-002] mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken — Techniek: Responsive viewport + end-to-end use-case · Assertions: 14
- [MOB-H-003] mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar — Techniek: Responsive viewport + end-to-end use-case · Assertions: 10
- [MOB-N-004] mobiele facturen touch targets en modals blijven binnen viewport — Techniek: Responsive viewport + end-to-end use-case · Assertions: 13
- [MOB-H-005] mobiele verzendadministratie blijft leesbaar en toont geen geheime inhoud — Techniek: Responsive viewport + end-to-end use-case · Assertions: 15
- [MOB-H-006] een uitgenodigde collega stelt op de telefoon een wachtwoord in en ziet een duidelijke bevestiging — Techniek: Responsive viewport + end-to-end use-case · Assertions: 19
- [MOB-H-007] een medewerker leest mededelingen op de telefoon zonder afgekapte tekst — Techniek: Responsive viewport + end-to-end use-case · Assertions: 4
- [MOB-H-008] elk hoofdscherm blijft op een telefoon leesbaar en bedienbaar — Techniek: Responsive viewport + end-to-end use-case · Assertions: 5
- [MOB-H-009] instellingen en urenstaat zijn op een telefoon te overzien — Techniek: Responsive viewport + end-to-end use-case · Assertions: 9
- [MOB-H-010] een veeg over het scherm scrollt de pagina echt — Techniek: Responsive viewport + end-to-end use-case · Assertions: 3
- [MOB-H-011] geen enkele tekst op een telefoon staat onder de leesbare ondergrens — Techniek: Responsive viewport + end-to-end use-case · Assertions: 2
- [MOB-H-012] de app is als PWA te installeren met een echt vierkant icoon — Techniek: Responsive viewport + end-to-end use-case · Assertions: 10
- [MOB-H-013] de uitnodiging om te installeren verschijnt alleen waar hij hoort — Techniek: Responsive viewport + end-to-end use-case · Assertions: 9
- [MOB-H-014] het aanbod om te installeren blijft bereikbaar na wegklikken of verwijderen — Techniek: Responsive viewport + end-to-end use-case · Assertions: 4
- [MOB-H-015] het aanbod verschijnt uit zichzelf, ook zonder melding van de browser — Techniek: Responsive viewport + end-to-end use-case · Assertions: 4
- [MOB-H-016] de knop Installeren doet nooit stil niets — Techniek: Responsive viewport + end-to-end use-case · Assertions: 2
- [MOB-H-017] het installatieaanbod dekt geen knoppen af — Techniek: Responsive viewport + end-to-end use-case · Assertions: 3
- [MOB-H-018] na installatie verdwijnt het installatieaanbod uit de balk en het profielmenu — Techniek: Responsive viewport + end-to-end use-case · Assertions: 2

### Meldingen beheren

- Feature: `tests/playwright/features/notifications.feature`
- Source: `tests/playwright/notifications.spec.ts`
- Cases: 11

- [NOT-H-001] ingelogde gebruiker kan notificaties ophalen — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [NOT-H-002] mark_all_read werkt zonder fouten — Techniek: Toestandsovergang · Assertions: 8
- [NOT-N-003] anonieme gebruiker krijgt 401 op notificaties — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [NOT-N-004] unknown action geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [NOT-H-005] notificatielimiet wordt op minimaal een begrensd — Techniek: Grenswaardenanalyse · Assertions: 3
- [NOT-H-006] unread-filter retourneert uitsluitend ongelezen meldingen — Techniek: Toestandsovergang · Assertions: 3
- [NOT-N-007] mark_read zonder notification_id geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [NOT-H-008] mark_read voor onbekende melding wijzigt nul records — Techniek: Grenswaardenanalyse · Assertions: 2
- [NOT-H-009] alles gelezen wist teller en een oudere response kan deze niet herstellen — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 8
- [NOT-H-010] Herstel zet drie lokale basismeldingen terug en beschermt ze tegen serveroverschrijving — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 15
- [NOT-H-011] medewerker ziet drie echte mededelingen en tellers lopen gelijk terug naar nul — Techniek: Grenswaardenanalyse · Assertions: 10

### Mededelingen versturen, intrekken en verbergen

- Feature: `tests/playwright/features/announcements.feature`
- Source: `tests/playwright/announcements.spec.ts`
- Cases: 6

- [ANN-H-001] beheerder verstuurt een mededeling aan een gekozen medewerker — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [ANN-H-002] een concept blijft intern en kan daarna definitief worden verwijderd — Techniek: API-contract + equivalentieklasse · Assertions: 7
- [ANN-H-003] intrekken met reden en daarna verbergen bij medewerkers — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [ANN-N-004] intrekken zonder reden wordt geweigerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [ANN-N-005] verzenden zonder titel, bericht of ontvanger wordt geweigerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [ANN-N-006] een medewerker kan zelf geen mededeling versturen en anoniem is alles dicht — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2

### Wachtwoordherstel en misbruikbeveiliging

- Feature: `tests/playwright/features/password-reset.feature`
- Source: `tests/playwright/password-reset.spec.ts`
- Cases: 19

- [PWD-H-001] request-reset retourneert token in demo-modus — Techniek: Toestandsovergang · Assertions: 12
- [PWD-H-002] onbekend e-mailadres retourneert ook ok=true (geen email-enumeration) — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [PWD-H-003] me.php bevat force_password_change veld — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [PWD-H-004] ingelogde gebruiker kan het eigen wachtwoord veilig wijzigen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [PWD-H-005] medewerker stelt via een eenmalige e-maillink zelf een wachtwoord in — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [PWD-H-006] TEST-links zijn herhaalbaar zonder normale misbruikbegrenzing te verzwakken — Techniek: Beslissingstabel + equivalentieklassen + toestandsovergang · Assertions: 16
- [PWD-N-010] twee verschillende wachtwoorden worden in de GUI niet verstuurd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4
- [PWD-N-011] elf tekens ligt onder de wachtwoordgrens van twaalf — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [PWD-N-004] reset-password met ongeldig token geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [PWD-N-005] reset-password onder twaalf tekens geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [PWD-N-006] hergebruik van al-gebruikt token geeft 409 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [PWD-N-007] login wordt geblokkeerd na 5 mislukte pogingen (rate-limit) — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [PWD-N-008] request-reset weigert GET — Techniek: Toestandsovergang · Assertions: 2
- [PWD-N-009] request-reset met leeg e-mailadres geeft 400 — Techniek: Toestandsovergang · Assertions: 2
- [PWD-H-012] een aangevraagde reset wordt ook echt verzonden, niet alleen in de wachtrij gezet — Techniek: Toestandsovergang · Assertions: 24
- [PWD-H-014] wachtwoord-vergeten op het inlogscherm verraadt niet welke e-mailadressen bestaan — Techniek: API-contract + equivalentieklasse · Assertions: 11
- [PWD-N-015] het resetscherm neemt het ingevulde adres over, weigert een leeg adres en laat terugkeren naar inloggen — Techniek: Toestandsovergang · Assertions: 10
- [PWD-N-016] productie toont nooit dry-run-jargon aan iemand die zijn wachtwoord kwijt is — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 7
- [PWD-H-017] een uitnodigingslink opent het wachtwoordscherm, ook als er al iemand is ingelogd — Techniek: API-contract + equivalentieklasse · Assertions: 8

### Maandperiodes beheren

- Feature: `tests/playwright/features/period-management.feature`
- Source: `tests/playwright/period-management.spec.ts`
- Cases: 10

- [PER-H-001] admin kan periodes ophalen met overzicht — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [PER-H-002] admin kan periode sluiten en heropenen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 9
- [PER-N-003] anonieme gebruiker krijgt 401 op periods — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [PER-N-004] medewerker mag geen periodes beheren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [PER-N-005] dubbel sluiten van periode geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [PER-N-006] heropenen van open periode geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [PER-N-007] driecijferig jaar geeft 400 — Techniek: Grenswaardenanalyse · Assertions: 2
- [PER-N-008] vijfcijferig jaar geeft 400 — Techniek: Grenswaardenanalyse · Assertions: 2
- [PER-N-009] ongeldige maand geeft 400 — Techniek: Grenswaardenanalyse · Assertions: 2
- [PER-N-010] onbekende periodeactie geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2

### Veilige productieconfiguratie en deployment

- Feature: `tests/playwright/features/production-safety.feature`
- Source: `tests/playwright/production-safety.spec.ts`
- Cases: 21

- [SAFE-H-001] login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn — Techniek: API-contract + equivalentieklasse · Assertions: 9
- [SAFE-H-012] TEST toont accountkeuze met autofill en een afgeschermde gedeelde reset — Techniek: Beslissingstabel + equivalentieklassen + toestandsovergang · Assertions: 19
- [SAFE-H-014] gedeelde TEST-reset herstelt alleen de exacte veilige 12-actiebaseline — Techniek: Beslissingstabel + equivalentieklassen + toestandsovergang · Assertions: 29
- [SAFE-H-015] TEST-deploy herstelt en verifieert de vaste accountbaseline vóór cutover — Techniek: Herstelbaarheid + toestandsovergang · Assertions: 23
- [SAFE-N-001] frontend source bevat geen plaintext demo-credentials — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SAFE-N-002] writes zonder csrf blijven geblokkeerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SAFE-H-002] timesheet writeflow blijft werkend (draft + submit) — Techniek: API-contract + equivalentieklasse · Assertions: 8
- [SAFE-N-003] productieconfig zet demo-migraties standaard uit — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 9
- [SAFE-H-003] health.php bevat productieguard die technische details onderdrukt — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [SAFE-H-009] productie-health accepteert een schone database zonder demodata — Techniek: Equivalentieklassen + toestandsovergang · Assertions: 7
- [SAFE-N-004] install.php en migrate.php bevatten productieguards — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [SAFE-N-008] lokale productieconfig is via HTTP expliciet geblokkeerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SAFE-H-004] config.example.php bevat mail.enabled=false als standaard — Techniek: API-contract + equivalentieklasse · Assertions: 5
- [SAFE-N-005] live login verbergt lokale accountkeuze en valt gesloten uit zonder authservice — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 11
- [SAFE-N-006] destructieve DB-testsetup weigert productie en niet-testdatabases — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 15
- [SAFE-N-007] productieconfigurator verwerkt DB-secret uitsluitend interactief en fail-closed — Techniek: Toestandsovergang · Assertions: 14
- [SAFE-H-005] SMTP-dispatch en operationele scripts blijven fail-closed — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 25
- [SAFE-H-010] echte TEST-mail vereist opt-in en een ontvangers-whitelist — Techniek: API-contract + equivalentieklasse · Assertions: 16
- [SAFE-H-013] TEST-mailsandbox opent atomisch voor twee toegestane TEST-ontvangers (sink + CC) — Techniek: API-contract + equivalentieklasse · Assertions: 27
- [SAFE-H-006] eerste productieorganisatie wordt gevalideerd en zonder overschrijven ingericht — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 18
- [SAFE-H-011] groene main-pipeline rolt exact dezelfde release veilig uit naar productie — Techniek: Toestandsovergang + foutinjectie + beslissingstabel · Assertions: 23

### Rollen, rechten en gegevensafscherming

- Feature: `tests/playwright/features/roles-authorization.feature`
- Source: `tests/playwright/roles-api.spec.ts`
- Cases: 3

- [ROLE-N-003] zonder sessie geeft protected API 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2
- [ROLE-H-001] admin ziet volledige data — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [ROLE-H-002] employee ziet alleen eigen data — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8

### Authenticatie- en API-beveiliging

- Feature: `tests/playwright/features/security.feature`
- Source: `tests/playwright/security.spec.ts`
- Cases: 14

- [SEC-H-001] csrf token endpoint werkt — Techniek: API-contract + equivalentieklasse · Assertions: 4
- [SEC-H-002] login met csrf werkt — Techniek: API-contract + equivalentieklasse · Assertions: 2
- [SEC-H-003] logout met csrf werkt — Techniek: API-contract + equivalentieklasse · Assertions: 1
- [SEC-N-001] login zonder csrf faalt netjes — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SEC-N-002] logout zonder csrf faalt netjes — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SEC-N-003] invalid login payload geeft nette error — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 3
- [SEC-N-004] zonder sessie protected API blijft 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [SEC-H-004] csrf-token blijft stabiel binnen dezelfde sessie — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [SEC-N-005] csrf-endpoint weigert POST — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SEC-N-006] login-endpoint weigert GET — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SEC-N-007] logout-endpoint weigert GET — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 2
- [SEC-H-005] sessiecode bevat expliciete timeout-check en sliding expiration — Techniek: API-contract + equivalentieklasse · Assertions: 3
- [SEC-H-006] herhaalde mislukte loginpogingen maken security-audit event — Techniek: API-contract + equivalentieklasse · Assertions: 4
- [SEC-H-007] config voorbeeld bevat voorbereide CSP/CORS/HSTS flags — Techniek: API-contract + equivalentieklasse · Assertions: 3

### Correctie- en goedkeuringsproces

- Feature: `tests/playwright/features/correction-approval-workflow.feature`
- Source: `tests/playwright/timesheet-review-flow.spec.ts`
- Cases: 3

- [TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking — Techniek: Concurrency + toestandsovergang · Assertions: 65
- [TS-REV-API-H-006] gelijktijdige approve-requests door twee beheerders leveren exact één winnaar — Techniek: Concurrency + toestandsovergang · Assertions: 7
- [TS-REV-API-H-007] jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens — Techniek: API-contract + equivalentieklasse · Assertions: 7

### Correcties en goedkeuringen behandelen

- Feature: `tests/playwright/features/correction-approval-ui.feature`
- Source: `tests/playwright/timesheet-review-ui.spec.ts`
- Cases: 6

- [TS-REV-UI-H-008] browserflow: correctie, herindiening, goedkeuring en heropening blijven servergestuurd — Techniek: Toestandsovergang · Assertions: 29
- [TS-REV-UI-H-009] ingediende urenstaat blijft vergrendeld tot Backoffice een correctie vraagt — Techniek: Toestandsovergang · Assertions: 5
- [TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat — Techniek: End-to-end use-case + visuele contractasserties · Assertions: 3
- [TS-REV-UI-N-011] localhost kan demo-uren zonder serverversie voor correctie terugsturen — Techniek: Toestandsovergang · Assertions: 4
- [TS-REV-UI-N-012] gefactureerde goedkeuring blijft bij serverweigering vergrendeld — Techniek: Toestandsovergang · Assertions: 6
- [TS-REV-UI-H-011] urencontrole toont dag/week-uitsplitsing vóór goedkeuren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8

### Urenregistratie verwerken

- Feature: `tests/playwright/features/time-registration.feature`
- Source: `tests/playwright/timesheet-write.spec.ts`
- Cases: 5

- [TS-API-H-001] employee save draft, read back, submit; daarna zit de urenstaat op slot — Techniek: API-contract + equivalentieklasse · Assertions: 32
- [TS-API-N-010] employee mag geen andere medewerker schrijven — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 4
- [TS-API-N-011] write zonder csrf geeft 403 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [TS-API-N-003] write zonder sessie geeft 401 — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [TS-API-N-004] ongeldige payload geeft 400 — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 4

### Team en toegang beheren

- Feature: `tests/playwright/features/team-access.feature`
- Source: `tests/playwright/user-management.spec.ts`
- Cases: 11

- [USR-H-001] admin ziet alle gebruikers van het bedrijf — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [USR-H-002] admin kan medewerker deactiveren en heractiveren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [USR-H-003] admin kan force_password_change instellen — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [USR-N-004] anonieme gebruiker krijgt 401 op user-list — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [USR-N-005] medewerker mag geen gebruikersbeheer uitvoeren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 1
- [USR-N-006] admin kan zichzelf niet deactiveren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 2
- [USR-N-007] dubbel deactiveren geeft 409 — Techniek: Toestandsovergang · Assertions: 2
- [USR-H-008] inactieve medewerker zonder historie kan definitief worden verwijderd — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 9
- [USR-N-009] medewerker met zakelijke historie kan niet definitief worden verwijderd — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 6
- [USR-H-010] inactieve beheerder zonder historie kan definitief worden verwijderd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [USR-H-011] beheerder verstuurt vanuit Teambeheer een resetlink voor medewerker en beheerder — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7

### Live TEST-regressie en deployacceptatie

- Feature: `tests/playwright/features/live-test-regression.feature`
- Source: `tests/playwright/../remote/*.spec.ts`
- Cases: 37

- [TEST-E2E-13] klanturenstaat-toestandsketen: indienen, opnieuw opvragen, herindienen, goedkeuren, brokerroute — Techniek: Toestandsovergang · Assertions: 20
- [TEST-E2E-15] uren-invoer EP/BVA: 0 en 24 door, negatief, >24 en niet-numeriek fail-closed — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 10
- [TEST-E2E-19] robuustheid: te lange invoer begrensd, dubbele acties idempotent, gelijktijdige writes consistent — Techniek: Concurrency + toestandsovergang · Assertions: 19
- [TEST-E2E-21] exploratory: mededeling plaatsen, ontvangen, intrekken met historie; instellingenmenu compleet — Techniek: API-contract + equivalentieklasse · Assertions: 18
- [TEST-E2E-34] een mededeling met scriptinhoud belandt als tekst bij de medewerker, niet als code — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [TEST-E2E-22] herinneringen: samenvatting volgt exact de instellingen, klanturenstaat-tijd bereikt de server, voorbeeld zonder neveneffect — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 18
- [TEST-E2E-23] verse beheerder: aanmaken, inloggen, goedkeuren en factuur afronden — Techniek: Toestandsovergang · Assertions: 10
- [TEST-E2E-24] medewerker deactiveren blokkeert inloggen; data blijft; heractiveren herstelt toegang — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [TEST-E2E-27] goedgekeurde urenstaat zonder factuur mag terug naar correctie; met factuur wordt heropenen geweigerd — Techniek: Toestandsovergang · Assertions: 8
- [TEST-E2E-30] twee medewerkers met hetzelfde nummer-sjabloon in dezelfde periode krijgen elk een uniek nummer — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 7
- [TEST-E2E-31] Marc en Brian: volledige afrond-flow levert de branded jsPDF-factuur — Techniek: Equivalentieklassen · Assertions: 2
- [TEST-E2E-10] elke bestaande factuur heeft een echt nummer en geen CONCEPT-markering in de PDF — Techniek: Equivalentieklassen · Assertions: 6
- [TEST-E2E-11] nieuwe medewerker via het beheer-scherm: volledige flow tot de jsPDF-conceptfactuur — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [TEST-E2E-25] Overig-ontvanger: het vinkje Factuur meesturen bepaalt op de live site of de bijlage meegaat — Techniek: API-contract + equivalentieklasse · Assertions: 9
- [TEST-E2E-12] urenstaat-toestandsketen: indienen, correctie, herindienen, goedkeuren; ongeldige overgang geweigerd — Techniek: Toestandsovergang · Assertions: 12
- [TEST-E2E-14] klanturenstaat-upload: geldige typen door, ongeldige fail-closed, concept ongewijzigd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 15
- [TEST-E2E-16] rol-beslissingstabel: medewerker geweigerd op beheeracties, beheerder toegestaan — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [TEST-E2E-17] één factuuractie levert exact drie gescheiden routes met het juiste bijlagebeleid — Techniek: API-contract + equivalentieklasse · Assertions: 9
- [TEST-E2E-18] negatieve controles: CSRF verplicht, XSS geëscaped, stale version geweigerd — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 9
- [TEST-E2E-20] werkvoorraad-invariant: alle acties = Backoffice + medewerkers, ongewijzigd bij maandnavigatie — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 3
- [TEST-E2E-06] elke demo-medewerker ziet alleen eigen data; alle facturen hebben een echt nummer — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 8
- [TEST-E2E-07] nieuwe medewerker met eigen opdracht-opties: volledige keten en eigen factuurnummer — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 12
- [TEST-E2E-08] herinneringen: instelling bewaren en een veilige voorbeeldmelding — Techniek: API-contract + equivalentieklasse · Assertions: 7
- [TEST-E2E-28] een medewerker komt niet bij de gegevens of acties van een andere medewerker — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 11
- [TEST-E2E-01] inloggen: juiste credentials binnen, foute geweigerd — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 5
- [TEST-E2E-02] wachtwoord vergeten: aanvraag, nieuw wachtwoord, oude link vervalt — Techniek: API-contract + equivalentieklasse · Assertions: 6
- [TEST-E2E-03] medewerker aanmaken, laat hem zelf inloggen en alleen eigen uren zien — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 9
- [TEST-E2E-04] volledige factuur- en mailketen met PDF- en mailinhoudcontrole — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 21
- [TEST-E2E-05] acceptatieconsole verstuurt de vijf scenario-mails naar de sink — Techniek: API-contract + equivalentieklasse · Assertions: 9
- [TEST-E2E-29] een wachtwoord-vergeten-aanvraag wordt op de live SMTP-weg echt verstuurd — Techniek: API-contract + equivalentieklasse · Assertions: 8
- [TEST-E2E-33] de wachtwoord-reset-drempel stopt de vierde aanvraag binnen het venster — Techniek: Toestandsovergang · Assertions: 7
- [TEST-SMOKE-01] de TEST-site draait de verwachte versie met veilige headers — Techniek: API-contract + equivalentieklasse · Assertions: 7
- [TEST-E2E-26] de deploy levert de veiligheidsheaders en PWA-assets die de app nodig heeft — Techniek: API-contract + equivalentieklasse · Assertions: 20
- [TEST-E2E-32] de live sessie is een veilige cookie en valt na uitloggen echt om — Techniek: API-contract + equivalentieklasse · Assertions: 8
- [TEST-SMOKE-02] beheerder kan inloggen en elke view laadt zonder fouten — Techniek: Negatieve equivalentieklasse + error guessing · Assertions: 6
- [TEST-SMOKE-03] medewerker ziet alleen de eigen uren — Techniek: Beslissingstabel rollen en autorisatie · Assertions: 5
- [TEST-SMOKE-04] de factuurpreview rendert met bedragen en bedrijfsidentiteit — Techniek: API-contract + equivalentieklasse · Assertions: 4

### Database-integriteit en CRUD-controle

- Feature: `tests/playwright/features/database-integrity.feature`
- Source: `database/queries/crud-smoke.sql + scripts/run-db-crud-smoke.mjs`
- Cases: 1

- [DB-H-001] CRUD smoke test werkt in een geïsoleerde tijdelijke tabel — Techniek: API-contract + equivalentieklasse · Assertions: 3

## Rapportage

- Suites: UI Desktop, UI Mobile, API, Security, DB / SQL en DB / Integratie.
- Epic: Path Uren & Facturatie.
- SubSuite: Happy of Negative.
- API request/response-attachments worden centraal geredigeerd.
- UI-screenshots zijn selectief; trace, video en failure-screenshot volgen de Playwright failure-policy.

## Bijwerken

1. Wijzig of voeg eerst de native Playwright-case met unieke ID toe.
2. Voeg voor directe SQL/DB-validatie een case toe via de database-definitie in de sync-script.
3. Draai `node scripts/sync-living-docs.mjs`.
4. Controleer de feature/steps/spec/Allure mapping.
5. Draai `npm run test:e2e`, `npm run allure:generate` en `npm run check`.
