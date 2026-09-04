# PROD-remigratie: stamdata opnieuw inladen met startdatum september

**Wie voert dit uit:** iemand met PROD-toegang (SSH + database). **Niet Claude** —
zie BESLISTABEL W3/P2. Dit document is puur een naslag-draaiboek.

**Waarom:** de eenmalige migratie (`server/scripts/migrate-test-masterdata-to-production.php`)
nam bij de eerste run `employment_start_date` letterlijk over uit de TEST-seed
(destijds 1 januari / 1 juli 2026 — demo-placeholders, geen echte startdatums).
Gevolg: medewerkers verschijnen op PROD als "in dienst" in maanden van vóór hun
echte eerste werkdag. Het script is inmiddels aangepast: elke run zet nu
`employment_start_date = 2026-09-01` voor alle 4 medewerkers én de pilot
(`PROD_EMPLOYMENT_START_DATE` bovenin het script — pas die aan als de go-live-
datum verschuift).

Nog niemand werkt op dit moment echt met PROD (go-live over ± een week), dus dit
is nu het goedkoopste moment om het recht te zetten.

---

## Stap 0 — Backup (niet overslaan)

```bash
mysqldump [prod-credentials] > prod-backup-voor-remigratie-$(date +%Y%m%d).sql
```

Bewaar dit bestand ergens buiten de server zelf.

## Stap 1 — Precies deze rijen weg (FK-veilig, in deze volgorde)

Het migratiescript ruimt `mail_recipients` en `counterparties` voor company_id=1
zelf al op bij elke run (regel ~212-213) — daar hoef je niets aan te doen.
Het weigert wél hard te draaien als `employees`, `assignments`,
`assignment_mail_routes`, `timesheets`, `time_entries`, `customer_timesheets` of
`invoices` niet leeg zijn. Van die laatste vier zouden er (aangenomen niemand
heeft al iets ingevoerd) al 0 moeten zijn. Verwijder dus alleen:

```sql
DELETE amr FROM assignment_mail_routes amr
  JOIN assignments a ON a.id = amr.assignment_id
  WHERE a.company_id = 1;

DELETE FROM assignments WHERE company_id = 1;
DELETE FROM employees WHERE company_id = 1;

DELETE FROM users WHERE company_id = 1 AND email IN (
  'marcderoon@pathconsultancy.nl', 'stasjovanbakel@pathconsultancy.nl',
  'brian.hek@pathconsultancy.nl', 'shawn.nahar@pathconsultancy.nl',
  'prod-medewerker@pathconsultancy.nl'
);
```

Dit raakt **niet** de 2 echte beheerderaccounts (`giovanno.maatsen@` /
`info@pathconsultancy.nl`) — die staan niet in deze lijst.

**Controleer vooraf** (optioneel maar verstandig) dat `timesheets`,
`time_entries`, `customer_timesheets`, `invoices` en `email_deliveries` voor
company_id=1 inderdaad leeg zijn:

```sql
SELECT
  (SELECT COUNT(*) FROM timesheets t JOIN employees e ON e.id=t.employee_id WHERE e.company_id=1) AS timesheets,
  (SELECT COUNT(*) FROM customer_timesheets ct JOIN employees e ON e.id=ct.employee_id WHERE e.company_id=1) AS customer_timesheets,
  (SELECT COUNT(*) FROM invoices i JOIN employees e ON e.id=i.employee_id WHERE e.company_id=1) AS invoices;
```
Alle drie moeten `0` zijn. Zo niet: stop en overleg eerst — dan staat er al
echte data die de scriptguard terecht blokkeert.

## Stap 2 — Het (aangepaste) migratiescript draaien

Eerst een dry-run (mode `check`, print alleen een preview, schrijft niets):

```bash
php server/scripts/migrate-test-masterdata-to-production.php \
  --source-config=<pad naar TEST-config> \
  [overige target-config-argumenten die het script verwacht]
```

Controleer de preview: `mode: "check"`, de 4 echte namen + pilot,
`production_counts_after` met de verwachte aantallen. Klopt dat, dan pas echt:

```bash
php server/scripts/migrate-test-masterdata-to-production.php --execute \
  --source-config=<pad naar TEST-config> \
  [overige target-config-argumenten]
```

Het script draait in één transactie en rolt zelf terug bij een onverwachte
tussenstand (placeholderadres, verkeerd aantal na afloop) — zie de eigen
`RuntimeException`-checks.

## Stap 3 — Verifiëren

Teambeheer op PROD → Marc, Stasjo, Brian, Shawn, PROD Pilot Medewerker moeten
alle vijf **1 september 2026** als startdatum tonen. Het dashboard voor een
maand vóór september hoort voor niemand van hen meer "Nog invullen" te tonen —
ze bestaan dan simpelweg nog niet in die maand.

## Als er iets misgaat

Terug naar de backup uit stap 0. Niet zelf verder patchen op een halfweg
uitgevoerde run.
