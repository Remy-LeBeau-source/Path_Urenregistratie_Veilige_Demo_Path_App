-- Demo-only: zet het gedeelde demo-beheerwachtwoord overal consistent naar de
-- nieuwe waarde (matcht het GitHub-secret PLAYWRIGHT_ADMIN_PASSWORD en de
-- lokale .env.local/README-conventie). Loopt op elke omgeving met
-- allow_demo_migrations (lokaal, elke geïsoleerde Playwright-testdatabase, en
-- de publieke TEST-site) zodat ze onderling niet uit de pas lopen. De "_demo_"
-- in de bestandsnaam zorgt dat dit nooit op productie draait
-- (allow_demo_migrations staat daar uit).
UPDATE users
SET password_hash = '$2y$12$NXfWuBvBWwTwNoyFb.MKXeVNlWXceY/PpaHJYYfBOROefhsut3dvu'
WHERE email IN ('gio@example.invalid', 'joyce@example.invalid', 'admin@example.invalid')
  AND role = 'administrator';
