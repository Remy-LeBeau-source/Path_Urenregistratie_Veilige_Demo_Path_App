# Uitvoerbare BDD-tests

Deze map is de incrementele, uitvoerbare BDD-laag bovenop Playwright.

- `features/`: businessleesbare scenario's; dit is de bron voor gemigreerde BDD-cases.
- `steps/`: herbruikbare browseracties en zichtbare `expect(...)`-assertions.
- `../playwright/pages/`: bestaande Page Objects; locators worden niet in features geplaatst.
- `.features-gen/`: automatisch door `playwright-bdd` gegenereerde Playwright-specs en niet in Git.

## Een case toevoegen

1. Voeg een scenario met unieke case-ID toe aan het passende `.feature`-bestand.
2. Hergebruik bestaande stapzinnen waar mogelijk.
3. Voeg alleen voor nieuwe stapzinnen één implementatie in het passende `.steps.ts`-bestand toe.
4. Draai `npm run test:bdd:design` voor generatie- en mappingcontrole.
5. Draai `npm run test:bdd` voor de echte browsertest.

Onbekende of dubbelzinnige stappen laten de generatie bewust falen. De 168 bestaande native cases
blijven uitvoerbaar totdat een feature volledig en aantoonbaar met pariteit is gemigreerd.
