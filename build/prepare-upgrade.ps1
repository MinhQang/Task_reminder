param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
# Old portable builds may live outside INSTDIR. Restrict detection to this session.
$session = (Get-Process -Id $PID).SessionId
$running = @(Get-Process -Name 'Task Reminder' -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $session })
if ($CheckOnly) { if ($running.Count) { exit 10 }; exit 0 }
$dataFile = [IO.Path]::Combine([Environment]::GetFolderPath('ApplicationData'), 'task-reminder', 'reminders.json')
if (Test-Path -LiteralPath $dataFile) { Copy-Item -LiteralPath $dataFile -Destination ($dataFile + '.pre-upgrade.bak') -Force }
foreach ($process in $running) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
if ($running.Count) { Start-Sleep -Milliseconds 300 }
if (@(Get-Process -Name 'Task Reminder' -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $session }).Count) { throw 'Task Reminder is still running.' }
# Remove obsolete portable startup paths. The installed app registers its new path on launch.
$run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
foreach ($name in @('Task Reminder', 'task-reminder')) { Remove-ItemProperty -LiteralPath $run -Name $name -ErrorAction SilentlyContinue }
$sha = [Security.Cryptography.SHA256]::Create()
try { $hash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($dataFile.ToLowerInvariant())) | ForEach-Object { $_.ToString('x2') }) } finally { $sha.Dispose() }
$name = 'TaskReminder-' + $hash.Substring(0, 12)
$task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
if ($task) { Unregister-ScheduledTask -TaskName $name -Confirm:$false }
exit 0
