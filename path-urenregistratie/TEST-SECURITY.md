# TEST SECURITY

## Checkpunten

- CSRF-token ophalen via [server/auth/csrf.php](server/auth/csrf.php)
- Login werkt met geldige token
- Logout werkt met geldige token
- Invalid JSON en ontbrekende velden geven nette validation errors
- Protected read-only API blijft zonder sessie `401`

## Handmatige teststappen

1. Open de app.
2. Laat de frontend een CSRF-token ophalen via `/server/auth/csrf.php`.
3. Log in met de bekende demo-credentials.
4. Controleer dat logout werkt en daarna `/server/auth/me.php` weer `authenticated: false` geeft.
5. Post zonder token of met ongeldige JSON en controleer dat de response netjes JSON blijft.

## Opmerking

Deze stap voegt nog geen write-endpoints toe. De scope blijft beperkt tot CSRF, validatie en veilige auth-aanroepen.
