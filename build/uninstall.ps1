$ErrorActionPreference = 'Stop'
# Match the per-user schedule ID used by src/windows-scheduler.js; keep reminder data.
$dataFile = [IO.Path]::Combine([Environment]::GetFolderPath('ApplicationData'), 'task-reminder', 'reminders.json').ToLowerInvariant()
$sha = [Security.Cryptography.SHA256]::Create()
try {
    $hash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($dataFile)) | ForEach-Object { $_.ToString('x2') })
} finally { $sha.Dispose() }
$taskName = 'TaskReminder-' + $hash.Substring(0, 12)
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
