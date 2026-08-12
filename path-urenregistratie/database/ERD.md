# Database ERD — Path Uren & Facturatie

De definitieve ERD is als schaalbare vector beschikbaar in [ERD.svg](ERD.svg).
Voor eenvoudig delen en invoegen is er ook een hoge-resolutie [ERD.jpg](ERD.jpg).
Het diagram is rechtstreeks gebaseerd op het actuele `schema.sql` en toont alle 19 tabellen en
alle 263 kolommen. Per veld zijn `PK`, `FK`, `PK/FK` en `UQ` zichtbaar; de verbindingslijnen tonen
alle 49 foreign-keyrelaties tussen de functionele domeinen.

![Database ERD van Path Uren & Facturatie](ERD.svg)

## Domeinen

| Domein | Tabellen |
|---|---|
| Identiteit en beheer | `companies`, `users`, `user_preferences`, `audit_log` |
| Mensen en opdrachten | `employees`, `counterparties`, `assignments` |
| Uren en perioden | `periods`, `timesheets`, `time_entries`, `timesheet_corrections` |
| Routes en documenten | `mail_recipients`, `assignment_mail_routes`, `customer_timesheets` |
| Facturatie en communicatie | `invoices`, `announcements`, `announcement_recipients`, `notifications`, `email_deliveries` |

Bij een schemawijziging moeten `schema.sql`, de bijbehorende migration en `ERD.svg` samen worden
bijgewerkt.
