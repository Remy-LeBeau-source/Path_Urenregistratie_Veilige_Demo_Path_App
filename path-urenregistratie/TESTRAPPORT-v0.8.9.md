# Testrapport Path Uren & Facturatie v0.8.9

Datum: 7 augustus 2026

## Resultaat

Versie 0.8.9 verbetert de urenstaat en vernieuwt het hulpmenu.

### Urenstaat

- Iedere datum staat gecentreerd boven het urenveld waartoe die datum behoort.
- Datum en invoer vormen één duidelijk dagblok.
- De datum toont dagnummer en maandafkorting, bijvoorbeeld `3 aug`.
- Urenvelden hebben een duidelijkere focusrand en meer visuele rust.
- Dagen buiten de maand zijn herkenbaar niet-invulbaar.
- De werking van opslaan, Enter, weektotalen en maandtotalen blijft gelijk.

### Hulp & contact

- Bovenaan staat het zoekveld **Vind je antwoord**.
- Het menu bevat een duidelijk kopje **Veelgestelde vragen**.
- **Contact opnemen** staat als eerste vaste keuze.
- Er is geen berichteninbox, recent bericht, teamstatus of livechatbelofte.
- De bekende antwoorden, verduidelijkingsvraag en contactroute blijven werken.

## Uitgevoerde controles

```text
npm run check                              -> geslaagd
npm run build                              -> geslaagd
datum en urenveld in hetzelfde dagblok     -> geslaagd
week- en maandtotalen                      -> geslaagd
Enter slaat op en gaat verder              -> geslaagd
Veelgestelde vragen en zoekveld            -> geslaagd
geen livechat- of berichtenweergave        -> geslaagd
contact en onbekende-vraagroute            -> geslaagd
licht/donker en responsieve CSS            -> geslaagd
zipintegriteit                             -> geslaagd
```

De demo verstuurt geen echte e-mail.

Een aanvullende gebruikstest op een fysieke telefoon blijft onderdeel van de productiecontrole.
