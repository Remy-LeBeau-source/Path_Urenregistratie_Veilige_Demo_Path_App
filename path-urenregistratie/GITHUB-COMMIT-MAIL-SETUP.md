# GitHub commit-notificatie (met tags op commits)

Deze repo gebruikt een GitHub Actions workflow die alleen op commit-pushes draait (`main` en `master`).
De workflow plaatst een commit-comment met @mentions voor 2 users en bevat een directe link naar de branch history.

## Waar staat de configuratie?

- Workflowbestand: [../.github/workflows/commit-email-notify.yml](../.github/workflows/commit-email-notify.yml)

## Welke users krijgen de tag?

Standaard:

- `giovannomaatsen-dev`
- `kenrichlieveld`

Optioneel kun je dit overschrijven via repo variables:

1. **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**
2. Voeg toe:
	- `NOTIFY_USER_1`
	- `NOTIFY_USER_2`

## Gedrag

1. Alleen bij pushes naar `main`/`master`.
2. Geen PR-only meldingen.
3. Notificatie bevat:
	- commit link
	- directe link naar commit history van die branch
