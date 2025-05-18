#define MyAppName "Gantt Chart Tool"
#define MyAppVersion "0.3.1"
#define MyAppPublisher "Gantt Chart Tool Team"
#define MyAppURL "https://github.com/yourusername/GanttChartTool"
#define MyAppExeName "Gantt Chart Tool.exe"
#define MyAppIcoName "build\icon.ico"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
AppId={{6A8C9B85-29C8-4D32-B45A-A2A5A2F7C0B1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=GanttChartTool-Setup-v{#MyAppVersion}
SetupIconFile={#MyAppIcoName}
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

; Automatically uninstall previous versions
UninstallDisplayIcon={app}\{#MyAppExeName}
AppMutex=GanttChartToolApplicationMutex
CloseApplications=yes
CloseApplicationsFilter=*.exe;*.dll
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "release-builds\Gantt Chart Tool-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var
  UninstallPath: String;
  UninstallerPath: String;
  ResultCode: Integer;
begin
  // Initialize result
  Result := True;

  // Check if previous version exists
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1', 'UninstallString', UninstallPath) then
  begin
    // Extract the path of the uninstaller
    UninstallerPath := RemoveQuotes(UninstallPath);
    
    // If we found the uninstaller, prompt the user to uninstall the existing version
    if FileExists(UninstallerPath) then
    begin
      if MsgBox('A previous version of {#MyAppName} was detected. It is recommended to uninstall it before installing this version. Do you want to uninstall the previous version now?', mbConfirmation, MB_YESNO) = IDYES then
      begin
        // Run the uninstaller silently and wait for it to finish
        if Exec(UninstallerPath, '/SILENT /NORESTART', '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
        begin
          // Uninstaller executed successfully, continue with setup
          Result := True;
        end
        else
        begin
          // Failed to execute the uninstaller
          MsgBox('Failed to uninstall the previous version. Setup will continue, but you may experience issues.', mbError, MB_OK);
          Result := True; // Continue anyway
        end;
      end
      else
      begin
        // User chose not to uninstall
        if MsgBox('Continuing without uninstalling the previous version may cause issues. Are you sure you want to continue?', mbConfirmation, MB_YESNO) = IDNO then
        begin
          // User chose not to continue
          Result := False;
        end;
      end;
    end;
  end;

  // Return whether to continue with setup
  Result := True;
end;
