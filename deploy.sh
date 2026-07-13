#!/usr/bin/env bash
set -euo pipefail

# See deploy.md for the one-time server-side setup this script depends on.
#
# Required env:
#   DEPLOY_SSH_PRIVATE_KEY  private half of the dedicated deploy keypair
#                           (OpenSSH format, no passphrase)
#   DEPLOY_SSH_HOST         deploy target server hostname/IP
#   DEPLOY_SSH_USER         remote user whose authorized_keys restricts this
#                           key to `rrsync -wo DEPLOY_TARGET_PATH`
#   DEPLOY_TARGET_PATH      directory dist/ is synced into — MUST match the
#                           DIR baked into that authorized_keys entry (rrsync
#                           enforces its own DIR server-side regardless of
#                           what path is sent here; a mismatch won't error,
#                           it'll just write somewhere other than intended)
#   DEPLOY_KNOWN_HOSTS      output of `ssh-keyscan -H -p <port> <host>` for
#                           the target server, used for strict host-key
#                           verification
# Optional env:
#   DEPLOY_SSH_PORT         defaults to 22

# ci.sh already ran (without --skip-tests) in the `test` job this job
# `needs:`, so the test suite has already passed — re-running it here would
# just duplicate that work. Reuse ci.sh for the `npm ci` step anyway so
# there's one place that knows how to set up dependencies.
./ci.sh --skip-tests
npm run build

key_file="$(mktemp)"
known_hosts_file="$(mktemp)"
trap 'rm -f "$key_file" "$known_hosts_file"' EXIT

printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" > "$key_file"
chmod 600 "$key_file"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$known_hosts_file"

rsync -az --delete \
  -e "ssh -i $key_file -o UserKnownHostsFile=$known_hosts_file -o StrictHostKeyChecking=yes -p ${DEPLOY_SSH_PORT:-22}" \
  dist/ "$DEPLOY_SSH_USER@$DEPLOY_SSH_HOST:$DEPLOY_TARGET_PATH/"
