#!/usr/bin/env bash
# Copies uploaded-file data (photos, chat attachments, certificates, etc.) from the V4.0
# uploads root into the V4.1 uploads root over rsync/SSH.
#
# Same relative "uploads/<subfolder>/<yyyy>/<mm>/<file>" layout is used on both sides (see
# UploadsController.cs) - no path transformation needed, only a straight tree copy.
#
# --ignore-existing makes this purely ADDITIVE: it never overwrites or deletes anything already
# present at the destination, so it is safe to run against a V4.1 uploads folder that already
# has its own live data.
#
# Usage:
#   ./sync-files.sh <source_root> <dest_root>
#   ./sync-files.sh /var/www/mahima-uploads deploy@v41-server:/var/www/mahima-uploads
set -euo pipefail

SOURCE_ROOT="${1:?Usage: sync-files.sh <source_root> <dest_root>}"
DEST_ROOT="${2:?Usage: sync-files.sh <source_root> <dest_root>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../migration-output/file-sync"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/file-sync-$(date +%Y%m%d-%H%M%S).log"

echo "Copying $SOURCE_ROOT -> $DEST_ROOT (additive only, --ignore-existing)"
echo "Log: $LOG_FILE"

rsync -avh --progress --ignore-existing "$SOURCE_ROOT"/ "$DEST_ROOT"/ | tee "$LOG_FILE"

echo "Done."
