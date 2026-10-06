#!/usr/bin/env python3
"""Spielt eine DynamoDB-Tabelle aus einer Sicherung (scripts/aws/backup-plexora.py) zurück.

  python3 scripts/aws/restore-table.py <Sicherungsordner> <Tabelle> --dry-run
  python3 scripts/aws/restore-table.py <Sicherungsordner> <Tabelle> --target plexora-restore-test
  python3 scripts/aws/restore-table.py <Sicherungsordner> <Tabelle> --in-place --yes     (überschreibt Zeilen der ORIGINAL-Tabelle!)

Sicherheitsregeln: Ohne --target oder --in-place passiert nichts. Eine Kopie mit anderem Namen wird bei Bedarf aus der
gesicherten Tabellendefinition angelegt (Schlüssel, Indizes, TTL; Abrechnung on-demand). --in-place verlangt zusätzlich --yes
und schreibt nur Zeilen (put), löscht nichts. Es werden nie Inhalte ausgegeben, nur Namen und Anzahlen.
"""
import argparse, json, os, subprocess, sys, tempfile, time
REGION = "eu-central-1"

def aws(*args, ok_fail=False):
    r = subprocess.run(["aws", *args, "--region", REGION, "--output", "json"], capture_output=True, text=True)
    if r.returncode != 0:
        if ok_fail: return None
        raise RuntimeError(r.stderr.strip()[:300])
    return json.loads(r.stdout) if r.stdout.strip() else {}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("backup"); ap.add_argument("table")
    ap.add_argument("--target"); ap.add_argument("--in-place", action="store_true"); ap.add_argument("--yes", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    data = json.load(open(f"{a.backup}/dynamodb/{a.table}.json"))
    meta = json.load(open(f"{a.backup}/dynamodb/{a.table}.table.json"))
    t = meta["Table"]; items = data["Items"]
    target = a.table if a.in_place else a.target
    if not target and not a.dry_run:
        print("Nichts zu tun: --target <Name>, --in-place oder --dry-run angeben."); return 2
    target = target or f"{a.table} (Kopie, Name im Probelauf offen)"
    if a.in_place and not a.dry_run and not a.yes:
        print("--in-place überschreibt Zeilen der Original-Tabelle und braucht --yes."); return 2
    if not a.in_place and target == a.table:
        print("Der Zielname darf nicht der Originalname sein (dafür gibt es --in-place)."); return 2
    key = [k["AttributeName"] for k in t["KeySchema"]]
    gsis = [g["IndexName"] for g in t.get("GlobalSecondaryIndexes", [])]
    ttl = meta.get("TimeToLive", {})
    print(f"Quelle:  {a.backup}/dynamodb/{a.table}.json  ({len(items)} Einträge)")
    print(f"Ziel:    {target}{'  (ORIGINAL-Tabelle, nur Schreiben/Überschreiben von Zeilen)' if a.in_place else ''}")
    print(f"Schlüssel: {', '.join(key)} | Indizes: {', '.join(gsis) or 'keine'} | TTL: {ttl.get('AttributeName') if ttl.get('TimeToLiveStatus') == 'ENABLED' else 'aus'}")
    exists = None if a.dry_run and not a.target and not a.in_place else aws("dynamodb", "describe-table", "--table-name", target, ok_fail=True)
    if a.dry_run:
        print("PROBELAUF – es wird nichts geändert. Ablauf wäre:")
        if not a.in_place: print(f"  1. Tabelle {target} {'existiert bereits (wird weiterverwendet)' if exists else 'aus der gesicherten Definition anlegen'}")
        print(f"  2. {len(items)} Einträge in Paketen zu je 25 schreiben (BatchWriteItem, Put; bestehende Zeilen mit gleichem Schlüssel werden überschrieben)")
        if not a.in_place and ttl.get("TimeToLiveStatus") == "ENABLED": print(f"  3. TTL auf '{ttl['AttributeName']}' aktivieren")
        print("  4. Anzahl im Ziel zählen und mit der Sicherung vergleichen")
        return 0

    if not a.in_place and not exists:
        spec = {"TableName": target, "KeySchema": t["KeySchema"], "AttributeDefinitions": t["AttributeDefinitions"], "BillingMode": "PAY_PER_REQUEST"}
        if t.get("GlobalSecondaryIndexes"):
            spec["GlobalSecondaryIndexes"] = [{"IndexName": g["IndexName"], "KeySchema": g["KeySchema"], "Projection": g["Projection"]} for g in t["GlobalSecondaryIndexes"]]
        if t.get("LocalSecondaryIndexes"):
            spec["LocalSecondaryIndexes"] = [{"IndexName": g["IndexName"], "KeySchema": g["KeySchema"], "Projection": g["Projection"]} for g in t["LocalSecondaryIndexes"]]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f: json.dump(spec, f); p = f.name
        aws("dynamodb", "create-table", "--cli-input-json", f"file://{p}"); os.unlink(p)
        subprocess.run(["aws", "dynamodb", "wait", "table-exists", "--table-name", target, "--region", REGION], check=True)
        print(f"Tabelle {target} angelegt.")
    for i in range(0, len(items), 25):
        batch = {target: [{"PutRequest": {"Item": it}} for it in items[i:i + 25]]}
        for attempt in range(6):
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f: json.dump(batch, f); p = f.name
            res = aws("dynamodb", "batch-write-item", "--request-items", f"file://{p}"); os.unlink(p)
            un = res.get("UnprocessedItems", {})
            if not un.get(target): break
            batch = un; time.sleep(0.5 * (attempt + 1))
        else: raise RuntimeError("Einträge blieben unverarbeitet")
    if not a.in_place and ttl.get("TimeToLiveStatus") == "ENABLED":
        aws("dynamodb", "update-time-to-live", "--table-name", target, "--time-to-live-specification", f"Enabled=true,AttributeName={ttl['AttributeName']}", ok_fail=True)
    n = aws("dynamodb", "scan", "--table-name", target, "--select", "COUNT")["Count"]
    print(f"Zurückgespielt: {len(items)} Einträge geschrieben, im Ziel gezählt: {n} -> {'GLEICH' if n == len(items) or a.in_place else 'ABWEICHUNG'}")
    return 0 if (n == len(items) or a.in_place) else 1

if __name__ == "__main__":
    try: sys.exit(main())
    except RuntimeError as e: print("Fehler:", e, file=sys.stderr); sys.exit(1)
