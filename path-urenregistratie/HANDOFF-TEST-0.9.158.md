# Handoff TEST 0.9.158 — septemberstart en externe urenbevestiging

Datum: 2 september 2026
Doel: uitsluitend TEST (`https://uren-test.pathconsultancy.nl`), niet PROD.

## Uitkomst

Release 0.9.158 maakt de actuele kalendermaand bij iedere nieuwe login leidend voor zowel Backoffice als medewerkers. Een handmatig gekozen maand blijft binnen de lopende sessie staan; na uitloggen en opnieuw inloggen opent weer september 2026.

De medewerker kan in een volledig lege nieuwe maand alsnog **Al rechtstreeks gemaild** registreren. De server maakt dan veilig de ontbrekende klanturenstaatregistratie aan. Backoffice kan een ontbrekend bestand daarna als **Extern bevestigd** vastleggen met een verplichte reden en een afzonderlijke waarschuwing. Alleen de tweede expliciete bevestiging schrijft de status. De registratie kan via **Externe bevestiging terugdraaien** weer als ontbrekend worden gemarkeerd.

## Verder hersteld tijdens de brede regressie

- Toekomstperioden uit testdata starten geen onbegrensde workflowreads meer. Alleen perioden tot en met de actuele maand worden geladen en maximaal vier reads lopen tegelijk.
- Bij een dubbel e-mailadres blijft de bestaande accountmarkering zichtbaar nadat de blokkademodal is gesloten. De markering verloopt niet langer onzichtbaar achter de modal.
- De terugdraaiactie in het documentarchief is duidelijker vormgegeven en heeft uitleg over het gevolg.

## Zelf naspelen op TEST

### 1. Actuele maand na login

1. Log in als beheerder; controleer dat de maandkeuze **September 2026** toont.
2. Kies handmatig augustus en open meerdere schermen; augustus moet gekozen blijven.
3. Log uit en opnieuw in; september moet weer de standaard zijn.
4. Herhaal dit met een medewerker.

### 2. Medewerker — lege septembermaand

1. Kies op het inlogscherm de klaargezette medewerker **TEST Externe Goedkeuring**.
2. Open september en kies bij de klanturenstaat **Al rechtstreeks gemaild**.
3. Controleer dat een reden verplicht is; kies een algemene reden en voeg eventueel een toelichting toe.
4. Vernieuw de pagina. De status moet bewaard blijven.
5. Draai de registratie terug. De urenstaat moet weer als ontbrekend zichtbaar zijn.

### 3. Backoffice — twee-staps externe bevestiging

1. Log in als Gio en open **Facturen → September 2026**.
2. Open het documentarchief van **TEST Externe Goedkeuring**.
3. Kies **Geen bestand? Extern bevestigen**, selecteer een reden en klik **Reden controleren**.
4. Annuleer bij **Weet je het zeker?**. Er mag nog niets zijn opgeslagen.
5. Herhaal en kies nu **Ja, extern bevestigen**. De urenstaat telt groen mee zonder bestand.
6. Open het documentarchief opnieuw en kies **Externe bevestiging terugdraaien**. De status wordt weer ontbrekend/oranje.

## Vastgelegde testcases en technieken

- `DASH-H-018`: login opent actuele maand, sessiekeuze blijft staan en nieuwe login reset — end-to-end use-case met visuele contractasserties.
- `CTS-API-H-004`: lege maand, verplichte reden, servercreate, readback en restore — toestandsovergang.
- `CTS-API-H-013`: volledige medewerker-GUI, refreshpersistentie en herstel — toestandsovergang.
- `INV-H-020`: eerste klik schrijft niet, annuleren schrijft niet, tweede bevestiging schrijft exact één keer en restore werkt — toestandsovergang.
- `INV-N-019`: lege actuele maand blijft geblokkeerd en wordt nooit onterecht afgerond — toestandsovergang.
- `DASH-H-019`: toekomstgrens en maximaal vier parallelle reads — grenswaardenanalyse.
- `ADM-WR-N-002`: dubbel accountadres maakt geen duplicaat en opent het bestaande account — negatieve equivalentieklasse/error guessing.

De volledige mapping staat in `TEST-BDD-MAPPING.md`; de leesbare rapportage staat in `LIVING-DOC.md` en `live-doc-site/`.

## Lokaal releasebewijs

- Volledige Playwright-regressie: 376 uitvoeringen; 373 direct groen. Drie timingafwijkingen uit de 44-minutenrun zijn afzonderlijk opnieuw groen bevestigd.
- Gerichte GUI-releasepoort na de laatste codewijziging: groen.
- BDD-generatie en uitvoerbare BDD-test: groen.
- Centrale `npm run check`: groen.
- Testdesign-audit: 348 uitvoerbare en 348 gemapte cases, 235 positief en 113 negatief, verdeeld over 25 featurebestanden.
- Productiebuild, database-CRUD, PHP-syntax en dependency-audit: groen; 0 kwetsbaarheden op het ingestelde niveau.
- Living Documentation sync en bundle: groen.

## Grenzen en veiligheid

- Deze release is niet naar PROD gezet.
- De TEST-deploy reset eerst de gedeelde TEST-baseline; daarna wordt de aparte acceptatiemedewerker opnieuw klaargezet.
- De externe bevestiging verstuurt zelf geen mail en maakt geen urenstaatbestand aan.
- Productiemail, productieaccounts en de PROD-vrijgave vallen buiten deze handoff.

## Losse designconcepten

De JPG’s in `design-mockups/` zijn alleen voorstellen en zijn niet automatisch in de werkende GUI toegepast:

- `extern-bevestigd-documentarchief-concept.jpg`
- `september-start-dashboard-concept.jpg`
