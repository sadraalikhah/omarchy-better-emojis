#!/usr/bin/env bash

# Paste using Omarchy's standard helper, then leave the emoji on the regular
# clipboard so clipboard history and subsequent pastes retain the selection.
set -u

omarchy_path=${1:?Usage: insert-and-copy.sh OMARCHY_PATH EMOJI}
emoji=${2:?Usage: insert-and-copy.sh OMARCHY_PATH EMOJI}
paste_helper="$omarchy_path/bin/omarchy-menu-emoji-insert"

if "$paste_helper" "$emoji"; then
  paste_status=0
else
  paste_status=$?
fi

printf '%s' "$emoji" | wl-copy --type text/plain
copy_status=$?

if [[ $copy_status -ne 0 ]]; then
  exit "$copy_status"
fi
exit "$paste_status"
