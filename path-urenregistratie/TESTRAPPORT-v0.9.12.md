# Testrapport v0.9.12

## Zichtbare klanturenstaat op Mijn overzicht

- Gecontroleerd dat een ontbrekende klanturenstaat als aparte open taak op het medewerkerdashboard staat.
- Gecontroleerd dat goedgekeurde uren niet langer de onjuiste melding geven dat de hele maand is afgerond wanneer het klantdocument nog ontbreekt.
- Gecontroleerd dat status, periode, toelichting en directe actie naar de klanturenstaat zichtbaar blijven.

## Al rechtstreeks gemaild

- Gecontroleerd dat **Al rechtstreeks gemaild** een verplichte, vooraf ingevulde reden toont.
- Gecontroleerd dat reden, medewerker en tijdstip in de maandgegevens worden opgeslagen.
- Gecontroleerd dat Backoffice deze registratie in de klanturenstaatdetails ziet.
- Gecontroleerd dat de afgehandelde taak uit de open werkvoorraad verdwijnt, maar zichtbaar blijft bij de maand.
- Gecontroleerd dat **Alsnog uploaden** de registratie terugdraait en de uploadroute opnieuw beschikbaar maakt.

## Regressie

- Volledige geautomatiseerde rooktest uitgevoerd.
- Productiebouw uitgevoerd.
- Medewerker- en beheerdersweergave live gecontroleerd.
