#!/usr/bin/env bash
# Wertet das Protokoll des Beobachtungsmodus aus: Welche Aufrufe WÄREN abgelehnt worden, wenn die Durchsetzung an wäre?
# Liest nur (CloudWatch Logs der Lambda plexora-api), ändert nichts, gibt keine Adressen aus (Mandanten stehen nur als Hash im Protokoll).
#
#   scripts/aws/enforce-report.sh [Stunden]            Standard: letzte 24 Stunden, Rollen ([roles]) UND Tarif/Limits ([plan])
#   scripts/aws/enforce-report.sh --from-file DATEI    wertet gespeicherte Protokollzeilen aus (ein Eintrag pro Zeile, zum Testen)
#
# Zeigt je Art (Rollen / Tarif) die Aufrufe gruppiert nach Methode, Pfad, verlangt und vorhanden, mit Anzahl und Zahl der betroffenen Mandanten.
# Dient dazu, die Zuordnung zu korrigieren, BEVOR scharf geschaltet wird (scripts/aws/set-enforce.sh roles|plan on).
set -euo pipefail
REGION="${AWS_REGION:-eu-central-1}"; GROUP="/aws/lambda/plexora-api"
SRC="$(mktemp)"; trap 'rm -f "$SRC"' EXIT
if [[ "${1:-}" == "--from-file" ]]; then cp "${2:?Datei fehlt}" "$SRC"
else
  HOURS="${1:-24}"; [[ "$HOURS" =~ ^[0-9]+$ ]] || { echo "Aufruf: $0 [Stunden] | --from-file DATEI" >&2; exit 2; }
  START=$(( ( $(date +%s) - HOURS * 3600 ) * 1000 ))
  for P in '"würde ablehnen"'; do
    aws logs filter-log-events --region "$REGION" --log-group-name "$GROUP" --start-time "$START" --filter-pattern "$P" --query 'events[].message' --output json >> "$SRC.json" 2>/dev/null || true
  done
  python3 - "$SRC.json" "$SRC" <<'PY'
import json,sys
msgs=[]
try:
    for chunk in open(sys.argv[1]).read().replace('][', ']\n[').split('\n'):
        chunk=chunk.strip()
        if chunk: msgs+= [str(m) for m in json.loads(chunk)]
except Exception: pass
open(sys.argv[2],'w').write('\n'.join(m.replace('\n',' ') for m in msgs))
PY
  rm -f "$SRC.json"
fi
python3 - "$SRC" <<'PY'
import json,re,sys,collections
rows=collections.defaultdict(lambda:{'n':0,'t':set()})
for line in open(sys.argv[1],encoding='utf-8').read().split('\n'):
    m=re.search(r'\[(roles|plan)\]\s+(?:würde ablehnen|abgelehnt)\s+(\{.*\})',line)
    if not m: continue
    try: d=json.loads(m.group(2))
    except Exception: continue
    kind=m.group(1)
    if kind=='roles': key=('Rollen',d.get('method',''),d.get('path',''),f"verlangt {d.get('required')}",f"hat {d.get('role')}")
    else: key=('Tarif',d.get('method') or d.get('what',''),d.get('path') or d.get('code') or d.get('pool',''),f"braucht {d.get('need') or d.get('reason') or d.get('code','')}",f"hat {d.get('plan','')}")
    rows[key]['n']+=1; rows[key]['t'].add(d.get('tenant','?'))
if not rows:
    print('Keine "würde ablehnen"-Einträge im Zeitraum. (Entweder wurde nichts gefunden, das abgelehnt würde, oder es hat noch niemand mit einem eingeschränkten Konto gearbeitet.)'); sys.exit(0)
for art in ('Rollen','Tarif'):
    part=[(k,v) for k,v in rows.items() if k[0]==art]
    if not part: continue
    print(f"\n== {art}: {sum(v['n'] for _,v in part)} Aufrufe wären abgelehnt worden, {len(part)} verschiedene")
    for k,v in sorted(part,key=lambda kv:-kv[1]['n']):
        print(f"  {v['n']:5}x  {k[1]:6} {k[2]:55} {k[3]:22} {k[4]:16} ({len(v['t'])} Mandant(en))")
print('\nHinweis: Jede Zeile ist ein Aufruf, den ein Konto mit dieser Rolle/diesem Tarif TATSÄCHLICH gemacht hat. Gehört er zur normalen Arbeit, muss die Zuordnung (server/utils/rolePolicy.ts bzw. moduleAccess.ts) angepasst werden, bevor scharf geschaltet wird.')
PY
