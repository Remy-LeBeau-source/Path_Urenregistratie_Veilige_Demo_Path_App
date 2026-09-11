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
| 13 | Opgeknipte schermen (Mijn maanden, Procesvoortgang, Klanturenstaat) zijn in New verborgen. Het opknippen landt daar dus niet. | gebruiker: "het opknippen zou je ook doorvoeren" | open |
| 24 | Bot die bij elke versie een bericht naar het team stuurt. WhatsApp-groepen kunnen niet via de officiële API; mail of Teams/Slack wel. Wacht op keuze. | gebruiker | wacht op gebruiker |
| 29 | "Standaardweek vullen" altijd laten overschrijven. LET OP: botst met een eerdere wens van Stasjo ("als ik ziek of vrij ben moet ik ze eruit kunnen halen"), die als eis in SKIN-H-023 staat. Advies: niet het gedrag van de bestaande knop omdraaien maar een aparte actie "week terugzetten naar standaard" toevoegen. Eerst kijken of taak 30 de klacht al wegneemt. | Shawn via WhatsApp | wacht op gebruiker |
| 25 | Echte mailadressen van medewerkers op TEST, zodat zij de urenoverzichtmail ook zien. Adressen onbekend bij mij; herinneringstaak draait elke 15 min, dus collega's krijgen dan automatisch post. Wacht op adressen en akkoord. | gebruiker | wacht op gebruiker |
| 15 | Statuslabels: kleuren zijn per scherm gegroeid; één systeem waarin een kleur overal hetzelfde betekent. | eigen voorstel | open |
| 16 | Laadtoestanden ("Werkvoorraad laden…") staan als gewone tekst op de plek van een getal; het scherm springt. | eigen voorstel | open |
| 17 | Tabellen: rijritme, hover en uitlijning van getallen/bedragen. | eigen voorstel | open |
| 18 | Donkere herokaart is een plat blok met een lichter kadertje. | eigen voorstel | open |
| 19 | Hulp- en meldingenpaneel nooit bekeken. | eigen voorstel | open |
| 20 | "Mijn maanden": "totaal verantwoord" staat op elke rij herhaald; hoort in de kolomkop. | eigen vondst | open |
| 21 | PROD-goedkeuringspoort blokkeert de hele uitrolketen. Alleen de gebruiker kan die afhandelen. | eigen vondst | wacht op gebruiker |

## Afgerond

| # | Punt | Bron | Status |
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

## Bewust niet gedaan

| Punt | Reden |
|---|---|
| Primaire knop naar dieper groen met witte tekst. | Haalt op de donkere herokaart de contrastnorm niet; mint met donkere tekst voldoet daar juist ruim. Een primaire kleur die per ondergrond verschilt kost complexiteit zonder winst. |
| "Jouw uren in 4 stappen" uit New halen (punt 3 van Shawn). | Gebruiker bevestigde dat het laat zien in welke stap je zit en daar waarde heeft. Klassiek heeft dit blok niet. |
