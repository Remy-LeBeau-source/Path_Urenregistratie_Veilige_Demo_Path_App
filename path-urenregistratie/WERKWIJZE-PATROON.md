# Werkwijzepatroon — van bedrijfsregel naar groene release

Dit document is de vaste uitvoeringsvolgorde voor iedere wijziging. Het voorkomt dat een zichtbaar
scherm wordt gerepareerd terwijl een eerdere of latere stap in dezelfde bedrijfsketen breekt.

## 1. Eerst het contract lezen

- Fetch vóór ieder nieuw werkblok `origin/main` en `origin/herontwerp`, controleer de
  recente commits en lees de actuele herontwerp-handoff volledig. Voor pilotwerk zijn
  minimaal `HANDOFF-CODEX-FASE-D.md` en `HANDOFF-PILOT-DESIGN.md` verplicht; lees daarnaast
  de meest recent bijgewerkte handoff waarnaar zij verwijzen. Controleer daarna pas de
  werkboom, zodat parallel werk van Claude/Codex niet wordt overschreven of dubbel gebouwd.
- Lees het Functioneel Ontwerp voor rollen, eigenaar, statussen en vervolgacties.
- Lees het Technisch Ontwerp voor servergezag, synchronisatie, opslag en beveiliging.
- Zoek de bestaande featurecase, Playwright-test, API en database-relaties.
- Controleer zowel LOCAL, TEST als PROD-beleid; bedrijfslogica is gelijk, alleen data, reset,
  accountkeuze en mailaflevering mogen per omgeving verschillen.

## 2. Impact als keten bepalen

Volg altijd de volledige route:

`startstatus → gebruikersactie → API-write → readback → taakprojectie → teller → vervolgactie → mailqueue → SMTP-status`

Leg vooraf vast:

- wie de actie vóór en na de overgang bezit;
- welke teller gelijk blijft, stijgt of daalt;
- welke serverstatus gezaghebbend is;
- welke documenten vóór afronden controleerbaar moeten zijn;
- welke mailroutes en bijlagen ontstaan;
- wat bij een dubbele klik, fout, stale versie, maandwissel, rolwissel en F5 gebeurt.

## 3. Testontwerp toepassen

Gebruik waar relevant:

- toestandsovergangen voor uren, correctie, klanturenstaat, factuur en mail;
- beslissingstabellen voor rol × status × omgeving × bijlagen;
- equivalentieklassen en grenswaarden voor invoer, datum, wachtwoord en retries;
- pairwise voor rol × omgeving × actie;
- negatieve autorisatie en foutinjectie;
- ketentests voor medewerker → Backoffice → mail/afronding;
- invarianten voor globale tellers bij maandwissel, rolwissel en refresh.

Elke nieuwe bedrijfsregel krijgt minimaal:

1. een leesbare featurecase met unieke ID;
2. uitvoerbare Playwright-asserties;
3. een negatief of herstelpad wanneer falen mogelijk is;
4. een GUI-smokecase als de hoofdketen of een releasekritieke bediening verandert;
5. een rij in de traceerbaarheid van FO/TO.

## 4. Vaste mailregel

Eén afgeronde standaardfactuuractie maakt exact drie gescheiden queue-items:

| Route | Bericht | Bijlagen |
|---|---|---|
| Broker | factuurbericht; klanturenstaat via aparte brokeractie | factuur; klanturenstaat pas na die controle |
| Boekhouding | factuuradministratie | alleen factuur |
| Salarisadministratie | ureninformatie | geen bijlage |

In TEST gaan de drie SMTP-afleveringen fysiek naar `giovanno.maatsen@pathconsultancy.nl`, met
`kenrich.lieveld@pathconsultancy.nl` als vaste CC. De bedoelde productieontvanger, route, onderwerp
en attachment policy blijven zichtbaar en auditbaar. Iedere functionele route blijft een eigen
bericht; CC wordt uitsluitend gebruikt om beide TEST-beoordelaars dezelfde sandboxmail te geven.

Een klanturenstaat moet vóór **Controle afronden** gereed zijn: `received` of
`Al rechtstreeks gemaild` met reden is voldoende. Externe bevestiging is daarna een aparte,
optionele Backoffice-actie en geen voorwaarde voor de factuurblokkade.

## 5. Uitvoeringsvolgorde

1. Pas de kleinste coherente productwijziging toe.
2. Werk feature, Playwright-spec, FO en TO in dezelfde wijziging bij.
3. Draai syntax/smoke en de gerichte positieve en negatieve cases.
4. Draai `npm run test:gui-smoke`.
5. Draai de volledige regressie en build volgens de releasepipeline.
6. Controleer `git diff --check`, scope en gegenereerde `dist`/living docs.
7. Commit en push alleen groen; volg vervolgens de pipeline tot en met TEST/PROD-deploy.
8. Bij een fout: bewijs de oorzaak, voeg eerst de ontbrekende regressie toe, repareer en herhaal
   vanaf de kleinst falende laag. Verhoog geen timeout en gebruik geen forced click als maskering.

## 6. Overdracht en documentatie vastleggen

Werk na iedere betekenisvolle diagnose, codewijziging of test de overdracht bij:

1. Leg een nieuwe productkeuze vast in `BESLISTABEL.md`.
2. Beschrijf gebruikersgedrag in `FUNCTIONEEL-ONTWERP.md` en status/API/DB-contracten in
  `TECHNISCH-ONTWERP.md`.
3. Wijzig de kleinste coherente code-slice.
4. Voeg een unieke featurecase, Playwright-test, step-mapping en waar nodig smoke-/GUI-regel toe.
5. Draai syntax/smoke, gerichte positieve en negatieve tests, GUI-smoke en daarna de brede gate.
6. Draai `npm run docs:sync` na testwijzigingen en controleer `LIVING-DOC.md` en
  `TEST-BDD-MAPPING.md`.
7. Werk `COPILOT_HANDOFF.md` bij met datum, conclusie, bewijs, bestanden, tests, blokkade en
  volgende stap. Voor `herontwerp` hoort dit ook in de Fase-D-handoff.
8. Versioneer, commit en push alleen na groene controles; PROD blijft achter de reviewerpoort.

De actuele taakstatus staat in `MASTERCHECKLIST.md`. De handoff beschrijft de overdracht, maar
vervangt de checklist, ontwerpdocumenten of uitvoerbare tests niet.

## 7. Geen vraaglus bij oplevering

- Vertaal iedere zichtbare gebruikersmelding eerst naar één concrete browserketen met beginstand,
  actie en zichtbaar eindresultaat; vraag niet opnieuw naar informatie die al in chat, screenshot of
  overdracht staat.
- Een groene brede regressie vervangt nooit de eigen zichtbare eindtest van precies die keten.
- Bouw de handmatige acceptatiestappen die de gebruiker krijgt ook in als echte Playwright-case en,
  wanneer releasekritiek, in `test:gui-smoke`.
- Controleer na iedere write alle geraakte projecties: serverreadback, belbadge, schermfilter, lijst,
  rolwissel en F5 waar relevant. Alleen een API-status of één teller is onvoldoende.
- Verhoog de patchversie en zichtbare versielabels vóór de gebruiker opnieuw lokaal test, zodat
  ondubbelzinnig zichtbaar is welke oplevering wordt beoordeeld.
- Zeg pas `Je kunt nu testen op localhost` nadat de gerichte browsercase, GUI-smoke en vereiste
  regressie zelf zijn uitgevoerd en groen zijn. Meld tussendoor actief diagnose, wijziging en tests.

## 8. Klaarcriteria

Een wijziging is pas klaar wanneer:

- de serverstatus en UI dezelfde waarheid tonen;
- tellers en eigenaar bij elke overgang kloppen;
- documenten vóór verzending geopend kunnen worden en iedere getoonde bijlagetelling naar exact
  zoveel afzonderlijk klikbare serverbijlagen leidt;
- queue en uiteindelijke SMTP-status niet door elkaar worden gehaald;
- LOCAL/TEST/PROD-beleid aantoonbaar gescheiden blijft;
- smoke, regressie, documentatie en pipeline groen zijn.
# Controle bij wijzigingen aan e-mail

Bij iedere mailwijziging worden minimaal deze toestanden aantoonbaar gecontroleerd: LOCAL/dry-run, TEST actief, TEST gepauzeerd en PROD zonder TEST-schakelaar. De UI-status moet rechtstreeks overeenkomen met de serverstatus. Tests bewijzen daarnaast dat TEST-ontvangers niet vanuit de browser kunnen worden verruimd en dat elke mutatie CSRF plus een expliciete bevestiging vereist.
