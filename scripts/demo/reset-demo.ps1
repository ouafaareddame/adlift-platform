<#
  Réinitialise les données de démonstration d'Adlift.

  - Efface tout sauf le compte direction (SUPER_ADMIN) et son tenant plateforme.
  - Crée 4 espaces clients via l'API (mots de passe hachés par auth-service).
  - Insère campagnes, historique de métriques et notifications (dates relatives au jour même).

  Usage (depuis la racine du projet, stack Docker démarrée) :
    powershell -ExecutionPolicy Bypass -File scripts\demo\reset-demo.ps1
    powershell -ExecutionPolicy Bypass -File scripts\demo\reset-demo.ps1 -Recipient "moi@gmail.com"
#>
param(
  [string]$Recipient = "oufaa.reddame@gmail.com",
  [string]$DirectionEmail = "direction@adlift.ma",
  [string]$DirectionPassword = "Adlift@2026",
  [string]$DemoPassword = "Demo@2026",
  [string]$Gateway = "http://127.0.0.1:8080"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Api($method, $path, $body = $null, $token = $null) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$Gateway$path"; Headers = $headers; ContentType = "application/json; charset=utf-8" }
  if ($null -ne $body) { $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 5)) }
  try {
    return Invoke-RestMethod @params
  } catch {
    $detail = ""
    $resp = $_.Exception.Response
    if ($resp) { $detail = (New-Object System.IO.StreamReader($resp.GetResponseStream())).ReadToEnd() }
    throw "$method $path a échoué : $($_.Exception.Message) $detail"
  }
}

function Psql($container, $user, $db, $file, [string[]]$vars = @()) {
  docker cp (Join-Path $here $file) "${container}:/tmp/$file" | Out-Null
  $cmd = @("exec", $container, "psql", "-q", "-U", $user, "-d", $db, "-v", "ON_ERROR_STOP=1")
  foreach ($v in $vars) { $cmd += @("-v", $v) }
  $cmd += @("-f", "/tmp/$file")
  & docker @cmd
  if ($LASTEXITCODE -ne 0) { throw "psql $file sur $container a échoué" }
}

function PsqlQuery($container, $user, $db, $sql) {
  $out = & docker exec $container psql -At -F "|" -U $user -d $db -c $sql
  if ($LASTEXITCODE -ne 0) { throw "Requête échouée sur $container" }
  return $out
}

Write-Host "1/5 Nettoyage des trois bases..." -ForegroundColor Cyan
Psql "auth-db" "auth_user" "auth_db" "wipe.sql" @("db=auth")
Psql "campaign-db" "campaign_user" "campaign_db" "wipe.sql" @("db=campaign")
Psql "notification-db" "notification_user" "notification_db" "wipe.sql" @("db=notification")

Write-Host "2/5 Création des espaces clients via l'API..." -ForegroundColor Cyan
$direction = Api POST "/api/auth/login" @{ email = $DirectionEmail; password = $DirectionPassword }

$clients = @(
  @{ key = "atlas";  name = "Atlas Voyages";           email = "contact@atlasvoyages.ma"; admin = "karim@atlasvoyages.ma";
     members = @(@{ email = "salma@atlasvoyages.ma"; role = "AGENCY_ADMIN" }, @{ email = "direction@atlasvoyages.ma"; role = "CLIENT" }) },
  @{ key = "zitoun"; name = "Dar Zitoun Cosmétiques";  email = "contact@darzitoun.ma";    admin = "nadia@darzitoun.ma";
     members = @(@{ email = "client@darzitoun.ma"; role = "CLIENT" }) },
  @{ key = "casa";   name = "Casa Immo Conseil";       email = "contact@casaimmo.ma";     admin = "youssef@casaimmo.ma";
     members = @(@{ email = "client@casaimmo.ma"; role = "CLIENT" }) },
  @{ key = "riad";   name = "Riad Menara Marrakech";   email = "contact@riadmenara.ma";   admin = "hicham@riadmenara.ma";
     members = @() }
)

$ids = @{}
foreach ($c in $clients) {
  $tenant = Api POST "/api/tenants" @{ name = $c.name; email = $c.email; adminEmail = $c.admin; adminPassword = $DemoPassword } $direction.accessToken
  $ids[$c.key] = $tenant.id
  $admin = Api POST "/api/auth/login" @{ email = $c.admin; password = $DemoPassword }
  $ids["$($c.key)_admin"] = $admin.user.id
  foreach ($m in $c.members) {
    Api POST "/api/members/invite" @{ email = $m.email; password = $DemoPassword; role = $m.role } $admin.accessToken | Out-Null
  }
  Write-Host "   $($c.name) : $($c.admin)"
}

# Comptes de démo utilisables directement ; le changement forcé se montre en créant un client en direct.
PsqlQuery "auth-db" "auth_user" "auth_db" "UPDATE users SET must_change_password = false WHERE role <> 'SUPER_ADMIN'" | Out-Null
Api PATCH "/api/tenants/$($ids.riad)/deactivate" $null $direction.accessToken | Out-Null

Write-Host "3/5 Campagnes et historique de métriques..." -ForegroundColor Cyan
$vars = @()
foreach ($k in $ids.Keys) { $vars += "$k=$($ids[$k])" }
Psql "campaign-db" "campaign_user" "campaign_db" "seed-campaigns.sql" ($vars + @("demo_recipient=$Recipient"))

Write-Host "4/5 Notifications..." -ForegroundColor Cyan
Psql "notification-db" "notification_user" "notification_db" "seed-notifications.sql" $vars

Write-Host "5/5 Vérification..." -ForegroundColor Cyan
$overview = Api GET "/api/campaigns/overview" $null $direction.accessToken
Write-Host "   Vue direction : $($overview.tenants.Count) espace(s) avec campagnes"

Write-Host ""
Write-Host "Données de démo prêtes. Mot de passe de tous les comptes clients : $DemoPassword" -ForegroundColor Green
Write-Host "   Direction      : $DirectionEmail / $DirectionPassword"
foreach ($c in $clients) { Write-Host ("   {0,-24} admin {1}" -f $c.name, $c.admin) }
Write-Host "   Email de démo  : destinataire $Recipient (campagne 'Newsletter clients fidèles', à passer en Active puis envoyer)"
