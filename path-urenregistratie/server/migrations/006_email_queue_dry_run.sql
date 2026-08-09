-- Migration 006: add dry_run flag to email_deliveries so demo/test queued items are clearly marked.
ALTER TABLE email_deliveries
    ADD COLUMN dry_run TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
        COMMENT '1 = item was queued in dry-run mode and will never be dispatched'
    AFTER attempt_count;
