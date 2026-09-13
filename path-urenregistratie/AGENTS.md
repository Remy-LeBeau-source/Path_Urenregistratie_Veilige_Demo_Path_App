# Vaste werkwijze voor wijzigingen

## Vaste branchvolgorde

- `main` is de bron voor functionele wijzigingen, beveiligingsfixes en releases.
- `herontwerp` is de bron voor de New-skin en uitsluitend bijbehorende visuele tests.
- Na iedere nieuwe commit op `main`: neem eerst de actuele `main` op in
  `herontwerp` voordat nieuw design wordt gepusht. Los conflicten op
  `herontwerp` op en draai daar de gerichte controles opnieuw.
- Alleen een `herontwerp`-kop die de actuele `main` bevat én volledig groene CI
  heeft, mag via de merge-queue naar `main` fast-forwarden.
- Werk niet gelijktijdig op beide branches aan hetzelfde bestand. Leg tijdelijk
  eigenaarschap vast in `COPILOT_HANDOFF.md`.
- PROD blijft altijd achter de handmatige reviewerpoort.

De CI-guard controleert technisch dat `herontwerp` de actuele `main` bevat. De
zin "nog niet pushen" in een handoff is alleen een tijdelijke blokkade tijdens
een actieve main-hotfix en vervangt deze permanente volgorde niet.

Lees vóór product- of testwijzigingen altijd volledig:

1. `WERKWIJZE-PATROON.md`
2. `FUNCTIONEEL-ONTWERP.md`
3. `TECHNISCH-ONTWERP.md`
4. de betrokken feature in `tests/playwright/features/`
5. de bijbehorende Playwright-spec en API/servercode

Volg daarna de wijzigingslus uit `WERKWIJZE-PATROON.md`. Nieuwe productlogica is pas klaar als
code, positieve en negatieve tests, GUI-smoke, living documentation en traceerbaarheid samen zijn
bijgewerkt. Commit en push pas nadat de vereiste lokale controles groen zijn.

## Ontwerprondes medewerkerschermen — de vaste route

De vormgeving van de medewerkerschermen wordt ontworpen in een los
Claude-designproject en hier nagebouwd. Gio hoeft deze route niet per ronde uit
te leggen: bij elke ronde komt er één link naar een nieuwe versie van
`handoff/OPDRACHT.md`, en dat bestand is de volledige opdracht. Eén losse link
in een bericht betekent dus: doorlopen wat hieronder staat, zonder verdere
vragen.

1. **Direct ophalen.** De links in `OPDRACHT.md` verlopen na ongeveer een uur.
   Haal de vier bestanden uit de tabel op en **overschrijf** ze in `handoff/`;
   samenvoegen mag niet en een oudere export is nooit de waarheid. Bewaar de
   vorige versie eerst buiten de repo, zodat de diff te tonen is.
2. **Lezen vóór bouwen.** `handoff/HANDOFF-MEDEWERKER-MOBIEL.md` geeft het
   waarom en welke punten nog een besluit van Gio vragen;
   `handoff/DESIGN-BESLUITEN.md` is het designcontract (palet, licht als één
   veld, de zes glanslagen, naamgeving Modern/Klassiek).
3. **`github.md` bijwerken** met wat er deze ronde is veranderd, en de vorige
   `## Last sync` verplaatsen naar `## Sync history`.
4. **Exact overnemen.** Hex, rgba, spacing, radius en font-size 1-op-1 uit de
   bron. Niets afronden, niets "verbeteren", geen tussenwaarden verzinnen.
   Gebruikt de app een ander component, vertaal dan de inline stijl naar dat
   component in plaats van de DOM te herbouwen. Bij twijfel over een waarde:
   eerst de exacte regel uit het bronbestand citeren, dan bouwen.
5. **Elke wijziging krijgt een testcase**, hoe klein ook, en die gaat mee in de
   regressie. Controleer eerst met grep dat het `[CODE-X-000]`-id vrij is —
   dubbele id's worden door de living-docs-poort geweigerd en `--grep` draait er
   dan stilletjes twee. Toon dat de case discriminerend is (wijziging eruit →
   rood, erin → groen) en draai hem op de breedtes waar de wijziging actief is;
   zit hij achter een media query, dan ook op de rand ervan.
6. **Bestaande tests aanpassen in dezelfde wijziging** als ze een tekst, class
   of status aanroepen die hier verandert. Nooit een assertion verzwakken om
   iets groen te krijgen.
7. Afsluiten met `npm run docs:sync` en de gegenereerde bestanden meecommitten.

Grenzen die per ronde gelden: Klassiek mag niet regresseren door een wijziging
voor Modern, en een bestand waarvan onduidelijk is of het nog gebruikt wordt
gaat niet weg maar wordt teruggemeld. In de UI heet de New-skin **Modern**; de
technische skin-waarde blijft `new`.

Waarom `handoff/` zelf niet in Git staat en hoe de herkomst wél wordt
vastgelegd: `DESIGNEXPORT-HERKOMST.md`.
