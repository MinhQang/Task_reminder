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
