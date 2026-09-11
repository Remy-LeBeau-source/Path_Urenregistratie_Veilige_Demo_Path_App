# UI-takenlijst

Lopende lijst van alles wat de gebruiker aandraagt (foto's, meldingen, verzoeken)
en wat daaruit volgt. Bedoeld om niets te laten vallen. Nieuwe punten onderaan
toevoegen; afgeronde punten laten staan met de versie erbij, zodat te zien is
wanneer iets is opgelost.

Status: `open` · `bezig` · `klaar (vX.Y.Z)` · `bewust niet`

---

## Openstaand

| # | Punt | Bron | Status |
|---|---|---|---|
| 24 | Bot die bij elke versie een bericht naar het team stuurt. WhatsApp-groepen kunnen niet via de officiële API; mail of Teams/Slack wel. Wacht op keuze. | gebruiker | wacht op gebruiker |
| 29 | "Standaardweek vullen" altijd laten overschrijven. LET OP: botst met een eerdere wens van Stasjo ("als ik ziek of vrij ben moet ik ze eruit kunnen halen"), die als eis in SKIN-H-023 staat. Advies: niet het gedrag van de bestaande knop omdraaien maar een aparte actie "week terugzetten naar standaard" toevoegen. Eerst kijken of taak 30 de klacht al wegneemt. | Shawn via WhatsApp | wacht op gebruiker |
| 25 | Echte mailadressen van medewerkers op TEST, zodat zij de urenoverzichtmail ook zien. Adressen onbekend bij mij; herinneringstaak draait elke 15 min, dus collega's krijgen dan automatisch post. Wacht op adressen en akkoord. | gebruiker | wacht op gebruiker |
| 15 | Statuslabels: kleuren zijn per scherm gegroeid; één systeem waarin een kleur overal hetzelfde betekent. | eigen voorstel | open |
| 16 | Laadtoestanden ("Werkvoorraad laden…") staan als gewone tekst op de plek van een getal; het scherm springt. | eigen voorstel | open |
| 17 | Tabellen: rijritme, hover en uitlijning van getallen/bedragen. | eigen voorstel | open |
| 18 | Donkere herokaart is een plat blok met een lichter kadertje. | eigen voorstel | open |
| 19 | Hulp- en meldingenpaneel nooit bekeken. | eigen voorstel | open |
| 21 | PROD-goedkeuringspoort blokkeert de hele uitrolketen. Alleen de gebruiker kan die afhandelen. | eigen vondst | wacht op gebruiker |
| 34 | Beheerdashboard in New staat als één lange pagina met veel lege ruimte links en rechts; vraag of dat slimmer kan. Zie mijn antwoord in de chat: de kolom mag breder en de onderste twee panelen horen achter hun eigen ingang. | vraag gebruiker | open |

## Afgerond

| # | Punt | Bron | Status |
| 33 | Testdocumenten bij Openen/Downloaden in het documentarchief. De factuur is nu een echte Path-factuur (juiste onderneming, ontvanger, bedragen, IBAN) en de urenstaat een Path-voorbeeldstaat met de echte naam, opdracht, maand en uren van die maand. Onderweg bleek `server/api/invoices.php` niet te gebruiken vanuit een resetscript: dat bestand handelt bij inladen meteen een verzoek af. De opbouw van de factuur-PDF staat daarom nu in `server/lib/invoice-pdf.php`, die het endpoint en de TEST-reset beide gebruiken; opslaan en het bijwerken van `pdf_storage_key` blijft in het endpoint, want dat is verzoekgedrag. De reset schrijft de bytes op de sleutel die de rij al heeft, anders schuift die kolom bij elke reset en dat leest de e2e-isolatievingerafdruk. Het woord TESTDOCUMENT staat nog in de voettekst van de urenstaat, want `server/mail/dispatch.php` gebruikt die marker om te voorkomen dat een voorbeeld ooit als echte factuur wordt meegemaild. | foto gebruiker | klaar (v1.0.100) |
|---|---|---|---|
| 1 | Menu opknippen in groepen (Werkvoorraad / Organisatie). | gebruiker | klaar (v1.0.82) |
| 2 | Topbalk: vijf gelijke knoppen zonder hiërarchie. | eigen vondst | klaar (v1.0.82) |
| 3 | Urenraster: 25 groene datumpillen, accent wees nergens naar. | eigen vondst | klaar in Klassiek (v1.0.82), New volgt in v1.0.91 |
| 4 | Tegelrij stond vast op vier kolommen terwijl de medewerker er vijf heeft. | eigen vondst | klaar (v1.0.82) |
| 5 | Medewerkerkaarten: gegevens in vakjes die op invulvelden leken. | eigen vondst | klaar in Klassiek (v1.0.83), New volgt in v1.0.91 |
| 6 | Instellingen: springlinks leken tabbladen, kleurkiezers waren balken van 500px. | eigen vondst | klaar (v1.0.83) |
| 7 | Logovoorbeeld bij "Eigen logo" onzichtbaar in donkere modus. | eigen vondst | klaar (v1.0.83) |
| 8 | Klassiek had geen eigen lettertype; beeld hing af van het besturingssysteem. | eigen vondst | klaar (v1.0.84) |
| 9 | Dialoog: vijf weekdagen als lijst i.p.v. week; opslaanknop onder de vouw. | eigen vondst | klaar (v1.0.85) |
| 10 | Mobiele kop was vier losse regels. | eigen vondst | klaar (v1.0.86) |
| 11 | Inlogscherm bood drie ingangen op gelijke sterkte. | eigen vondst | klaar (v1.0.87) |
| 22 | Logo in de donkere New-skin slecht zichtbaar (chip i.p.v. logo, in vierkant geperst). | gebruiker, tweemaal gemeld | klaar (v1.0.92) |
| 23 | Horizontale schuifbalk tussen 760 en 1300px (topbalk liep buiten beeld). | eigen vondst | klaar (v1.0.92) |
| 12 | `styles-new.css` had geen versieparameter in `index.html` terwijl `styles.css` die wel kreeg: de New-skin bleef na een release uit de cache komen. Nu ook gestempeld, set-version houdt hem bij (16 plekken). | eigen vondst n.a.v. "ik zie geen verschil in v1.0.90" | klaar (v1.0.92) |
| 26 | De vier stappen in New: lijnen raakten de bollen niet (halo van 5px dekte het uiteinde af) en bij stap 1 ontbrak de lijn. Nu één doorlopende lijn van bol tot bol. | foto gebruiker | klaar (v1.0.92) |
| 27 | Klanturenstaat-kaart in New: foto kapte hard af bij openklappen, en velden/statuspil/mailblok waren donker op crème. Foto loopt door en vervaagt; het hele kaartje is één licht palet. | foto gebruiker | klaar (v1.0.92) |
| 28 | New-skin overschreef drie Klassiek-verbeteringen (datumpillen, medewerkergegevens, mededelingen-meta) waardoor die daar niet landden. | eigen vondst n.a.v. "ik zie geen verschil" | klaar (v1.0.92) |
| 30 | De automatische standaardvulling draaide bij élke server-sync en vulde telkens elke dag op 0 opnieuw. Daardoor: een bewust leeg gelaten dag kwam terug, "Standaardweek vullen" had nooit iets te doen, en een net ingetypt uur kon worden overschreven in de race met het inlezen van de server (echte fout, raakte uren). Vult nu alleen nog bij een maand waar nog niets mee gebeurd is. | eigen vondst via SKIN-H-011 + melding Shawn | klaar (v1.0.95) |
| 31 | Hulptekst over de bel noemde klanturenstaat-meldingen niet en beweerde hard dat e-mailverzending uitstond. | tester via foto | klaar (v1.0.92) |
| 13 | Opgeknipte schermen in New. Mijn maanden (`#view-historie`) en de ingang ernaartoe waren daar verborgen; dat was een gat, geen keuze. Scherm en teaser hebben nu eigen New-opmaak (kaarten i.p.v. tabelregels, zelfde donkere werkruimte als Mijn uren). Klanturenstaat en Procesvoortgang blijven in New verborgen: die hebben daar al een eigen kaart resp. de stappenlijn bovenaan. | gebruiker: "het opknippen zou je ook doorvoeren" | klaar (v1.0.99) |
| 20 | "Mijn maanden": "totaal verantwoord" stond onder elk uurtotaal. Staat nu één keer in de kolomkop ("Uren verantwoord"). | eigen vondst | klaar (v1.0.99) |
| 37 | Maandkoppen in de open werkvoorraad liepen dwars door elkaar ("Eerdere maand · nog niet afgerond" over "Juli 2026 · 5 open acties"). Oorzaak: `.admin-task-month` is per ongeluk twee componenten (de maandtegeltjes én de uitklapbare maandsecties), waardoor een sectie het raster van een tegeltje kreeg en de kop in 68px werd geperst. Beide stijlbladen gescoped. | foto gebruiker | klaar (v1.0.99) |
| 38 | Toelichtingsregel onder "Klanturenstaten" stond links buiten de kaart. De klasse `open-periods-intro` had helemaal geen opmaak, dus geen padding terwijl de kop erboven 24px inspringt. Gold in beide skins. | foto gebruiker: "teveel naar links" | klaar (v1.0.99) |
| 39 | Geselecteerde rij in de beheerstoryline kreeg een amberen rand en amberen statustekst, terwijl amber in deze skin "actie vereist" betekent. "Voltooid" las daardoor als waarschuwing. Selectie is nu een neutrale lichte omlijning, de status wordt vet en houdt zijn eigen kleur. | foto gebruiker | klaar (v1.0.99) |
| 32 | Logo linksboven in New nog steeds onduidelijk (derde melding). Twee dingen door elkaar. (a) De eerdere oplossing (witte logovariant zonder chip, breder logo) zit in mijn tak vanaf v1.0.92 maar niet in main, en is dus nooit op TEST beland — TEST draait main. Zit vast achter punt 36. (b) Die oplossing was zelf nog maar half goed: in de lichte modus koos de eerste tekening het donkere woordmerk (applyOrganizationBranding draait vóór applySkin, dus data-skin stond nog op classic), en de merkpil op het medewerkerdashboard was in de lichte modus juist licht terwijl de code altijd het witte woordmerk koos. Beide gerepareerd. | foto gebruiker, drie keer gemeld | code klaar (v1.0.99), wacht op uitrol |
| 35 | Voettekst van het beheerdashboard toont in New nog de Klassiek-stijl. Oorzaak: de twee regels die dat moesten regelen verwezen naar `--font-sans` en `--tekst`, en die tokens bestaan niet. | eigen vondst in foto gebruiker | klaar (v1.0.99) |
| 40 | `--surface-muted` werd op 19 plekken als achtergrond gebruikt en was nergens gedefinieerd. Een `var()` naar een onbekend token maakt de hele declaratie ongeldig, dus stonden al die vlakken transparant in plaats van verdiept. Nu gedefinieerd per skin en per modus. | eigen vondst via een tokenscan | klaar (v1.0.99) |
| 36 | Releasepijplijn op main was rood, vier runs op rij, dus er kwam niets meer op TEST. Drie oorzaken, alle drie gerepareerd. (a) SAFE-H-018 controleerde voor gebruiker 1 en 2 hard op het vaste demowachtwoord, terwijl CI én de releasepijplijn per run een willekeurig beheer- en medewerkerwachtwoord genereren en die hash op alle zes baselineaccounts zetten (`scripts/bootstrap-playwright-db.mjs`). Lokaal staat die env-variabele niet, dus slaagde hij altijd; in CI kon hij niet slagen. De case legt nu zijn eigen uitgangssituatie vast binnen de transactie die toch al wordt teruggedraaid. Bewezen door de CI-situatie lokaal na te bootsen: main's versie faalt met exact dezelfde melding, met de fix slaagt hij. (b) De feature-bestanden worden gegenereerd door `sync-living-docs.mjs`; die was na het toevoegen van SAFE-H-018 niet gedraaid, dus klaagde de test-design-audit over een case zonder feature. Gedraaid. (c) Shard 9 liep op exit 124: de releasepijplijn stond nog op 14 min binnen een stap van 15, terwijl ci.yml op 11 sep naar 22/23 is gegaan. Gelijkgetrokken. | eigen vondst | klaar (v1.0.99) |

## Bewust niet gedaan

| Punt | Reden |
|---|---|
| Primaire knop naar dieper groen met witte tekst. | Haalt op de donkere herokaart de contrastnorm niet; mint met donkere tekst voldoet daar juist ruim. Een primaire kleur die per ondergrond verschilt kost complexiteit zonder winst. |
| "Jouw uren in 4 stappen" uit New halen (punt 3 van Shawn). | Gebruiker bevestigde dat het laat zien in welke stap je zit en daar waarde heeft. Klassiek heeft dit blok niet. |
