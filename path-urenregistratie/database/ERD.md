# Database ERD — Path Uren & Facturatie

Gebaseerd op het werkelijke schema in `schema.sql` en de actieve migrations.  
Automatisch bij te houden: pas dit diagram aan telkens als een migration een nieuwe tabel of FK toevoegt.

```mermaid
erDiagram
    COMPANIES {
        bigint id PK
        varchar slug
        varchar legal_name
        varchar trade_name
        varchar invoice_prefix
        smallint payment_term_days
    }
    USERS {
        bigint id PK
        bigint company_id FK
        varchar email
        varchar display_name
        enum role
        boolean active
    }
    USER_PREFERENCES {
        bigint user_id PK_FK
        enum theme
        boolean email_notifications
    }
    EMPLOYEES {
        bigint id PK
        bigint company_id FK
        bigint user_id FK
        varchar full_name
        decimal weekly_contract_hours
        boolean active
    }
    COUNTERPARTIES {
        bigint id PK
        bigint company_id FK
        enum type
        varchar legal_name
        varchar invoice_email
    }
    ASSIGNMENTS {
        bigint id PK
        bigint company_id FK
        bigint employee_id FK
        bigint client_id FK
        bigint broker_id FK
        decimal hourly_rate
        decimal vat_percentage
        varchar invoice_number_template
    }
    MAIL_RECIPIENTS {
        bigint id PK
        bigint company_id FK
        varchar recipient_key
        varchar email
        boolean active
    }
    ASSIGNMENT_MAIL_ROUTES {
        bigint assignment_id PK_FK
        bigint mail_recipient_id PK_FK
        boolean enabled
        boolean include_invoice_pdf
    }
    PERIODS {
        bigint id PK
        bigint company_id FK
        smallint year
        tinyint month
        enum status
    }
    TIMESHEETS {
        bigint id PK
        bigint period_id FK
        bigint employee_id FK
        bigint assignment_id FK
        decimal billable_hours
        enum status
        int version
    }
    TIME_ENTRIES {
        bigint id PK
        bigint timesheet_id FK
        date work_date
        decimal hours
        enum entry_type
    }
    TIMESHEET_CORRECTIONS {
        bigint id PK
        bigint timesheet_id FK
        bigint requested_by FK
        text correction_message
        timestamp resubmitted_at
    }
    CUSTOMER_TIMESHEETS {
        bigint id PK
        bigint period_id FK
        bigint employee_id FK
        bigint assignment_id FK
        enum status
        varchar storage_key
    }
    INVOICES {
        bigint id PK
        bigint company_id FK
        bigint timesheet_id FK
        bigint recipient_id FK
        varchar invoice_number
        decimal total
        enum status
        timestamp locked_at
    }
    ANNOUNCEMENTS {
        bigint id PK
        bigint company_id FK
        bigint created_by FK
        enum kind
        enum status
        varchar title
    }
    ANNOUNCEMENT_RECIPIENTS {
        bigint announcement_id PK_FK
        bigint user_id PK_FK
        boolean email_requested
        timestamp read_at
    }
    EMAIL_DELIVERIES {
        bigint id PK
        bigint invoice_id FK
        bigint announcement_id FK
        enum channel
        enum status
        boolean dry_run
    }
    NOTIFICATIONS {
        bigint id PK
        bigint company_id FK
        bigint user_id FK
        bigint period_id FK
        bigint announcement_id FK
        enum notification_type
        timestamp read_at
    }
    AUDIT_LOG {
        bigint id PK
        bigint company_id FK
        bigint actor_user_id FK
        varchar event_type
        varchar entity_type
        varchar entity_id
    }

    COMPANIES ||--o{ USERS : "heeft"
    COMPANIES ||--o{ EMPLOYEES : "heeft"
    COMPANIES ||--o{ COUNTERPARTIES : "heeft"
    COMPANIES ||--o{ ASSIGNMENTS : "heeft"
    COMPANIES ||--o{ MAIL_RECIPIENTS : "beheert"
    COMPANIES ||--o{ PERIODS : "heeft"
    COMPANIES ||--o{ INVOICES : "heeft"
    COMPANIES ||--o{ ANNOUNCEMENTS : "plaatst"
    COMPANIES ||--o{ NOTIFICATIONS : "ontvangt"
    COMPANIES ||--o{ AUDIT_LOG : "logt"

    USERS ||--o| USER_PREFERENCES : "heeft"
    USERS ||--o{ TIMESHEET_CORRECTIONS : "vraagt"
    USERS ||--o{ ANNOUNCEMENT_RECIPIENTS : "ontvangt"

    EMPLOYEES ||--o{ ASSIGNMENTS : "werkt_op"
    EMPLOYEES ||--o{ TIMESHEETS : "dient_in"
    EMPLOYEES ||--o{ CUSTOMER_TIMESHEETS : "uploadt"

    ASSIGNMENTS ||--o{ TIMESHEETS : "produceert"
    ASSIGNMENTS ||--o{ CUSTOMER_TIMESHEETS : "vereist"
    ASSIGNMENTS ||--o{ ASSIGNMENT_MAIL_ROUTES : "heeft"

    MAIL_RECIPIENTS ||--o{ ASSIGNMENT_MAIL_ROUTES : "gebruikt_in"

    PERIODS ||--o{ TIMESHEETS : "bevat"
    PERIODS ||--o{ CUSTOMER_TIMESHEETS : "bevat"
    PERIODS ||--o{ NOTIFICATIONS : "linkt"

    TIMESHEETS ||--o{ TIME_ENTRIES : "bevat"
    TIMESHEETS ||--o{ TIMESHEET_CORRECTIONS : "heeft"
    TIMESHEETS ||--|| INVOICES : "produceert"
    TIMESHEETS ||--o{ EMAIL_DELIVERIES : "trigger"

    INVOICES ||--o{ EMAIL_DELIVERIES : "trigger"

    ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_RECIPIENTS : "stuurt_naar"
    ANNOUNCEMENTS ||--o{ EMAIL_DELIVERIES : "trigger"
    ANNOUNCEMENTS ||--o{ NOTIFICATIONS : "linkt"

    COUNTERPARTIES ||--o{ INVOICES : "ontvangt"
```

## Tabelgroepen

| Groep | Tabellen |
|---|---|
| Organisatie | `companies`, `users`, `user_preferences`, `employees`, `counterparties` |
| Opdrachten & routes | `assignments`, `mail_recipients`, `assignment_mail_routes` |
| Uren & perioden | `periods`, `timesheets`, `time_entries`, `timesheet_corrections` |
| Klantdocumenten | `customer_timesheets` |
| Facturatie | `invoices` |
| Communicatie | `announcements`, `announcement_recipients`, `email_deliveries`, `notifications` |
| Beheer | `audit_log` |
