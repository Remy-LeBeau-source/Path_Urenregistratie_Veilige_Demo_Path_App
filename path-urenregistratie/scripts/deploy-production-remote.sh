#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "$#" -ne 9 ]]; then
  echo 'Expected exactly nine deployment arguments.' >&2
  exit 1
fi

release_root="$1"
live_root="$2"
private_deployments_root="$3"
production_origin="$4"
source_sha="$5"
version="$6"
expected_archive_sha="$7"
expected_archive_bytes="$8"
deployment_id="$9"

[[ "$release_root" == "$private_deployments_root/$deployment_id" ]] || { echo 'Release root mismatch.' >&2; exit 1; }
[[ "$private_deployments_root" == /data/sites/web/pathconsultancynl/private/path-uren-deployments ]] || { echo 'Private root mismatch.' >&2; exit 1; }
[[ "$live_root" == /data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl ]] || { echo 'Live root mismatch.' >&2; exit 1; }
[[ "$production_origin" == https://uren.pathconsultancy.nl ]] || { echo 'Production origin mismatch.' >&2; exit 1; }
[[ "$source_sha" =~ ^[0-9a-f]{40}$ && "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Release identity is invalid.' >&2; exit 1; }
[[ "$expected_archive_sha" =~ ^[0-9a-f]{64}$ && "$expected_archive_bytes" =~ ^[0-9]+$ ]] || { echo 'Archive contract is invalid.' >&2; exit 1; }
[[ "$deployment_id" =~ ^[0-9a-f]{12}-[0-9]+-[0-9]+$ ]] || { echo 'Deployment id is invalid.' >&2; exit 1; }

archive="$release_root/release.tar.gz"
stage_root="$release_root/release"
app_root="$stage_root/path-urenregistratie"
remote_script="$release_root/deploy-production-remote.sh"

[[ -f "$archive" && -f "$remote_script" ]] || { echo 'Uploaded release files are incomplete.' >&2; exit 1; }
[[ "$(wc -c < "$archive" | tr -d '[:space:]')" == "$expected_archive_bytes" ]] || { echo 'Remote archive size mismatch.' >&2; exit 1; }
[[ "$(sha256sum "$archive" | awk '{print $1}')" == "$expected_archive_sha" ]] || { echo 'Remote archive checksum mismatch.' >&2; exit 1; }
[[ ! -e "$stage_root" ]] || { echo 'Stage root already exists.' >&2; exit 1; }
[[ -d "$live_root" && -f "$live_root/server/config.local.php" ]] || { echo 'Current live config is unavailable.' >&2; exit 1; }

mkdir -m 700 "$stage_root"
tar -xzf "$archive" -C "$stage_root"
[[ -f "$app_root/package.json" && -f "$app_root/server/scripts/production-preflight.php" ]] || {
  echo 'Extracted application is incomplete.' >&2
  exit 1
}
actual_version="$(php -r '$p=json_decode(file_get_contents($argv[1]), true); echo $p["version"] ?? "";' "$app_root/package.json")"
[[ "$actual_version" == "$version" ]] || { echo 'Extracted version mismatch.' >&2; exit 1; }

cp "$live_root/server/config.local.php" "$app_root/server/config.local.php"
chmod 600 "$app_root/server/config.local.php"

cd "$app_root"
php server/scripts/production-preflight.php --config=server/config.local.php
php -r '
  require $argv[1] . "/server/scripts/cli-bootstrap.php";
  $config = require $argv[1] . "/server/config.local.php";
  $mail = is_array($config["mail"] ?? null) ? $config["mail"] : [];
  $acceptance = is_array($mail["acceptance_test"] ?? null) ? $mail["acceptance_test"] : [];
  if (($mail["enabled"] ?? false) === true || ($acceptance["enabled"] ?? false) === true) {
      fwrite(STDERR, "Production mail or acceptance window is still enabled.\n");
      exit(1);
  }
  $pdo = ops_pdo($config);
  $pending = (int)$pdo->query("SELECT COUNT(*) FROM email_deliveries WHERE status IN (\"queued\",\"processing\")")->fetchColumn();
  if ($pending !== 0) {
      fwrite(STDERR, "Pending production mail prevents deployment: " . $pending . "\n");
      exit(1);
  }
  echo "mail_window=closed pending_mail=0\n";
' "$app_root"
php server/scripts/database-backup.php --config=server/config.local.php --execute
php server/migrate.php
php server/scripts/production-preflight.php --config=server/config.local.php --live

refresh_opcache() {
  local root="$1"
  local nonce helper_name helper_path response curl_status
  nonce="$(php -r 'echo bin2hex(random_bytes(24));')"
  helper_name="cache-refresh-${nonce}.php"
  helper_path="$root/server/$helper_name"
  cat > "$helper_path" <<'PHP'
<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$invalidated = function_exists('opcache_invalidate')
    ? opcache_invalidate(__DIR__ . '/config.local.php', true)
    : false;
$reset = function_exists('opcache_reset') ? opcache_reset() : false;
echo json_encode(['ok' => true, 'invalidated' => $invalidated, 'reset' => $reset]);
PHP
  # The web worker must be able to read this single-use helper. The random
  # filename is removed immediately after the request.
  chmod 644 "$helper_path"
  curl_status=0
  response="$(curl -fsS "$production_origin/server/$helper_name")" || curl_status="$?"
  rm -f -- "$helper_path"
  [[ "$curl_status" -eq 0 ]] || return "$curl_status"
  grep -Fq '"ok":true' <<<"$response"
}

current_version="$(php -r '$p=json_decode(file_get_contents($argv[1]), true); echo preg_replace("/[^0-9.]/", "", (string)($p["version"] ?? "unknown"));' "$live_root/package.json")"
timestamp="$(date -u +%Y%m%d-%H%M%S)"
rollback_root="$private_deployments_root/rollback-v${current_version:-unknown}-pre-${deployment_id}-${timestamp}"
failed_root="$private_deployments_root/failed-${deployment_id}-${timestamp}"
[[ ! -e "$rollback_root" && ! -e "$failed_root" ]] || { echo 'Rollback target collision.' >&2; exit 1; }

cutover_started=0
move_directory_contents() {
  local source="$1" target="$2"
  [[ -d "$source" && -d "$target" ]] || return 1
  find "$source" -mindepth 1 -maxdepth 1 -exec mv -- {} "$target/" \;
}

mkdir -m 700 "$rollback_root" "$failed_root"

rollback_on_error() {
  local code="$?"
  trap - EXIT HUP INT TERM
  if [[ "$code" -ne 0 && "$cutover_started" -eq 1 ]]; then
    echo 'Live smoke failed; restoring previous production release.' >&2
    set +e
    move_directory_contents "$live_root" "$failed_root"
    move_directory_contents "$rollback_root" "$live_root"
    refresh_opcache "$live_root" || true
  fi
  exit "$code"
}
trap rollback_on_error EXIT HUP INT TERM

cutover_started=1
move_directory_contents "$live_root" "$rollback_root"
move_directory_contents "$app_root" "$live_root"
chmod 600 "$live_root/server/config.local.php"
printf '%s\n' "$source_sha" > "$live_root/.release-sha"
refresh_opcache "$live_root" || echo 'PROD OPcache refresh unavailable; continuing to authoritative public smoke.' >&2

index_snapshot="$release_root/live-index.html"
health_snapshot="$release_root/live-health.json"
curl -fsS "$production_origin/index.html?release=$deployment_id" -o "$index_snapshot"
grep -Fq "Versie $version" "$index_snapshot"
curl -fsS "$production_origin/assets/app.js?v=$version" -o /dev/null
curl -fsS "$production_origin/assets/styles.css?v=$version" -o /dev/null
curl -fsS "$production_origin/server/health.php" -o "$health_snapshot"
php -r '
  $payload = json_decode(file_get_contents($argv[1]), true);
  if (!is_array($payload) || ($payload["ok"] ?? false) !== true) {
      fwrite(STDERR, "Production public health response is invalid or unhealthy.\n");
      exit(1);
  }
  echo "Production public health check passed.\n";
' "$health_snapshot"
cd "$live_root"
php server/scripts/production-preflight.php --config=server/config.local.php --live

cutover_started=0
trap - EXIT HUP INT TERM
rmdir "$failed_root"
printf 'Live smoke passed: version=%s sha=%s rollback=%s\n' "$version" "$source_sha" "$rollback_root"
