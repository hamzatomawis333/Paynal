# Backs up the MySQL database to a timestamped .sql file and keeps only the
# newest $Keep backups. XAMPP's default root account has no password; pass
# -MysqlPassword if yours does.
#
# Run manually:   powershell -File scripts\backup-db.ps1
# Schedule daily: schtasks /create /tn "Paynal DB Backup" /sc daily /st 02:00 ^
#                 /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\xampp\htdocs\Paynal-main\scripts\backup-db.ps1"
param(
    [string]$MysqlDir = "C:\xampp\mysql\bin",
    [string]$Database = "maranao_treasures_db",
    [string]$OutDir = (Join-Path $PSScriptRoot "..\backups"),
    [string]$MysqlPassword = "",
    [int]$Keep = 14
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MysqlDir)) {
    Write-Error "mysql bin dir not found: $MysqlDir (pass -MysqlDir if XAMPP is elsewhere)"
}
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutDir "$Database-$stamp.sql"

$mysqldump = Join-Path $MysqlDir "mysqldump.exe"
$args = @("--default-character-set=utf8mb4", "-u", "root")
if ($MysqlPassword -ne "") { $args += "-p$MysqlPassword" }
$args += $Database

# mysqldump writes to stdout; capture as raw bytes so the file is a valid
# dump (Out-File would re-encode and can corrupt binary/blob columns).
$proc = Start-Process -FilePath $mysqldump -ArgumentList $args `
    -RedirectStandardOutput $file -RedirectStandardError "$env:TEMP\paynal-backup-err.txt" `
    -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -ne 0) {
    $err = if (Test-Path "$env:TEMP\paynal-backup-err.txt") { Get-Content "$env:TEMP\paynal-backup-err.txt" -Raw } else { "" }
    if (Test-Path $file) { Remove-Item $file -Force }
    Write-Error "mysqldump failed (exit $($proc.ExitCode)): $err"
}

$size = (Get-Item $file).Length
Write-Host "Backup written: $file ($([math]::Round($size / 1KB, 1)) KB)"

# Retention: keep only the newest $Keep dumps for this database.
$old = Get-ChildItem -Path $OutDir -Filter "$Database-*.sql" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep
foreach ($f in $old) {
    Remove-Item $f.FullName -Force
    Write-Host "Pruned old backup: $($f.Name)"
}
Write-Host "Done. $(@(Get-ChildItem -Path $OutDir -Filter "$Database-*.sql").Count) backup(s) in $OutDir."
