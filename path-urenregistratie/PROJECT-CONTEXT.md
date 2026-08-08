# Project Context

## Path Uren & Facturatie

Path Uren & Facturatie is de interne demo-app voor urenregistratie en facturatie.

Medewerkers voeren uren in. De backoffice controleert die uren, keurt ze goed, factureert en zet mails klaar voor verdere afhandeling.

## Rollen

- `administrator` / backoffice
- `employee` / medewerker

## Demo-medewerkers

- Marc de Roon
- Stasjo van Bakel
- Brian Hek
- Shawn-Douglas Nahar

## Demo-perioden

- Juni 2026: afgerond
- Juli 2026: deels gecontroleerd en klaar voor controle
- Augustus 2026: combinatie van blokkades en klaar-voor-controle

## Workflow

- concept
- ingediend
- correctie
- goedgekeurd
- factuur klaar
- verzonden

## Privacy

Een employee ziet alleen eigen data. Er is geen toegang tot volledige medewerkerlijsten, collega-data of backoffice-brede overzichten.

## Mail

De demo- en testomgeving verstuurt geen echte mails. Mailflows blijven zichtbaar als preview of routecontrole.

## Security

- Geen secrets in Git
- [server/config.local.php](server/config.local.php) nooit committen
- `.env.local` nooit committen
- Demo/testwachtwoorden alleen lokaal en tijdelijk gebruiken
