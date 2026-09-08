-- Demo-only corrective migration. Migration 032 may already be registered on
-- a TEST database with an invalid hash. Give the three shared demo admins the
-- agreed TEST password. This migration is included only when
-- allow_demo_migrations is true, and must never be part of PROD's plan.
UPDATE users
SET password_hash = '$2y$12$NXfWuBvBWwTwNoyFb.MKXeVNlWXceY/PpaHJYYfBOROefhsut3dvu'
WHERE email IN ('gio@example.invalid', 'joyce@example.invalid', 'admin@example.invalid')
  AND role = 'administrator';
