# Overdracht aan Claude — verplichte klanturenstaat, veilig indienen, medewerker-mails en herinneringen

Bijgewerkt op 7 september 2026. Dit document is zelfstandig leesbaar.

> Ik heb de merge-queue gecontroleerd: `herontwerp` is automatisch gefast-forwarded naar `main`. Ik heb dit niet handmatig naar `main` gepusht. Beide branches staan nu op `40ad8b1`.

De merge naar `main` is dus gelukt. Alleen de automatische release-handoff ontbrak tijdens die queue-run, omdat die run nog de eerdere workflowdefinitie vanaf `main` gebruikte. Release Pipeline-run `34167621706` is daarom handmatig gestart als tijdelijke overgang en draaide bij de laatste controle voor `main`/`40ad8b1` richting TEST. De definitie die nu op `main` staat bevat sinds commit `5e84fb8` zowel `actions: write` als de expliciete `createWorkflowDispatch` voor `release-pipeline.yml`; bouw geen tweede queue en raak PROD niet aan.

## 1. Huidige stand en veilige werkvolgorde

- Basis: `main` op `4809911` (`fix: herstel releasepipeline en mobiele urenweergave`). De kleine weekknopfix staat lokaal op `fix/week-save-only` als versie `1.0.11`; neem die later gecontroleerd op in `herontwerp`, niet rechtstreeks tijdens de lopende herontwerpcontrole.
- De releasepipeline van die commit: <https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/actions/runs/34158865852>. Controleer de actuele conclusie voordat nieuw werk wordt gemerged of gepromoveerd.
- `npm run check` was lokaal groen met 440 uitvoerbare cataloguscases. Gerichte regressie `DASH-N-015`, `MOB-H-002` en `E2E-H-019` was groen.
- De laatste UI-fix toont `September: 2 open acties` en maakt de horizontale weeknavigatie op mobiel zichtbaar en bedienbaar.
- Niets uit de hieronder beschreven nieuwe productwens is al geïmplementeerd. Bouw eerst op LOCAL, daarna volledige regressie en TEST. PROD alleen via de bestaande promotiepipeline en uitsluitend nadat TEST groen en handmatig geaccepteerd is.
- De 1919-pilotpagina's blijven alleen op LOCAL/TEST en gaan vooralsnog niet naar PROD.

### Kleine-fixeschecklist

- [x] Open-actiesregel leesbaar als `September: 2 open acties`.
- [x] Mobiele weeknavigatie zichtbaar en horizontaal bedienbaar.
- [x] Lokaal voorbereid: weekweergave toont alleen **Week opslaan**; **Maand indienen** staat alleen onder **Hele maand** (`TS-REV-UI-H-013`). Nog niet pushen zolang de actuele `herontwerp`-controle loopt.
- [ ] Niet-actieve pilotknoppen individueel markeren als `Demo`/`Nog niet actief`; de algemene pilotbalk alleen is niet voldoende.
- [ ] `scripts/set-version.mjs` met een echte tokengrens hardenen.
- [ ] Optioneel cosmetisch: sub-seconde eerste-frameflits tijdens `auth=checking` verwijderen.

### Branch- en merge-queuewerkelijkheid

De automatische workflow bestaat al op `main`: `.github/workflows/pilot-merge-queue.yml`, toegevoegd in commit `5376f95`. Bouw geen tweede workflow. Hij reageert alleen op een volledig groene workflow `CI` voor `herontwerp`, eist dat de geteste herontwerpcommit de actuele `main` bevat, wacht tot geen Release Pipeline op `main` actief is en fast-forwardt daarna exact die groene SHA naar `main`. De daaropvolgende main-pipeline gaat naar TEST; PROD blijft achter de handmatige reviewerpoort.

Bij de laatste controle staan `origin/main` en `origin/herontwerp` beide op `40ad8b1`. Neem bij volgende iteraties `main` opnieuw in `herontwerp` op zodra ze uiteenlopen. De queue hoort bij rode CI of een achterlopende branch niets te mergen. Neem nooit de duizenden lokale `node_modules`-wijzigingen uit een IDE-werkboom mee.

Concrete instructie voor de herontwerp-werkboom:

```text
git fetch origin
git switch herontwerp
git merge origin/main
```

Los daarna alleen echte conflicts en testfouten op, commit en push uitsluitend naar `origin/herontwerp`. Een volledig groene workflow `CI` op die gepushte SHA triggert vanzelf **Pilot naar main (wachtrij)**. Bij een fout over schrijfrechten: controleer GitHub → Settings → Actions → General → Workflow permissions (`Read and write permissions`) en de branchregels voor geautomatiseerde fast-forward pushes. Maak geen tweede queue-workflow en stage nooit `node_modules`.

Lees vóór implementatie volledig: `AGENTS.md`, `WERKWIJZE-PATROON.md`, `FUNCTIONEEL-ONTWERP.md`, `TECHNISCH-ONTWERP.md`, de betrokken featurebestanden en de bijbehorende specs/servercode. Nieuwe bedrijfslogica is pas klaar met FO + TO + feature + uitvoerbare Playwright-assertions + GUI-smoke + traceerbaarheid in dezelfde wijziging.

## 2. Definitieve productbeslissingen

### 2.1 Klanturenstaat is verplicht

Voor iedere actieve medewerker en iedere toegankelijke werkmaand is een klanturenstaat vereist. De oude opdrachtoptie om facturatie zonder klanturenstaat toe te staan vervalt als functionele bypass.

Er zijn precies twee geldige groene eindpaden:

1. een officieel PDF/JPG/PNG-document is ingediend en door Backoffice goedgekeurd;
2. de medewerker registreert **Al rechtstreeks gemaild** en Backoffice legt daarna met verplichte reden **Extern bevestigd** vast.

`Al rechtstreeks gemaild` door de medewerker alleen blijft oranje, blijft een open actie en blokkeert afronding. Alleen Backoffice kan hem groen maken. Terugdraaien van de externe bevestiging maakt de klanturenstaat opnieuw oranje en blokkerend.

### 2.2 Week opslaan, maand indienen

- In een weekweergave bestaan alleen conceptacties: **Opslaan** en weeknavigatie.
- De definitieve knop **Maand indienen** staat alleen in **Hele maand**.
- De knop blijft daar altijd zichtbaar, zodat de gebruiker weet waar de eindactie staat.
- Zolang de maand niet compleet verantwoord is, is de knop uitgeschakeld. Direct erboven staat bijvoorbeeld: **Nog 3 werkdagen invullen: ma 7, wo 9 en vr 11 september**. De genoemde dagen zijn aanklikbaar en visueel gemarkeerd.
- De pagina legt uit: **Vul uren, verlof of ziekte in. Niet gewerkt? Laat het veld leeg en sla de dag bewust op als Geen uren (0 uur).**
- Een succesvol opgeslagen leeg veld telt dus als een bewuste dagverantwoording. Een nooit opgeslagen lege dag telt niet.

Technisch zijn daarom minimaal twee toestanden nodig; alleen een nullable urenwaarde is onvoldoende:

| Dagtoestand | Betekenis | Telt compleet? | Weergave |
|---|---|---:|---|
| onaangeraakt | gebruiker heeft de dag niet verantwoord | nee | `Nog invullen` |
| bewust leeg opgeslagen | geen uren gewerkt | ja | `Geen uren · 0,00` |
| uren opgeslagen | gewerkte uren | ja | aantal uren |
| verlof opgeslagen | verlof verantwoord | ja | `Verlof` + uren volgens beleid |
| ziekte opgeslagen | ziekte verantwoord | ja | `Ziekte` + uren volgens beleid |

Gebruik een expliciet veld zoals `is_accounted`/`entry_state`; leid dit niet af uit `hours IS NULL`. Bestaande historische dagregels moeten in een idempotente migratie bewust worden gemapt en de migratiekeuze moet in het TO staan.

Bij **Maand indienen** verschijnt een controlesamenvatting met de periode, totaaluren, uren/verlof/ziekte/geen-uren per dag en expliciet `Niet ingevuld: geen`. Alleen na bevestiging volgt één serverwrite. UI én API blokkeren een onvolledige maand; omzeilen van de grijze knop mag dus niet werken. `0` en bewust leeg opgeslagen zijn geldige grensklassen; onaangeraakt null is ongeldig voor indienen.

### 2.3 Ontvangstmail na indienen en herindienen

Na iedere succesvolle `submit` of `resubmit` wordt precies één persoonlijke ontvangstmail voor de medewerker aangemaakt. Niet bij klikken, concept opslaan of een door de server geweigerde indiening.

Inhoud:

- onderwerp en begeleidende standaardtekst zijn aanpasbaar bij **Instellingen → Teksten**, volgens hetzelfde override/fallback-contract als de bestaande mailkanalen;
- de vaste opgemaakte afzenderhandtekening **Robot Path IT** blijft automatisch toegevoegd, ook bij een eigen tekst;
- HTML en plain-text variant;
- een Path-branded PDF-bijlage met medewerker, klant/project, periode, generatietijd, status `Ingediend`, dagregels en een prominent totaal;
- nooit tarief, bedrag, btw, factuurnummer of euroteken;
- sectie **Niet ingevulde werkdagen**. Bij een geldige indiening is dit `Geen`; de pre-submit-controle toont eventuele ontbrekende dagen en blokkeert dan verzending.

Bij correctie en herindienen ontstaat een nieuwe ontvangstmail en een nieuwe PDF-snapshot met de gecorrigeerde waarden. De eerste mail blijft als auditrecord bestaan. Een dubbele/retry-write met dezelfde idempotentiesleutel maakt nooit twee ontvangstbewijzen.

Voorgestelde nieuwe templatekanalen:

- `timesheet_submission_receipt` — ontvangst na indienen/herindienen;
- `timesheet_final_approval` — definitieve goedkeuring na afronding.

Voeg alle gebruikte tokens toe aan de servervalidatie, minimaal `{medewerker}`, `{klant}`, `{periode}`, `{maand}`, `{jaar}` en `{uren}`. De robotnaam, rol, logo en contactregels zijn onderdeel van de vaste afzendershell en niet vrij bewerkbaar als berichttekst. Hergebruik de bestaande HTML-handtekening uit `server/auth/password-reset-service.php` via een gedeelde renderer; kopieer geen tweede afwijkende Robot Path IT-opmaak.

### 2.4 Definitieve afronding en goedkeuringsmail

**Controle afronden** is de laatste Backoffice-actie en is alleen toegestaan als:

- de urenstaat door Backoffice is goedgekeurd; én
- de klanturenstaat groen is via goedgekeurd document of Backoffice-status `Extern bevestigd`.

Die ene bevestigde actie:

1. maakt/vergrendelt de definitieve factuur;
2. maakt de bestaande afzonderlijke routes voor broker, boekhouder en salarisadministratie volgens hun huidige bijlagenbeleid;
3. maakt daarnaast één aparte medewerker-mail: **Je uren zijn goedgekeurd door Backoffice**;
4. voegt aan die medewerker-mail het actuele Path-urenoverzicht zonder geldbedragen toe;
5. gebruikt opnieuw de vaste Robot Path IT-handtekening en de aanpasbare standaardtekst `timesheet_final_approval`.

Het is dus geen CC/BCC en geen vierde factuurroute: de medewerker-mail is een eigen kanaal en mag nooit de factuur of financiële informatie bevatten. Bij SMTP-fout blijft alleen de betreffende delivery herstelbaar; processtatus en audit mogen niet liegen dat alles verzonden is.

### 2.5 Automatische in-appmeldingen en herinneringen

De huidige serverlijst ondersteunt blijvende meldingen, maar de herinneringsinstellingen voor uren zijn nog niet automatisch: er is nog geen scheduler. Bouw daarom opslag, planning én uitvoering.

Eerste voorgestelde standaardmomenten:

- onvolledige week: vrijdag 14:00;
- onvolledige maand: laatste werkdag 15:00;
- achterstallige maand: eerste werkdag van de volgende maand 09:00;
- klanturenstaat: één werkdag vóór de persoonlijke deadline om 15:00, op de deadline om 10:00 en daarna volgens de ingestelde herhaaltermijn.

Een herinnering wordt server-side opgeslagen, verschijnt in de bel op desktop en mobiel, overleeft F5/nieuwe login, heeft ongelezen/gelezen-status en opent direct de juiste maand/dag/documentactie. De scheduler is idempotent op minimaal `gebruiker + soort + periode + geplande instantie`; meerdere cronruns leveren geen duplicaten. Een optionele e-mailmelding staat los van de in-appmelding: e-mail uitzetten mag de appmelding niet onderdrukken. Dit is in-appfunctionaliteit, niet automatisch OS/PWA-push; echte push is een apart toekomstbesluit.

## 3. Beslissingstabel voor de hoofdflow

| Urenstatus | Klanturenstaat | Actie/eigenaar | Afronden? | Kleur |
|---|---|---|---:|---|
| draft en dagen ontbreken | ieder | medewerker vult/verantwoordt dagen | nee | oranje |
| compleet draft | ontbreekt | medewerker kan maand indienen; klanturenstaat blijft eigen actie | nee | oranje |
| submitted | ontbreekt | Backoffice controleert uren; medewerker levert document | nee | oranje |
| approved | `Al rechtstreeks gemaild` door medewerker | Backoffice moet extern bevestigen | nee | oranje |
| approved | received | Backoffice moet document goedkeuren | nee | oranje |
| approved | approved | Backoffice kan Controle afronden | ja | groen voor beide controles |
| approved | extern bevestigd door Backoffice | Backoffice kan Controle afronden | ja | groen voor beide controles |
| correction | ieder | medewerker corrigeert en dient opnieuw in | nee | oranje |
| invoiced/verzonden | approved of extern bevestigd | afgerond; alle routes auditbaar | n.v.t. | groen |

Uren en klanturenstaat zijn parallelle vereisten. Zet klanturenstaat daarom niet misleidend als vaste stap 2 vóór controle: presenteer `Urencontrole` en `Klanturenstaat` als twee controles die beide vóór `Afronden en verzenden` groen moeten zijn.

## 4. Nieuwe TMAP/ISTQB-testset

Onderstaande ID's zijn gereserveerd als implementatie-opdracht. Voeg ze pas als featurecases toe wanneer de bijbehorende uitvoerbare assertions in dezelfde wijziging bestaan; een alleen-leesbaar scenario zonder test telt niet.

| ID | Techniek | Bewijs |
|---|---|---|
| `TS-API-H-014` | equivalentieklassen + toestandsovergang | uren, verlof, ziekte, expliciet 0 en bewust leeg opgeslagen maken een dag compleet |
| `TS-API-N-015` | grenswaarde + negatieve equivalentieklasse | onaangeraakte null blokkeert submit; lege maar bewust opgeslagen dag wordt geaccepteerd |
| `TS-REV-UI-H-015` | use-case + grenswaarde mobiel/desktop | week toont alleen Opslaan; Hele maand toont altijd Maand indienen en concrete ontbrekende dagen |
| `TS-REV-UI-N-016` | error guessing | geforceerde klik/clientmanipulatie omzeilt de serverblokkade niet |
| `EQ-H-035` | toestandsovergang + idempotentie | succesvolle eerste submit maakt exact één medewerkerdelivery met HTML/plain/Path-PDF |
| `EQ-H-036` | toestandsovergang | correctie + herindienen maakt een nieuwe actuele snapshot zonder het eerste auditrecord te wissen |
| `EQ-N-037` | privacy + beslissingstabel | medewerkers-PDF bevat geen bedrag, tarief, btw, factuurnummer, euroteken of factuur-PDF |
| `EQ-H-038` | equivalentieklasse | aangepast ontvangstsjabloon wint; leeg/herstel valt terug; Robot Path IT staat altijd onder beide varianten |
| `CTS-API-N-017` | beslissingstabel | ontbrekend, concept, received en alleen rechtstreeks gemaild blokkeren server-side afronding |
| `CTS-API-H-018` | toestandsovergang | extern bevestigd met reden maakt groen en afrondbaar; terugdraaien blokkeert opnieuw |
| `E2E-H-028` | end-to-end use-case | complete maand → ontvangstmail → uren goedkeuren → klanturenstaat goedkeuren → afronden → broker/boekhouder/salaris plus aparte medewerkergoedkeuringsmail |
| `E2E-H-029` | alternatief pad | rechtstreeks gemaild blijft oranje → Backoffice extern bevestigd → afronden en juiste vier functionele deliveries |
| `E2E-N-030` | beslissingstabel + herstelbaarheid | uren goedgekeurd maar klanturenstaat niet groen: geen factuurfinalisatie en geen eindmails |
| `NOT-H-012` | tijdgrens + toestandsovergang | eerste urenherinnering verschijnt vrijdag 14:00, blijft na F5 en navigeert naar de juiste maand/dag |
| `NOT-H-013` | tijdgrens | klanturenstaatherinneringen ontstaan vóór/op/na persoonlijke deadline volgens werkdagregels |
| `NOT-N-014` | idempotentie + concurrency | twee scheduler-runs voor dezelfde instantie maken exact één melding |
| `NOT-N-015` | beslissingstabel | complete/inactieve/niet-toegankelijke maand krijgt geen herinnering; e-mail uit laat in-appmelding bestaan |
| `MOB-H-025` | grenswaarde 390 px | Hele maand, ontbrekende-dagenmelding, grijze/actieve submitknop en belmelding zijn zonder horizontale overflow bedienbaar |

Aanvullende assertions per mailcase:

- delivery is gekoppeld aan exact employee + period + timesheet version;
- bijlage is valide PDF, geautoriseerd, `no-store` bij inline preview en heeft een veilige bestandsnaam;
- dagtotalen in PDF zijn gelijk aan serverreadback;
- totaal is de som van dagregels;
- een geweigerde submit schrijft nul deliveries;
- TEST herschrijft de fysieke ontvanger naar de sink maar bewaart de bedoelde medewerker als functionele ontvanger;
- PROD gebruikt het echte persoonlijke accountadres en blijft onder de bestaande mailpolicy/worker vallen.

## 5. Implementatievolgorde

1. Datamodel/migratie voor dagverantwoording en verplichte klanturenstaat; servervalidatie eerst.
2. Week/Hele-maand-UX met toegankelijke blokkadereden en mobiel gedrag.
3. Gedeelde branded urenoverzicht-PDF-generator zonder financiële velden.
4. Twee nieuwe aanpasbare mailtemplates en herbruikbare Robot Path IT-handtekening.
5. Submit/resubmit-receipt met idempotente queuekoppeling.
6. Finale medewerkergoedkeuringsmail binnen de bestaande afrondtransactie/queueflow.
7. Scheduler, database-instellingen en blijvende in-appmeldingen.
8. FO, TO, features, specs, traceability, GUI-smoke, volledige lokale regressie.
9. TEST-deploy; controleer beide bekende rollen en de mailacceptatie fysiek op TEST.
10. Alleen na volledig groen en handmatige acceptatie: de gebruiker start Promote PROD.

## 6. Definition of done

- Geen enkele medewerkermaand kan worden afgerond zonder groene klanturenstaatcontrole.
- Medewerker kan niet per ongeluk te vroeg indienen en ziet exact welke dagen nog aandacht vragen.
- Bewust leeg opslaan is aantoonbaar anders dan nooit invullen.
- Iedere geldige submit/resubmit geeft exact één ontvangstbewijs met correct, financieel schoon PDF-overzicht.
- Iedere definitieve afronding geeft de bestaande zakelijke routes plus exact één persoonlijke goedkeuringsmail.
- Beide nieuwe standaardteksten zijn wijzigbaar en herstelbaar; Robot Path IT blijft altijd toegevoegd.
- In-appherinneringen zijn echt servergestuurd, persistent, navigeerbaar en idempotent.
- Klassiek/nieuw, licht/donker, desktop en mobiel volgen hetzelfde servercontract.
- Alle geplande cases hebben uitvoerbare assertions en staan in FO/TO-traceerbaarheid.
- LOCAL, volledige CI en TEST zijn groen; ontvangen TEST-mails en PDF's zijn handmatig gecontroleerd.
- Pas daarna is PROD-promotie toegestaan.
