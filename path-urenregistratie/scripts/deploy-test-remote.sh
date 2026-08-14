#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "$#" -ne 10 ]]; then echo 'Expected exactly ten TEST deployment arguments.' >&2; exit 1; fi

release_root="$1"
live_root="$2"
deployments_root="$3"
private_root="$4"
test_origin="$5"
source_sha="$6"
version="$7"
expected_archive_sha="$8"
expected_archive_bytes="$9"
deployment_id="${10}"

[[ "$release_root" == "$deployments_root/$deployment_id" ]] || { echo 'Release root mismatch.' >&2; exit 1; }
[[ "$deployments_root" == /data/sites/web/pathconsultancynl/private/path-uren-test-deployments ]] || { echo 'TEST deployments root mismatch.' >&2; exit 1; }
[[ "$private_root" == /data/sites/web/pathconsultancynl/private/path-uren-test ]] || { echo 'TEST private root mismatch.' >&2; exit 1; }
[[ "$live_root" == /data/sites/web/pathconsultancynl/subsites/uren-test.pathconsultancy.nl ]] || { echo 'TEST live root mismatch.' >&2; exit 1; }
[[ "$test_origin" == https://uren-test.pathconsultancy.nl ]] || { echo 'TEST origin mismatch.' >&2; exit 1; }
[[ "$source_sha" =~ ^[0-9a-f]{40}$ && "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Release identity is invalid.' >&2; exit 1; }
[[ "$expected_archive_sha" =~ ^[0-9a-f]{64}$ && "$expected_archive_bytes" =~ ^[0-9]+$ ]] || { echo 'Archive contract is invalid.' >&2; exit 1; }
[[ "$deployment_id" =~ ^[0-9a-f]{12}-[0-9]+-[0-9]+$ ]] || { echo 'Deployment id is invalid.' >&2; exit 1; }

archive="$release_root/release.tar.gz"
stage_root="$release_root/release"
app_root="$stage_root/path-urenregistratie"
canonical_config="$private_root/config.local.php"
remote_script="$release_root/deploy-test-remote.sh"
[[ -f "$archive" && -f "$remote_script" ]] || { echo 'Uploaded TEST release files are incomplete.' >&2; exit 1; }
[[ -f "$canonical_config" ]] || { echo 'Canonical TEST config is unavailable. Run configure-test.php first.' >&2; exit 1; }
[[ "$(wc -c < "$archive" | tr -d '[:space:]')" == "$expected_archive_bytes" ]] || { echo 'Remote archive size mismatch.' >&2; exit 1; }
[[ "$(sha256sum "$archive" | awk '{print $1}')" == "$expected_archive_sha" ]] || { echo 'Remote archive checksum mismatch.' >&2; exit 1; }
[[ ! -e "$stage_root" ]] || { echo 'Stage root already exists.' >&2; exit 1; }
[[ -d "$live_root" ]] || { echo 'TEST document root does not exist.' >&2; exit 1; }

mkdir -m 700 "$stage_root"
tar -xzf "$archive" -C "$stage_root"
[[ -f "$app_root/package.json" && -f "$app_root/server/scripts/test-preflight.php" ]] || { echo 'Extracted TEST application is incomplete.' >&2; exit 1; }
actual_version="$(php -r '$p=json_decode(file_get_contents($argv[1]), true); echo $p["version"] ?? "";' "$app_root/package.json")"
[[ "$actual_version" == "$version" ]] || { echo 'Extracted version mismatch.' >&2; exit 1; }

cp "$canonical_config" "$app_root/server/config.local.php"
chmod 600 "$app_root/server/config.local.php"
cd "$app_root"
php server/scripts/test-preflight.php --config=server/config.local.php
php -r '
  require $argv[1] . "/server/scripts/cli-bootstrap.php";
  $config = require $argv[1] . "/server/config.local.php";
  $mail = is_array($config["mail"] ?? null) ? $config["mail"] : [];
  $acceptance = is_array($mail["acceptance_test"] ?? null) ? $mail["acceptance_test"] : [];
  if (($mail["enabled"] ?? false) === true || ($mail["test_delivery_enabled"] ?? false) === true || ($acceptance["enabled"] ?? false) === true) {
      fwrite(STDERR, "TEST mail or acceptance window is still enabled.\n"); exit(1);
  }
  echo "test_mail_window=closed\n";
' "$app_root"

wait_for_test_vhost() {
  local nonce marker_name marker_path attempt response
  nonce="$(php -r 'echo bin2hex(random_bytes(24));')"
  marker_name="test-vhost-ready-${nonce}.txt"
  marker_path="$live_root/$marker_name"
  printf '%s' "$nonce" > "$marker_path"
  chmod 644 "$marker_path"
  for attempt in $(seq 1 30); do
    response="$(curl -fsS "$test_origin/$marker_name" 2>/dev/null || true)"
    if [[ "$response" == "$nonce" ]]; then
      rm -f -- "$marker_path"
      echo "TEST vhost is ready after attempt $attempt."
      return 0
    fi
    sleep 10
  done
  rm -f -- "$marker_path"
  echo 'TEST vhost does not yet serve its configured document root.' >&2
  return 1
}

wait_for_test_vhost
php server/scripts/database-backup.php --config=server/config.local.php --execute
php server/migrate.php
php server/scripts/test-preflight.php --config=server/config.local.php --live

refresh_opcache() {
  local root="$1" nonce helper_name helper_path response curl_status
  [[ -d "$root/server" ]] || return 0
  nonce="$(php -r 'echo bin2hex(random_bytes(24));')"
  helper_name="cache-refresh-${nonce}.php"
  helper_path="$root/server/$helper_name"
  cat > "$helper_path" <<'PHP'
<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$invalidated = function_exists('opcache_invalidate') ? opcache_invalidate(__DIR__ . '/config.local.php', true) : false;
$reset = function_exists('opcache_reset') ? opcache_reset() : false;
echo json_encode(['ok' => true, 'invalidated' => $invalidated, 'reset' => $reset]);
PHP
  chmod 644 "$helper_path"
  curl_status=0
  response="$(curl -fsS "$test_origin/server/$helper_name")" || curl_status="$?"
  rm -f -- "$helper_path"
  [[ "$curl_status" -eq 0 ]] || return "$curl_status"
  grep -Fq '"ok":true' <<<"$response"
}

timestamp="$(date -u +%Y%m%d-%H%M%S)"
rollback_root="$deployments_root/rollback-pre-${deployment_id}-${timestamp}"
failed_root="$deployments_root/failed-${deployment_id}-${timestamp}"
[[ ! -e "$rollback_root" && ! -e "$failed_root" ]] || { echo 'Rollback target collision.' >&2; exit 1; }

cutover_started=0
rollback_on_error() {
  local code="$?"
  trap - EXIT HUP INT TERM
  if [[ "$code" -ne 0 && "$cutover_started" -eq 1 ]]; then
    echo 'TEST smoke failed; restoring previous TEST release.' >&2
    if [[ -d "$live_root" && ! -e "$failed_root" ]]; then mv "$live_root" "$failed_root"; fi
    if [[ -d "$rollback_root" && ! -e "$live_root" ]]; then mv "$rollback_root" "$live_root"; refresh_opcache "$live_root" || true; fi
  fi
  exit "$code"
}
trap rollback_on_error EXIT HUP INT TERM

mv "$live_root" "$rollback_root"
cutover_started=1
mv "$app_root" "$live_root"
chmod 600 "$live_root/server/config.local.php"
printf '%s\n' "$source_sha" > "$live_root/.release-sha"
refresh_opcache "$live_root"

index_snapshot="$release_root/live-index.html"
health_snapshot="$release_root/live-health.json"
curl -fsS "$test_origin/index.html?release=$deployment_id" -o "$index_snapshot"
grep -Fq "Versie $version" "$index_snapshot"
curl -fsS "$test_origin/assets/app.js?v=$version" -o /dev/null
curl -fsS "$test_origin/assets/styles.css?v=$version" -o /dev/null
curl -fsS "$test_origin/server/health.php" -o "$health_snapshot"
grep -Fq '"ok":true' "$health_snapshot"
cd "$live_root"
php server/scripts/test-preflight.php --config=server/config.local.php --live

cutover_started=0
trap - EXIT HUP INT TERM
printf 'TEST live smoke passed: version=%s sha=%s rollback=%s\n' "$version" "$source_sha" "$rollback_root"
