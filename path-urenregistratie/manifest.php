<?php

declare(strict_types=1);

// Het manifest wordt per omgeving anders benoemd, zodat een op het beginscherm
// geplaatste TEST-installatie herkenbaar verschilt van de productie-installatie.
// De browser haalt dit bestand zelf op bij "toevoegen aan beginscherm"; daar
// kan de app-JavaScript niet tussen komen, dus de naam moet serverseitig.

header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');

$environment = 'production';
$configPath = __DIR__ . '/server/config.local.php';
if (is_file($configPath)) {
    $config = require $configPath;
    if (is_array($config)) {
        $environment = strtolower(trim((string)(
            $config['environment'] ?? ($config['app']['environment'] ?? 'production')
        )));
    }
}

// Alleen de naam verschilt per omgeving. De statusbalkkleur (theme_color) is
// overal navy -- gelijk aan de web-app en aan productie. Dat de TEST-app zichtbaar
// TEST is, blijft aan de naam ("Path TEST") en aan het oranje TESTOMGEVING-label
// in de app zelf.
$naming = [
    'test' => [
        'name' => 'Path Uren — TESTOMGEVING',
        'short_name' => 'Path TEST',
    ],
    'development' => [
        'name' => 'Path Uren — DEV',
        'short_name' => 'Path DEV',
    ],
];
$pick = $naming[$environment] ?? [
    'name' => 'Path Uren & Facturatie',
    'short_name' => 'Path Uren',
];

echo json_encode([
    'id' => '/',
    'name' => $pick['name'],
    'short_name' => $pick['short_name'],
    'description' => 'Uren registreren, goedkeuren en factureren voor Path Consultancy.',
    'start_url' => '/',
    'scope' => '/',
    'display' => 'standalone',
    'orientation' => 'portrait-primary',
    'background_color' => '#0D1B38',
    'theme_color' => '#0D1B38',
    'lang' => 'nl',
    'dir' => 'ltr',
    'prefer_related_applications' => false,
    'icons' => [
        ['src' => 'assets/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => 'assets/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => 'assets/icon-maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
