<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

// 19 sep: vervolg op Gio's opdracht "veel security testen over de gehele
// applicatie". server/auth/session.php bepaalt zelf, per binnenkomend
// verzoek, of de sessiecookie het Secure-attribuut krijgt:
//   $secureCookie = $isHttps || ($requireHttps && !$isLocalHost);
// Niets bewaakte die formule zelf -- SEC-H-015 (tests/playwright/security.spec.ts)
// toetst alleen HttpOnly en SameSite tegen een lokale Playwright-server, waar
// $isHttps en require_https altijd allebei onwaar zijn; de drie andere
// combinaties (echte HTTPS, require_https zonder HTTPS, en de localhost-
// uitzondering daarop) komen daar nooit aan bod. Een regressie in die formule
// zou dus pas op TEST of PROD zichtbaar worden -- of, erger, helemaal niet,
// als hij de cookie juist te vaak onbeveiligd laat.
//
// Dit script roept auth_start_session_secure() rechtstreeks aan met een
// synthetisch verzoek per equivalentieklasse (elke combinatie in een eigen
// PHP-subproces, want een sessie heeft eigen globale status). Klassen op
// basis van de formule zelf (ISTQB equivalentieklassen op de drie factoren):
// A. Echte HTTPS, require_https uit                    -> secure
// B. Echte HTTPS, require_https aan                     -> secure (eerste term wint)
// C. Geen HTTPS, require_https uit, niet-localhost       -> onbeveiligd (huidig gedrag TEST zonder eis)
// D. Geen HTTPS, require_https aan, niet-localhost       -> secure (vangnet: nooit een onbeveiligde cookie als het beleid HTTPS eist)
// E. Geen HTTPS, require_https aan, localhost            -> onbeveiligd (uitzondering voor lokale ontwikkeling/Playwright)
// F. Echte HTTPS, require_https aan, localhost           -> secure (HTTPS wint alsnog van de localhost-uitzondering)

$sessionPath = __DIR__ . '/../auth/session.php';

function session_secure_check_run(?string $https, string $host, bool $requireHttps): bool
{
    global $sessionPath;
    $script = tempnam(sys_get_temp_dir(), 'session-secure-');
    $configPhp = var_export(['security' => ['require_https' => $requireHttps]], true);
    file_put_contents($script, sprintf(
        '<?php
$_SERVER["REQUEST_METHOD"] = "GET";
$_SERVER["HTTP_HOST"] = %s;
%s
require %s;
auth_start_session_secure(%s);
echo json_encode(["secure" => session_get_cookie_params()["secure"]]);',
        var_export($host, true),
        $https === null ? 'unset($_SERVER["HTTPS"]);' : '$_SERVER["HTTPS"] = ' . var_export($https, true) . ';',
        var_export($sessionPath, true),
        $configPhp
    ));
    $result = shell_exec('php ' . escapeshellarg($script));
    unlink($script);
    $payload = json_decode((string)$result, true);
    if (!is_array($payload) || !array_key_exists('secure', $payload)) {
        throw new RuntimeException('session.php gaf geen geldige JSON terug: ' . substr((string)$result, 0, 300));
    }
    return (bool)$payload['secure'];
}

$fouten = 0;
$controle = function (bool $conditie, string $melding) use (&$fouten): void {
    if (!$conditie) {
        fwrite(STDERR, "FOUT: {$melding}\n");
        $fouten++;
    }
};

$controle(session_secure_check_run('on', 'uren.pathconsultancy.nl', false) === true, 'A: echte HTTPS zonder require_https hoort de cookie secure te maken.');
$controle(session_secure_check_run('on', 'uren.pathconsultancy.nl', true) === true, 'B: echte HTTPS met require_https hoort de cookie secure te maken.');
$controle(session_secure_check_run(null, 'uren-test.pathconsultancy.nl', false) === false, 'C: geen HTTPS, require_https uit, niet-localhost -- hoort onbeveiligd te blijven (huidig TEST-gedrag zonder de eis).');
$controle(session_secure_check_run(null, 'uren-test.pathconsultancy.nl', true) === true, 'D: geen HTTPS maar require_https aan -- vangnet moet de cookie alsnog secure maken, nooit een onbeveiligde cookie als het beleid HTTPS eist.');
$controle(session_secure_check_run(null, '127.0.0.1', true) === false, 'E: localhost-uitzondering moet blijven werken, ook met require_https aan (anders breekt lokale ontwikkeling/Playwright).');
$controle(session_secure_check_run('on', 'localhost', true) === true, 'F: echte HTTPS wint alsnog van de localhost-uitzondering.');

if ($fouten > 0) {
    exit(1);
}

echo "session-cookie-secure-policy-check: alle zes combinaties van HTTPS, require_https en localhost geven het juiste Secure-attribuut.\n";
