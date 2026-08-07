# Testrapport Path Uren & Facturatie v0.8.7

Datum: 7 augustus 2026

## Resultaat

Versie 0.8.7 verwijdert de vooraf ingevulde mailtest bij Shawn. Shawn begint nu, net als iedere andere medewerker met goedgekeurde uren, met de status **Factuur klaar** en de actie **Mailvoorbeeld**. Pas nadat de beheerder zelf de veilige verzendtest uitvoert, verandert de status naar **Test gedaan** en wordt de test terugkijkbaar.

De bestaande factuurnummering uit v0.8.6 blijft behouden, waaronder `Bel-Shawn-2026-juli` en de automatische maand- en jaarwisseling.

## Uitgevoerde controles

```text
npm run check                              -> geslaagd
npm run build                              -> geslaagd
Shawn start met Factuur klaar              -> geslaagd
Shawn toont Mailvoorbeeld                  -> geslaagd
geen vooraf ingevulde Mailtest bekijken    -> geslaagd
teststatus pas na eigen verzendtest        -> geslaagd
migratie van bestaande browsergegevens     -> geslaagd
factuur-PDF's                              -> geslaagd
zipintegriteit                             -> geslaagd
```

De demo verstuurt geen echte e-mail.
