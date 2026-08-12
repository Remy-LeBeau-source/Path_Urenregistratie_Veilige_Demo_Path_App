-- Fase 16: allow the broker's confirmed two-document production bundle.
ALTER TABLE email_deliveries
    MODIFY COLUMN attachment_policy
        ENUM('none', 'invoice', 'customer_timesheet', 'invoice_and_customer_timesheet')
        NOT NULL DEFAULT 'none';

ALTER TABLE email_deliveries
    MODIFY COLUMN status
        ENUM('queued', 'processing', 'sent', 'failed')
        NOT NULL DEFAULT 'queued';
