#!/usr/bin/env bash
# Installed outside the checkout; invoked only by a restricted SSH deploy key.
set -euo pipefail
umask 077
if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  printf '%s\n' 'Only deploy <commit SHA> is allowed.' >&2
  exit 1
fi
commit=${BASH_REMATCH[1]}
app_dir=/home/ubuntu/qarqaraly
state_dir=/home/ubuntu/qarqaraly-ci
mkdir -p "$state_dir"
exec 9>"$state_dir/deploy.lock"
flock -w 900 9
stage=$(mktemp -d "$state_dir/release.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
tar -xzf - --no-same-owner --no-same-permissions -C "$stage"
for required in Dockerfile compose.yaml package-lock.json; do
  test -f "$stage/$required"
done
test -f "$app_dir/.env"
# Server configuration, persistent data and backups never come from Git.
rsync -a --delete \
  --exclude='.env' --exclude='.env.*' --exclude='.git/' \
  --exclude='uploads/' --exclude='backups/' --exclude='node_modules/' --exclude='.next/' \
  "$stage/" "$app_dir/"
cd "$app_dir"
previous=$(docker image inspect qarqaraly-app:latest --format '{{.Id}}' 2>/dev/null || true)
if [[ -n "$previous" ]]; then
  docker tag "$previous" qarqaraly-app:previous
fi
# The current container keeps serving while the next image builds.
docker compose -p qarqaraly build app
if ! docker compose -p qarqaraly up -d --no-build --wait --wait-timeout 120 app; then
  if [[ -n "$previous" ]]; then
    printf '%s\n' 'Startup failed; restoring the previous application image.' >&2
    docker tag qarqaraly-app:previous qarqaraly-app:latest
    docker compose -p qarqaraly up -d --no-build --wait --wait-timeout 120 app
  fi
  exit 1
fi
printf '%s\n' "$commit" > "$state_dir/deployed-commit"
printf 'Deployed %s\n' "$commit"
