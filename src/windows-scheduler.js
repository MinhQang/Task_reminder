'use strict';
const { execFile } = require('node:child_process');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";

function wakePlan(state, now = new Date()) {
  if (!state.settings.notifyWhenClosed) return { enabled: false, next: null };
  const pending = new Set(state.pending.map(item => item.taskId));
  const tasks = state.tasks.filter(task => task.enabled && task.nextDue);
  const times = tasks.filter(task => !pending.has(task.id)).map(task => +new Date(task.nextDue)).filter(Number.isFinite);
  const first = times.length ? Math.min(...times) : null;
  return { enabled: tasks.length > 0, next: first === null ? null : new Date(Math.max(first, +now + 5000)).toISOString() };
}

function registrationScript({ name, executable, args = ['--background', '--scheduled-wake'], plan }) {
  // All dynamic values are PowerShell single-quoted literals; no task content enters a command.
  const lines = ["$ErrorActionPreference = 'Stop'", `$taskName = ${quote(name)}`];
  if (!plan.enabled) return lines.concat("$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue", 'if ($existing) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }').join('\n');
  const argumentString = args.map(arg => '"' + arg.replaceAll('"', '\\"') + '"').join(' ');
  lines.push(
    '$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value',
    `$action = New-ScheduledTaskAction -Execute ${quote(executable)} -Argument ${quote(argumentString)} -WorkingDirectory ${quote(path.dirname(executable))}`,
    '$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited',
    '$triggers = @(New-ScheduledTaskTrigger -AtLogOn -User $identity)',
    ...(plan.next ? [`$triggers += New-ScheduledTaskTrigger -Once -At ([DateTimeOffset]::Parse(${quote(plan.next)}).LocalDateTime)`] : []),
    '$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances Parallel',
    "Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Task Reminder: open saved reminders at their scheduled time and after sign-in.' -Force | Out-Null"
  );
  return lines.join('\n');
}

function createWindowsScheduler({ dataPath, executable, args, onStatus, runner = execute }) {
  const name = 'TaskReminder-' + createHash('sha256').update(dataPath.toLowerCase()).digest('hex').slice(0, 12);
  let queue = Promise.resolve(), lastKey, requested = 0;
  function sync(state) {
    const plan = wakePlan(state);
    const key = JSON.stringify(plan);
    const revision = ++requested;
    queue = queue.catch(() => {}).then(async () => {
      if (revision !== requested || key === lastKey) return;
      onStatus({ working: true, error: '', name, ...plan });
      try {
        const script = registrationScript({ name, executable, args, plan });
        const systemRoot = process.env.SystemRoot || 'C:\\Windows';
        await runner(path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 30000, maxBuffer: 256 * 1024 });
        lastKey = key;
        onStatus({ working: false, error: '', registered: plan.enabled, name, ...plan });
      } catch (error) {
        onStatus({ working: false, registered: false, error: String(error.stderr || error.message).trim().slice(0, 1200), name, ...plan });
      }
    });
    return queue;
  }
  return { sync, name, idle: () => queue };
}
module.exports = { wakePlan, registrationScript, createWindowsScheduler };
