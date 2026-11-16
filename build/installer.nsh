!macro customCheckAppRunning
  InitPluginsDir
  File /oname=$PLUGINSDIR\task-reminder-upgrade.ps1 "${BUILD_RESOURCES_DIR}\prepare-upgrade.ps1"
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\task-reminder-upgrade.ps1" -CheckOnly'
  Pop $0
  ${if} $0 == 10
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "Task Reminder is running, possibly from an older portable folder. Click OK to close it and install the new version. Your reminders will be backed up and kept." /SD IDCANCEL IDOK tr_upgrade_continue
    Abort
    tr_upgrade_continue:
  ${elseIf} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "Cannot check running Task Reminder processes. Close all Task Reminder copies before retrying setup." /SD IDOK
    Abort
  ${endif}
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\task-reminder-upgrade.ps1"'
  Pop $0
  ${if} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "Cannot close the old Task Reminder safely. Setup has stopped; your data is kept." /SD IDOK
    Abort
  ${endif}
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    InitPluginsDir
    File /oname=$PLUGINSDIR\task-reminder-cleanup.ps1 "${BUILD_RESOURCES_DIR}\uninstall.ps1"
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\task-reminder-cleanup.ps1"'
    Pop $0
    DetailPrint "Reminder schedule cleanup result: $0"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Task Reminder"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "task-reminder"
  ${endif}
!macroend
