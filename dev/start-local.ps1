# Starts the backend against the local Docker MySQL (see dev/local_schema.sql).
# These variables override .env: dotenv never replaces values already set in the environment.
#
# One-time DB setup:
#   docker run -d --name quora-mysql -e MYSQL_ROOT_PASSWORD=quora_local_root `
#     -e MYSQL_DATABASE=tutorial_management_system -e MYSQL_USER=quora -e MYSQL_PASSWORD=quora_local `
#     -p 3306:3306 mysql:8.0 --character-set-server=utf8mb4
#   Get-Content dev/local_schema.sql, dev/local_seed.sql | docker exec -i quora-mysql mysql -uquora -pquora_local tutorial_management_system

$env:APP_MODE = "dev"
$env:DB_HOST = "127.0.0.1"
$env:DB_USER_DEV = "quora"
$env:DB_USER_PASS_DEV = "quora_local"
$env:DB_NAME_DEV = "tutorial_management_system"
$env:VITE_PUBLIC_URL = "http://localhost:5173"   # links in verification/reset emails
$env:SMTP_HOST = ""                              # emails are printed to this console

Set-Location (Join-Path $PSScriptRoot "..")
node server.js
