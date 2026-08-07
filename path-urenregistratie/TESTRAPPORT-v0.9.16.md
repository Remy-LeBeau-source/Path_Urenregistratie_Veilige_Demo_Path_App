# Testrapport v0.9.16

## Verklaarbare actietelling

- Gecontroleerd dat de standaarddemo exact **7 open acties** bevat: **1 in juli + 6 in augustus**.
- Gecontroleerd dat dezelfde acties exact zijn verdeeld als **4 bij Backoffice + 3 bij medewerkers**.
- Gecontroleerd dat de zeven acties vijf medewerker-maanddossiers vormen; Brian en Shawn hebben ieder twee verschillende acties in augustus.
- Gecontroleerd dat de hoofdsamenvatting beide rekensommen toont en hetzelfde totaal gebruikt als kaart, filters en taakregels.

## Maanden onder elkaar

- Gecontroleerd dat juli en augustus als afzonderlijke maandblokken onder elkaar staan, oudste maand eerst.
- Gecontroleerd dat ieder maandblok het eigen actietotaal en de verdeling tussen Backoffice en medewerkers toont.
- Gecontroleerd dat iedere actie exact één regel, één eigenaar en één actieknop heeft.
- Gecontroleerd dat de maandkiezer alleen de detailpanelen wijzigt en nooit open acties uit andere maanden verbergt.
- Het dubbele losse paneel **Samenvatting per maand** is verwijderd.

## Procesmeter

- De procesmeter staat bij de maanddetails en niet meer in de globale hoofdsamenvatting.
- De meter blijft expliciet gelabeld als **geen taakteller** en benoemt open klanturenstaten apart.

## Regressie

- Volledige geautomatiseerde rooktest uitgevoerd.
- JavaScript-syntaxcontrole uitgevoerd.
- Productiebouw uitgevoerd.
- Desktop- en mobiele browserweergave interactief gecontroleerd.
