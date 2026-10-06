#!/usr/bin/env bash
# Listet die Cloudflare-Pages-Deployments eines Projekts und löscht auf Wunsch alle außer dem aktuellen Produktions-Deployment.
# Alte Deployments bleiben unter ihrer eigenen Adresse (https://<hash>.<projekt>.pages.dev/…) erreichbar und liefern damit auch gelöschte Dateien weiter aus.
#
#   CF_API_TOKEN=… CF_ACCOUNT_ID=… PROJECT=plexora scripts/cloudflare/delete-old-pages-deployments.sh --dry-run
#   CF_API_TOKEN=… CF_ACCOUNT_ID=… PROJECT=plexora scripts/cloudflare/delete-old-pages-deployments.sh --apply
#
# Der API-Token braucht die Berechtigung "Cloudflare Pages: Edit" (Konto) und wird nie ausgegeben. Ohne Skript: Dashboard -> Workers & Pages ->
# Projekt -> Deployments -> Menü (⋯) neben dem Deployment -> Delete.
set -euo pipefail
MODE="${1:---dry-run}"
: "${CF_API_TOKEN:?CF_API_TOKEN fehlt}"; : "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID fehlt}"; : "${PROJECT:?PROJECT fehlt (Pages-Projektname)}"
API="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$PROJECT"
call() { curl -fsS -H "Authorization: Bearer $CF_API_TOKEN" "$@"; }
PROD="$(call "$API" | python3 -c 'import json,sys; d=json.load(sys.stdin)["result"]; print((d.get("canonical_deployment") or {}).get("id",""))')"
[[ -n "$PROD" ]] || { echo "Aktuelles Produktions-Deployment nicht ermittelt – Abbruch"; exit 1; }
echo "Projekt $PROJECT, aktuelles Produktions-Deployment: ${PROD:0:8}…"
page=1; total=0; todo=()
while :; do
  resp="$(call "$API/deployments?page=$page&per_page=25")"
  ids="$(echo "$resp" | python3 -c 'import json,sys; [print(d["id"]+" "+d.get("environment","")+" "+d.get("created_on","")[:10]) for d in json.load(sys.stdin)["result"]]')"
  [[ -z "$ids" ]] && break
  while read -r id env day; do total=$((total+1)); [[ "$id" == "$PROD" ]] && continue; todo+=("$id"); echo "  zu löschen: ${id:0:8}…  $env  $day"; done <<< "$ids"
  page=$((page+1))
done
echo "$total Deployments gefunden, ${#todo[@]} würden gelöscht (das aktuelle Produktions-Deployment bleibt)."
[[ "$MODE" == "--apply" ]] || { echo "(Probelauf: nichts gelöscht)"; exit 0; }
for id in "${todo[@]}"; do
  call -X DELETE "$API/deployments/$id?force=true" >/dev/null && echo "  gelöscht: ${id:0:8}…" || echo "  FEHLER bei ${id:0:8}…"
done
