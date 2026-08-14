#!/usr/bin/env bash

set -Eeuo pipefail

required=(
  TRANSIP_SSH_HOST
  TRANSIP_SSH_USER
  TRANSIP_SSH_KEY_PATH
  TRANSIP_PRIVATE_DEPLOYMENTS_ROOT
  TRANSIP_LIVE_ROOT
  PRODUCTION_ORIGIN
  DEPLOY_SOURCE_SHA
  GITHUB_RUN_ID
  GITHUB_RUN_ATTEMPT
)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Required deployment variable is missing: %s\n' "$name" >&2
    exit 1
  fi
done

[[ "$TRANSIP_SSH_HOST" =~ ^[A-Za-z0-9.-]+$ ]] || { echo 'Invalid SSH host.' >&2; exit 1; }
[[ "$TRANSIP_SSH_USER" =~ ^[A-Za-z0-9._-]+$ ]] || { echo 'Invalid SSH user.' >&2; exit 1; }
[[ "$DEPLOY_SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'DEPLOY_SOURCE_SHA must be a full commit SHA.' >&2; exit 1; }
[[ "$GITHUB_RUN_ID" =~ ^[0-9]+$ && "$GITHUB_RUN_ATTEMPT" =~ ^[0-9]+$ ]] || {
  echo 'GitHub run identifiers must be numeric.' >&2
  exit 1
}
[[ "$TRANSIP_PRIVATE_DEPLOYMENTS_ROOT" == /data/sites/web/pathconsultancynl/private/path-uren-deployments ]] || {
  echo 'Unexpected private deployment root.' >&2
  exit 1
}
[[ "$TRANSIP_LIVE_ROOT" == /data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl ]] || {
  echo 'Unexpected production document root.' >&2
  exit 1
}
[[ "$PRODUCTION_ORIGIN" == https://uren.pathconsultancy.nl ]] || {
  echo 'Unexpected production origin.' >&2
  exit 1
}
[[ -f "$TRANSIP_SSH_KEY_PATH" ]] || { echo 'SSH key file not found.' >&2; exit 1; }

repo_root="$(git rev-parse --show-toplevel)"
git -C "$repo_root" cat-file -e "${DEPLOY_SOURCE_SHA}^{commit}"
version="$(git -C "$repo_root" show "${DEPLOY_SOURCE_SHA}:path-urenregistratie/package.json" | php -r '$p=json_decode(stream_get_contents(STDIN), true); echo $p["version"] ?? "";')"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Release version is invalid.' >&2; exit 1; }

short_sha="${DEPLOY_SOURCE_SHA:0:12}"
deployment_id="${short_sha}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
remote_release="${TRANSIP_PRIVATE_DEPLOYMENTS_ROOT}/${deployment_id}"
ssh_target="${TRANSIP_SSH_USER}@${TRANSIP_SSH_HOST}"
ssh_options=(-i "$TRANSIP_SSH_KEY_PATH" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes)

temp_root="$(mktemp -d)"
cleanup() {
  local path="$temp_root"
  if [[ -n "$path" && "$path" == /tmp/* && -d "$path" ]]; then
    rm -rf -- "$path"
  fi
}
trap cleanup EXIT

archive="$temp_root/path-uren-${short_sha}.tar.gz"
remote_script_local="$repo_root/path-urenregistratie/scripts/deploy-production-remote.sh"
git -C "$repo_root" archive --format=tar.gz --prefix=path-urenregistratie/ \
  -o "$archive" "${DEPLOY_SOURCE_SHA}:path-urenregistratie"

archive_sha="$(sha256sum "$archive" | awk '{print $1}')"
archive_bytes="$(wc -c < "$archive" | tr -d '[:space:]')"
remote_script_sha="$(sha256sum "$remote_script_local" | awk '{print $1}')"

ssh "${ssh_options[@]}" "$ssh_target" \
  "set -eu; test ! -e '$remote_release'; mkdir -m 700 '$remote_release'"
scp -q "${ssh_options[@]}" "$archive" "$ssh_target:$remote_release/release.tar.gz"
scp -q "${ssh_options[@]}" "$remote_script_local" "$ssh_target:$remote_release/deploy-production-remote.sh"

verification="$(ssh "${ssh_options[@]}" "$ssh_target" \
  "set -eu; wc -c < '$remote_release/release.tar.gz'; sha256sum '$remote_release/release.tar.gz' '$remote_release/deploy-production-remote.sh'")"
grep -Fxq "$archive_bytes" <<<"$verification"
grep -Fq "$archive_sha  $remote_release/release.tar.gz" <<<"$verification"
grep -Fq "$remote_script_sha  $remote_release/deploy-production-remote.sh" <<<"$verification"

remote_args=(
  bash "$remote_release/deploy-production-remote.sh"
  "$remote_release"
  "$TRANSIP_LIVE_ROOT"
  "$TRANSIP_PRIVATE_DEPLOYMENTS_ROOT"
  "$PRODUCTION_ORIGIN"
  "$DEPLOY_SOURCE_SHA"
  "$version"
  "$archive_sha"
  "$archive_bytes"
  "$deployment_id"
)
printf -v remote_command '%q ' "${remote_args[@]}"
ssh "${ssh_options[@]}" "$ssh_target" "$remote_command"

printf 'Production deployment completed: version=%s sha=%s deployment=%s\n' \
  "$version" "$DEPLOY_SOURCE_SHA" "$deployment_id"
