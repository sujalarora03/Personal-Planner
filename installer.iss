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
#define AppVersion   "0.7.0"
#define AppPublisher "Sujal Arora"
#define AppURL       "https://github.com/sujalarora03/Personal-Planner"
#define AppExeName   "PersonalPlanner.exe"

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
WizardSmallImageFile=icon.ico

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

; ── Ollama (local AI engine) ──────────────────────────────────────
Name: "install_ollama"; \
  Description: "Install &Ollama (local AI engine — powers AI chat, quotes, Relax tab)"; \
  GroupDescription: "AI Features (Optional — requires internet):"; \
  Flags: unchecked

Name: "install_ollama\model_llama32"; \
  Description: "Download llama3.2 model  (~2.0 GB)  Recommended — fast & capable"; \
  GroupDescription: "AI Models to download:"; \
  Flags: unchecked

Name: "install_ollama\model_mistral"; \
  Description: "Download mistral model   (~4.1 GB)  Larger, more detailed responses"; \
  GroupDescription: "AI Models to download:"; \
  Flags: unchecked

Name: "install_ollama\model_phi3"; \
  Description: "Download phi3 model      (~2.3 GB)  Lightweight alternative"; \
  GroupDescription: "AI Models to download:"; \
  Flags: unchecked

[Files]
; Bundle everything from the PyInstaller output folder
Source: "dist\PersonalPlanner\*"; \
  DestDir: "{app}"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

; Model setup script (copied to app dir so users can re-run it later)
Source: "setup_models.ps1"; \
  DestDir: "{app}"; \
  Flags: ignoreversion; \
  Tasks: install_ollama

; Ollama installer — bundled so no internet needed for the engine itself
Source: "OllamaSetup.exe"; \
  DestDir: "{tmp}"; \
  Flags: deleteafterinstall; \
  Tasks: install_ollama

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
; Install Ollama silently (only if task selected)
Filename: "{tmp}\OllamaSetup.exe"; \
  Parameters: "/S"; \
  Description: "Installing Ollama AI engine..."; \
  StatusMsg: "Installing Ollama AI engine (this takes ~30 seconds)..."; \
  Tasks: install_ollama; \
  Flags: waituntilterminated

; Launch the app after install
Filename: "{app}\{#AppExeName}"; \
  Description: "Launch {#AppName}"; \
  Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: dirifempty; Name: "{app}"

; ── Pascal code: pull selected AI models after install ────────────
[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  Models, PSArgs, ScriptPath: string;
  ResultCode: Integer;
begin
  if CurStep <> ssPostInstall then Exit;
  if not IsTaskSelected('install_ollama') then Exit;

  Models := '';
  if IsTaskSelected('install_ollama\model_llama32') then begin
    if Models <> '' then Models := Models + ',';
    Models := Models + 'llama3.2';
  end;
  if IsTaskSelected('install_ollama\model_mistral') then begin
    if Models <> '' then Models := Models + ',';
    Models := Models + 'mistral';
  end;
  if IsTaskSelected('install_ollama\model_phi3') then begin
    if Models <> '' then Models := Models + ',';
    Models := Models + 'phi3';
  end;

  if Models = '' then Exit;

  ScriptPath := ExpandConstant('{app}\setup_models.ps1');
  PSArgs := '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath +
            '" -ModelList "' + Models + '"';

  // Show a visible console so user sees download progress
  Exec('powershell.exe', PSArgs, '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
end;
