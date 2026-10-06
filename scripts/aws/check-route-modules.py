#!/usr/bin/env python3
"""Fordert jede geschützte Route einmal OHNE Token an. Erwartet 401/403 (oder 400/404/405/422), nie 5xx.
Ein 5xx bedeutet meist: Modul fehlt im Paket oder die Route stürzt vor der Anmeldeprüfung ab.
Verändert nichts: ohne Token bricht jede dieser Routen vor jedem Schreibzugriff ab. Offene Routen (POST/PUT/...)
werden bewusst ausgelassen. Aufruf: scripts/aws/check-route-modules.py [Basis-URL]"""
import os, re, sys, json, urllib.request, urllib.error
API = sys.argv[1] if len(sys.argv) > 1 else "https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com"
BASE = os.path.join(os.path.dirname(__file__), "..", "..", "server", "api")
PROTECTED = re.compile(r"requireAuth\(|requireAdmin\(|requireTenantId\(|requireMailSender\(|draftContext\(")
bad, checked = [], 0
for root, _, files in os.walk(BASE):
    for f in sorted(files):
        m = re.match(r"(.*)\.(get|post|put|patch|delete)\.ts$", f)
        if not m: continue
        full = os.path.join(root, f)
        src = open(full, encoding="utf-8", errors="ignore").read()
        if not PROTECTED.search(src): continue
        rel = os.path.relpath(full, BASE)[:-len(f)] + m.group(1)
        if rel.endswith("/index"): rel = rel[:-6]
        path = "/api/" + re.sub(r"\[[^\]]+\]", "x", rel)
        method = m.group(2).upper()
        req = urllib.request.Request(API + path, method=method, data=b"{}" if method != "GET" else None,
                                     headers={"Content-Type": "application/json"})
        try:
            code = urllib.request.urlopen(req, timeout=30).status
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception:
            code = 0
        checked += 1
        if code >= 500 or code == 0: bad.append((method, path, code))
print(f"geprüft: {checked} geschützte Routen ohne Token")
if bad:
    print(f"FEHLER ({len(bad)}): Routen mit 5xx statt 401:")
    for m_, p_, c_ in bad: print(f"  {c_} {m_} {p_}")
    sys.exit(1)
print("OK: keine Route stürzt ohne Token ab")
