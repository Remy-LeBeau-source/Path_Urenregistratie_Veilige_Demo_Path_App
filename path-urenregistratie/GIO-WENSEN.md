# Wensen, besluiten en open taken (Gio)

Eén lijst van alles wat Gio vraagt en wat we besluiten, zodat niets vergeten wordt.
Bijgehouden door de herontwerp-sessie; main werkt zijn eigen punten hier ook bij.
Nieuwste bovenaan per status. Statussen: **open**, **bezig**, **klaar (versie)**, **bij main**.

## Open en bezig

| Datum | Wens / besluit van Gio | Wie | Status |
|---|---|---|---|
| 15 sep | **Drie ingetrokken voorbeeldmededelingen** in de TEST-basis ("Kantoor gesloten", "Vrijdagborrel gaat niet door", "Parkeergarage dicht"), zoals de echte flow, meldingen al gelezen. | main | bij main |
| 15 sep | Oude 0-regels uit de indienbug: geen opschoonscript. PROD is nog niet live (alleen gebruikers gemigreerd) en krijgt bij de livegang een verse migratie/reset met de gerepareerde code (R44 in BESLISTABEL.md; de reset hoort bij de livegangchecklist van Gio). | besluit | vastgelegd |
| 15 sep | Bel en Berichten blijven allebei: bel = eigen urenstatus, correcties, herinneringen; Berichten = algemene mededelingen. | besluit | vastgelegd |
| 15 sep | Dialoog met toetsenbord onder "minder beweging": dialoog krimpt niet mee (SKIN-N-008 fixme). Controleren op echte iPhone. | herontwerp | open |
| 15 sep | Kleine open vondsten: monkey seed 15, statuspil 8px bij 360px in Instellingen. | herontwerp | open |

## Klaar

| Datum | Wens / besluit | Versie |
|---|---|---|
| 15 sep | Nieuw in de app: laatste 10 updates met korte kop, één zin en datum, binnen de rand van het paneel, geen namen of gevoelige info (bewaakt in KLV-H-018). Versiescript laat deze notities met rust. | 2.0.95 |
| 15 sep | Nieuw in de app in Berichten, alleen TEST en lokaal, nooit op PROD (KLV-H-018). Bijwerken bij elke versie met iets voor medewerkers. | 2.0.94 |
| 15 sep | Indienlogica: Maand indienen pas als elke werkdag bewust is ingevuld; alleen zelf invullen, Week opslaan (Klassiek en Modern), Standaardweek vullen en Terugzetten bevestigen dagen (KLV-N-012, KLV-H-013, KLV-H-014). CI groen. | 2.0.94 |
| 15 sep | Weeklabel op Mijn uren: spatie naast het weeknummer, "N open" of "Compleet" (KLV-H-015). | 2.0.94 |
| 15 sep | Terugknop "‹ Vandaag" op Mijn uren, telefoon (KLV-H-016). | 2.0.94 |
| 15 sep | Urenregel standaardweek: hele dagen van 9 of 8 vanaf maandag, vrije dag van Beheer telt mee (KLV-H-017). | 2.0.94 |
| 15 sep | DASH-H-050 vervuilde september op de server (rood op mobile-safari en voor SKIN-H-006/-011); draait nu in een eigen maand. | 2.0.94 |
| 15 sep | Testfuncties uit beeld: alleen Herstel bovenin (leesbaar, 44px op telefoon), thema/vormgeving/omgeving/versie in het profielmenu onder "Testfuncties", nooit op PROD. Testpil weg. | 2.0.93 |
| 15 sep | Prod-poort: niet binnen 10 min goedgekeurd = automatisch afbreken, TEST loopt altijd door. Werkt via force-cancel. | main 2.0.92 |
| 15 sep | Zwevende "Hulp & contact" weg op telefoon, hulp via profielmenu. | main 2.0.84 |
| 15 sep | Waarschuwing bij meer dan 24 uur per dag, niets naar de server tot het klopt. | 2.0.83 |
| 15 sep | Klanturenstaatlabel niet op Mijn uren in Klassiek (was al zo), bewaakt. | 2.0.87 |
| 15 sep | Teamupdates altijd neutraal: geen namen, rollen gebruiken (bv. "Beheer"). | werkwijze |
| 15 sep | Main en herontwerp stemmen onderling af; Gio krijgt de uitkomst. Prod en productbesluiten blijven bij Gio. | werkwijze |
| 15 sep | Monkey-verkenning Klassiek met vaste regressiecases KLV-N-001 t/m KLV-N-011. | 2.0.77–2.0.90 |
