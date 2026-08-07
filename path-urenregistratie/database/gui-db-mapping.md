# GUI naar database mapping

Deze mapping legt vast hoe de demo-GUI zich verhoudt tot de SQL-tabellen.

## Hoofdtabellen

| GUI onderdeel | DB tabel(len) |
| --- | --- |
| Organisatie/Path instellingen | `companies` |
| Beheerders en medewerkerslogin | `users`, `employees`, `user_preferences` |
| Medewerkerkaart | `employees`, `assignments`, `counterparties` |
| Broker/klant/boekhouder/EasySalary | `counterparties`, `mail_recipients`, `assignment_mail_routes` |
| Maandkiezer | `periods` |
| Uren invullen | `timesheets`, `time_entries` |
| Correctie vragen | `timesheets.status = 'correction'`, `timesheet_corrections` |
| Klanturenstaat uploaden | `customer_timesheets` |
| Facturen | `invoices`, `timesheets`, `assignments`, `counterparties` |
| Mededelingen | `announcements`, `announcement_recipients`, `notifications` |
| Audit/logging | `audit_log` |

## Statusmapping uren

| GUI status | DB status |
| --- | --- |
| Nog niet ingediend | `timesheets.status = 'draft'` |
| Ingediend / wacht op controle | `timesheets.status = 'submitted'` |
| Goedgekeurd | `timesheets.status = 'approved'` |
| Correctie nodig | `timesheets.status = 'correction'` |
| Gefactureerd / afgesloten | `timesheets.status = 'invoiced'` |

## Statusmapping klanturenstaat

| GUI status | DB status |
| --- | --- |
| Nog niet ontvangen | `customer_timesheets.status = 'missing'` |
| Concept opgeslagen | `customer_timesheets.status = 'draft'` |
| Controle nodig | `customer_timesheets.status = 'received'` |
| Goedgekeurd | `customer_timesheets.status = 'approved'` |
| Opnieuw uploaden | `customer_timesheets.status = 'resubmit'` |
| Al rechtstreeks gemaild | `customer_timesheets.status = 'skipped'` |
| Naar broker gecontroleerd/verstuurd | `customer_timesheets.status = 'sent'` |

## Statusmapping facturen

| GUI status | DB status |
| --- | --- |
| Nog geen factuur | `invoices.status = 'concept'` |
| Factuur klaar | `invoices.status = 'ready'` |
| Verzending gecontroleerd | `invoices.status = 'sent'` |
| Betaald | `invoices.status = 'paid'` |
| Geannuleerd | `invoices.status = 'cancelled'` |

## Demo-basisstand

| Maand | GUI doel | DB herkenning |
| --- | --- | --- |
| Juni 2026 | Afgeronde historie | alle `invoices.status = 'sent'` |
| Juli 2026 | Groen: 1 maandcontrole klaar | 3 facturen `sent`, Shawn `ready` |
| Augustus 2026 | Oranje: 2 blokkades | Marc `draft`, Stasjo `correction`, Brian/Shawn factuur `ready` |

## Werkvoorraad-telling

De GUI telt open acties uit meerdere bronnen:

- `timesheets.status = 'submitted'` → actie bij Backoffice.
- `timesheets.status = 'draft'` of `correction` → actie bij medewerker.
- `customer_timesheets.status = 'received'` → actie bij Backoffice.
- `customer_timesheets.status = 'approved'` met brokerroute actief → actie bij Backoffice.
- `customer_timesheets.status = 'missing'`, `draft` of `resubmit` → actie bij medewerker.
- `customer_timesheets.status = 'skipped'` → geen open actie; blijft wel als registratie/audit zichtbaar.
- `timesheets.status = 'approved'` en `invoices.status != 'sent'` → factuur-/verzendcontrole bij Backoffice.

In de seed levert dat 7 acties op:

- Juli 2026: 2 acties.
- Augustus 2026: 5 acties.
- Eigenaarverdeling: 4 bij Backoffice en 3 bij medewerkers.

## Live koppeling

Voor live koppeling moet de frontend niet meer direct `localStorage` gebruiken, maar een API. De database is dan de bron, en de API vertaalt bovenstaande tabellen naar dezelfde state-vorm die de GUI nu intern gebruikt.
