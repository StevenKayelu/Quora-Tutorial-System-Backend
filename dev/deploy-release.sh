#!/usr/bin/env bash
# Deploys the October 2026 release on the live server, in a safe order:
#   check pm2 -> back up the database -> pull the code -> migrations 003-006
#   -> verify the database -> npm install -> restart -> health check
# Stops at the first problem. Run on the server as root:
#   bash dev/deploy-release.sh
set -euo pipefail
umask 077   # backup and credentials file readable by root only

APP_DIR="${APP_DIR:-/var/www/Quora-Tutorial-System-Backend}"
PM2_NAME="${PM2_NAME:-quora-backend}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/root/backup_quora_${STAMP}.sql"
CNF="$(mktemp /root/.quora-deploy-XXXXXX.cnf)"
trap 'rm -f "$CNF"' EXIT

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mSTOPPED: %s\033[0m\n' "$*"; exit 1; }

cd "$APP_DIR" || fail "app folder $APP_DIR not found"

# ---------------------------------------------------------------------
step "1/8 Checking pm2"
command -v pm2 >/dev/null || fail "pm2 is not installed"
pm2 describe "$PM2_NAME" >/dev/null 2>&1 || fail "pm2 app '$PM2_NAME' not found"
WATCH=$(pm2 jlist | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    // pm2 can print warnings before the JSON list
    const app = JSON.parse(s.slice(s.indexOf("["))).find((p) => p.name === process.argv[1]);
    console.log(app && app.pm2_env.watch ? "yes" : "no");
  });' "$PM2_NAME")
[ "$WATCH" = "no" ] || fail "pm2 restarts on file changes, so the new code would start before the migrations. Tell Claude."
echo "pm2 app '$PM2_NAME' found, not watching files"

# ---------------------------------------------------------------------
step "2/8 Reading database settings from .env"
envget() { { grep -E "^$1=" .env || true; } | tail -n1 | cut -d= -f2- | tr -d '\r' | sed -E "s/^[\"']//; s/[\"']\$//"; }
if [ "$(envget APP_MODE)" = "prod" ]; then
  DB_USER=$(envget DB_USER_LIVE); DB_PASS=$(envget DB_USER_PASS_LIVE); DB_NAME=$(envget DB_NAME_LIVE)
else
  DB_USER=$(envget DB_USER_DEV); DB_PASS=$(envget DB_USER_PASS_DEV); DB_NAME=$(envget DB_NAME_DEV)
fi
DB_HOST=$(envget DB_HOST); DB_HOST=${DB_HOST:-localhost}
[ -n "$DB_USER" ] && [ -n "$DB_NAME" ] || fail "database user or name missing in .env"

# Credentials go in a private temp file (deleted on exit), not on the command line
PASS_ESC=${DB_PASS//\\/\\\\}; PASS_ESC=${PASS_ESC//\"/\\\"}
printf '[client]\nuser="%s"\npassword="%s"\nhost="%s"\n' "$DB_USER" "$PASS_ESC" "$DB_HOST" > "$CNF"
chmod 600 "$CNF"

q() { mysql --defaults-extra-file="$CNF" -N -B "$DB_NAME" -e "$1"; }
q "SELECT 1" >/dev/null || fail "cannot connect to database '$DB_NAME' as '$DB_USER'"
echo "Connected to '$DB_NAME' on $DB_HOST as '$DB_USER'"

# ---------------------------------------------------------------------
step "3/8 Backing up the database"
mysqldump --defaults-extra-file="$CNF" --single-transaction --routines --triggers --no-tablespaces \
  --result-file="$BACKUP" "$DB_NAME" || fail "backup failed"
grep -q 'CREATE TABLE `user`' "$BACKUP" || fail "backup file looks incomplete: $BACKUP"
ls -lh "$BACKUP"

# ---------------------------------------------------------------------
step "4/8 Updating the code from GitHub"
PREV_COMMIT=$(git rev-parse --short HEAD)
git diff > "/root/server_changes_${STAMP}.diff" || true
for f in $(git status --porcelain --untracked-files=no | awk '{print $2}'); do
  case "$f" in
    controllers/api/UserCourseController.js|package-lock.json) git checkout -- "$f" ;;
    *) fail "unexpected edit on the server in $f (saved to /root/server_changes_${STAMP}.diff). Tell Claude." ;;
  esac
done
git pull --ff-only origin main || fail "git pull failed"
for m in 003_school_and_study_year 004_notifications 005_course_school_sharing 006_align_live_schema; do
  [ -f "migrations/$m.sql" ] || fail "migrations/$m.sql missing after pull"
done
echo "Code updated: $PREV_COMMIT -> $(git rev-parse --short HEAD)"

# ---------------------------------------------------------------------
step "5/8 Running database migrations"
run() {
  echo "-- $1"
  mysql --defaults-extra-file="$CNF" --table "$DB_NAME" < "migrations/$1.sql" \
    || fail "migration $1 failed. Backup: $BACKUP. Tell Claude."
}
HAS_SCHOOL=$(q "SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'school_id'")
if [ "$HAS_SCHOOL" = "0" ]; then run 003_school_and_study_year; else echo "-- 003 already applied, skipping"; fi
run 004_notifications
run 005_course_school_sharing
run 006_align_live_schema

# ---------------------------------------------------------------------
step "6/8 Verifying the database"
NOT_INT=$(q "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_id' AND DATA_TYPE <> 'int'
               AND TABLE_NAME IN ('user_course_subscription', 'payment_transaction')")
[ "$NOT_INT" = "0" ] || fail "user_id columns were not converted"
for t in study_year notification course_school; do
  [ "$(q "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$t'")" = "1" ] \
    || fail "table $t is missing"
done
[ "$(q "SELECT COUNT(*) FROM topic_material WHERE topic_id IS NULL")" = "0" ] || fail "some materials have no topic"
echo "OK. Subscriptions: $(q 'SELECT COUNT(*) FROM user_course_subscription'), payments: $(q 'SELECT COUNT(*) FROM payment_transaction')"

# ---------------------------------------------------------------------
step "7/8 Installing dependencies"
npm install --omit=dev --no-audit --no-fund \
  || fail "npm install failed. The database is migrated; the old app is still running. Tell Claude."

# ---------------------------------------------------------------------
step "8/8 Restarting the backend"
pm2 restart "$PM2_NAME"
sleep 6
PORT=$(envget APP_PORT); PORT=${PORT:-5010}
if command -v curl >/dev/null; then
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null; then
    echo "Health check OK on port $PORT"
  else
    pm2 logs "$PM2_NAME" --lines 40 --nostream || true
    fail "backend is not answering on port $PORT. Tell Claude."
  fi
fi
pm2 logs "$PM2_NAME" --lines 15 --nostream || true

printf '\n\033[1;32mDEPLOY COMPLETE\033[0m\n'
echo "Backup:          $BACKUP"
echo "Previous commit: $PREV_COMMIT"
echo "To roll back:    git reset --hard $PREV_COMMIT && npm install --omit=dev"
echo "                 mysql -u $DB_USER -p $DB_NAME < $BACKUP && pm2 restart $PM2_NAME"
