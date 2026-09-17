<?php

declare(strict_types=1);

// Wie ben je, en mag je schrijven?
//
// Waarom hergebruik van het inloggen van de urenapp, en niet een eigen
// accountmodel: die keuze stond open, maar zonder database zou "eigen accounts"
// neerkomen op wachtwoorden in een bestand. De urenapp heeft al een bewezen en
// getest inlogmechanisme (sessies, CSRF, snelheidslimiet, wachtwoordherstel) op
// een echte database. Dat is voor iedereen die vandaag met de kwaliteitsstraat
// werkt precies goed: het zijn Path-medewerkers met een bestaand account.
//
// Wat hier NIET opgelost is: accounts voor klanten. Die horen niet in de
// gebruikerstabel van de urenregistratie thuis, en dat vraagt de eigen database
// en een scheiding per klant die nog niet bestaat. Zolang die er niet is, kan
// alleen een Path-medewerker schrijven -- en dat is eerlijker dan iedereen
// laten schrijven omdat het nog niet af is.

require_once __DIR__ . '/../server/auth/session.php';

/**
 * De ingelogde gebruiker, of null. Faalt nooit met een fout: een kapotte
 * database mag hooguit betekenen dat je niet mag schrijven, niet dat de pagina
 * omvalt voor wie alleen leest.
 *
 * @return array<string,mixed>|null
 */
function kwaliteitsstraat_gebruiker(): ?array
{
    try {
        $config = auth_try_load_raw_config();
        if (!is_array($config) || $config === []) {
            return null;
        }
        auth_start_session_secure($config);
        return auth_current_user(auth_pdo($config));
    } catch (Throwable $fout) {
        return null;
    }
}

/**
 * Een leesbare naam voor in de geschiedenis. Bewust de weergavenaam en niet het
 * e-mailadres: de geschiedenis is voor mensen om na te lezen, en een adres is
 * een persoonsgegeven dat daar niet voor nodig is.
 */
function kwaliteitsstraat_naam(?array $gebruiker): string
{
    if (!is_array($gebruiker)) {
        return 'onbekend';
    }
    $naam = trim((string)($gebruiker['display_name'] ?? ''));
    return $naam !== '' ? $naam : 'medewerker';
}
