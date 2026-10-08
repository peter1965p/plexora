#!/usr/bin/env bash
# Prüft nach jedem Deploy die öffentlichen Abläufe, ohne etwas zu verändern (keine Leads, keine Buchungen, keine Mails):
# Landingpage, Lead-Formular (Definition + Preflight), Terminbuchung (Typen, freie Zeiten, Preflight), Nexora-Seite,
# Cron-Schutz und Anmeldeschutz sowie die HTTP-Speicherprüfung (scripts/aws/check-storage.sh --http-only). Endet mit Fehlercode 1, wenn etwas nicht stimmt.
set -uo pipefail
API="https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com"
TENANT="PLXR-GOD0-MODE-0000-PETE"
CAMPAIGN="eeb06c2a-4ff3-48ba-b8bc-883f985589e4"
FAIL=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFEHLER\033[0m %s\n' "$1"; FAIL=1; }
code() { curl -s -o /dev/null -m 25 -w '%{http_code}' "$@"; }
expect() { local want="$1" desc="$2"; shift 2; local got; got="$(code "$@")"; [[ "$got" == "$want" ]] && ok "$desc ($got)" || bad "$desc: erwartet $want, erhalten $got"; }

echo "== Landingpage"
LP="$(curl -s -m 25 "$API/api/marketing/public/$CAMPAIGN")"
FORM_ID="$(echo "$LP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["campaign"]["formId"])' 2>/dev/null || true)"
NFIELDS="$(echo "$LP" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["form"]["fields"]))' 2>/dev/null || echo 0)"
TYPE_ID="$(echo "$LP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["campaign"].get("appointmentTypeId",""))' 2>/dev/null || true)"
[[ -n "$FORM_ID" ]] && ok "Kampagnendaten laden (Formular $FORM_ID)" || bad "Kampagnendaten laden"
[[ "$NFIELDS" -ge 1 ]] && ok "Formular hat $NFIELDS Felder" || bad "Formular ohne Felder"
expect 200 "Seite app.plexora.eu/lead/<Kampagne>" -H 'Accept: text/html' "https://app.plexora.eu/lead/$CAMPAIGN"
expect 200 "Kurzlink-Variante /ai.beratung (Slug)" "$API/api/marketing/public/ai.beratung"

# Bot-Schutz (Turnstile): öffentliche Ausgaben enthalten höchstens Sitekey + Modus, nie ein Secret.
# Ist die Test-Kampagne geschützt (botProtection gesetzt), kann dieses Skript kein Token lösen: dann wird nur geprüft,
# dass ein Absenden OHNE Token mit 403 abgewiesen wird (kein Lead entsteht, weil die Prüfung vor dem Speichern läuft).
BOT="$(echo "$LP" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin).get("botProtection")))' 2>/dev/null || echo null)"
echo "$LP" | grep -qiE 'secret|encrypted' && bad "Landingpage-Ausgabe enthält ein Secret-Feld" || ok "Landingpage-Ausgabe ohne Secret-Felder"
CT="$(curl -s -m 25 "$API/api/public/$TENANT/contact")"
echo "$CT" | grep -qiE 'secret|encrypted' && bad "Kontakt-Ausgabe enthält ein Secret-Feld" || ok "Kontakt-Ausgabe ohne Secret-Felder"
if [[ "$BOT" != "null" && -n "$FORM_ID" ]]; then
  expect 403 "Bot-Schutz aktiv: Absenden ohne Token wird abgewiesen (kein Lead)" -X POST "$API/api/forms/$FORM_ID/submit" -H 'Content-Type: application/json' -d '{"data":{"E-Mail":"check-public-flows@invalid.example"}}'
else
  ok "Bot-Schutz an der Test-Kampagne aus (Formular bleibt ohne Token erreichbar)"
fi

echo "== Lead-Seite: Vertrauenspunkte, Datenschutzzeile, Overlays (Standardwerte, Grenzen, Whitelist)"
check_decor() { # $1 = Beschriftung, $2 = JSON der Landingpage-Schnittstelle
  local out; out="$(PLX_JSON="$2" python3 - "$1" <<'PY'
import json,re,sys,os
label=sys.argv[1]
try: d=json.loads(os.environ.get("PLX_JSON",""))
except Exception:
    print("FEHLER|"+label+": Antwort ist kein JSON"); sys.exit(0)
c=d.get("campaign")
if not isinstance(c,dict):
    print("FEHLER|"+label+": keine Kampagne in der Antwort"); sys.exit(0)
src=open("server/utils/publicView.ts",encoding="utf-8").read()
allowed=set(re.findall(r"'([A-Za-z]+)'", src[src.index("PUBLIC_CAMPAIGN_FIELDS"):src.index("] as const")]))
errs=[]
extra=sorted(set(c)-allowed)
if extra: errs.append("nicht freigegebene Felder: "+",".join(extra))
t=c.get("trustItems"); p=c.get("privacyLine"); o=c.get("overlays")
if not isinstance(t,list) or len(t)>8: errs.append("trustItems fehlt oder mehr als 8")
else:
    for i in t:
        if len(i.get("text",""))>60 or not re.fullmatch(r"[a-z-]+",i.get("icon","")): errs.append("Vertrauenspunkt ungültig")
if not isinstance(p,dict) or "on" not in p or len(p.get("text",""))>120: errs.append("privacyLine ungültig")
if not isinstance(o,list) or len(o)>8: errs.append("overlays fehlt oder mehr als 8")
else:
    if sum(1 for x in o if x.get("anim","none")!="none")>2: errs.append("mehr als 2 animierte Overlays")
    for x in o:
        if len(x.get("text",""))>24 or not re.fullmatch(r"#[0-9a-fA-F]{6}",x.get("color","")): errs.append("Overlay ungültig")
        if x.get("place") not in ("image","page") or not isinstance(x.get("hideMobile"),bool): errs.append("Overlay: Platzierung/Handy-Schalter ungültig")
        for k,l in (("px",100),("mx",100),("py",150),("my",150)):
            v=x.get(k)
            if not isinstance(v,int) or isinstance(v,bool) or abs(v)>l: errs.append("Overlay: Lage "+k+" ungültig")
raw=json.dumps(d)
if re.search(r"userId|notifyEmail|\"scope\"",raw): errs.append("Besitzerdaten in der Antwort")
if errs: print("FEHLER|"+label+": "+"; ".join(sorted(set(errs))))
else:
    stored_default = isinstance(t,list) and [x["text"] for x in t]==["Anfrage 100 % kostenlos","SSL gesichert","Antwort in 24 h"]
    print(f"OK|{label}: {len(t)} Vertrauenspunkte{' (Standard)' if stored_default else ''}, Datenschutzzeile {'an' if p['on'] else 'aus'}, {len(o)} Overlay(s), nur freigegebene Felder")
PY
)"
  [[ "${out%%|*}" == "OK" ]] && ok "${out#*|}" || bad "${out#*|}"
}
check_decor "Kampagne $CAMPAIGN" "$LP"
LP2="$(curl -s -m 25 "$API/api/marketing/public/ai.beratung")"; [[ -n "$LP2" ]] && check_decor "Kurzlink-Kampagne ai.beratung" "$LP2"

echo "== Lead-Formular (nur Preflight, kein Absenden)"
PF="$(curl -s -i -m 25 -X OPTIONS "$API/api/forms/$FORM_ID/submit" -H 'Origin: https://app.plexora.eu' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type')"
echo "$PF" | head -1 | grep -qE ' (200|204)' && ok "Preflight für POST /api/forms/<id>/submit" || bad "Preflight für Formular-Absenden"

echo "== Terminbuchung"
TY="$(curl -s -m 25 "$API/api/public/$TENANT/termine${TYPE_ID:+?type=$TYPE_ID}")"
NTYPES="$(echo "$TY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["types"]))' 2>/dev/null || echo 0)"
[[ "$NTYPES" -ge 1 ]] && ok "$NTYPES Terminarten (Deep-Link ?type=${TYPE_ID:-–})" || bad "keine Terminarten"
if [[ -n "$TYPE_ID" ]]; then
  echo "$TY" | grep -q "$TYPE_ID" && ok "Kampagnen-Terminart über Deep-Link sichtbar" || bad "Kampagnen-Terminart nicht über Deep-Link sichtbar"
  echo "$(curl -s -m 25 "$API/api/public/$TENANT/termine")" | grep -q "$TYPE_ID" && bad "Kampagnen-Terminart steht auf der allgemeinen Liste" || ok "Kampagnen-Terminart NICHT auf der allgemeinen Liste"
fi
next_workday() { local d="$1"; while [[ "$(date -d "$d" +%u)" -ge 6 ]]; do d="$(date -d "$d +1 day" +%F)"; done; echo "$d"; }   # Termine gibt es nur Mo–Fr: sonst wäre die Prüfung am Wochenende rot
DAY="$(next_workday "$(date -d '+2 days' +%F)")"; FIRST_TYPE="$(echo "$TY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["types"][0]["typeId"])' 2>/dev/null || true)"
SLOTS="$(curl -s -m 25 "$API/api/public/$TENANT/termine/availability?typeId=${TYPE_ID:-$FIRST_TYPE}&date=$DAY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["slots"]))' 2>/dev/null || echo 0)"
[[ "$SLOTS" -ge 1 ]] && ok "freie Zeiten am $DAY: $SLOTS" || bad "keine freien Zeiten am $DAY"
PB="$(curl -s -i -m 25 -X OPTIONS "$API/api/public/$TENANT/termine/book" -H 'Origin: https://www.paeffgen-it.de' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type')"
echo "$PB" | head -1 | grep -qE ' (200|204)' && ok "Preflight für POST …/termine/book" || bad "Preflight für Terminbuchung"

echo "== Terminbuchung: Widget und serverseitige Prüfung stimmen überein (es wird nie ein Termin gebucht)"
# Probe: Buchung OHNE Token für einen nicht verfügbaren Zeitpunkt (01.01.2020, 03:33 Uhr). Verlangt der Server ein Token (Kampagnen-Terminart mit Bot-Schutz), kommt 403,
# sonst 409 "nicht mehr verfügbar" – in beiden Fällen entsteht keine Buchung. Die Buchungsseite muss genau dann ein Widget zeigen, wenn 403 kommt, sonst scheitert jede Buchung.
book_probe() { curl -s -o /dev/null -m 25 -w '%{http_code}' -X POST "$API/api/public/$TENANT/termine/book" -H 'Content-Type: application/json' -d "{\"typeId\":\"$1\",\"date\":\"2020-01-01\",\"startTime\":\"03:33\",\"customerName\":\"check-public-flows\",\"customerEmail\":\"check-public-flows@invalid.example\"}"; }
widget_for() { curl -s -m 25 "$API/api/public/$TENANT/termine?type=$1" | python3 -c 'import json,sys; print("ja" if json.load(sys.stdin).get("botProtection") else "nein")' 2>/dev/null || echo "?"; }
consistent() { # $1 Beschriftung, $2 typeId
  local w st; w="$(widget_for "$2")"; st="$(book_probe "$2")"
  case "$st:$w" in
    429:*) ok "$1: übersprungen (Drossel der Buchungsroute, kein Fehler)";;
    403:ja) ok "$1: Widget wird gezeigt UND der Server verlangt ein Token (403) – konsistent";;
    409:nein) ok "$1: kein Widget und der Server verlangt kein Token (409 nicht verfügbar) – konsistent";;
    403:nein|503:nein) bad "$1: der Server verlangt ein Token ($st), die Seite zeigt aber KEIN Widget – jede Buchung würde scheitern";;
    409:ja) bad "$1: die Seite zeigt ein Widget, der Server prüft aber nichts (409) – Schutz wirkungslos";;
    *) bad "$1: unerwartet (Server $st, Widget $w)";;
  esac
}
[[ -n "${FIRST_TYPE:-}" ]] && consistent "allgemeine Terminart" "$FIRST_TYPE" || bad "keine allgemeine Terminart zum Prüfen"
CAMP_TYPES="$( { echo "$LP"; echo "$LP2"; } | python3 -c '
import sys,json
seen=set()
for line in sys.stdin.read().split("\n"):
    try: t=json.loads(line)["campaign"].get("appointmentTypeId")
    except Exception: continue
    if t: seen.add(t)
print(" ".join(sorted(seen)))' 2>/dev/null)"
if [[ -z "$CAMP_TYPES" ]]; then ok "keine Kampagne mit Terminart gefunden: nur die allgemeine Terminart geprüft (Kampagnen-Termine: tests/botprotection/consistency.test.ts)"
else for t in $CAMP_TYPES; do consistent "Kampagnen-Terminart $t" "$t"; done; fi

echo "== Nexora-Website"
expect 200 "www.paeffgen-it.de/termine" -H 'Accept: text/html' "https://www.paeffgen-it.de/termine${TYPE_ID:+?type=$TYPE_ID}"
expect 200 "www.paeffgen-it.de/" -H 'Accept: text/html' "https://www.paeffgen-it.de/"

echo "== Dateien im Bucket (öffentliche Bilder laden, Deploy-Zips sind nicht öffentlich)"
S3="https://plexora-files.s3.eu-central-1.amazonaws.com"
img_status() { curl -s -o /dev/null -I -m 20 -w '%{http_code}' "$1"; }
IMG_URLS="$( { echo "$LP"; echo '---'; echo "$TY"; } | python3 -c '
import sys,json
a,b=sys.stdin.read().split("\n---\n")
urls=[]
try:
    d=json.loads(a); c=d.get("campaign") or {}; urls+=[c.get("headerImageUrl"),c.get("bgImageUrl"),c.get("logoUrl"),(d.get("branding") or {}).get("logoUrl")]
except Exception: pass
try: urls.append(json.loads(b).get("avatarUrl"))
except Exception: pass
print("\n".join(u for u in urls if u and u.startswith("https://plexora-files")))
' 2>/dev/null)"
if [[ -z "$IMG_URLS" ]]; then ok "keine Bild-URLs auf Landingpage/Terminseite zu prüfen"; else
  while IFS= read -r u; do [[ -z "$u" ]] && continue; c="$(img_status "$u")"; [[ "$c" == "200" ]] && ok "Bild lädt (200): ${u#$S3/}" || bad "Bild lädt nicht ($c): ${u#$S3/}"; done <<< "$IMG_URLS"
fi
# Privates bleibt privat, Auflisten verboten, deklarierte Präfixe erreichbar: dieselbe Deklaration wie das Deploy-Gate (infra/storage-policy.ts)
echo "== Speicher (HTTP, Regel: infra/storage-policy.ts)"
if ST="$(scripts/aws/check-storage.sh --http-only 2>&1)"; then STORAGE_OK=1; else STORAGE_OK=0; fi
printf '%s\n' "$ST" | grep -E '^\s+.{0,12}(OK|FEHLER|WARNUNG|--)' | sed -E 's/\x1b\[[0-9;]*m//g' | while IFS= read -r l; do
  case "$l" in *FEHLER*) printf '  \033[31mFEHLER\033[0m %s\n' "${l#*FEHLER }";; *WARNUNG*) printf '  \033[33mWARNUNG\033[0m %s\n' "${l#*WARNUNG }";; *OK*) printf '  \033[32mOK\033[0m   %s\n' "${l#*OK   }";; *) printf '  --   %s\n' "${l#*--   }";; esac
done
[[ "$STORAGE_OK" == "1" ]] && ok "Speicher-Prüfung (HTTP) bestanden" || bad "Speicher-Prüfung (HTTP) fehlgeschlagen – Ausgabe mit scripts/aws/check-storage.sh --http-only ansehen; bei Deploy-Zips: scripts/aws/secure-bucket.sh --apply"

echo "== Schutz"
expect 401 "Entwürfe ohne Token" "$API/api/drafts/marketing-campaign"
expect 401 "Cron-Route ohne Secret" -X POST "$API/api/termine/cron/reminders"
expect 200 "Anwendung antwortet (/api/settings/agb)" "$API/api/settings/agb"

echo
[[ $FAIL -eq 0 ]] && echo "Alle Prüfungen bestanden." || { echo "Es gibt Fehler."; exit 1; }
