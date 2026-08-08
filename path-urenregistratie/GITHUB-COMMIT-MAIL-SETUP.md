# GitHub commit-notificatie (native, zonder tags)

Deze repo gebruikt nu alleen native GitHub notificaties.
Er worden geen @mentions en geen workflow-comments meer geplaatst.

## Doel

- Alleen de 2 gewenste users krijgen push/commit meldingen.
- Geen extra tag-meldingen.

## Instellen voor de 2 users

1. Open de repository op GitHub.
2. Klik op **Watch** (rechtsboven).
3. Kies **Custom**.
4. Zet **Pushes** aan.
5. Sla op.

## Instellen voor users die geen melding moeten krijgen

1. Open dezelfde repository.
2. Klik op **Watch**.
3. Kies **Not watching**.

## E-mail ontvangst

Of er e-mail binnenkomt, hangt af van de persoonlijke GitHub notificatie-instellingen van die user:

1. **Settings** -> **Notifications**
2. E-mailnotificaties aanzetten voor watching notificaties.

## Belangrijk

- Er is geen Actions-workflow nodig voor deze route.
- Er zijn geen secrets of variables nodig voor deze route.
