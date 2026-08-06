# Testrapport Path Uren & Facturatie v0.8.6

Datum: 7 augustus 2026

## Resultaat

Versie 0.8.6 toont het label en nummer als één witte regel: **Factuurnummer: [nummer]**. Alle factuurnummers gebruiken koppeltekens en bevatten geen spaties. Ook bestaande browsergegevens worden automatisch naar deze notatie omgezet.

## Gecontroleerde nummering

| Medewerker | Juli 2026 | Augustus 2026 | Januari 2027 |
|---|---|---|---|
| Marc de Roon | `IND-2026-juli` | `IND-2026-augustus` | `IND-2027-januari` |
| Stasjo van Bakel | `IND-StvB-2026-juli` | `IND-StvB-2026-augustus` | `IND-StvB-2027-januari` |
| Brian Hek | `COA-2026-juli` | `COA-2026-augustus` | `COA-2027-januari` |
| Shawn-Douglas Nahar | `Bel-Shawn-2026-juli` | `Bel-Shawn-2026-augustus` | `Bel-Shawn-2027-januari` |

## Uitgevoerde controles

```text
npm run check                              -> geslaagd
npm run build                              -> geslaagd
één witte factuurnummerregel in scherm     -> geslaagd
factuurnummer in vier PDF's                -> geslaagd
migratie van nummers met spaties            -> geslaagd
maandwisseling juli naar augustus          -> geslaagd
jaarwisseling 2026 naar 2027               -> geslaagd
vier A4-PDF's, ieder één pagina            -> geslaagd
zipintegriteit                             -> geslaagd
```

De demo verstuurt geen echte e-mail en maakt nog geen definitief vergrendelde productiefacturen.
