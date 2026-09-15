# Wensen, besluiten en open taken (Gio)

Eén lijst van alles wat Gio vraagt en wat we besluiten, zodat niets vergeten wordt.
Bijgehouden door de herontwerp-sessie; main werkt zijn eigen punten hier ook bij.
Nieuwste bovenaan per status. Statussen: **open**, **bezig**, **klaar (versie)**, **bij main**.

## Open en bezig

| Datum | Wens / besluit van Gio | Wie | Status |
|---|---|---|---|
| 15 sep | **Indienlogica Mijn uren.** Maand indienen alleen als alle werkdagen van de maand gevuld zijn, ongeacht in welke week je staat. Een lege week (0,0 zonder bewust invullen) is niet gevuld: dan geen "Alle werkdagen zijn ingevuld" en geen Maand indienen. Na invullen, Opslaan of Standaardweek vullen van de laatste open week komt Maand indienen terug, ook als dat niet de laatste week van de maand is. Geldt voor Mijn uren én het dashboard. Andere plekken met dezelfde logica nalopen en met cases vastleggen. | herontwerp | bezig (2.0.94): oorzaak gevonden (elke autosave bevestigde de hele bekeken week). Fix gebouwd voor Klassiek en Modern (Opslaan), met KLV-N-012/H-013/H-014 in een eigen maand zodat andere cases niet vervuild raken. Vandaag, weekkaarten en de indiendialoog gebruiken dezelfde regel (werkdagTeltAlsIngevuld). Regressie loopt. |
| 15 sep | **"36Open" op Mijn uren**: spatie ontbreekt; label moet de echte stand tonen ("3 open" / "Compleet") en niet "Open" blijven na invullen. | herontwerp | bezig (2.0.94): label toont "N open" of "Compleet" en telt mee bij typen, spatie tussen weeknummer en label; KLV-H-015. |
| 15 sep | **Terugknop op Mijn uren** (telefoon): klein, niet storend knopje bij de weekkeuze terug naar Vandaag. | herontwerp | bezig (2.0.94): tekstknop "‹ Vandaag" boven de weekkeuze, alleen telefoon Klassiek, 44px tikvlak; KLV-H-016. |
| 15 sep | **Urenregel standaardweek.** Geen gelijke verdeling (7,2). 40 uur = 5 × 8. 36 uur = 4 × 9. Beheer stelt per persoon de vrije dag in (werkpatroon, 0 uur); die blijft 0 en de medewerker kan hem nog zelf invullen. Zonder ingestelde vrije dag: maandag t/m donderdag 9, vrijdag leeg. | herontwerp | bezig (2.0.94): standardHoursForDay volgens deze regel; past het niet in hele dagen van 9 of 8 (bv. 38 uur), dan gelijk verdeeld over de dagen zonder instelling. Uitleg in Beheer bijgewerkt. Beslistabel KLV-H-017. |
| 15 sep | **"Nieuw in de app" in Berichten**, alleen op TEST: laatste 5 versies met iets voor medewerkers, één zin per versie. Niet op PROD. | herontwerp | bezig (2.0.94): blok onder Ontvangen mededelingen, verborgen op de PROD-host; KLV-H-018. Bij elke versie met iets voor medewerkers bijwerken in index.html. |
| 15 sep | **Drie ingetrokken voorbeeldmededelingen** in de TEST-basis ("Kantoor gesloten", "Vrijdagborrel gaat niet door", "Parkeergarage dicht"), zoals de echte flow, meldingen al gelezen. | main | bij main |
| 15 sep | Oude 0-regels uit de indienbug: geen opschoonscript. PROD is nog niet live (alleen gebruikers gemigreerd) en krijgt bij de livegang een verse migratie/reset met de gerepareerde code (R44 in BESLISTABEL.md; de reset hoort bij de livegangchecklist van Gio). | besluit | vastgelegd |
| 15 sep | Bel en Berichten blijven allebei: bel = eigen urenstatus, correcties, herinneringen; Berichten = algemene mededelingen. | besluit | vastgelegd |
| 15 sep | Wisselvallig op mobile-safari: DASH-H-050 (2× rood vóór retry), SKIN-H-040 (1×). | herontwerp | open |
| 15 sep | Dialoog met toetsenbord onder "minder beweging": dialoog krimpt niet mee (SKIN-N-008 fixme). Controleren op echte iPhone. | herontwerp | open |
| 15 sep | Kleine open vondsten: monkey seed 15, statuspil 8px bij 360px in Instellingen. | herontwerp | open |

## Klaar

| Datum | Wens / besluit | Versie |
|---|---|---|
| 15 sep | Testfuncties uit beeld: alleen Herstel bovenin (leesbaar, 44px op telefoon), thema/vormgeving/omgeving/versie in het profielmenu onder "Testfuncties", nooit op PROD. Testpil weg. | 2.0.93 |
| 15 sep | Prod-poort: niet binnen 10 min goedgekeurd = automatisch afbreken, TEST loopt altijd door. Werkt via force-cancel. | main 2.0.92 |
| 15 sep | Zwevende "Hulp & contact" weg op telefoon, hulp via profielmenu. | main 2.0.84 |
| 15 sep | Waarschuwing bij meer dan 24 uur per dag, niets naar de server tot het klopt. | 2.0.83 |
| 15 sep | Klanturenstaatlabel niet op Mijn uren in Klassiek (was al zo), bewaakt. | 2.0.87 |
| 15 sep | Teamupdates altijd neutraal: geen namen, rollen gebruiken (bv. "Beheer"). | werkwijze |
| 15 sep | Main en herontwerp stemmen onderling af; Gio krijgt de uitkomst. Prod en productbesluiten blijven bij Gio. | werkwijze |
| 15 sep | Monkey-verkenning Klassiek met vaste regressiecases KLV-N-001 t/m KLV-N-011. | 2.0.77–2.0.90 |
