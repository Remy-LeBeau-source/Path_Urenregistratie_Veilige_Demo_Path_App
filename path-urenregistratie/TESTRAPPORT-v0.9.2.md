# Testrapport Path Uren & Facturatie v0.9.2

Datum: 7 augustus 2026

## Resultaat

Versie 0.9.2 bewaakt nu ook achterstallige maanden. Er zijn geen functionele fouten gevonden.

## Gewijzigd

- Het dashboard bevat **Openstaande maanden** over alle bekende perioden.
- Oudere maanden staan bovenaan en blijven zichtbaar zolang minimaal één relevante stap openstaat.
- Per maand worden concepturen, correcties, goedkeuringen en nog te controleren verzendingen samengevat.
- Een actie selecteert eerst precies de betreffende maand en opent daarna Goedkeuringen, Facturen of Medewerkers.
- **Maandverzending controleren** blijft altijd beperkt tot één geselecteerde maand.
- Een volledig afgeronde maand verdwijnt uit het open overzicht, maar blijft in de historie.
- De afgeronde factuurstatus heet nu **Verzendtest afgerond** in plaats van het vagere **Test gedaan**.
- De uitleg vermeldt expliciet dat alle gekozen routes zijn gecontroleerd en niets echt is verstuurd.
- De vooraf gevulde juni-historie markeert nu ook de salarisadministratieroute als afgerond.

## Vooraf gevulde demonstratie

- Juni 2026: volledig afgeronde uren- en verzendhistorie.
- Juli 2026: één open goedkeuring en drie klaarstaande verzendingen.
- Augustus 2026: concept, correctie, goedkeuring en klaarstaande verzending.
- Medewerkers, brokers, tarieven, centrale ontvangers, bijlagekeuzes en mededelingen zijn vooraf ingevuld.

## Uitgevoerde controles

```text
npm run check                                  -> geslaagd
npm run build                                  -> geslaagd
openstaande maanden oudste eerst               -> geslaagd
afgeronde juni niet in open overzicht          -> geslaagd
juli en augustus met juiste aantallen          -> geslaagd
doorklik selecteert eerst juiste maand          -> geslaagd
maandverzending blijft één maand                -> geslaagd
verzendteststatus en uitleg                     -> geslaagd
uren, correcties en goedkeuringen               -> geslaagd
ontvangers en afzonderlijke bijlagen            -> geslaagd
facturen en Shawn-referenties                   -> geslaagd
migratie van bestaande browsergegevens          -> geslaagd
zipintegriteit                                  -> geslaagd
controle op afwezigheid databasegeheimen        -> geslaagd
```

De demo verstuurt geen echte e-mail en maakt geen verbinding met de productiedatabase.
