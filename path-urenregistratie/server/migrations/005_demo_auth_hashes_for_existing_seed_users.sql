-- Ensure all seeded demo users have temporary auth hashes for local login.
-- Demo credentials only:
--   administrators -> PLAYWRIGHT_ADMIN_PASSWORD
--   employees      -> PLAYWRIGHT_EMPLOYEE_PASSWORD
-- Never use demo credentials in production.

UPDATE users
SET password_hash = '$2y$12$qVvbQn6GLOj5EDXAmIext.Y5us9ejel4LxvWst/BQOUMyJpjpPaQ2'
WHERE email IN (
  'gio@example.invalid',
  'joyce@example.invalid',
  'admin@example.invalid'
)
  AND role = 'administrator'
  AND (password_hash IS NULL OR password_hash = '');

UPDATE users
SET password_hash = '$2y$12$9l0stK0LLDLF6EpPc7z9eOfLLvfQwpsKEbjDJdF8dzPH54CEIMxkS'
WHERE email IN (
  'marc@example.invalid',
  'stasjo@example.invalid',
  'brian@example.invalid',
  'shawn@example.invalid',
  'employee.demo@example.invalid'
)
  AND role = 'employee'
  AND (password_hash IS NULL OR password_hash = '');
