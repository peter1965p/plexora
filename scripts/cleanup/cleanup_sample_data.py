#!/usr/bin/env python3
"""Bereinigung der Beispieldaten (nur auf ausdrückliche Anweisung). Immer erst Probelauf, dann --apply.

  python3 scripts/cleanup/cleanup_sample_data.py <schritt> [--apply]

  schritt "mandant"  : Beispielzeilen im Mandanten news24regional@gmail.com (5 Kontakte, 3 Deals nach Firmennamen,
                       2 Projekte, 3 Support-Tickets). Alles andere bleibt unangetastet.
  schritt "altdemo"  : ALLE Zeilen der alten Demo-Kennungen demo-plexora und demo-user in allen plexora-*-Tabellen.
  schritt "demo"     : ALLE Zeilen des Demo-Mandanten demo@plexora.eu (danach wird die Seed-Datei eingespielt, siehe apply_demo_seed.py).

Vor jeder Löschung werden die betroffenen Zeilen vollständig nach <Sicherungsordner>/bereinigung-<Datum>/<schritt>/ exportiert
(Rechte 600, außerhalb jedes Git-Repos). Ausgabe: nur Tabellennamen, Anzahlen und Namen von Beispielfirmen – keine Adressen, Telefonnummern.
"""
import argparse, datetime, json, os, subprocess, sys

REGION = "eu-central-1"
ME = "news24regional@gmail.com"
BACKUP_ROOT = "/home/peter/Dev/backups/plexora"
OWNER_ATTRS = ("userId", "scope", "tenantId", "owner", "ownerId")

def aws(*args, ok_fail=False):
    r = subprocess.run(["aws", *args, "--region", REGION, "--output", "json"], capture_output=True, text=True)
    if r.returncode != 0:
        if ok_fail: return None
        raise RuntimeError(r.stderr.strip()[:300])
    return json.loads(r.stdout) if r.stdout.strip() else {}

def scan(table):
    items, key = [], None
    while True:
        a = ["dynamodb", "scan", "--table-name", table, "--no-paginate"] + (["--exclusive-start-key", json.dumps(key)] if key else [])
        d = aws(*a); items += d.get("Items", []); key = d.get("LastEvaluatedKey")
        if not key: return items

def val(item, name):
    v = item.get(name) or {}
    return next(iter(v.values())) if v else ""

def tables():
    return [t for t in aws("dynamodb", "list-tables")["TableNames"] if t.startswith("plexora-")]

def key_names(table):
    return [k["AttributeName"] for k in aws("dynamodb", "describe-table", "--table-name", table)["Table"]["KeySchema"]]

def select_mandant():
    """(Tabelle, Auswahlfunktion, erwartete Anzahl, Beschreibung)"""
    sample_companies = {"Hoffmann Digital AG", "Weber Handels KG", "Müller Consulting", "Bauer & Partner GmbH", "Klein Steuerberatung"}
    return [
        ("plexora-contacts", lambda i: val(i, "userId") == ME and (val(i, "company") in sample_companies or (val(i, "firstName") == "Max" and val(i, "lastName") == "Demo")) and val(i, "leadSource") != "landingpage", 5, "Beispiel-Kontakte (Max Demo, Hoffmann, Weber, Müller, Bauer)"),
        ("plexora-deals", lambda i: val(i, "userId") == ME and val(i, "name") in {"Plexora Enterprise Deal", "Pro Lizenz", "Starter Paket"} and val(i, "company") in sample_companies, 3, "Beispiel-Deals nach Firmennamen"),
        ("plexora-projects", lambda i: val(i, "userId") == ME and val(i, "name") in {"CRM Migration", "Website Relaunch 2026"}, 2, "Projekte CRM Migration, Website Relaunch 2026"),
        ("plexora-support", lambda i: val(i, "userId") == ME and val(i, "title") in {"Dashboard lädt langsam", "PDF-Anhang fehlt", "Login funktioniert nicht"}, 3, "Beispiel-Support-Tickets"),
    ]

def collect(step):
    plan = []   # (Tabelle, [Zeilen], Beschreibung)
    if step == "mandant":
        for table, sel, expected, desc in select_mandant():
            rows = [i for i in scan(table) if sel(i)]
            if len(rows) != expected: raise RuntimeError(f"{table}: erwartet {expected} Zeilen, gefunden {len(rows)} – Abbruch, nichts geändert")
            plan.append((table, rows, desc))
    else:
        owners = {"altdemo": {"demo-plexora", "demo-user"}, "demo": {"demo@plexora.eu"}}[step]
        for t in tables():
            # Einstellungen des Demo-Mandanten (sichtbare Module, Theme) sind keine Beispieldaten und bleiben erhalten
            if step == "demo" and t == "plexora-settings": continue
            rows = [i for i in scan(t) if any(val(i, a) in owners for a in OWNER_ATTRS)]
            if rows: plan.append((t, rows, "Zeilen der Kennung(en) " + ", ".join(sorted(owners))))
    return plan

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("step", choices=["mandant", "altdemo", "demo"]); ap.add_argument("--apply", action="store_true")
    ap.add_argument("--date", default=datetime.date.today().isoformat()); a = ap.parse_args()
    plan = collect(a.step)
    total = sum(len(r) for _, r, _ in plan)
    print(f"{'ANWENDEN' if a.apply else 'PROBELAUF'} – Schritt '{a.step}': {total} Zeilen in {len(plan)} Tabellen")
    for t, rows, desc in plan: print(f"  {t:28s} {len(rows):3d}  {desc}")
    if not a.apply: print("(Probelauf: nichts exportiert, nichts gelöscht)"); return 0
    os.umask(0o077)
    out = f"{BACKUP_ROOT}/bereinigung-{a.date}/{a.step}"; os.makedirs(out, exist_ok=True)
    for p in (f"{BACKUP_ROOT}/bereinigung-{a.date}", out): os.chmod(p, 0o700)
    for t, rows, _ in plan:                                 # 1. Export vor jeder Änderung
        path = f"{out}/{t}.json"
        with open(path, "w", encoding="utf-8") as f: json.dump({"TableName": t, "Count": len(rows), "Items": rows}, f, ensure_ascii=False, indent=1)
        os.chmod(path, 0o600)
    print(f"Export vor dem Löschen: {out}")
    deleted = 0
    for t, rows, _ in plan:                                 # 2. Löschen
        keys = key_names(t)
        for it in rows:
            aws("dynamodb", "delete-item", "--table-name", t, "--key", json.dumps({k: it[k] for k in keys}))
            deleted += 1
    print(f"Gelöscht: {deleted} Zeilen")
    for t, rows, _ in plan:                                 # 3. Kontrolle: keine der Zeilen mehr vorhanden
        keys = key_names(t); gone = {tuple(val(it, k) for k in keys) for it in rows}
        still = [it for it in scan(t) if tuple(val(it, k) for k in keys) in gone]
        print(f"  Kontrolle {t:28s} übrig: {len(still)}")
        if still: return 1
    return 0

if __name__ == "__main__":
    try: sys.exit(main())
    except RuntimeError as e: print("Fehler:", e, file=sys.stderr); sys.exit(1)
