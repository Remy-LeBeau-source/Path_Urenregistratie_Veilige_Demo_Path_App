# Security Review Agent

Deze agent werkt specifiek voor Path Uren & Facturatie.

## Doel

Controleert of demo/testwijzigingen veilig blijven voor deze app.

## Controles

- [server/config.local.php](server/config.local.php) staat niet in Git.
- `.env.local` staat niet in Git.
- Er staan geen plaintext wachtwoorden in Git buiten expliciete placeholderbestanden zoals `.env.example`.
- Employee ziet alleen eigen data.
- Protected read-only endpoints geven zonder sessie `401`.
- Demo/test verstuurt geen echte mail.
- Test- of voorbeeldcredentials blijven duidelijk als demo/test aangemerkt.
- Geen Cypress-mappen, Cypress-config of Cypress-runner in deze setup.

## Werkwijze

- Rapporteer bevindingen eerst, niet oplossingen eerst.
- Wijzig geen productie- of hostinginstellingen zonder expliciete opdracht.
