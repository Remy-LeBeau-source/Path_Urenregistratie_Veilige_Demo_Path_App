-- Demo-only auth seed for local role tests.
-- The seeded demo users are intentionally mapped to the LocalDemo* credentials used by the app and Playwright.
-- Do not use this pattern for production identities or real passwords.

UPDATE users
SET password_hash = '$2y$12$nhN1FeuN5BltOb9eRgpasOaL6AvXHJZ4.DAPETtSJ3x/ixdtmdxDy'
WHERE email = 'stasjo@example.invalid';
