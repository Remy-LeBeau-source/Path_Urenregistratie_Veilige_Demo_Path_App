# Handoff TEST 0.9.159 — septemberfactuur-hotfix

## Doel

Deze TEST-hotfix zorgt dat `Controle afronden` ook werkt wanneer de urenstaat al server-side is
goedgekeurd maar er nog geen factuurrij bestaat. De app gebruikt dan het gezaghebbende
`timesheet_id`, laat de lock-API de factuur atomisch aanmaken, synchroniseert de nieuwe status en
toont de verzenduitkomst. De intrekactie voor een externe urenbevestiging is visueel duidelijker.

## Handmatige acceptatie op TEST

1. Log in als Backoffice en controleer dat september 2026 standaard opent.
2. Open de septembercase met goedgekeurde uren en een open factuuractie.
3. Kies `Controle afronden`; de melding `Serverfactuur nog niet beschikbaar` mag niet meer komen.
4. Controleer dat de factuuractie sluit en de verzenduitkomst zichtbaar wordt.
5. Open een extern bevestigde urenstaat in het Documentarchief.
6. Controleer de opvallende knop `Externe bevestiging intrekken` met terugdraai-icoon en waarschuwing.
7. Kies de knop, controleer de rode bevestigingsmodal en annuleer eenmaal.
8. Herhaal en bevestig; de urenstaat moet daarna weer als ontbrekend/oranje blokkeren.

## Klaargezette werkmaandgevallen (open taken-set)

De vier actieve TEST-medewerkers dekken samen elke open-taaksoort voor de actuele werkmaand:

- Marc de Roon — `draft`, klanturenstaat ontbreekt: open uren bij medewerker;
- Brian Hek — `submitted`, klanturenstaat ontvangen: open goedkeuring + klanturenstaat controleren;
- Stasjo van Bakel — `approved`, klanturenstaat goedgekeurd, nog geen factuurrij: open brokerroute
  controleren + open factuur (de controle maakt de serverfactuur aan);
- Shawn-Douglas Nahar — `approved`, rechtstreeks gemaild, factuurrij aanwezig: open verzending controleren.

Deze records worden na een TEST-baselineherstel veilig en zonder mail aangemaakt met:
`php server/scripts/seed-test-working-month.php --execute --confirm=SEED_TEST_WORKING_MONTH`.
Het script richt zich altijd op de kalendermaand van nu (of `--month=JJJJ-MM`), weigert iedere
omgeving buiten het exacte gedeelde TEST-contract en overschrijft geen bestaande uren of facturen.

## Geautomatiseerd bewijs

- `INV-H-020`: externe urenbevestiging, waarschuwing, groene projectie en herstelpad;
- `INV-H-021`: ontbrekende factuurrij wordt vanuit goedgekeurde serveruren aangemaakt, inclusief
  concept-PDF, drie TEST-routes, statussynchronisatie en zichtbare succesmelding.

## Releasegrens

Dit document geldt alleen voor TEST. PROD wordt pas door de gebruiker zelf gepromoveerd na expliciet
akkoord op deze handmatige acceptatie.
