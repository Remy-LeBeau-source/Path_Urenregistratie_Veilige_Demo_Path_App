# Wensen, besluiten en open taken (Gio)

Eén lijst van alles wat Gio vraagt en wat we besluiten, zodat niets vergeten wordt.
Bijgehouden door de herontwerp-sessie; main werkt zijn eigen punten hier ook bij.
Nieuwste bovenaan per status. Statussen: **open**, **bezig**, **klaar (versie)**, **bij main**.

## Open en bezig

| Datum | Wens / besluit van Gio | Wie | Status |
|---|---|---|---|
| 15 sep | **Filter Gelezen in Berichten**, compact: Actueel · Ongelezen · Gelezen · Ingetrokken · Alles met korte labels en aantallen. (Bruin bij ingetrokken was nog 2.0.108; grijs komt met 2.0.112.) | herontwerp | bezig |
| 15 sep | **Meer voorbeeldberichten voor alle medewerkers:** 15 mededelingen per medewerker (Stasjo, Marc, Brian, Shawn), waarvan 6 ingetrokken en 5 ongelezen, zodat onder Alles ook een tweede pagina te testen is. Nu: Stasjo 10/6/4, de rest 7 met 1 ongelezen. | main | bij main |
| 15 sep | Wisselvallig op mobile-safari: SKIN-H-040. 15 sep 5 van 5 keer groen herhaald, niet te reproduceren; opnieuw bekijken als hij in CI nog eens valt. | herontwerp | in de gaten houden |
| 15 sep | Oude 0-regels uit de indienbug: geen opschoonscript. PROD is nog niet live (alleen gebruikers gemigreerd) en krijgt bij de livegang een verse migratie/reset met de gerepareerde code (R44 in BESLISTABEL.md; de reset hoort bij de livegangchecklist van Gio). | besluit | vastgelegd |
| 15 sep | Bel en Berichten blijven allebei: bel = eigen urenstatus, correcties, herinneringen; Berichten = algemene mededelingen. | besluit | vastgelegd |
| 15 sep | Dialoog met toetsenbord onder "minder beweging": dialoog krimpt niet mee (SKIN-N-008 fixme). Controleren op echte iPhone. | herontwerp | open |

## Klaar

| Datum | Wens / besluit | Versie |
|---|---|---|
| 15 sep | Werkwijze stokje: één agent per branch tegelijk (wie "aan zet" staat bovenaan CODEX_HANDOFF.md). Overdragen = alles gepusht + CI-uitkomst + stokje bijwerken; overnemen = fetch, schone werkmap, log lezen. Versienummer altijd hoogste op origin + 1. Aanleiding: dubbel 2.0.69, afgebroken CI 2.0.73 en achtergebleven commit toen Codex en Claude tegelijk werkten (14 sep). | werkwijze |
| 16 sep | Mededelingen-seed op TEST: elke medewerker (Stasjo/Marc/Brian/Shawn) krijgt nu dezelfde 15 mededelingen, 6 ingetrokken, 9 actueel, 5 ongelezen — zodat "Alles" een tweede pagina toont (10 per pagina). Vijf nieuwe mededelingen toegevoegd en de drie bestaande die eerst alleen Stasjo zag, nu voor alle vier. Geverifieerd met een query op de lokale testdatabase (15/6/9/5 klopt voor alle vier). Herontwerp werkt NOT-H-012/NOT-H-017 hierop bij. | main (seed-only, geen versiebump) |
| 16 sep | Interactieve demo van de werkwijze uit Gio's eigen procesplaatje (Jira+Confluence → Zephyr → Playwright/Cypress/API → CI/CD), als los Claude-Artifact "Path Pipeline": https://claude.ai/code/artifact/724f13a3-819e-4e55-8462-abf73b8236ec — geen deel van de repo, geen appfunctie, dus geen MASTERCHECKLIST/BESLISTABEL-entry; alleen hier en in main-sessiegeheugen vastgelegd. Drie tabbladen (Backlog/Kennisbank/Testbeheer) delen live data via de artifact-db; een ticket doorlopen laat 'm zichtbaar door alle vier fases lopen en schrijft een regel in de Living Doc (hard begrensd op de laatste 10, net als "Nieuw in de app"). Gezaaid met vijf echte opleveringen uit dit project (PATH-196/194/197/188/191), elk met het volledige Gherkin-scenario. Blijft privé tot Gio 'm zelf deelt; main werkt 'm bij op verzoek. | artifact (geen versie) |
| 15 sep | Voorbeeldmeldingen in de bel voor alle medewerkers op TEST: elk 4 ongelezen (correctie, uren invullen, goedgekeurd, klanturenstaat), tik springt naar de juiste plek. | main 2.0.108 + 2.0.111 |
| 15 sep | Prod-wekker slimmer: na 10 minuten alleen afbreken als main een nieuwere commit heeft dan de wachtende release; zo niet, dan blijft de stap naar productie open. Elke 5 minuten opnieuw gekeken (tot 360 min). Contractcheck met tegenproef, R45. Nog te bevestigen in de eerstvolgende echte release. | main 2.0.106 |
| 15 sep | Berichten: filter Actueel (alleen berichten die nog gelden) als startfilter, met aantallen in de filters (Actueel · N, Ingetrokken · N). Ingetrokken rustig en neutraal in plaats van oranje/bruin: omlijnd grijs label, gedempte titel, reden met dun streepje. NOT-H-017 (contrast ≥ 4,5 licht en donker). | 2.0.105 |
| 15 sep | Overzicht bij veel meldingen: Berichten toont hooguit de laatste 30, 10 per pagina met Vorige/Volgende (ongelezen altijd vooraan); de bel hooguit 10 ongelezen met "en nog N". NOT-H-016. | 2.0.105 |
| 15 sep | Nieuw in de app: datum en tijdstip van elke release, 20 updates, 5 per pagina met Vorige/Volgende. KLV-H-018. | 2.0.105 |
| 15 sep | Werkwijze: bij elke fix of wens een Playwright-case met assertions, benoemde TMap/ISTQB-techniek en een tegenproef (rood op oude code). | werkwijze |
| 15 sep | Berichten: de onderste kaart stak met rechte hoeken over de ronde hoeken van het paneel ("die hoekjes"). Paneel knipt nu af; bewaakt in NOT-H-012. | 2.0.104 |
| 15 sep | Berichten ronde 2 (Gio): gelezen alleen bij openklappen of het kleine knopje Markeer als gelezen, niets vanzelf; alle berichten ingeklapt, nieuwe met Nieuw en vet bovenaan; Berichten springt naar het eerste ongelezen bericht; leeg filter Ongelezen valt terug op Alles. NOT-H-011, NOT-N-015; smoke zonder fouten. | 2.0.103 |
| 15 sep | Statuspil naast een kop in Instellingen stak op smalle telefoons uit (18px bij 360, 58px bij 320). Kop loopt nu om, pil mag over twee regels (KLV-N-022). Monkey seed 15 opnieuw gedraaid (150 stappen): de melding "door iemand anders gewijzigd" komt niet meer terug. CODEX_HANDOFF bijgewerkt t/m 2.0.101. | 2.0.102 |
| 15 sep | Bel en Berichten slimmer (keuze Gio: slim voorstel): bel van de medewerker alleen over de eigen uren, tik brengt je naar de plek (Mijn uren van die maand, Maanden met die maand open); mededelingen alleen in Berichten, ongelezen open en bovenaan, gelezen en ingetrokken ingeklapt; gelezen vanzelf (tik of 2 s in beeld), geen Markeer-knop, wel Alles gelezen (alleen mededelingen). NOT-H-010 t/m 014, NOT-N-015, smoke. | 2.0.101 |
| 15 sep | TEST-seed: 10 mededelingen, 6 ingetrokken, 4 ongelezen (main). | main 2.0.100 |
| 15 sep | Testfunctieknoppen tonen het doel: in licht "Donker", in Klassiek "Modern" en andersom; geen aria-pressed meer (KLV-H-021). | 2.0.99 |
| 15 sep | Knop in Mijn maanden: huisstijlknop (mint, zelfde vorm als andere hoofdknoppen) in plaats van kale grijze browserknop, en de tekst volgt de stap: Uren invullen, Maand indienen, Correctie doorvoeren, Opnieuw indienen, Klanturenstaat aanleveren (KLV-H-020). | 2.0.98 |
| 15 sep | Ingevulde uren onleesbaar in donker op Mijn uren (Klassiek, desktop): vak was bijna wit met bijna witte cijfers (contrast 1,04:1). Nu donker vak met lichte cijfers en zichtbare rand; KLV-H-019 meet contrast ≥ 4,5:1 in licht en donker op 390 en 1280. | 2.0.97 |
| 15 sep | Tooltip vormgevingsknop: "Naar Modern" / "Naar Klassiek" in plaats van "Naar nieuw" (bewaakt in KLV-H-010). | 2.0.97 |
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
