# GitHub commit-notificatie (met tags op commits)

Deze repo gebruikt de release-pipeline voor automatische commit-notificaties op pushes naar `main`.
De workflow plaatst een commit-comment met @mentions voor 2 users en bevat een directe link naar de branch history.

## Waar staat de configuratie?

- Workflowbestand: [../.github/workflows/release-pipeline.yml](../.github/workflows/release-pipeline.yml)
- Handmatige fallback-workflow: [../.github/workflows/commit-email-notify.yml](../.github/workflows/commit-email-notify.yml)

## Welke users krijgen de tag?

Standaard:

- `giovannomaatsen-dev`
- `kenrichlieveld`

Optioneel kun je dit overschrijven via repo variables:

1. **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**
2. Voeg toe:
	- `NOTIFY_USER_1`
	- `NOTIFY_USER_2`
	- `NOTIFY_EXCLUDE_USERS` (optioneel, komma-gescheiden usernames zonder @)

Standaardgedrag:

- De user die de push doet wordt automatisch niet getagd.
- Users in `NOTIFY_EXCLUDE_USERS` worden ook niet getagd.

## Gedrag

1. Automatisch binnen de release-pipeline bij pushes naar `main` en optioneel handmatig via de aparte fallback-workflow.
2. Geen PR-only meldingen.
3. De user die de push doet wordt automatisch niet getagd.
4. Notificatie bevat:
	- commit link
	- workflow run link
	- directe link naar commit history van die branch
