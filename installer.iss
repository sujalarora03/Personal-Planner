; ============================================================
; Personal Planner — Inno Setup 6 installer script
; https://github.com/sujalarora03/Personal-Planner
;
; To build:
;   1. Run build_installer.bat  (recommended)
;   OR
;   2. Open this file in Inno Setup Compiler and press Compile
; ============================================================

#define AppName      "Personal Planner"
#define AppVersion   "0.8.8"
#define AppPublisher "Sujal Arora"
#define AppURL       "https://github.com/sujalarora03/Personal-Planner"
#define AppExeName   "PersonalPlanner.exe"
#define AppCopyright "Copyright (C) 2024-2026 Sujal Arora"

[Setup]
AppId={{A3F8C2D1-7E4B-4A5C-B6D7-E8F9A0B1C234}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} v{#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/issues
AppUpdatesURL={#AppURL}/releases

; Install per-user by default (no UAC prompt needed)
DefaultDirName={localappdata}\{#AppName}
DefaultGroupName={#AppName}
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=PersonalPlannerSetup_v{#AppVersion}
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

; ── Windows VERSIONINFO (shown in File Properties → Details) ────────
; These fields help Windows SmartScreen and AV engines trust the installer.
VersionInfoVersion={#AppVersion}.0
VersionInfoCompany={#AppPublisher}
VersionInfoDescription={#AppName} Setup
VersionInfoTextVersion={#AppVersion} BETA
VersionInfoCopyright={#AppCopyright}
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}.0

; Show a "What's New" link after install
InfoAfterFile=

UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} v{#AppVersion}
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; \
  Description: "Create a &desktop shortcut"; \
  GroupDescription: "Additional icons:"

Name: "startuprun"; \
  Description: "Start Personal Planner automatically when Windows starts"; \
  GroupDescription: "Startup:"; \
  Flags: unchecked

; ── Local AI Model ───────────────────────────────────────────────
Name: "download_model"; \
  Description: "Download Qwen 2.5 3B local AI model (~2.0 GB — powers AI chat, quotes, Relax tab)"; \
  GroupDescription: "AI Features (Optional — requires internet):"

[Files]
; Bundle everything from the PyInstaller output folder
Source: "dist\PersonalPlanner\*"; \
  DestDir: "{app}"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}";          Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppName}";   Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Registry]
; Optional auto-start entry
Root: HKCU; \
  Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; \
  ValueName: "{#AppName}"; \
  ValueData: """{app}\{#AppExeName}"""; \
  Flags: uninsdeletevalue; \
  Tasks: startuprun

[Run]
; Launch the app after install
Filename: "{app}\{#AppExeName}"; \
  Description: "Launch {#AppName}"; \
  Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: dirifempty; Name: "{app}"

; ── Pascal code: download and deploy local AI GGUF model ──────────
[Code]
var
  DownloadPage: TDownloadWizardPage;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(SetupMessage(msgWizardPreparing), SetupMessage(msgPreparingDesc), nil);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = wpReady) and IsTaskSelected('download_model') then begin
    DownloadPage.Clear;
    DownloadPage.Add('https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf', 'qwen2.5-3b-instruct-q4_k_m.gguf', '');
    DownloadPage.Show;
    try
      try
        DownloadPage.Download;
      except
        SuppressibleMsgBox(AddPeriod(GetExceptionMessage), mbCriticalError, MB_OK, IDOK);
        Result := False;
      end;
    finally
      DownloadPage.Hide;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  SrcPath, DestDir, DestPath: string;
begin
  if CurStep <> ssPostInstall then Exit;
  if not IsTaskSelected('download_model') then Exit;

  SrcPath := ExpandConstant('{tmp}\qwen2.5-3b-instruct-q4_k_m.gguf');
  DestDir := ExpandConstant('{userappdata}\PersonalPlanner\models');
  
  if ForceDirectories(DestDir) then begin
    DestPath := DestDir + '\qwen2.5-3b-instruct-q4_k_m.gguf';
    if FileExists(SrcPath) then begin
      FileCopy(SrcPath, DestPath, False);
    end;
  end;
end;
