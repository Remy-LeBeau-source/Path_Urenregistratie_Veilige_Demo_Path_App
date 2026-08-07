# VS Code + SQL Developer stappenplan

Doel: de lokale Path demo draaien in VS Code én dezelfde demo-basisdata laden in een MySQL/MariaDB database via SQL Developer.

## 1. Belangrijke uitleg vooraf

De app die je nu start met:

```bash
npm run dev
```

draait als frontend op Vite.

Dat betekent:

- `http://localhost:5173/` opent de app op je eigen pc.
- `http://192.168.x.x:5173/` opent dezelfde app vanaf een ander apparaat in je netwerk.
- De huidige GUI leest nog uit browseropslag (`localStorage`), niet rechtstreeks uit SQL.

Dus:

- SQL-data laden is goed voor voorbereiding en backend-koppeling.
- Een losse `INSERT` in SQL Developer zie je nog niet automatisch in de GUI.
- Voor 1-op-1 live GUI↔DB is een backend/API nodig.

## 2. Benodigdheden

Installeer:

1. Node.js LTS.
2. VS Code.
3. MySQL of MariaDB.
4. SQL Developer met MySQL JDBC-driver, of makkelijker: DBeaver/MySQL Workbench.

Let op: dit is een MySQL/MariaDB schema. Het is geen Oracle SQL-schema.

## 3. Project openen in VS Code

1. Pak de zip uit.
2. Open deze map in VS Code:

```text
path-urenregistratie
```

3. Open een terminal in VS Code.
4. Installeer dependencies:

```bash
npm install
```

5. Start de frontend:

```bash
npm run dev
```

6. Open:

```text
http://localhost:5173/
```

Als Vite ook `Network` toont, mag je die URL gebruiken op een ander apparaat in hetzelfde netwerk.

## 4. Database laden via SQL Developer

Gebruik SQL Developer alleen met een MySQL/MariaDB connectie.

Stappen:

1. Open SQL Developer.
2. Voeg MySQL JDBC-driver toe als dat nog niet is gedaan.
3. Maak verbinding met je lokale MySQL/MariaDB server.
4. Open:

```text
database/schema.sql
```

5. Kies “Run Script” voor het hele bestand.
6. Open:

```text
database/seed-demo-data.sql
```

7. Kies opnieuw “Run Script”.
8. Open:

```text
database/verify-demo-data.sql
```

9. Draai het bestand en controleer de uitkomsten.

## 5. Database laden via VS Code terminal

Als `mysql` beschikbaar is in je terminal:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p path_urenregistratie < database/seed-demo-data.sql
mysql -u root -p path_urenregistratie < database/verify-demo-data.sql
```

Met eigen user:

```bash
mysql -u jouw_user -p < database/schema.sql
mysql -u jouw_user -p path_urenregistratie < database/seed-demo-data.sql
mysql -u jouw_user -p path_urenregistratie < database/verify-demo-data.sql
```

## 6. Verwachte demo-data

Na laden van de seed:

| Onderdeel | Verwacht |
| --- | --- |
| Organisatie | Path Consultancy / QSI Consultancy |
| Beheerders | Gio Maatsen, Joyce van der Steenhoven |
| Medewerkers | Marc, Stasjo, Brian, Shawn-Douglas |
| Juni 2026 | afgerond |
| Juli 2026 | groen: 3 gecontroleerd, 1 klaar voor controle |
| Augustus 2026 | oranje: 2 blokkades, 2 klaar voor controle |
| Open acties | 7 totaal |
| Eigenaarverdeling | 4 bij Backoffice, 3 bij medewerkers |

## 7. Controleren met SQL

Draai:

```sql
USE path_urenregistratie;

SELECT * FROM employees;

SELECT
  p.year,
  p.month,
  e.full_name,
  t.status AS timesheet_status,
  ct.status AS klanturenstaat_status,
  i.status AS invoice_status
FROM timesheets t
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
JOIN customer_timesheets ct
  ON ct.period_id = t.period_id
  AND ct.employee_id = t.employee_id
  AND ct.assignment_id = t.assignment_id
JOIN invoices i ON i.timesheet_id = t.id
ORDER BY p.year, p.month, e.id;
```

Of draai gewoon:

```text
database/verify-demo-data.sql
```

## 8. Waarom de GUI nog niet live wijzigt na INSERT

Voorbeeld:

```sql
UPDATE invoices
SET status = 'sent'
WHERE invoice_number = 'Bel-Shawn-2026-juli';
```

Deze wijziging staat dan in je database, maar de frontend ziet hem nog niet automatisch.

Reden: de frontend heeft nog geen API-call naar MySQL.

## 9. Wat nodig is voor echte live koppeling

Voor live GUI↔DB heb je deze laag nodig:

```text
Browser GUI op localhost:5173
        ↓ API calls
Backend op localhost:8000
        ↓ SQL queries
MySQL/MariaDB database path_urenregistratie
```

Minimale API-endpoints:

```text
GET  /api/bootstrap
GET  /api/dashboard?period=2026-07
GET  /api/invoices?period=2026-07
POST /api/timesheets/:id/submit
POST /api/timesheets/:id/approve
POST /api/timesheets/:id/correction
POST /api/customer-timesheets/:id/skip
POST /api/month-control
```

Daarna moet de frontend worden aangepast:

- `freshState()` wordt alleen fallback/demo.
- `loadState()` haalt data uit `/api/bootstrap`.
- `persistState()` schrijft via API in plaats van `localStorage`.

## 10. Praktische volgorde

Voor nu:

1. Start GUI met `npm run dev`.
2. Laad database met `schema.sql`.
3. Laad demo-data met `seed-demo-data.sql`.
4. Controleer met `verify-demo-data.sql`.
5. Gebruik de GUI als klikbare demo.
6. Gebruik de DB als voorbereiding op echte backend.

Volgende bouwstap:

1. Backend/API toevoegen.
2. GUI op API aansluiten.
3. Dan lopen SQL Developer en GUI live gelijk.
