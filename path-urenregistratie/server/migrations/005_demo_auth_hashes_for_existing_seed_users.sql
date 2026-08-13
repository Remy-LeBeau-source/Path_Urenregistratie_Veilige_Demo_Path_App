-- Ensure all seeded demo users have temporary auth hashes for local login.
-- Demo credentials only:
--   administrators -> PLAYWRIGHT_ADMIN_PASSWORD
--   employees      -> PLAYWRIGHT_EMPLOYEE_PASSWORD
-- Never use demo credentials in production.

UPDATE users
SET password_hash = '$2y$12$d9YdUVSap69WDPkl7/NsE.hvfNG7.Id08L6FuBFs.qTPXvz7BBj.C'
WHERE email IN (
  'gio@example.invalid',
  'joyce@example.invalid',
  'admin@example.invalid'
)
  AND role = 'administrator'
  AND (password_hash IS NULL OR password_hash = '');

UPDATE users
SET password_hash = '$2y$12$nhN1FeuN5BltOb9eRgpasOaL6AvXHJZ4.DAPETtSJ3x/ixdtmdxDy'
WHERE email IN (
  'marc@example.invalid',
  'stasjo@example.invalid',
  'brian@example.invalid',
  'shawn@example.invalid',
  'employee.demo@example.invalid'
)
  AND role = 'employee'
  AND (password_hash IS NULL OR password_hash = '');
