# GitHub commit-notificatie (zonder SMTP)

Deze repo gebruikt nu GitHub-notificaties in plaats van SMTP-mail.
Bij elke push naar `main` of `master` plaatst de workflow een commit-comment met @mentions, zodat de 2 personen direct een GitHub-notificatie (en vaak e-mail via GitHub) krijgen.

## Waar staat de configuratie in de repo?

- Workflowbestand: [.github/workflows/commit-email-notify.yml](.github/workflows/commit-email-notify.yml)

## Waar vul je de config in op GitHub?

1. Open de repository op GitHub.
2. Ga naar **Settings**.
3. Ga naar **Secrets and variables** -> **Actions** -> **Variables**.
4. Voeg deze repository variables toe:
   - `NOTIFY_USER_1` = GitHub username van persoon 1 (zonder @)
   - `NOTIFY_USER_2` = GitHub username van persoon 2 (zonder @)

Voorbeeld:

- `NOTIFY_USER_1 = giovannomaatsen`
- `NOTIFY_USER_2 = kenrichlieveld`

## Testen

1. Ga naar **Actions** in GitHub.
2. Kies workflow **Commit Team Notification**.
3. Doe een test-push naar `main` of `master`.
4. Open de laatste commit en controleer de commit-comments: je ziet een team-notificatie met @mentions.

## Belangrijk

- Voor @mentions zijn GitHub gebruikersnamen nodig, geen e-mailadressen.
- De genoemde users moeten toegang hebben tot de repository.
- SMTP-secrets zijn voor deze workflow niet meer nodig.
