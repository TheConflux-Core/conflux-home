; ─────────────────────────────────────────────────────────────────────────────
; Conflux Home — Custom NSIS Installer Template
; Downloads models from R2 during install so they're ready on first launch.
; Too large to bundle (3GB+ total).
; ─────────────────────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "FileFunc.nsh"

; ── Version from Tauri (injected at build time) ─────────────────────────────
!define VERSION "0.1.103"

; ── Installer Settings ───────────────────────────────────────────────────────
Name "Conflux Home"
OutFile "Conflux.Home_x64-setup.exe"
InstallDir "$LOCALAPPDATA\Conflux Home"
InstallDirRegKey HKCU "Software\ConfluxHome" "InstallDir"
RequestExecutionLevel user
BrandingText "Conflux Home Setup"

; ── Modern UI ────────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\win.bmp"

; ── Pages ────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY

; Custom download page using NSISdl (built-in)
!insertmacro MUI_PAGE_INSTFILES

!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Pre-download hook (runs before MUI_PAGE_INSTFILES) ────────────────────────
Function .onInit
    ; Show a message about model download
    MessageBox MB_YESNO|MB_ICONINFO \
        "Conflux Home will download AI models (~3.2 GB total) during installation.\n\n\
        This requires an internet connection and may take several minutes.\n\n\
        Continue installation?" \
        IDYES skip_cancel
    Abort
    skip_cancel:
FunctionEnd

; ── Install Section ──────────────────────────────────────────────────────────
Section "Install" SecMain
    SetOutPath "$INSTDIR"

    ; ── Copy all bundled resources (llama-server, DLLs, etc.) ──────────────
    ; The binaries/ directory is bundled by Tauri
    File /r "binaries\*.*"

    ; ── Create models directory ─────────────────────────────────────────────
    CreateDirectory "$INSTDIR\models"

    ; ── Download gemma-3n-e2b-q4km.gguf (~2.9 GB) ────────────────────────────
    DetailPrint "Downloading AI model (gemma-3n-e2b-q4km.gguf, ~2.9 GB)..."
    NSISdl::download \
        "https://pub-23603fff461c41af90f9cdbbbac2b5de.r2.dev/gemma-3n-e2b-q4km.gguf" \
        "$INSTDIR\models\gemma-3n-e2b-q4km.gguf"
    Pop $0
    ${If} $0 != "success"
        DetailPrint "WARNING: Primary model download returned: $0"
        DetailPrint "App will download model on first launch instead."
    ${Else}
        DetailPrint "Primary model downloaded successfully."
    ${EndIf}

    ; ── Download conflux-toolrouter-q4-v2.gguf (249 MB) ──────────────────────
    DetailPrint "Downloading tool router (conflux-toolrouter-q4-v2.gguf, ~249 MB)..."
    NSISdl::download \
        "https://pub-23603fff461c41af90f9cdbbbac2b5de.r2.dev/conflux-toolrouter-q4-v2.gguf" \
        "$INSTDIR\models\conflux-toolrouter-q4-v2.gguf"
    Pop $0
    ${If} $0 != "success"
        DetailPrint "WARNING: Tool router download returned: $0"
        DetailPrint "App will download tool router on first launch instead."
    ${Else}
        DetailPrint "Tool router downloaded successfully."
    ${EndIf}

    ; ── Write registry ───────────────────────────────────────────────────────
    WriteRegStr HKCU "Software\ConfluxHome" "InstallDir" "$INSTDIR"

    ; ── Write uninstaller ───────────────────────────────────────────────────
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; ── Add/Remove Programs entry ────────────────────────────────────────────
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "DisplayName" "Conflux Home"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "DisplayIcon" "$INSTDIR\Conflux Home.exe"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "Publisher" "The Conflux"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "DisplayVersion" "${VERSION}"
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "NoModify" 1
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome" \
        "NoRepair" 1

    ; ── Copy main executable ─────────────────────────────────────────────────
    File "Conflux Home.exe"

SectionEnd

; ── Uninstaller ──────────────────────────────────────────────────────────────
Section "Uninstall"
    ; Remove app dir (includes models)
    RMDir /r "$INSTDIR"

    ; Remove registry entries
    DeleteRegKey HKCU "Software\ConfluxHome"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome"

    ; Remove Start Menu shortcuts
    Delete "$SMPROGRAMS\Conflux Home.lnk"
    Delete "$SMPROGRAMS\Uninstall Conflux Home.lnk"
SectionEnd

; ── Callbacks ────────────────────────────────────────────────────────────────
Function .onInstFailed
    ; If install fails, log — the app will handle model download on next launch
    DetailPrint "Installation ended before model download completed."
FunctionEnd