# Database ERD — Path Uren & Facturatie

## Overzicht

De aanbevolen ERD is beschikbaar als schaalbare [ERD.svg](ERD.svg) en als hoge-resolutie
[ERD.jpg](ERD.jpg). Deze rustige hoofdversie toont alle 19 tabellen en alle 76 sleutelvelden.
Per veld zijn `PK`, `FK`, `PK/FK` en `UQ` zichtbaar. Achter ieder foreign-keyveld staat direct de
doeltabel en doelkolom, zodat alle 49 relaties leesbaar blijven zonder lange kruisende lijnen.

![Overzichtelijke database-ERD van Path Uren & Facturatie](ERD.svg)

## Volledig technisch detail

De volledige versie is beschikbaar als [ERD-detail.svg](ERD-detail.svg) en
[ERD-detail.jpg](ERD-detail.jpg). Deze bevat alle 263 kolommen, datatypes, nullability en de 49
fysieke foreign-keyverbindingen uit `schema.sql`.

## Domeinen

| Domein | Tabellen |
|---|---|
| Identiteit en beheer | `companies`, `users`, `user_preferences`, `audit_log` |
| Mensen en opdrachten | `employees`, `counterparties`, `assignments` |
| Uren en perioden | `periods`, `timesheets`, `time_entries`, `timesheet_corrections` |
| Routes en documenten | `mail_recipients`, `assignment_mail_routes`, `customer_timesheets` |
| Facturatie en communicatie | `invoices`, `announcements`, `announcement_recipients`, `notifications`, `email_deliveries` |

Bij een schemawijziging moeten `schema.sql`, de bijbehorende migration en beide ERD-versies samen
worden bijgewerkt.
