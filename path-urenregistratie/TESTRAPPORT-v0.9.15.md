# Testrapport v0.9.15

## Eén-op-één taaktelling

- Gecontroleerd dat iedere open taak precies één regel in **Alle open taken** vormt.
- Gecontroleerd dat iedere regel exact één eigenaar toont: **Actie bij Backoffice** of **Actie bij medewerker**.
- De regressiesituatie is exact nagebouwd: **3 open taken over 2 maanden = 0 bij Backoffice + 3 bij medewerkers**.
- Gecontroleerd dat de maandknop in die situatie **Augustus 2026 · 2 urentaken bij medewerkers** toont. De derde taak blijft zichtbaar als julitaak in het volledige overzicht.
- Gecontroleerd dat hoofdtekst, taakkaart, hoofdknop, filters en taakregels hetzelfde totaal gebruiken.

## Procesmeter en maandacties

- De voortgangsmeter is gelabeld als **geen taakteller** en gebruikt vier procesfasen.
- Een maandactie vermeldt altijd maand, aantal, taaksoort en eigenaar.
- Een urencontrole bij Backoffice opent rechtstreeks Goedkeuringen; open uren bij medewerkers openen rechtstreeks de gefilterde teamstatus.

## Gegevensbehoud

- Het actuele gegevensschema wordt bij herladen geaccepteerd, zodat lokale wijzigingen niet door voorbeelddata worden vervangen.
- Bestaande oudere gegevensversies blijven via de bestaande migratie behouden.

## Regressie

- Volledige geautomatiseerde rooktest uitgevoerd.
- JavaScript-syntaxcontrole uitgevoerd.
- Productiebouw uitgevoerd.
- De situatie uit de aangeleverde schermafbeelding interactief in de browser gecontroleerd.
