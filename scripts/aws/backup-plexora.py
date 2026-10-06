#!/usr/bin/env python3
"""Vollständige Sicherung von Plexora (nur LESEN in AWS) nach <Ziel>/<Datum>/.

  python3 scripts/aws/backup-plexora.py [--dest /home/peter/Dev/backups/plexora] [--date YYYY-MM-DD]

Inhalt: DynamoDB (Export + Tabellendefinition + TTL je Tabelle), S3 plexora-files (ohne lambda/ und lambda-deploy/),
Lambda-Code (live-Version) + Konfiguration (NUR Namen der Umgebungsvariablen), Cognito (Nutzer, Gruppen, Client-Konfiguration,
Identity-Provider nur als Namen), EventBridge-Regeln + Ziele (Secret-Werte maskiert), CloudWatch-Alarme, SES-Identitätsnamen,
API-Gateway-Konfiguration, MANIFEST.txt mit Anzahlen, Größen und SHA-256.
Es werden nie Secrets, Schlüssel oder Passwörter gespeichert und nie Inhalte ausgegeben (nur Namen und Anzahlen).
"""
import argparse, datetime, hashlib, json, os, re, subprocess, sys, time, urllib.request

REGION = "eu-central-1"
BUCKET = "plexora-files"
POOL = "eu-central-1_lM7sN6LvC"
# Felder, die im Klartext in der Datenbank stehen und NICHT in die Sicherung gehören (z. B. Zahlungs-Schlüssel in plexora-settings).
# Verschlüsselte Felder (AES-GCM, "...Encrypted") bleiben drin: ohne NUXT_ENCRYPTION_KEY sind sie unlesbar.
SECRET_FIELDS = {"stripeSecretKey", "stripeWebhookSecret", "paypalSecret", "mollieApiKey", "customApiKey"}
SENSITIVE = re.compile(r"(secret|token|password|passwort|authorization|apikey|api_key|private|credential|client_secret)", re.I)

def aws(*args, text=False):
    r = subprocess.run(["aws", *args, "--region", REGION, "--output", "json"], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"aws {' '.join(args[:2])}: {r.stderr.strip()[:200]}")
    return r.stdout if text else (json.loads(r.stdout) if r.stdout.strip() else {})

def mask(obj):
    """Maskiert rekursiv Werte unter Schlüsseln, die nach Geheimnis aussehen, sowie Strings in JSON-Eingaben (EventBridge Input)."""
    if isinstance(obj, dict):
        return {k: ("***maskiert***" if SENSITIVE.search(k) and not isinstance(v, (dict, list)) else mask(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [mask(x) for x in obj]
    if isinstance(obj, str) and obj.strip().startswith("{"):
        try: return json.dumps(mask(json.loads(obj)))
        except Exception: return obj
    return obj

def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1) if not isinstance(data, str) else f.write(data)
    os.chmod(path, 0o600)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dest", default="/home/peter/Dev/backups/plexora")
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    a = ap.parse_args()
    os.umask(0o077)
    root = os.path.join(a.dest, a.date)
    os.makedirs(root, exist_ok=True); os.chmod(a.dest, 0o700); os.chmod(root, 0o700)
    t0 = time.time(); started = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    notes, counts = [], {}

    # 1) DynamoDB
    tables = [t for t in aws("dynamodb", "list-tables")["TableNames"] if t.startswith("plexora-")]
    for t in tables:
        items, token = [], None
        while True:
            args = ["dynamodb", "scan", "--table-name", t, "--no-paginate"] + (["--exclusive-start-key", json.dumps(token)] if token else [])
            d = aws(*args)
            items += d.get("Items", []); token = d.get("LastEvaluatedKey")
            if not token: break
        removed = 0
        for it in items:
            for fld in SECRET_FIELDS:
                v = it.get(fld, {}).get("S", "")
                if v and not re.fullmatch(r"[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+", v):   # AES-GCM-verschlüsselte Werte bleiben
                    it[fld] = {"S": "***nicht gesichert***"}; removed += 1
        if removed: notes.append(f"{t}: {removed} Klartext-Geheimnisfelder durch Platzhalter ersetzt (nach einer Wiederherstellung neu eintragen)")
        write(f"{root}/dynamodb/{t}.json", {"TableName": t, "Count": len(items), "Items": items})
        desc = aws("dynamodb", "describe-table", "--table-name", t)["Table"]
        try: ttl = aws("dynamodb", "describe-time-to-live", "--table-name", t).get("TimeToLiveDescription", {})
        except Exception: ttl = {}
        write(f"{root}/dynamodb/{t}.table.json", {"Table": desc, "TimeToLive": ttl})
        counts[t] = len(items)

    # 2) S3 (ohne lambda/ und lambda-deploy/)
    os.makedirs(f"{root}/files", exist_ok=True)
    r = subprocess.run(["aws", "s3", "sync", f"s3://{BUCKET}", f"{root}/files", "--region", REGION, "--only-show-errors",
                        "--exclude", "lambda/*", "--exclude", "lambda-deploy/*"], capture_output=True, text=True)
    if r.returncode != 0: notes.append("S3-Sync mit Fehlern: " + r.stderr.strip()[:200])

    # 3) Lambda: Code der live-Version + Konfiguration (nur Namen der Umgebungsvariablen)
    fns = [f["FunctionName"] for f in aws("lambda", "list-functions")["Functions"] if f["FunctionName"].startswith("plexora")]
    for fn in fns:
        qual = ["--qualifier", "live"] if fn == "plexora-api" else []
        g = aws("lambda", "get-function", "--function-name", fn, *qual)
        cfg = g["Configuration"]
        env = (cfg.pop("Environment", None) or {}).get("Variables", {})
        cfg["EnvironmentVariableNames"] = sorted(env.keys())
        write(f"{root}/lambda/{fn}.config.json", {"Configuration": cfg, "Concurrency": g.get("Concurrency"), "Tags": g.get("Tags")})
        zpath = f"{root}/lambda/{fn}.zip"
        with urllib.request.urlopen(g["Code"]["Location"]) as resp, open(zpath, "wb") as f:
            while True:
                b = resp.read(1 << 20)
                if not b: break
                f.write(b)
        os.chmod(zpath, 0o600)
    try:
        aliases = aws("lambda", "list-aliases", "--function-name", "plexora-api")
        write(f"{root}/lambda/plexora-api.aliases.json", aliases)
    except Exception as e: notes.append(f"Lambda-Aliase nicht lesbar: {e}")

    # 4) Cognito: Nutzer, Gruppen, Pool- und Client-Konfiguration (Identity-Provider nur Namen, Client-Secrets entfernt)
    users = aws("cognito-idp", "list-users", "--user-pool-id", POOL)["Users"]
    write(f"{root}/cognito/users.json", {"Count": len(users), "Users": users})
    groups = aws("cognito-idp", "list-groups", "--user-pool-id", POOL)["Groups"]
    write(f"{root}/cognito/groups.json", groups)
    members = {}
    for g in groups:
        try: members[g["GroupName"]] = [u["Username"] for u in aws("cognito-idp", "list-users-in-group", "--user-pool-id", POOL, "--group-name", g["GroupName"])["Users"]]
        except Exception: members[g["GroupName"]] = "nicht lesbar"
    write(f"{root}/cognito/group-members.json", members)
    try: write(f"{root}/cognito/user-pool.json", mask(aws("cognito-idp", "describe-user-pool", "--user-pool-id", POOL)["UserPool"]))
    except Exception as e: notes.append(f"Cognito-Pool-Konfiguration nicht lesbar: {e}")
    clients = []
    try:
        for c in aws("cognito-idp", "list-user-pool-clients", "--user-pool-id", POOL)["UserPoolClients"]:
            dc = aws("cognito-idp", "describe-user-pool-client", "--user-pool-id", POOL, "--client-id", c["ClientId"])["UserPoolClient"]
            dc.pop("ClientSecret", None); clients.append(mask(dc))
        write(f"{root}/cognito/clients.json", clients)
    except Exception as e: notes.append(f"Cognito-Clients nicht lesbar: {e}")
    try:
        write(f"{root}/cognito/identity-provider-names.json", [p["ProviderName"] for p in aws("cognito-idp", "list-identity-providers", "--user-pool-id", POOL)["Providers"]])
    except Exception as e: notes.append(f"Cognito-Identity-Provider nicht lesbar: {e}")

    # 5) EventBridge, CloudWatch-Alarme, SES (nur Namen), API Gateway (Konfiguration)
    rules = [r for r in aws("events", "list-rules")["Rules"] if r["Name"].startswith("plexora")]
    out = []
    for r in rules:
        tg = aws("events", "list-targets-by-rule", "--rule", r["Name"])["Targets"]
        out.append(mask({"Rule": r, "Targets": tg}))
    write(f"{root}/eventbridge/rules.json", out)
    write(f"{root}/cloudwatch/alarms.json", aws("cloudwatch", "describe-alarms", "--alarm-name-prefix", "plexora-"))
    try: write(f"{root}/ses/identity-names.json", {"Identities": aws("ses", "list-identities")["Identities"]})
    except Exception as e: notes.append(f"SES nicht lesbar: {e}")
    try:
        apis = aws("apigatewayv2", "get-apis")["Items"]
        for ap_ in apis:
            aid = ap_["ApiId"]
            write(f"{root}/apigateway/{aid}.json", mask({"Api": ap_, "Stages": aws("apigatewayv2", "get-stages", "--api-id", aid)["Items"],
                  "Integrations": aws("apigatewayv2", "get-integrations", "--api-id", aid)["Items"], "Routes": aws("apigatewayv2", "get-routes", "--api-id", aid)["Items"]}))
    except Exception as e: notes.append(f"API Gateway nicht lesbar: {e}")
    notes.append("Resend/Stripe/Google: nur als Namen der Lambda-Umgebungsvariablen erfasst (siehe lambda/*.config.json), keine Werte.")
    notes.append("Nicht gesichert: S3 lambda/ und lambda-deploy/ (Deploy-Zips, in Git reproduzierbar), Umgebungsvariablen-Werte, Secrets, Passwörter.")

    # 6) MANIFEST.txt
    lines = [f"Plexora-Sicherung {a.date}", f"Beginn (UTC): {started}", f"Dauer bis Manifest: {time.time()-t0:.0f} s", "",
             f"DynamoDB: {len(tables)} Tabellen, {sum(counts.values())} Einträge (Export)", ""]
    lines += [f"  {t:40s} {c:6d} Einträge" for t, c in sorted(counts.items())]
    lines += ["", "Anmerkungen:"] + [f"  - {n}" for n in notes] + ["", "Dateien (Größe in Bytes, SHA-256):"]
    total = 0
    for dp, _, fs in os.walk(root):
        for f in sorted(fs):
            p = os.path.join(dp, f)
            if f == "MANIFEST.txt": continue
            sz = os.path.getsize(p); total += sz
            lines.append(f"  {sha256(p)}  {sz:10d}  {os.path.relpath(p, root)}")
    lines += ["", f"Gesamtgröße: {total} Bytes ({total/1048576:.1f} MB)"]
    write(f"{root}/MANIFEST.txt", "\n".join(lines) + "\n")
    print(f"Sicherung fertig: {root}  | {len(tables)} Tabellen, {sum(counts.values())} Einträge, {total/1048576:.1f} MB, {time.time()-t0:.0f} s")
    for n in notes: print("  Hinweis:", n)

if __name__ == "__main__":
    try: main()
    except RuntimeError as e: print("Fehler:", e, file=sys.stderr); sys.exit(1)
