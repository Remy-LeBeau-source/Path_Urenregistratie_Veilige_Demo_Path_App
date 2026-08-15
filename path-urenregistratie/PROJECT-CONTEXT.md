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

- LOCAL verstuurt geen echte e-mail en toont alleen preview/routecontrole.
- TEST kan echte e-mail alleen via de expliciete mailsandbox versturen. Alle routes worden dan
  fysiek afgeleverd bij `giovanno.maatsen@pathconsultancy.nl`; de bedoelde productieroute blijft
  in de UI en auditregistratie zichtbaar.
- PROD gebruikt nooit TEST-omleiding en blijft fail-closed zolang productie-mail niet bewust is vrijgegeven.

## Security

- Geen secrets in Git
- [server/config.local.php](server/config.local.php) nooit committen
- `.env.local` nooit committen
- Demo/testwachtwoorden alleen lokaal en tijdelijk gebruiken
# Werkwijze

Lees vóór iedere wijziging `WERKWIJZE-PATROON.md`, `FUNCTIONEEL-ONTWERP.md` en
`TECHNISCH-ONTWERP.md`. De vaste ontwikkel-, test- en releasecriteria staan in dat werkwijzepatroon.
