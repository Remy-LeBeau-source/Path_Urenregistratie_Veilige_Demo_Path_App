# TEST BDD Mapping

## Architectuur

- Native Playwright specs zijn de uitvoerbare bron van waarheid.
- `.feature`-bestanden zijn Living Documentation.
- `.steps.ts`-bestanden zijn navigatie- en case-ID-mapping zonder Cucumber-runner.
- Case-ID staat in de scenarionaam en is gelijk aan Playwright en Allure `testCaseId`.

## Compacte tagconventie

- Feature: `@regressie`, precies een hoofdtype (`@ui`, `@api`, `@security`, `@db` of `@integration`), optioneel `@desktop`/`@mobile`, en `@fase:<nummer>`.
- Scenario: precies een van `@happy` of `@negative`.
- Geen domein-, backend-, case-ID- of lange business-taglijsten.

## Volledige traceability matrix

| Case ID | Type | Feature file | Scenario | Steps mapping | Playwright spec | Allure parentSuite | Allure Feature | Allure Story | Flow | Fase | Status |
|---|---|---|---|---|---|---|---|---|---|---:|---|
| AUD-H-001 | api | audit-log.feature | admin kan auditlog ophalen | audit-log.steps.ts | audit-log.spec.ts | API | Audit & Security | admin kan auditlog ophalen | Happy | 16 | Actueel |
| AUD-H-002 | api | audit-log.feature | auditlog filtert op entity_type | audit-log.steps.ts | audit-log.spec.ts | API | Audit & Security | auditlog filtert op entity_type | Happy | 16 | Actueel |
| AUD-H-003 | api | audit-log.feature | auditlog filtert op event_type | audit-log.steps.ts | audit-log.spec.ts | API | Audit & Security | auditlog filtert op event_type | Happy | 16 | Actueel |
| AUD-H-004 | api | audit-log.feature | auditlog bevat geen wachtwoorden of tokens in event_data | audit-log.steps.ts | audit-log.spec.ts | API | Audit & Security | auditlog bevat geen wachtwoorden of tokens in event_data | Happy | 16 | Actueel |
| AUD-N-005 | api | audit-log.feature | anonieme gebruiker krijgt 401 op auditlog | audit-log.steps.ts | audit-log.spec.ts | API | Audit & Security | anonieme gebruiker krijgt 401 op auditlog | Negative | 16 | Actueel |
| AUD-N-006 | api | audit-log.feature | medewerker mag auditlog niet lezen | audit-log.steps.ts | audit-log.spec.ts | API | Audit & Security | medewerker mag auditlog niet lezen | Negative | 16 | Actueel |
| AUTH-H-001 | ui | auth.feature | Admin logt in en auth/me geeft de juiste gebruiker terug | auth.steps.ts | auth.spec.ts | UI Desktop | Authenticatie | Veilige toegang en sessies | Happy | 4 | Actueel |
| AUTH-H-002 | ui | auth.feature | Medewerker logt in en auth/me geeft de juiste gebruiker terug | auth.steps.ts | auth.spec.ts | UI Desktop | Authenticatie | Veilige toegang en sessies | Happy | 4 | Actueel |
| AUTH-H-003 | ui | auth.feature | Gebruiker logt uit en auth/me geeft authenticated false terug | auth.steps.ts | auth.spec.ts | UI Desktop | Authenticatie | Veilige toegang en sessies | Happy | 4 | Actueel |
| CTS-API-H-001 | api | customer-timesheets.feature | employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen | customer-timesheets.steps.ts | customer-timesheet-api.spec.ts | API | Klanturenstaten | Klanturenstaat lifecycle | Happy | 10 | Actueel |
| CTS-API-N-006 | api | customer-timesheets.feature | employee kan geen klanturenstaat voor andere medewerker wijzigen | customer-timesheets.steps.ts | customer-timesheet-api.spec.ts | API | Klanturenstaten | Klanturenstaat lifecycle | Negative | 10 | Actueel |
| CTS-API-N-007 | api | customer-timesheets.feature | employee kan geen admin reviewactie uitvoeren op klanturenstaat | customer-timesheets.steps.ts | customer-timesheet-api.spec.ts | API | Klanturenstaten | Klanturenstaat lifecycle | Negative | 10 | Actueel |
| CTS-API-H-004 | api | customer-timesheets.feature | employee kan mark_skipped registreren en restore_missing terugdraaien | customer-timesheets.steps.ts | customer-timesheet-api.spec.ts | API | Klanturenstaten | Klanturenstaat lifecycle | Happy | 10 | Actueel |
| CTS-API-N-005 | api | customer-timesheets.feature | employee krijgt 400 bij ongeldig bestandstype | customer-timesheets.steps.ts | customer-timesheet-api.spec.ts | API | Klanturenstaten | Klanturenstaat lifecycle | Negative | 10 | Actueel |
| DASH-H-001 | ui | dashboard.feature | admin dashboard opent zonder console errors | dashboard.steps.ts | dashboard.spec.ts | UI Desktop | Dashboard | admin dashboard opent zonder console errors | Happy | 15 | Actueel |
| DASH-H-002 | ui | dashboard.feature | employee dashboard opent zonder console errors | dashboard.steps.ts | dashboard.spec.ts | UI Desktop | Dashboard | employee dashboard opent zonder console errors | Happy | 15 | Actueel |
| DASH-N-007 | ui | dashboard.feature | gecachete oude open-acties teller wordt niet als actuele teller getoond | dashboard.steps.ts | dashboard.spec.ts | UI Desktop | Dashboard | gecachete oude open-acties teller wordt niet als actuele teller getoond | Negative | 15 | Actueel |
| DASH-N-008 | ui | dashboard.feature | voorbeeldgegevens herstellen overschrijft in auth-modus de DB teller niet | dashboard.steps.ts | dashboard.spec.ts | UI Desktop | Dashboard | voorbeeldgegevens herstellen overschrijft in auth-modus de DB teller niet | Negative | 15 | Actueel |
| EQ-H-001 | api | email-queue.feature | factuurlock maakt queue-items aan met dry_run=true | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | factuurlock maakt queue-items aan met dry_run=true | Happy | 12 | Actueel |
| EQ-H-002 | api | email-queue.feature | broker-channel heeft attachment_policy invoice | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | broker-channel heeft attachment_policy invoice | Happy | 12 | Actueel |
| EQ-H-003 | api | email-queue.feature | EasySalary-channel heeft attachment_policy none | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | EasySalary-channel heeft attachment_policy none | Happy | 12 | Actueel |
| EQ-H-004 | api | email-queue.feature | action=enqueue voor gelockte factuur maakt nieuwe items aan | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | action=enqueue voor gelockte factuur maakt nieuwe items aan | Happy | 12 | Actueel |
| EQ-H-005 | api | email-queue.feature | action=list response bevat verplichte velden | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | action=list response bevat verplichte velden | Happy | 12 | Actueel |
| EQ-N-006 | api | email-queue.feature | anonieme gebruiker krijgt 401 op list | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | anonieme gebruiker krijgt 401 op list | Negative | 12 | Actueel |
| EQ-N-007 | api | email-queue.feature | medewerker krijgt 403 op list | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | medewerker krijgt 403 op list | Negative | 12 | Actueel |
| EQ-N-008 | api | email-queue.feature | action=enqueue zonder invoice_id geeft 400 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | action=enqueue zonder invoice_id geeft 400 | Negative | 12 | Actueel |
| EQ-N-009 | api | email-queue.feature | action=enqueue niet-bestaande factuur geeft 404 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | action=enqueue niet-bestaande factuur geeft 404 | Negative | 12 | Actueel |
| EQ-N-010 | api | email-queue.feature | action=enqueue niet-gelockte factuur geeft 409 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | action=enqueue niet-gelockte factuur geeft 409 | Negative | 12 | Actueel |
| EQ-N-011 | api | email-queue.feature | action=retry op queued item geeft 409 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | action=retry op queued item geeft 409 | Negative | 12 | Actueel |
| EQ-N-012 | api | email-queue.feature | ongeldige status-filter geeft 400 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | ongeldige status-filter geeft 400 | Negative | 12 | Actueel |
| EQ-N-013 | api | email-queue.feature | anonieme enqueue geeft 401 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | anonieme enqueue geeft 401 | Negative | 12 | Actueel |
| EQ-N-014 | api | email-queue.feature | unknown action geeft 400 | email-queue.steps.ts | email-queue.spec.ts | API | E-mailverwerking | unknown action geeft 400 | Negative | 12 | Actueel |
| INV-H-004 | integration | invoice-locking.feature | admin lockt approved timesheet naar definitieve immutable factuur | invoice-locking.steps.ts | invoice-lock.spec.ts | DB / Integratie | Facturatie | Factuur definitief maken | Happy | 11 | Actueel |
| INV-N-008 | integration | invoice-locking.feature | anonieme gebruiker kan factuur niet locken | invoice-locking.steps.ts | invoice-lock.spec.ts | DB / Integratie | Facturatie | Factuur definitief maken | Negative | 11 | Actueel |
| INV-N-009 | integration | invoice-locking.feature | medewerker mag factuur niet finaliseren | invoice-locking.steps.ts | invoice-lock.spec.ts | DB / Integratie | Facturatie | medewerker mag factuur niet finaliseren | Negative | 11 | Actueel |
| INV-N-010 | integration | invoice-locking.feature | niet-goedgekeurde urenstaat kan niet worden gelockt | invoice-locking.steps.ts | invoice-lock.spec.ts | DB / Integratie | Facturatie | Factuur definitief maken | Negative | 11 | Actueel |
| INV-N-011 | integration | invoice-locking.feature | tweede lock-oproep op dezelfde factuur wordt geblokkeerd | invoice-locking.steps.ts | invoice-lock.spec.ts | DB / Integratie | Facturatie | Factuur definitief maken | Negative | 11 | Actueel |
| INV-N-012 | integration | invoice-locking.feature | gelijktijdige lock-requests leveren exact één winnaar | invoice-locking.steps.ts | invoice-lock.spec.ts | DB / Integratie | Facturatie | Factuur definitief maken | Negative | 11 | Actueel |
| INV-H-001 | ui | invoices-ui.feature | admin facturen zichtbaar en console errors 0 | invoices-ui.steps.ts | invoices.spec.ts | UI Desktop | Facturatie | admin facturen zichtbaar en console errors 0 | Happy | 11 | Actueel |
| INV-N-005 | ui | invoices-ui.feature | employee facturen zichtbaar maar beperkt en console errors 0 | invoices-ui.steps.ts | invoices.spec.ts | UI Desktop | Facturatie | employee facturen zichtbaar maar beperkt en console errors 0 | Negative | 11 | Actueel |
| INV-H-002 | ui | invoices-ui.feature | periodefilter juli en augustus werkt | invoices-ui.steps.ts | invoices.spec.ts | UI Desktop | Facturatie | periodefilter juli en augustus werkt | Happy | 11 | Actueel |
| INV-H-003 | ui | invoices-ui.feature | server berekent bedrag uit uren en uurtarief voor open facturen | invoices-ui.steps.ts | invoices.spec.ts | UI Desktop | Facturatie | server berekent bedrag uit uren en uurtarief voor open facturen | Happy | 11 | Actueel |
| INV-N-007 | ui | invoices-ui.feature | ongeldige periodefilter geeft nette 400-fout | invoices-ui.steps.ts | invoices.spec.ts | UI Desktop | Facturatie | ongeldige periodefilter geeft nette 400-fout | Negative | 11 | Actueel |
| MOB-H-001 | ui | mobile.feature | mobiele login navigatie en dashboard blijven volledig bereikbaar | mobile.steps.ts | mobile-ui.spec.ts | UI Mobile | Mobile Experience | Veilige toegang en sessies | Happy | 15 | Actueel |
| MOB-H-002 | ui | mobile.feature | mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken | mobile.steps.ts | mobile-ui.spec.ts | UI Mobile | Mobile Experience | Uren registreren en indienen | Happy | 15 | Actueel |
| MOB-H-003 | ui | mobile.feature | mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar | mobile.steps.ts | mobile-ui.spec.ts | UI Mobile | Mobile Experience | Correctie en goedkeuring | Happy | 15 | Actueel |
| MOB-N-004 | ui | mobile.feature | mobiele facturen touch targets en modals blijven binnen viewport | mobile.steps.ts | mobile-ui.spec.ts | UI Mobile | Mobile Experience | mobiele facturen touch targets en modals blijven binnen viewport | Negative | 15 | Actueel |
| NOT-H-001 | api | notifications.feature | ingelogde gebruiker kan notificaties ophalen | notifications.steps.ts | notifications.spec.ts | API | Notificaties | ingelogde gebruiker kan notificaties ophalen | Happy | 15 | Actueel |
| NOT-H-002 | api | notifications.feature | mark_all_read werkt zonder fouten | notifications.steps.ts | notifications.spec.ts | API | Notificaties | mark_all_read werkt zonder fouten | Happy | 15 | Actueel |
| NOT-N-003 | api | notifications.feature | anonieme gebruiker krijgt 401 op notificaties | notifications.steps.ts | notifications.spec.ts | API | Notificaties | anonieme gebruiker krijgt 401 op notificaties | Negative | 15 | Actueel |
| NOT-N-004 | api | notifications.feature | unknown action geeft 400 | notifications.steps.ts | notifications.spec.ts | API | Notificaties | unknown action geeft 400 | Negative | 15 | Actueel |
| PWD-H-001 | security | password-reset.feature | request-reset retourneert token in demo-modus | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Happy | 13 | Actueel |
| PWD-H-002 | security | password-reset.feature | onbekend e-mailadres retourneert ook ok=true (geen email-enumeration) | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Happy | 13 | Actueel |
| PWD-H-003 | security | password-reset.feature | me.php bevat force_password_change veld | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Happy | 13 | Actueel |
| PWD-N-004 | security | password-reset.feature | reset-password met ongeldig token geeft 400 | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 13 | Actueel |
| PWD-N-005 | security | password-reset.feature | reset-password met te kort wachtwoord geeft 400 | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 13 | Actueel |
| PWD-N-006 | security | password-reset.feature | hergebruik van al-gebruikt token geeft 409 | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 13 | Actueel |
| PWD-N-007 | security | password-reset.feature | login wordt geblokkeerd na 5 mislukte pogingen (rate-limit) | password-reset.steps.ts | password-reset.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 13 | Actueel |
| PER-H-001 | api | period-management.feature | admin kan periodes ophalen met overzicht | period-management.steps.ts | period-management.spec.ts | API | Periodebeheer | admin kan periodes ophalen met overzicht | Happy | 15 | Actueel |
| PER-H-002 | api | period-management.feature | admin kan periode sluiten en heropenen | period-management.steps.ts | period-management.spec.ts | API | Periodebeheer | admin kan periode sluiten en heropenen | Happy | 15 | Actueel |
| PER-N-003 | api | period-management.feature | anonieme gebruiker krijgt 401 op periods | period-management.steps.ts | period-management.spec.ts | API | Periodebeheer | anonieme gebruiker krijgt 401 op periods | Negative | 15 | Actueel |
| PER-N-004 | api | period-management.feature | medewerker mag geen periodes beheren | period-management.steps.ts | period-management.spec.ts | API | Periodebeheer | medewerker mag geen periodes beheren | Negative | 15 | Actueel |
| PER-N-005 | api | period-management.feature | dubbel sluiten van periode geeft 409 | period-management.steps.ts | period-management.spec.ts | API | Periodebeheer | dubbel sluiten van periode geeft 409 | Negative | 15 | Actueel |
| PER-N-006 | api | period-management.feature | heropenen van open periode geeft 409 | period-management.steps.ts | period-management.spec.ts | API | Periodebeheer | heropenen van open periode geeft 409 | Negative | 15 | Actueel |
| SAFE-H-001 | security | production-safety.feature | login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | login picker vult alleen lokaal demo-wachtwoord in wanneer hints beschikbaar zijn | Happy | 14 | Actueel |
| SAFE-N-001 | security | production-safety.feature | frontend source bevat geen plaintext demo-credentials | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | frontend source bevat geen plaintext demo-credentials | Negative | 14 | Actueel |
| SAFE-N-002 | security | production-safety.feature | writes zonder csrf blijven geblokkeerd | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | writes zonder csrf blijven geblokkeerd | Negative | 14 | Actueel |
| SAFE-H-002 | security | production-safety.feature | timesheet writeflow blijft werkend (draft + submit) | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | timesheet writeflow blijft werkend (draft + submit) | Happy | 14 | Actueel |
| SAFE-N-003 | security | production-safety.feature | productieconfig zet demo-migraties standaard uit | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | productieconfig zet demo-migraties standaard uit | Negative | 14 | Actueel |
| SAFE-H-003 | security | production-safety.feature | health.php bevat productieguard die technische details onderdrukt | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | health.php bevat productieguard die technische details onderdrukt | Happy | 14 | Actueel |
| SAFE-N-004 | security | production-safety.feature | install.php en migrate.php bevatten productieguards | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | install.php en migrate.php bevatten productieguards | Negative | 14 | Actueel |
| SAFE-H-004 | security | production-safety.feature | config.example.php bevat mail.enabled=false als standaard | production-safety.steps.ts | production-safety.spec.ts | Security | Audit & Security | config.example.php bevat mail.enabled=false als standaard | Happy | 14 | Actueel |
| ROLE-N-003 | security | roles-api.feature | zonder sessie geeft protected API 401 | roles-api.steps.ts | roles-api.spec.ts | Security | Audit & Security | zonder sessie geeft protected API 401 | Negative | 4 | Actueel |
| ROLE-H-001 | security | roles-api.feature | admin ziet volledige data | roles-api.steps.ts | roles-api.spec.ts | Security | Audit & Security | admin ziet volledige data | Happy | 4 | Actueel |
| ROLE-H-002 | security | roles-api.feature | employee ziet alleen eigen data | roles-api.steps.ts | roles-api.spec.ts | Security | Audit & Security | employee ziet alleen eigen data | Happy | 4 | Actueel |
| SEC-H-001 | security | security.feature | csrf token endpoint werkt | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Happy | 5 | Actueel |
| SEC-H-002 | security | security.feature | login met csrf werkt | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Happy | 5 | Actueel |
| SEC-H-003 | security | security.feature | logout met csrf werkt | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Happy | 5 | Actueel |
| SEC-N-001 | security | security.feature | login zonder csrf faalt netjes | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 5 | Actueel |
| SEC-N-002 | security | security.feature | logout zonder csrf faalt netjes | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 5 | Actueel |
| SEC-N-003 | security | security.feature | invalid login payload geeft nette error | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 5 | Actueel |
| SEC-N-004 | security | security.feature | zonder sessie protected API blijft 401 | security.steps.ts | security.spec.ts | Security | Audit & Security | Veilige toegang en sessies | Negative | 5 | Actueel |
| TS-REV-API-H-005 | integration | timesheets-review-integration.feature | admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking | timesheets-review-integration.steps.ts | timesheet-review-flow.spec.ts | DB / Integratie | Correctie & Goedkeuring | Correctie en goedkeuring | Happy | 9 | Actueel |
| TS-REV-UI-H-008 | ui | timesheets-review-ui.feature | browserflow: admin vraagt correctie, medewerker dient opnieuw in, admin keurt goed | timesheets-review-ui.steps.ts | timesheet-review-ui.spec.ts | UI Desktop | Correctie & Goedkeuring | Correctie en goedkeuring | Happy | 9 | Actueel |
| TS-API-H-001 | api | timesheets-api.feature | employee save draft, read back, submit, audit en gesloten status guard | timesheets-api.steps.ts | timesheet-write.spec.ts | API | Urenregistratie | Uren registreren en indienen | Happy | 8 | Actueel |
| TS-API-N-010 | api | timesheets-api.feature | employee mag geen andere medewerker schrijven | timesheets-api.steps.ts | timesheet-write.spec.ts | API | Urenregistratie | Uren registreren en indienen | Negative | 8 | Actueel |
| TS-API-N-011 | api | timesheets-api.feature | write zonder csrf geeft 403 | timesheets-api.steps.ts | timesheet-write.spec.ts | API | Urenregistratie | Uren registreren en indienen | Negative | 8 | Actueel |
| TS-API-N-003 | api | timesheets-api.feature | write zonder sessie geeft 401 | timesheets-api.steps.ts | timesheet-write.spec.ts | API | Urenregistratie | Uren registreren en indienen | Negative | 8 | Actueel |
| TS-API-N-004 | api | timesheets-api.feature | ongeldige payload geeft 400 | timesheets-api.steps.ts | timesheet-write.spec.ts | API | Urenregistratie | Uren registreren en indienen | Negative | 8 | Actueel |
| USR-H-001 | api | user-management.feature | admin ziet alle gebruikers van het bedrijf | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | admin ziet alle gebruikers van het bedrijf | Happy | 13 | Actueel |
| USR-H-002 | api | user-management.feature | admin kan medewerker deactiveren en heractiveren | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | admin kan medewerker deactiveren en heractiveren | Happy | 13 | Actueel |
| USR-H-003 | api | user-management.feature | admin kan force_password_change instellen | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | admin kan force_password_change instellen | Happy | 13 | Actueel |
| USR-N-004 | api | user-management.feature | anonieme gebruiker krijgt 401 op user-list | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | anonieme gebruiker krijgt 401 op user-list | Negative | 13 | Actueel |
| USR-N-005 | api | user-management.feature | medewerker mag geen gebruikersbeheer uitvoeren | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | medewerker mag geen gebruikersbeheer uitvoeren | Negative | 13 | Actueel |
| USR-N-006 | api | user-management.feature | admin kan zichzelf niet deactiveren | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | admin kan zichzelf niet deactiveren | Negative | 13 | Actueel |
| USR-N-007 | api | user-management.feature | dubbel deactiveren geeft 409 | user-management.steps.ts | user-management.spec.ts | API | Gebruikersbeheer | dubbel deactiveren geeft 409 | Negative | 13 | Actueel |

## Totalen

- Functionele cases: 96
- Playwright-uitvoeringen: 100
- Niet-mobile uitvoeringen: 92
- Mobile functionele cases: 4
- Pixel 7 / Chromium: 4 uitvoeringen
- iPhone 13 / WebKit: 4 uitvoeringen
