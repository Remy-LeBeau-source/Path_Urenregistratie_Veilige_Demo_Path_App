# Productarchitectuur Uren & Facturatie v0.9.0

Deze versie behandelt Path Consultancy als de eerste ingevulde organisatieconfiguratie, niet als de enige organisatie waarvoor de applicatie kan werken.

## Wat een organisatie zelf kan instellen

- organisatienaam en naam van de applicatie;
- eigen logo, primaire kleur en accentkleur;
- naam en e-mailadres van de ondersteuning;
- juridische facturerende onderneming en factuurgegevens;
- medewerkers, beheerders, opdrachtgevers, brokers, tarieven en factuurnummerpatronen;
- centrale ontvangers met een zelfgekozen naam en type, bijvoorbeeld boekhouding, salarisadministratie of een andere administratie;
- per medewerker en ontvanger: wel of geen afzonderlijke mail en wel of geen factuur als PDF;
- mailonderwerp, begeleidende tekst en aanvullende brokerreferenties.

Path wordt als complete voorbeeldomgeving meegeleverd. Een andere organisatie hoeft daardoor niet eerst alle functies zelf te demonstreren, maar kan de voorbeeldgegevens vervangen door de eigen inrichting.

## Productregels die niet aan Path zijn gekoppeld

- Iedere ontvanger krijgt een afzonderlijk bericht; verschillende gegevensstromen worden niet via CC of BCC gecombineerd.
- Bijlagen worden per ontvanger toegestaan.
- Een salarisadministratie is een configureerbaar ontvangerstype en hoeft niet EasySalary te heten.
- Een broker kan per opdracht of medewerker verschillen.
- Factuurnummering is een patroon per opdracht en periode, niet één vast Path-formaat.
- Oude versies, intrekkingen, urenstatussen en verzendingen blijven controleerbaar.
- De gebruikersinterface gebruikt de ingestelde organisatiebranding.

## Nodig voor een verkoopbare productieomgeving

De demo bewaart gegevens lokaal in één browser. Voor meerdere betalende organisaties wordt de bestaande MySQL-opzet gebruikt met `company_id` als tenantgrens. De productiebackend moet aanvullend afdwingen:

1. Een gebruiker krijgt uitsluitend data van de eigen organisatie.
2. Iedere query, upload, PDF en verzendtaak wordt aan één `company_id` gekoppeld.
3. Logo's en documenten worden per organisatie in afgeschermde opslag bewaard.
4. Google-inlog, mailafzender en andere geheimen worden per organisatie server-side beheerd.
5. Een organisatiebeheerder kan de eerste inrichting via een onboarding doorlopen.
6. Factuurnummers worden bij definitieve verzending atomair vastgezet.
7. Auditlog, back-ups, herstel en privacy-export werken per organisatie.
8. Abonnement, limieten en activatiestatus worden per organisatie bijgehouden.

## Voorgestelde onboarding

1. Organisatie en branding instellen.
2. Facturerende onderneming invullen.
3. Beheerders en medewerkers uitnodigen.
4. Opdrachtgevers, brokers en opdrachten aanmaken.
5. Centrale ontvangers en bijlageregels instellen.
6. Factuursjabloon en mailvoorbeeld controleren.
7. Eén volledige testmaand uitvoeren.
8. Pas daarna echte verzending activeren.

De frontend van v0.9.0 demonstreert de configureerbare inrichting. De server-side tenantbeveiliging en onboarding zijn bewust productiewerk en mogen niet door lokale browseropslag worden vervangen.
