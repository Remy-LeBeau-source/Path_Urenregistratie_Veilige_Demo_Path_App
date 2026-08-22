-- The settings screen offers 'Overig' as a recipient category, but the channel
-- enum had no value for it, so such a delivery was rejected and the recipient
-- silently never received mail.
ALTER TABLE email_deliveries
  MODIFY COLUMN channel ENUM('broker','accountant','payroll','other','reminder','customer_timesheet','announcement','password_reset') NOT NULL;
