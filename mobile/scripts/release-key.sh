#!/usr/bin/env bash
# Spot's dApp Store key, once, on your own computer (README.md, "The Solana
# dApp Store"). It makes the key, or picks up the one already made, outside
# the repo in ~/.spot-release; puts the four SPOT_RELEASE_* secrets the
# Android workflow signs with into GitHub; and writes the site's
# public/.well-known/assetlinks.json, which lets wallets verify the store
# build as usespot.fun. The password is typed here and never shown, logged
# or written down by the script; the only thing it prints is the
# certificate's fingerprint, which is public.
#
#   mobile/scripts/release-key.sh             make or reuse the key, upload it, write assetlinks.json
#   mobile/scripts/release-key.sh --dry-run   the same, but upload nothing and only print assetlinks.json
#   SPOT_KEY_DIR=~/somewhere mobile/scripts/release-key.sh
#                                             use a key made earlier by hand (spot-dapp-store.jks in that folder)
set -euo pipefail

dry=false
[ "${1:-}" = "--dry-run" ] && dry=true

repo="${SPOT_REPO:-vercettilev/spot-landing}"
dir="${SPOT_KEY_DIR:-$HOME/.spot-release}"
keystore="$dir/spot-dapp-store.jks"
alias="spot"
root="$(cd "$(dirname "$0")/../.." && pwd)"
links="$root/public/.well-known/assetlinks.json"

say() { printf '%s\n' "$*"; }
fail() { printf 'release-key: %s\n' "$*" >&2; exit 1; }

# Java's keytool, wherever it is. macOS has a keytool that only asks for
# Java to be installed, so each one is asked to start a JVM first.
keytool=""
for k in "${JAVA_HOME:+$JAVA_HOME/bin/keytool}" \
  /opt/homebrew/opt/openjdk@17/bin/keytool /opt/homebrew/opt/openjdk/bin/keytool \
  /usr/local/opt/openjdk@17/bin/keytool /usr/local/opt/openjdk/bin/keytool \
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
  "$(command -v keytool || true)"; do
  if [ -n "$k" ] && [ -x "$k" ] && "$k" -J-version >/dev/null 2>&1; then keytool="$k"; break; fi
done
[ -n "$keytool" ] || fail "Java's keytool isn't installed. Install it with: brew install openjdk@17 (then run this again)."

if ! $dry; then
  command -v gh >/dev/null || fail "GitHub's gh isn't installed: brew install gh, then gh auth login."
  gh auth status >/dev/null 2>&1 || fail "Sign in to GitHub first: gh auth login."
fi

umask 077
mkdir -p "$dir"

if [ -e "$keystore" ]; then
  say "Using the key already at $keystore."
  read -r -s -p "Its password: " pass; say ""
else
  say "Making Spot's dApp Store key at $keystore."
  say "Pick a long password (12 characters or more) and keep it in your password manager."
  # Asked again until it is long enough and the same twice, rather than
  # stopping: a password typed after the script stopped would land in the
  # shell, and on Enter in its history. Ctrl-C leaves.
  while :; do
    read -r -s -p "Password: " pass; say ""
    if [ "${#pass}" -lt 12 ]; then say "That one is shorter than 12 characters. Try a longer one."; continue; fi
    read -r -s -p "Again: " again; say ""
    [ "$pass" = "$again" ] && break
    say "The two didn't match. Once more, from the start."
  done
  unset again
  # PKCS12 takes one password for the store and the key; the workflow passes it as both.
  SPOT_PASS="$pass" "$keytool" -genkeypair -keystore "$keystore" -storetype PKCS12 -alias "$alias" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Spot, O=Spot" \
    -storepass:env SPOT_PASS -keypass:env SPOT_PASS >/dev/null
fi

# The password opens the store, the key is under the alias the workflow uses, and its fingerprint is what the site lists.
certs="$(SPOT_PASS="$pass" "$keytool" -list -v -keystore "$keystore" -alias "$alias" -storepass:env SPOT_PASS 2>&1)" \
  || fail "That password doesn't open $keystore, or it holds no key called \"$alias\"."
sha="$(printf '%s\n' "$certs" | sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' | head -1)"
[[ "$sha" =~ ^([0-9A-F]{2}:){31}[0-9A-F]{2}$ ]] || fail "Couldn't read the key's SHA-256 fingerprint."

if ! $dry; then
  base64 < "$keystore" | tr -d '\n' | gh secret set SPOT_RELEASE_KEYSTORE --repo "$repo"
  printf '%s' "$pass" | gh secret set SPOT_RELEASE_KEYSTORE_PASSWORD --repo "$repo"
  printf '%s' "$alias" | gh secret set SPOT_RELEASE_KEY_ALIAS --repo "$repo"
  printf '%s' "$pass" | gh secret set SPOT_RELEASE_KEY_PASSWORD --repo "$repo"
fi
unset pass

statement="$(cat <<EOF
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "fun.usespot.app",
      "sha256_cert_fingerprints": ["$sha"]
    }
  }
]
EOF
)"

say ""
say "The key's SHA-256 fingerprint: $sha"
if $dry; then
  say "Dry run: nothing uploaded. public/.well-known/assetlinks.json would be:"
  say "$statement"
  exit 0
fi
umask 022
mkdir -p "$(dirname "$links")"
printf '%s\n' "$statement" > "$links"
say "GitHub now holds the four SPOT_RELEASE_* secrets for $repo."
say "Wrote $links. Commit it; once the site serves it, wallets stop warning about the store build."
say ""
say "Back up $keystore and its password now, both in your password manager."
say "Lose either and Spot's dApp Store listing can never be updated."
