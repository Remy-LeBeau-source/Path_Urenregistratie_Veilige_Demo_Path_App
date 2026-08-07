# Testrapport v0.9.21

## Doorlopende Backoffice-werkmodus

- Gecontroleerd dat iedere uitvoerbare Backoffice-taak dezelfde modale werksessie opent.
- **Vorige** en **Volgende** bladeren door de open Backoffice-acties zonder een status te wijzigen.
- Na goedkeuren, terugsturen, een nieuwe upload vragen of een controle afronden opent automatisch de logisch volgende actie.
- Een nieuw vrijgekomen vervolg voor dezelfde medewerker en maand blijft op dezelfde logische positie staan.
- Onopgeslagen wijzigingen in de brokertekst blokkeren veilig het bladeren.
- Een ongeldige mailroute toont een eigen geblokkeerde taak; de overige acties blijven bereikbaar.
- De correctiereden gebruikt een aparte invoerstap met **Terug naar controle** en zonder misleidende taaknavigatie.
- Als alle Backoffice-acties klaar zijn, verschijnt een afrondscherm met het aantal acties dat nog op medewerkers wacht.

## Maandcontrole per medewerker

- Juli 2026 toont **1 klaar · 3 gecontroleerd** en blijft als groene resterende maandcontrole zichtbaar.
- Augustus 2026 toont **2 van 4 gereed** met exact twee zichtbare blokkades: Marc de Roon en Stasjo van Bakel.
- De Facturen-badge toont open maandcontroles over alle maanden en splitst oranje blokkades en groene controleklare maanden in aparte bolletjes.
- Het overzicht boven de maandkaart toont alle open maandcontroles over alle maanden, ook wanneer de geselecteerde maand zelf groen of oranje is.
- Bij meerdere open maandcontroles staan de maandkaarten in het factuurscherm naast elkaar op desktop.
- Iedere blokkade noemt de medewerker, status, eigenaar en een directe vervolgknop.
- Bij meerdere blokkades springt de hoofdknop naar de blokkadelijst; bij één blokkade opent direct de juiste status of urencontrole.
- Zodra alle uren zijn goedgekeurd, verandert de hoofdknop naar **Start maandcontrole · 4**.
- Klanturenstaten blijven volgens de ingestelde Path-regel een aparte route en blokkeren deze factuurbatch niet.

## Browsercontrole

- De geautomatiseerde DOM-smoke-test controleert de factuurpagina voor juli, augustus, gemengde badges en maandnavigatie.
- De agent-preview kan opnieuw worden geopend wanneer de cloudbrowser lokaal toegang geeft; de build- en smoke-poort blijven leidend voor deze zip.

## Regressie

- JavaScript-syntaxcontrole geslaagd.
- Volledige geautomatiseerde smoke-test geslaagd: `Path v0.9.21 volledige smoke test: geslaagd`.
- Productiebouw en Sites-checkpoint worden als laatste opleveringspoort uitgevoerd.
