# Eenvoudige stepdefinitions

De bestanden in deze map zijn een leesbare F12-index. De echte testacties en assertions blijven in `tests/playwright/*.spec.ts`; er wordt dus geen code of testdekking gedupliceerd of verwijderd. De volledige case-ID-, bron-, assertion- en techniekmapping blijft beschikbaar in `TEST-BDD-MAPPING.md`.

Het Gherkin-woord blijft in de navigatie herkenbaar gelijk:

```ts
Given("de gebruiker op de loginpagina staat");
When("de gebruiker inlogt");
Then("wordt het dashboard zichtbaar");
```

De bestanden worden automatisch bijgewerkt met:

```powershell
npm run docs:sync
```

Open voor dezelfde F12-koppeling op iedere werkplek het bestand `Path-Urenregistratie.code-workspace` in VS Code. Hiervoor is lokaal de extensie `alexkrechik.cucumberautocomplete` nodig.

Voeg nieuwe testcases toe in het bijbehorende `.spec.ts`-bestand met een case-ID, duidelijke `test.step(...)`-namen en `expect(...)`-assertions. Daarna maakt `docs:sync` de featuretekst en de eenvoudige stepregels automatisch aan. Dit werkt lokaal en gebruikt geen AI.
