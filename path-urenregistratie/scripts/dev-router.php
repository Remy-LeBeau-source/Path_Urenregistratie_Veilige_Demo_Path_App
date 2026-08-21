<?php

// Router for the persistent local dev server (php -S ... dev-router.php).
//
// Two problems this solves, both of which cost real debugging hours:
//
// 1. The built-in PHP server sends no cache headers at all, so Chrome may hold
//    on to assets/app.js indefinitely -- a fix can be live on disk while the
//    browser still runs old code, with no visible sign anything is stale.
// 2. Worse: once the browser has cached it, it stops requesting the file
//    entirely (the server log shows zero requests for app.js), so adding
//    no-store headers afterwards changes nothing -- they never get fetched.
//
// So on top of no-store headers, index.html's asset URLs are rewritten on the
// fly to carry the file's current modification time. A changed file therefore
// gets a URL the browser has never seen and cannot serve from cache.

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$root = realpath(__DIR__ . '/..');

function dev_no_cache_headers(): void
{
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}

// Anything this router serves itself bypasses the built-in server's access log,
// which once made it look like the browser never requested app.js at all. Log
// it explicitly so "did the browser actually fetch this?" stays answerable.
function dev_log(string $what): void
{
    error_log('[dev-router] served ' . $what);
}

// Serve index.html with cache-busted asset URLs based on real file mtimes.
if ($path === '/' || $path === '/index.html') {
    $indexFile = $root . '/index.html';
    $html = file_get_contents($indexFile);

    $html = preg_replace_callback(
        '#(assets/(?:app\.js|styles\.css))\?v=[^"\']*#',
        static function (array $m) use ($root): string {
            $assetPath = $root . '/' . $m[1];
            $stamp = is_file($assetPath) ? (string)filemtime($assetPath) : (string)time();
            return $m[1] . '?v=' . $stamp;
        },
        $html
    );

    dev_no_cache_headers();
    header('Content-Type: text/html; charset=utf-8');
    dev_log('index.html');
    echo $html;
    return true;
}

$candidate = realpath($root . $path);

// PHP files (the API, health checks) must still execute normally.
if ($candidate !== false && is_file($candidate) && !str_ends_with($candidate, '.php')) {
    // Never serve anything outside the project root.
    if (!str_starts_with($candidate, $root)) {
        http_response_code(403);
        return true;
    }

    $types = [
        'js' => 'application/javascript; charset=utf-8',
        'mjs' => 'application/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'html' => 'text/html; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'webmanifest' => 'application/manifest+json',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];
    $extension = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));

    dev_no_cache_headers();
    header('Content-Type: ' . ($types[$extension] ?? 'application/octet-stream'));
    header('Content-Length: ' . (string)filesize($candidate));
    dev_log($path);
    readfile($candidate);
    return true;
}

return false;
