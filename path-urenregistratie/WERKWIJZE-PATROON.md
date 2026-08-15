# Werkwijzepatroon — van bedrijfsregel naar groene release

Dit document is de vaste uitvoeringsvolgorde voor iedere wijziging. Het voorkomt dat een zichtbaar
scherm wordt gerepareerd terwijl een eerdere of latere stap in dezelfde bedrijfsketen breekt.

## 1. Eerst het contract lezen

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
| Broker | factuurbericht | factuur + goedgekeurde klanturenstaat |
| Boekhouding | factuuradministratie | alleen factuur |
| Salarisadministratie | ureninformatie | geen bijlage |

In TEST gaan de drie SMTP-afleveringen fysiek naar `giovanno.maatsen@pathconsultancy.nl`. De bedoelde
productieontvanger, route, onderwerp en attachment policy blijven zichtbaar en auditbaar. Er wordt
geen CC/BCC gebruikt om de drie routes samen te voegen.

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

## 6. Klaarcriteria

Een wijziging is pas klaar wanneer:

- de serverstatus en UI dezelfde waarheid tonen;
- tellers en eigenaar bij elke overgang kloppen;
- documenten vóór verzending geopend kunnen worden;
- queue en uiteindelijke SMTP-status niet door elkaar worden gehaald;
- LOCAL/TEST/PROD-beleid aantoonbaar gescheiden blijft;
- smoke, regressie, documentatie en pipeline groen zijn.
# Controle bij wijzigingen aan e-mail

Bij iedere mailwijziging worden minimaal deze toestanden aantoonbaar gecontroleerd: LOCAL/dry-run, TEST actief, TEST gepauzeerd en PROD zonder TEST-schakelaar. De UI-status moet rechtstreeks overeenkomen met de serverstatus. Tests bewijzen daarnaast dat TEST-ontvangers niet vanuit de browser kunnen worden verruimd en dat elke mutatie CSRF plus een expliciete bevestiging vereist.
