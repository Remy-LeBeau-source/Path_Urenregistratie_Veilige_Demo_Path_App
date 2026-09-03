# Dekkingsronde

**Trigger:** de gebruiker zegt **"dekkingsronde"** (of: "loop de hele app na op
testdekking").

Doel: elk scherm, elke flow en elk zichtbaar/klikbaar element van de app afgaan,
vergelijken met wat de regressiesuite al afdekt, en voor elk gat een nieuwe case
maken met echte assertions — desktop én mobiel (Android + iOS). Zodat handmatig
testen niet meer nodig is om er zeker van te zijn dat het werkt.

Dit is geen eenmalige actie maar de vaste manier van werken (BESLISTABEL W12).
Draai hem in elk geval vóór een Promote Prod, en verder wanneer de gebruiker erom
vraagt.

---

## Stap voor stap

1. **Inventariseer de app.** Loop deze gebieden af (elk voor beheerder én
   medewerker waar van toepassing):
   - Inloggen, rol kiezen, uitloggen, sessie/CSRF
   - Wachtwoord vergeten + accountuitnodiging (mail, link, throttle)
   - Dashboard beheerder: werkvoorraad, teller, laadtoestand, taakwachtrij,
     stapkaarten, maandnavigatie
   - Dashboard medewerker: volgende actie, open-maandenkaart, laadtoestand,
     klanturenstaatkaart
   - Mijn uren: invoeren, opslaan (concept), indienen, correctie, herindienen,
     locking, autosave
   - Goedkeuringen: goedkeuren, terugsturen, heropenen
   - Facturen: lijst, filters, maanddetail in/uitklappen, statuskaarten,
     documentarchief, factuur sluiten, externe factuur, PDF-inhoud
   - Klanturenstaten: uploaden (PDF/JPG/PNG), concept, indienen, rechtstreeks
     gemaild, extern bevestigen, terugdraaien, herkomst tonen
   - Mail: routes, kanaalsjablonen, acceptatieconsole, verzendadministratie,
     broker-dedup, sandbox-omleiding
   - Mededelingen / notificaties: teller, alles gelezen, stale-response,
     herstel-basismeldingen
   - Medewerkers / Teambeheer: aanmaken, aanpassen, deactiveren, verwijderen,
     resetlink, uitnodiging, dubbel e-mailadres
   - Instellingen: bedrijfsidentiteit, merkkleuren, betaaltermijn, herinneringen
   - Hulp & contact: zoeken, FAQ, mailconcept, gesprek wissen
   - PWA: manifest per omgeving (naam), theme_color, iconen, installatieaanbod,
     service worker
   - Beveiliging: rollen/autorisatie, rate-limits, headers, CSP, audit-log
   - Uiterlijk: licht/donker, contrast (4,5:1), leesbare tekstondergrens
   - **Database**: na een schrijfactie de rij in de DB controleren (status,
     `reviewed_by`/`reviewed_at`, audit_log-regel, e-mail-aflevering), en dat een
     serverlezing daarna dezelfde stand teruggeeft. Verder: geen weesrijen na
     verwijderen, foreign keys/`ON DELETE CASCADE`, geen dubbele afleveringen,
     migraties draaien schoon op de geïsoleerde testdatabase. Bestaande haken:
     `database-integrity.feature`, `scripts/run-db-crud-smoke.mjs`,
     `scripts/db-env-precedence-check.mjs`.

2. **Benoem per onderdeel het waarneembare gedrag** dat een test hoort vast te
   pinnen (wat verschijnt, wat verandert, wat mag niet, welke tekst/route/teller).

3. **Kruis af tegen de bestaande suite.** Voor elk gedrag: bestaat er een
   `Scenario` in `tests/playwright/features/*.feature` én een spec met een
   assertie die dat gedrag echt controleert? Een scenario zonder inhoudelijke
   assertie telt niet als dekking.

4. **Maak de gatenlijst.** Twee soorten: gedrag zonder case, en case met te
   zwakke of ontbrekende assertions.

5. **Vul de gaten.** Per gat:
   - vrije case-id kiezen (`grep -ohE "[A-Z]{2,4}-[A-Z]*-?[HN]-[0-9]{3}"` over
     features + specs, geen dubbele)
   - één `Scenario` in het passende feature-bestand
   - een spec met **echte assertions** (geen alleen-navigatie)
   - is het onderdeel op een telefoon zichtbaar/klikbaar → ook een case in
     `tests/playwright/mobile-ui.spec.ts` die op `mobile-chrome` (Android) én
     `mobile-safari` (iOS) draait
   - raakt het de database → een assertie die de opgeslagen rij nakijkt (via de
     lees-API of een gerichte query in de spec), niet alleen de UI
   - draaien en **fixen tot groen** — nooit rood of skipped inleveren

6. **Verifieer breed.** `npm run check` + de aangeraakte specs volledig.

7. **Afronden.** `npm run version:set` ophogen, commit in het Nederlands zonder
   handtekening, pushen, en rapporteren: hoeveel gaten gevonden, hoeveel cases
   toegevoegd, in welke bestanden. Grote rondes in passen per gebied committen,
   niet in één reuzecommit.

## Grenzen (eerlijk benoemen)

- `mobile-safari` is de WebKit-engine, geen echt iPhone-toestel. Rendering en
  gedrag kloppen daarmee; een echte visuele iPhone-check blijft mensenwerk.
- Wat aantoonbaar niet te automatiseren is (bijv. een echte SMTP-aflevering in
  productie, een fysiek deelscherm) wordt expliciet als handmatig benoemd, niet
  stil overgeslagen.
