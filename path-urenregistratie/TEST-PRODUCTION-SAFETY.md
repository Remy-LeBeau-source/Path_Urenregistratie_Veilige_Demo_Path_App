# TEST-PRODUCTION-SAFETY

Doel: controleer dat productiegevoelige instellingen veilig staan en dat de uren-writeflow intact blijft.

## 1) Frontend loginveiligheid

- Open `http://localhost:8000/`.
- Kies een account via de picker.
- Verwacht:
  - Alleen e-mail wordt ingevuld.
  - Wachtwoordveld blijft leeg.
  - Feedback toont: `E-mail voorgeselecteerd. Vul je wachtwoord in.`

## 2) Geen plaintext demo-credentials in tracked files

Voer uit:

```powershell
git grep -n -e "DemoTempAdmin!2026" -e "DemoTempEmployee!2026"
```

Verwacht: geen output.

## 3) Migraties: demo veilig afgeschermd

Controleer `server/config.local.php` op veilige defaults:

```php
'environment' => 'production',
'allow_demo_migrations' => false,
```

Verwacht:
- `_demo_` migraties worden standaard overgeslagen.
- Alleen wanneer lokaal expliciet `allow_demo_migrations => true` wordt gezet en environment niet `production` is, mogen demo-migraties draaien.

## 4) CORS gedrag

- Productie: alleen requests vanaf `app_origin` toegestaan.
- Local/test: `http://localhost:8000` toegestaan.
- Geen wildcard origin en geen willekeurige origin-reflectie.

## 5) Regressie

Voer uit:

```powershell
php -l server/migrate.php
npm run build
npm run test:e2e
npm run allure:generate
npm run check
.\check-after-big-change.cmd
```

Verwacht:
- Alle checks slagen.
- Timesheet writeflow blijft werken.
- Writes zonder CSRF blijven 403 geven.
