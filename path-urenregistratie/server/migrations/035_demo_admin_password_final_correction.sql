-- Demo-only corrective migration. Migrations 032 and 033 were already marked
-- applied on the public TEST database from an earlier deploy, with stale
-- content from before the password was fixed to the agreed shared value --
-- the migration runner tracks by id, not by file content, so re-editing 032/
-- 033 afterwards had no effect there. Give the three shared demo admins the
-- agreed TEST password under a fresh id so it actually executes. Included
-- only when allow_demo_migrations is true, never part of the PROD plan.
UPDATE users
SET password_hash = '$2y$12$NXfWuBvBWwTwNoyFb.MKXeVNlWXceY/PpaHJYYfBOROefhsut3dvu'
WHERE email IN ('gio@example.invalid', 'joyce@example.invalid', 'admin@example.invalid')
  AND role = 'administrator';
