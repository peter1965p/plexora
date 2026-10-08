#!/usr/bin/env bash
# Meldet Änderungen an Bucket-Policy, Block Public Access und Bucket-ACL der Buckets "plexora-*" binnen Minuten per Mail (SNS-Thema plexora-alerts).
# Quelle sind die Verwaltungsereignisse von CloudTrail, die EventBridge ohne eigenen Trail auf dem Standard-Bus bekommt:
#   PutBucketPolicy, DeleteBucketPolicy, PutBucketAcl, PutBucketPublicAccessBlock, DeleteBucketPublicAccessBlock  (nur Buckets mit dem Präfix "plexora-")
# Die Meldung nennt Bucket, Aktion, Benutzer/Rolle, Zeit und Quell-IP – nicht den Inhalt der Änderung. Sie sagt NICHT, ob der neue Zustand in Ordnung ist:
# dafür scripts/aws/check-storage.sh ausführen (vergleicht mit infra/storage-policy.ts). Die Aether-OS-Buckets sind absichtlich nicht erfasst.
#
#   scripts/aws/setup-bucket-change-alerts.sh --dry-run    [Standard] zeigt Plan, prüft das Muster gegen Beispielereignisse (events:TestEventPattern) und liest nur
#   scripts/aws/setup-bucket-change-alerts.sh --apply      legt Regel, Ziel und die Themen-Berechtigung an     (CloudShell als Administrator, siehe unten)
#   scripts/aws/setup-bucket-change-alerts.sh --remove     entfernt Regel und Ziel (das Thema bleibt)
#
# Rechte für --apply/--remove (Administrator in der CloudShell hat sie): events:PutRule, events:PutTargets, events:RemoveTargets, events:DeleteRule, events:DescribeRule,
#   sns:GetTopicAttributes, sns:SetTopicAttributes. Der Probelauf braucht nur events:TestEventPattern (oder zeigt, dass es fehlt) und ändert nichts.
# Kosten: EventBridge-Regel und eine Mail pro Änderung: praktisch 0.
set -uo pipefail
MODE="${1:---dry-run}"; REGION="${AWS_REGION:-eu-central-1}"
RULE="plexora-bucket-changes"; TOPIC="plexora-alerts"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
[[ "$ACCOUNT" =~ ^[0-9]{12}$ ]] || { echo "FEHLER: Konto nicht ermittelbar (aws sts get-caller-identity)." >&2; exit 1; }
TOPIC_ARN="arn:aws:sns:$REGION:$ACCOUNT:$TOPIC"; RULE_ARN="arn:aws:events:$REGION:$ACCOUNT:rule/$RULE"
umask 077; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/pattern.json" <<'JSON'
{"source":["aws.s3"],"detail-type":["AWS API Call via CloudTrail"],"detail":{"eventSource":["s3.amazonaws.com"],"eventName":["PutBucketPolicy","DeleteBucketPolicy","PutBucketAcl","PutBucketPublicAccessBlock","DeleteBucketPublicAccessBlock"],"requestParameters":{"bucketName":[{"prefix":"plexora-"}]}}}
JSON
# Lesbare Mail statt Roh-JSON
cat > "$TMP/targets.json" <<JSON
[{"Id":"sns","Arn":"$TOPIC_ARN","InputTransformer":{
  "InputPathsMap":{"bucket":"\$.detail.requestParameters.bucketName","what":"\$.detail.eventName","who":"\$.detail.userIdentity.arn","when":"\$.detail.eventTime","ip":"\$.detail.sourceIPAddress"},
  "InputTemplate":"\"Speicher-Änderung: <what> an Bucket <bucket> durch <who> um <when> (IP <ip>). Wenn das nicht gewollt war: sofort zurücksetzen. Soll-Zustand prüfen mit scripts/aws/check-storage.sh (infra/storage-policy.ts).\""}}]
JSON
cat > "$TMP/statement.json" <<JSON
{"Sid":"BucketAenderungenRegel","Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sns:Publish","Resource":"$TOPIC_ARN","Condition":{"ArnEquals":{"aws:SourceArn":"$RULE_ARN"}}}
JSON

echo "== Modus: ${MODE#--}   Region: $REGION"
echo "   Regel:   $RULE  -> SNS-Thema $TOPIC (bestehend)"
echo "   Muster:  $(cat "$TMP/pattern.json")"
echo "   Themen-Berechtigung (nur diese Regel darf veröffentlichen):"; sed 's/^/     /' "$TMP/statement.json"
echo
echo "== Muster gegen Beispielereignisse prüfen (events:TestEventPattern, nur lesend)"
sample() { printf '{"id":"1","account":"%s","time":"2026-10-08T10:00:00Z","region":"%s","source":"aws.s3","detail-type":"AWS API Call via CloudTrail","resources":[],"detail":{"eventSource":"s3.amazonaws.com","eventName":"%s","requestParameters":{"bucketName":"%s"}}}' "$ACCOUNT" "$REGION" "$1" "$2"; }
SELF=0
check() { # $1 Aktion, $2 Bucket, $3 erwartet (True/False)
  local got; got="$(aws events test-event-pattern --region "$REGION" --event-pattern "file://$TMP/pattern.json" --event "$(sample "$1" "$2")" --query Result --output text 2>&1)"
  case "$got" in
    True|False) if [[ "$got" == "$3" ]]; then [[ "$got" == "True" ]] && echo "   OK     $1 an $2 -> meldet" || echo "   OK     $1 an $2 -> meldet nicht"; else echo "   FEHLER $1 an $2 -> Muster liefert $got (erwartet $3)"; SELF=1; fi;;
    *) echo "   --     $1 an $2: nicht prüfbar (${got:0:90})"; SELF=2;;
  esac
}
check PutBucketPolicy plexora-files True; check DeleteBucketPolicy plexora-files True; check PutBucketAcl "plexora-backups-$ACCOUNT" True
check PutBucketPublicAccessBlock plexora-files True; check DeleteBucketPublicAccessBlock "plexora-backups-$ACCOUNT" True
check PutBucketPolicy "aether-os-assets-$ACCOUNT-eu-central-1-an" False; check PutObject plexora-files False; check PutBucketPolicy anderer-bucket False
echo
echo "== Ist-Zustand (nur lesend)"
rs="$(aws events describe-rule --name "$RULE" --region "$REGION" --query State --output text 2>&1)"
case "$rs" in *ResourceNotFound*) echo "   Regel: nicht vorhanden";; *AccessDenied*|*not\ authorized*) echo "   Regel: nicht prüfbar (kein events:DescribeRule)";; *) echo "   Regel: vorhanden ($rs)";; esac

[[ $SELF -eq 1 ]] && { echo "ABBRUCH: Das Muster verhält sich anders als erwartet." >&2; exit 1; }
case "$MODE" in
  --dry-run) echo; echo "(Probelauf: nichts geändert)"; exit 0;;
  --apply)
    echo; echo "== Anlegen"
    aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" --region "$REGION" --query 'Attributes.Policy' --output text > "$TMP/policy.cur" 2>/dev/null || true
    python3 - "$TMP/policy.cur" "$TMP/statement.json" "$TMP/policy.new" <<'PY'
import json,sys
try: pol=json.load(open(sys.argv[1]))
except Exception: pol={"Version":"2012-10-17","Statement":[]}
st=json.load(open(sys.argv[2])); pol["Statement"]=[s for s in pol.get("Statement",[]) if s.get("Sid")!=st["Sid"]]+[st]
json.dump(pol,open(sys.argv[3],"w"))
PY
    aws sns set-topic-attributes --topic-arn "$TOPIC_ARN" --region "$REGION" --attribute-name Policy --attribute-value "file://$TMP/policy.new" || exit 1
    aws events put-rule --name "$RULE" --region "$REGION" --event-pattern "file://$TMP/pattern.json" --state ENABLED --description "Änderungen an Policy/Block Public Access/ACL der plexora-Buckets an plexora-alerts" --query RuleArn --output text || exit 1
    aws events put-targets --rule "$RULE" --region "$REGION" --targets "file://$TMP/targets.json" || exit 1
    echo "Fertig. Rückweg: $0 --remove"
    echo "Test: siehe Ablauf in docs/aws/cloudshell-ablauf-warnungen.md (ein harmloses Tag oder eine Beschreibung ändern löst KEINE Meldung aus; nur Policy/ACL/Block Public Access).";;
  --remove)
    aws events remove-targets --rule "$RULE" --region "$REGION" --ids sns; aws events delete-rule --name "$RULE" --region "$REGION"
    echo "Entfernt (die Berechtigung am Thema bleibt als harmlose Zeile stehen; sie gilt nur für die gelöschte Regel).";;
  *) echo "Aufruf: $0 --dry-run | --apply | --remove" >&2; exit 2;;
esac
