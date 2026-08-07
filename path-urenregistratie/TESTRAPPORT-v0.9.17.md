# Testrapport v0.9.17

## Volgende actie

- Gecontroleerd dat direct onder de hoofdsamenvatting altijd één vaste prioriteitenkaart staat.
- In de standaarddemo toont de kaart **Klanturenstaat controleren** voor Shawn-Douglas Nahar als **1 van 4 bij Backoffice**, inclusief augustus 2026, klant/broker en een directe startknop.
- Na afronding wordt de kaart opnieuw uit de actuele werkvoorraad opgebouwd, zodat automatisch de volgende Backoffice-actie verschijnt.

## Wachten en afronden

- Gecontroleerd dat de kaart bij nul Backoffice-acties omschakelt naar **Voor jou is nu niets te doen**.
- In die toestand toont de kaart de eerstvolgende medewerker waarop wordt gewacht en een passende herinnerings- of statusknop.
- Als er helemaal niets openstaat, blijft een compacte groene melding **Er staat geen actie meer open** zichtbaar.

## Minder dubbele bediening

- De vierde KPI toont het aantal directe Backoffice-acties en apart hoeveel acties op medewerkers wachten.
- De KPI-link noemt het volledige aantal acties.
- De dubbele maandknop in de hero en de dubbele startknop in de kop van de werkvoorraad zijn verwijderd.
- De volledige actielijst per maand en eigenaar blijft ongewijzigd beschikbaar.

## Inklappen per maand

- Gecontroleerd dat iedere maandkop als één toegankelijke knop kan worden in- en uitgeklapt.
- Het aantal acties en de verdeling tussen Backoffice en medewerkers blijven ook in ingeklapte toestand zichtbaar.
- De oudste achterstallige maand en de huidige open maand staan standaard open; tussenliggende maanden kunnen compact dicht blijven.
- De eigenaargroepen binnen een geopende maand blijven direct zichtbaar en hebben bewust geen extra inklapniveau.

## Regressie

- De standaardtelling blijft **Juli 1 + Augustus 6 = 7** en **Backoffice 4 + medewerkers 3 = 7**.
- Volledige geautomatiseerde rooktest uitgevoerd.
- JavaScript-syntaxcontrole en productiebouw uitgevoerd.
- Desktop- en mobiele weergave gecontroleerd.
