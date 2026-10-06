#!/usr/bin/env python3
"""Ersetzt die Daten des Demo-Mandanten demo@plexora.eu durch die erfundene Seed-Datei scripts/demo/demo-seed.json.

  python3 scripts/demo/apply_demo_seed.py --dry-run     zeigt, was gelöscht und was angelegt würde
  python3 scripts/demo/apply_demo_seed.py --apply       Export der alten Zeilen, Löschen, Seed einspielen, Zählvergleich

Feste IDs: eine Wiederholung überschreibt dieselben Zeilen (keine Duplikate). Die Einstellungen des Demo-Mandanten (Module, Theme) bleiben erhalten.
Es werden nur Tabellennamen und Anzahlen ausgegeben.
"""
import argparse, json, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "cleanup"))
import cleanup_sample_data as cl  # noqa: E402

def to_ddb(v):
    if v is None: return {"NULL": True}
    if isinstance(v, bool): return {"BOOL": v}
    if isinstance(v, (int, float)): return {"N": str(v)}
    if isinstance(v, str): return {"S": v}
    if isinstance(v, list): return {"L": [to_ddb(x) for x in v]}
    if isinstance(v, dict): return {"M": {k: to_ddb(x) for k, x in v.items()}}
    raise TypeError(type(v))

def item(row): return {k: to_ddb(v) for k, v in row.items() if v is not None}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--seed", default=os.path.join(HERE, "demo-seed.json")); a = ap.parse_args()
    seed = json.load(open(a.seed, encoding="utf-8"))
    owner = seed["owner"]
    plan_old = cl.collect("demo")
    print(f"Demo-Mandant {owner}")
    print(f"  zu löschen:  {sum(len(r) for _, r, _ in plan_old)} Zeilen in {len(plan_old)} Tabellen (Einstellungen bleiben)")
    print(f"  anzulegen:   {sum(len(r) for r in seed['tables'].values())} Zeilen in {len(seed['tables'])} Tabellen")
    for t, rows in seed["tables"].items():
        old = next((len(r) for tt, r, _ in plan_old if tt == t), 0)
        print(f"    {t:26s} alt {old:3d} -> neu {len(rows):3d}")
    if not a.apply: print("(Probelauf: nichts geändert)"); return 0
    rc = subprocess.run([sys.executable, os.path.join(HERE, "..", "cleanup", "cleanup_sample_data.py"), "demo", "--apply"]).returncode
    if rc: return rc
    for t, rows in seed["tables"].items():
        for r in rows:
            assert r.get("userId") == owner, f"{t}: falscher Besitzer"
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f: json.dump(item(r), f); p = f.name
            cl.aws("dynamodb", "put-item", "--table-name", t, "--item", f"file://{p}"); os.unlink(p)
    bad = []
    for t, rows in seed["tables"].items():
        n = sum(1 for i in cl.scan(t) if cl.val(i, "userId") == owner)
        print(f"  Zählvergleich {t:26s} Soll {len(rows):3d} Ist {n:3d} {'OK' if n == len(rows) else 'ABWEICHUNG'}")
        if n != len(rows): bad.append(t)
    return 1 if bad else 0

if __name__ == "__main__":
    try: sys.exit(main())
    except RuntimeError as e: print("Fehler:", e, file=sys.stderr); sys.exit(1)
