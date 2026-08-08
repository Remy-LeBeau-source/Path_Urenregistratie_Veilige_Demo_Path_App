-- Demo-only auth seed for local role tests.
-- Uses an existing bcrypt hash for the temporary DemoTempEmployee!2026 credential.
-- Do not use this pattern for production identities or real passwords.

UPDATE users
SET password_hash = '$2y$12$9l0stK0LLDLF6EpPc7z9eOfLLvfQwpsKEbjDJdF8dzPH54CEIMxkS'
WHERE email = 'stasjo@example.invalid';
