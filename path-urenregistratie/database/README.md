# Database laden voor de Path demo

Deze map hoort bij de lokale demo in VS Code.

Belangrijk: de huidige GUI is nog een frontend-demo. `npm run dev` start Vite op `localhost:5173` en leest de basisdata uit browseropslag (`localStorage`). SQL `INSERT`-acties in je database zijn dus nog niet live zichtbaar in de GUI totdat er een backend/API-koppeling wordt gebouwd.

Wat deze databasebestanden wel doen:

- `schema.sql` maakt de MySQL/MariaDB-tabellen aan.
- `seed-demo-data.sql` vult dezelfde basisdata als de GUI-demo.
- `verify-demo-data.sql` controleert of de geladen DB dezelfde demo-stand heeft.
- `gui-db-mapping.md` legt uit welke GUI-status bij welke tabel/kolom hoort.

## Welke database

Dit schema is MySQL/MariaDB-syntax: 123

- `CREATE DATABASE`
- `BIGINT UNSIGNED`
- `AUTO_INCREMENT`
- `ENUM`
- `BOOLEAN`

Oracle SQL Developer kan dit alleen draaien als je via een MySQL/MariaDB JDBC-driver met een MySQL/MariaDB database verbindt. Op een Oracle database zelf draait dit schema niet zonder conversie.

Praktisch advies:

- MySQL Workbench of DBeaver is het makkelijkst.
- Oracle SQL Developer kan ook, maar dan moet je een MySQL-connector/J driver toevoegen en een MySQL-connectie maken.

## Laden via terminal in VS Code

Open de terminal in de projectmap `path-urenregistratie` en draai:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p path_urenregistratie < database/seed-demo-data.sql
mysql -u root -p path_urenregistratie < database/verify-demo-data.sql
```

Als je een andere database-user gebruikt:

```bash
mysql -u jouw_user -p < database/schema.sql
mysql -u jouw_user -p path_urenregistratie < database/seed-demo-data.sql
mysql -u jouw_user -p path_urenregistratie < database/verify-demo-data.sql
```

## Laden via SQL Developer

1. Maak verbinding met je MySQL/MariaDB database.
2. Open `database/schema.sql`.
3. Draai het volledige script.
4. Open `database/seed-demo-data.sql`.
5. Draai het volledige script.
6. Open `database/verify-demo-data.sql`.
7. Controleer dat de tellingen overeenkomen.

Gebruik in SQL Developer meestal “Run Script” voor het hele bestand, niet alleen één statement.

## Wat je na het laden moet zien

De seed staat bewust zo:

- Juni 2026: afgerond.
- Juli 2026: groene maandcontrole, 3 gecontroleerd en 1 klaar voor controle.
- Augustus 2026: oranje maandcontrole, 2 blokkades en 2 klaar voor controle.
- Open werkvoorraad: 7 acties totaal.
- Verdeling: 4 bij Backoffice en 3 bij medewerkers.

## Waarom zie ik mijn INSERT nog niet in localhost?

Omdat `http://localhost:5173` nu Vite/frontend is. De browser haalt geen records uit MySQL. Hij gebruikt de demo-state in JavaScript en `localStorage`.

Voor echte live DB-koppeling is nodig:

1. Backend starten, bijvoorbeeld PHP/Node op `localhost:8000`.
2. Backend verbinden met MySQL via `server/config.example.php` of een Node `.env`.
3. API endpoints maken, bijvoorbeeld:
   - `GET /api/bootstrap`
   - `GET /api/periods/:periodKey/dashboard`
   - `POST /api/timesheets/:id/submit`
   - `POST /api/timesheets/:id/approve`
   - `POST /api/customer-timesheets/:id/approve`
   - `POST /api/invoices/month-control`
4. Frontend vervangen van `localStorage` naar API-calls.

Tot die koppeling klaar is, kun je DB en GUI wel dezelfde startdata geven, maar ze lopen niet automatisch live synchroon.

## Local versus Network URL

Bij `npm run dev` zie je bijvoorbeeld:

- `Local: http://localhost:5173/`
- `Network: http://192.168.x.x:5173/`

`Local` gebruik je op dezelfde pc.
`Network` gebruik je vanaf een ander apparaat in hetzelfde netwerk.

Beide tonen dezelfde frontend. Geen van beide leest automatisch uit MySQL zolang de API-koppeling ontbreekt.
