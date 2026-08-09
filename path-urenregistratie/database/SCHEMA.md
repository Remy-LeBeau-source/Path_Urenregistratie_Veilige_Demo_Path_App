# Schema-overzicht — Path Uren & Facturatie

Per tabel: doel, PK, FK's, statusvelden en betrokken API.

---

## companies
**Doel:** één rij per organisatie (multi-tenant root).  
**PK:** `id`  
**Geen FK's** (root-tabel)  
**Belangrijke velden:** `slug`, `legal_name`, `invoice_prefix`, `payment_term_days`  
**API:** `bootstrap.php` (lezen), geen write-endpoint (productie: handmatig of beheer-API)

---

## users
**Doel:** inlogaccounts per organisatie.  
**PK:** `id` | **FK:** `company_id → companies`  
**Statusvelden:** `role` (employee/approver/administrator), `active`  
**API:** `users.php` (lezen, deactivate, reactivate, force_password_change)  
**Auth:** `auth/login.php`, `auth/me.php`, `auth/session.php`

---

## user_preferences
**Doel:** per-gebruiker UI-voorkeuren (thema, meldingsopties).  
**PK:** `user_id` (tevens FK → users)  
**API:** geen eigen endpoint; meegegeven via `auth/me.php`

---

## employees
**Doel:** medewerkerprofiel gekoppeld aan een user-account.  
**PK:** `id` | **FK:** `company_id → companies`, `user_id → users`  
**Statusvelden:** `active`  
**API:** `bootstrap.php` (lezen)

---

## counterparties
**Doel:** klanten, brokers, boekhouders en salarisadministraties.  
**PK:** `id` | **FK:** `company_id → companies`  
**Statusvelden:** `type` (client/broker/accountant/payroll), `active`  
**API:** `bootstrap.php` (lezen)

---

## assignments
**Doel:** opdracht van een medewerker bij een klant, inclusief tarieven en routeregels.  
**PK:** `id` | **FK:** `company_id`, `employee_id → employees`, `client_id → counterparties`, `broker_id → counterparties`  
**Statusvelden:** `active`  
**API:** `bootstrap.php` (lezen)

---

## mail_recipients
**Doel:** centrale mailontvangers (boekhouder, EasySalary, extra).  
**PK:** `id` | **FK:** `company_id → companies`  
**Statusvelden:** `active`  
**API:** `bootstrap.php` (lezen)

---

## assignment_mail_routes
**Doel:** per opdracht welke centrale ontvanger een mail + eventueel factuur krijgt.  
**PK:** `(assignment_id, mail_recipient_id)`  
**API:** `bootstrap.php` (lezen)

---

## periods
**Doel:** kalendermaand per organisatie; beheert open/gesloten workflow.  
**PK:** `id` | **FK:** `company_id → companies`, `closed_by → users`  
**Statusvelden:** `status` (open/review/closed)  
**API:** `periods.php` (lezen, close, reopen)  
⚠️ Bevat veel testdata (jaren 2099–9999) uit **lokale Playwright-regressieruns** die momenteel dezelfde database als de lokale dev-app gebruiken.  
GitHub CI gebruikt een verse tijdelijke MySQL 8 database per pipeline-run — CI-data verdwijnt na de job en staat nooit in de lokale DB.  
Advies: maak een aparte `path_urenregistratie_test` database voor lokale Playwright-runs.

---

## timesheets
**Doel:** urenregistratie per medewerker per opdracht per periode.  
**PK:** `id` | **FK:** `period_id → periods`, `employee_id → employees`, `assignment_id → assignments`, `approved_by → users`  
**Statusvelden:** `status` (draft/submitted/approved/correction/rejected/invoiced)  
**Versioning:** `version` (optimistic locking)  
**API:** `timesheets.php` (GET lezen, POST save_draft/submit/request_correction/resubmit/approve)

---

## time_entries
**Doel:** dagregels per urenstaat (één rij per werkdag per type).  
**PK:** `id` | **FK:** `timesheet_id → timesheets` (CASCADE DELETE)  
**API:** onderdeel van `timesheets.php` (meegegeven in payload)

---

## timesheet_corrections
**Doel:** correctieverzoeken met reden, tijdstip en herindiening.  
**PK:** `id` | **FK:** `timesheet_id → timesheets`, `requested_by → users`  
**API:** onderdeel van `timesheets.php` (correction_history in response)

---

## customer_timesheets
**Doel:** klantdocument (PDF/afbeelding) per medewerker per opdracht per periode.  
**PK:** `id` | **FK:** `period_id`, `employee_id`, `assignment_id`, `uploaded_by → users`, `reviewed_by → users`  
**Statusvelden:** `status` (missing/draft/received/approved/resubmit/skipped/sent/sent_to_broker)  
**API:** `customer-timesheets.php` (GET lezen, POST save_draft/submit/approve/request_resubmit/mark_sent/mark_skipped/restore_missing/download)

---

## invoices
**Doel:** definitieve factuur per goedgekeurde urenstaat.  
**PK:** `id` | **FK:** `company_id`, `timesheet_id → timesheets` (UNIQUE), `recipient_id → counterparties`, `created_by → users`  
**Statusvelden:** `status` (concept/ready/sent/paid/cancelled), `locked_at`  
**API:** `invoices.php` (GET lezen + server-side bedragberekening, POST lock)

---

## announcements
**Doel:** berichten van beheerder aan medewerkers (met concept/intrekken/wijzigen).  
**PK:** `id` | **FK:** `company_id`, `created_by → users`, `correction_of_id/superseded_by_id/withdrawal_of_id → announcements`  
**Statusvelden:** `kind` (standard/correction/withdrawal), `status` (draft/sent/withdrawn)  
**API:** `announcements.php` (GET lezen, POST send/save_draft/withdraw/hide/delete_draft)

---

## announcement_recipients
**Doel:** junction-tabel welke gebruiker welke mededeling heeft ontvangen/gelezen.  
**PK:** `(announcement_id, user_id)`  
**Statusvelden:** `email_status`, `read_at`  
**API:** onderdeel van `announcements.php` en `notifications.php`

---

## email_deliveries
**Doel:** e-mailwachtrij (dry-run standaard; echte verzending pas na productie-activatie).  
**PK:** `id` | **FK:** `invoice_id → invoices`, `timesheet_id`, `customer_timesheet_id`, `announcement_id`  
**Statusvelden:** `channel`, `status` (queued/sent/failed), `attachment_policy`  
**API:** `email-queue.php` (GET list, POST enqueue/retry)  
⚠️ 1678 records; vrijwel allemaal uit **lokale Playwright-regressieruns** (email.dry_run audit-events). GitHub CI-runs laten geen blijvende data achter.

---

## notifications
**Doel:** in-app meldingen per gebruiker.  
**PK:** `id` | **FK:** `company_id`, `user_id → users`, `period_id → periods`, `announcement_id → announcements`  
**Statusvelden:** `notification_type`, `read_at`  
**API:** `notifications.php` (GET list/unread, POST mark_read/mark_all_read/mark_announcement_read)

---

## audit_log
**Doel:** immutable log van alle write-events.  
**PK:** `id` | **FK:** `company_id`, `actor_user_id → users`  
**Velden:** `event_type`, `entity_type`, `entity_id`, `event_data` (JSON), `ip_hash`  
**API:** `audit-log.php` (GET met entity/event-filters, geen writes)  
⚠️ 6473 records; grootste deel uit **lokale Playwright-regressieruns** (email.dry_run 1668×, timesheet-acties 1000+×). GitHub CI-runs laten geen blijvende data achter.
