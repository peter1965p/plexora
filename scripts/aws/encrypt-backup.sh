#!/usr/bin/env bash
# Verschlüsselt eine Sicherung zu einem einzelnen Archiv (gpg symmetrisch, AES256). Die Passphrase gibst DU selbst ein (zweimal);
# sie wird nie als Argument oder in einer Datei gespeichert. Das Klartext-Verzeichnis bleibt bestehen (Rechte 700).
#
#   scripts/aws/encrypt-backup.sh [Sicherungsordner]     (Standard: neuester Ordner unter /home/peter/Dev/backups/plexora)
#   Entschlüsseln:  gpg --decrypt plexora-sicherung-<Datum>.tar.gpg | tar -x -C <Zielordner>
set -euo pipefail
umask 077
BASE="/home/peter/Dev/backups/plexora"
DIR="${1:-$(ls -1d "$BASE"/????-??-?? | sort | tail -1)}"
DATE="$(basename "$DIR")"
OUT="$BASE/plexora-sicherung-$DATE.tar.gpg"
[[ -d "$DIR" ]] || { echo "Ordner nicht gefunden: $DIR"; exit 1; }
[[ -e "$OUT" ]] && { echo "Existiert schon: $OUT (nicht überschrieben)"; exit 1; }
command -v gpg >/dev/null || { echo "gpg fehlt"; exit 1; }
echo "Archiviere und verschlüssele $DIR  ->  $OUT"
echo "Du wirst zweimal nach der Passphrase gefragt. Sie wird nirgends gespeichert; ohne sie ist das Archiv nicht lesbar."
tar -C "$BASE" -c "$DATE" | gpg --symmetric --cipher-algo AES256 --compress-algo none -o "$OUT"
chmod 600 "$OUT"
echo "Fertig: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Prüfen (fragt nach der Passphrase): gpg --decrypt \"$OUT\" | tar -t | head"
echo "SHA-256: $(sha256sum "$OUT" | cut -d' ' -f1)"
