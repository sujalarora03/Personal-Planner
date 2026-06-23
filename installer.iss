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
#define AppVersion   "0.8.13"
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
; Launch the app after install (interactive setup)
Filename: "{app}\{#AppExeName}"; \
  Description: "Launch {#AppName}"; \
  Flags: nowait postinstall skipifsilent

; Launch the app after install (silent auto-update setup)
Filename: "{app}\{#AppExeName}"; \
  Flags: nowait; \
  Check: WizardSilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

; ── Pascal code: download and deploy local AI GGUF model ──────────
[Code]
var
  DownloadPage: TDownloadWizardPage;
  DeletePersonalData: Boolean;
  DeleteModelData: Boolean;

procedure InitializeWizard;
begin
  DownloadPage := CreateDownloadPage(SetupMessage(msgWizardPreparing), SetupMessage(msgPreparingDesc), nil);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';
  // Forcefully close any running instance of the app to release file locks
  Exec('taskkill.exe', '/f /im PersonalPlanner.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = wpReady) and WizardIsTaskSelected('download_model') and not WizardSilent then begin
    // If the model file is already present, skip downloading it again
    if FileExists(ExpandConstant('{userappdata}\PersonalPlanner\models\qwen2.5-3b-instruct-q4_k_m.gguf')) then begin
      Exit;
    end;

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
  if not WizardIsTaskSelected('download_model') then Exit;

  SrcPath := ExpandConstant('{tmp}\qwen2.5-3b-instruct-q4_k_m.gguf');
  DestDir := ExpandConstant('{userappdata}\PersonalPlanner\models');
  
  if ForceDirectories(DestDir) then begin
    DestPath := DestDir + '\qwen2.5-3b-instruct-q4_k_m.gguf';
    if FileExists(SrcPath) then begin
      CopyFile(SrcPath, DestPath, False);
    end;
  end;
end;

function InitializeUninstall: Boolean;
var
  ResultCode: Integer;
begin
  // Forcefully close any running instance of the app at start of uninstall to release locks
  Exec('taskkill.exe', '/f /im PersonalPlanner.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;

procedure InitializeUninstallProgressForm;
var
  Form: TSetupForm;
  PromptLabel: TLabel;
  DataCheck, ModelCheck: TNewCheckBox;
  OKButton: TNewButton;
begin
  if UninstallSilent then begin
    DeletePersonalData := False;
    DeleteModelData := False;
    Exit;
  end;

  // Set defaults for interactive uninstall
  DeletePersonalData := True;
  DeleteModelData := False;

  // Move the standard progress form off-screen temporarily
  UninstallProgressForm.Left := -1000;
  UninstallProgressForm.Top := -1000;

  Form := CreateCustomForm(ScaleX(420), ScaleY(180), False, False);
  Form.Caption := 'Uninstall Options';
  Form.Position := poScreenCenter;
  
  PromptLabel := TLabel.Create(Form);
  PromptLabel.Parent := Form;
  PromptLabel.Left := ScaleX(16);
  PromptLabel.Top := ScaleY(16);
  PromptLabel.Width := ScaleX(388);
  PromptLabel.Height := ScaleY(40);
  PromptLabel.AutoSize := False;
  PromptLabel.WordWrap := True;
  PromptLabel.Caption := 'Select additional components to remove from your system:';
  PromptLabel.Font.Style := [fsBold];

  DataCheck := TNewCheckBox.Create(Form);
  DataCheck.Parent := Form;
  DataCheck.Left := ScaleX(16);
  DataCheck.Top := ScaleY(60);
  DataCheck.Width := ScaleX(388);
  DataCheck.Caption := 'Delete all personal planner data (tasks, goals, work sessions, settings)';
  DataCheck.Checked := True;

  ModelCheck := TNewCheckBox.Create(Form);
  ModelCheck.Parent := Form;
  ModelCheck.Left := ScaleX(16);
  ModelCheck.Top := ScaleY(85);
  ModelCheck.Width := ScaleX(388);
  ModelCheck.Caption := 'Delete the offline local AI LLM model (~2.0 GB)';
  ModelCheck.Checked := False;

  OKButton := TNewButton.Create(Form);
  OKButton.Parent := Form;
  OKButton.Left := ScaleX(325);
  OKButton.Top := ScaleY(125);
  OKButton.Width := ScaleX(75);
  OKButton.Height := ScaleY(25);
  OKButton.Caption := '&Continue';
  OKButton.ModalResult := mrYes;
  OKButton.Default := True;

  Form.ActiveControl := OKButton;

  // Show the form modal (blocks uninstaller thread until clicked)
  Form.ShowModal;

  // Retrieve checkbox states
  DeletePersonalData := DataCheck.Checked;
  DeleteModelData := ModelCheck.Checked;

  // Restore progress form position
  UninstallProgressForm.Left := Form.Left;
  UninstallProgressForm.Top := Form.Top;
  UninstallProgressForm.Visible := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir, ModelDir: string;
begin
  if CurUninstallStep = usPostUninstall then begin
    DataDir := ExpandConstant('{userappdata}\PersonalPlanner');
    ModelDir := DataDir + '\models';

    // Delete LLM model if checked
    if DeleteModelData then begin
      DelTree(ModelDir, True, True, True);
    end;

    // Delete personal data if checked
    if DeletePersonalData then begin
      if DeleteModelData then begin
        // If both checked, delete the entire directory
        DelTree(DataDir, True, True, True);
      end else begin
        // If only personal data checked, delete files but leave models folder
        DeleteFile(DataDir + '\planner.db');
        DeleteFile(DataDir + '\planner.log');
        DelTree(DataDir + '\backups', True, True, True);
      end;
    end;
  end;
end;
