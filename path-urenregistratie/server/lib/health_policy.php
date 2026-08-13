<?php

declare(strict_types=1);

function path_health_environment(array $config): string
{
    return strtolower(trim((string)($config['environment'] ?? $config['app']['environment'] ?? 'production')));
}

function path_health_requires_demo_seed(string $environment): bool
{
    return strtolower(trim($environment)) !== 'production';
}

function path_health_checks_are_ok(array $checks): bool
{
    $allOk = true;
    array_walk_recursive($checks, static function ($value, $key) use (&$allOk): void {
        if ($key === 'ok' && $value === false) {
            $allOk = false;
        }
    });

    return $allOk;
}
