; ─────────────────────────────────────────────────────────────────────────────
; Conflux Home — Custom NSIS Installer Template
; Uses NScurl (libcurl-based NSIS plugin) to download models from R2.
; NScurl supports files >2GB. Falls back to curl.exe if NScurl fails.
; ─────────────────────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define VERSION "0.1.105"
!define MODEL_BASE "https://pub-23603fff461c41af90f9cdbbbac2b5de.r2.dev"

; ── Model list ──────────────────────────────────────────────────────────────
; Name, URL suffix, expected size description
!define MODEL_1 "gemma-3n-e2b-q4km.gguf"
!define MODEL_2 "conflux-toolrouter-q4-v2.gguf"

; ── Installer Settings ───────────────────────────────────────────────────────
Name "Conflux Home"
OutFile "Conflux.Home_x64-setup.exe"
InstallDir "$LOCALAPPDATA\Conflux Home"
InstallDirRegKey HKCU "Software\ConfluxHome" "InstallDir"
RequestExecutionLevel user

; ── Modern UI ────────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\win.bmp"

; ── Pages ────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Pre-install confirmation ─────────────────────────────────────────────────
Function .onInit
    MessageBox MB_YESNO|MB_ICONINFO \
        "Conflux Home requires downloading AI models (~3.2 GB total).$\n$\n\
        This needs an active internet connection.$\n\
        Installation may take 10-20 minutes depending on speed.$\n$\n\
        Continue?" \
        IDYES skip_abort
    Abort
    skip_abort:
FunctionEnd

; ── Download function using NScurl ──────────────────────────────────────────
; Downloads a file using NScurl plugin (preferred).
; Falls back to curl.exe if NScurl is unavailable.
Function downloadWithNScurl
    ; NScurl is pre-installed by CI step (negrutiu/nsis-install-plugin)
    NScurl::http GET "${MODEL_BASE}/${MODEL_1}" "$INSTDIR\models\${MODEL_1}" /INSIST /END
    Pop $0
    ${If} $0 == "OK"
        DetailPrint "Downloaded ${MODEL_1}"
    ${Else}
        DetailPrint "NScurl failed for ${MODEL_1} (code: $0), trying curl..."
       /nscurl_failed:
        NSISdl::download "${MODEL_BASE}/${MODEL_1}" "$INSTDIR\models\${MODEL_1}"
        Pop $0
        ${If} $0 != "success"
            DetailPrint "curl download also failed for ${MODEL_1}"
        ${EndIf}
    ${EndIf}
FunctionEnd

; ── Install Section ──────────────────────────────────────────────────────────
Section "Install" SecMain
    SetOutPath "$INSTDIR"

    ; Copy all bundled resources (binaries/, etc.)
    File /r "binaries\*.*"

    ; ── Create models directory ─────────────────────────────────────────────
    CreateDirectory "$INSTDIR\models"

    ; ── Download Model 1: gemma-3n-e2b-q4km.gguf (~2.9 GB) ─────────────────
    DetailPrint "Downloading AI model (gemma-3n-e2b-q4km.gguf, ~2.9 GB)..."
    NScurl::http GET "${MODEL_BASE}/${MODEL_1}" "$INSTDIR\models\${MODEL_1}" /INSIST /RESUME /END
    Pop $0

    ${If} $0 != "OK"
        ; NScurl failed — try curl.exe as fallback
        DetailPrint "NScurl returned: $0 — falling back to curl.exe..."
        NSISdl::download "${MODEL_BASE}/${MODEL_1}" "$INSTDIR\models\${MODEL_1}"
        Pop $0
        ${If} $0 != "success"
            DetailPrint "WARNING: ${MODEL_1} download failed. App will download on first launch."
        ${Else}
            DetailPrint "${MODEL_1} downloaded via curl fallback."
        ${EndIf}
    ${Else}
        DetailPrint "${MODEL_1} downloaded successfully."
    ${EndIf}

    ; ── Download Model 2: conflux-toolrouter-q4-v2.gguf (249 MB) ────────────
    DetailPrint "Downloading tool router (conflux-toolrouter-q4-v2.gguf, ~249 MB)..."
    NScurl::http GET "${MODEL_BASE}/${MODEL_2}" "$INSTDIR\models\${MODEL_2}" /INSIST /RESUME /END
    Pop $0

    ${If} $0 != "OK"
        DetailPrint "NScurl returned: $0 — falling back to curl.exe..."
        NSISdl::download "${MODEL_BASE}/${MODEL_2}" "$INSTDIR\models\${MODEL_2}"
        Pop $0
        ${If} $0 != "success"
            DetailPrint "WARNING: ${MODEL_2} download failed. App will download on first launch."
        ${Else}
            DetailPrint "${MODEL_2} downloaded via curl fallback."
        ${EndIf}
    ${Else}
        DetailPrint "${MODEL_2} downloaded successfully."
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
    ; Path resolved by Tauri bundler — ${STAGING_DIR} is set when NSIS runs
    File /nonfatal "${STAGING_DIR}\Conflux Home.exe"
    ${If} ${FileExists} "$INSTDIR\Conflux Home.exe"
    ${Else}
        DetailPrint "WARNING: Main executable not found — bundle may be incomplete."
    ${EndIf}

SectionEnd

; ── Uninstaller ──────────────────────────────────────────────────────────────
Section "Uninstall"
    RMDir /r "$INSTDIR"
    DeleteRegKey HKCU "Software\ConfluxHome"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConfluxHome"
    Delete "$SMPROGRAMS\Conflux Home.lnk"
    Delete "$SMPROGRAMS\Uninstall Conflux Home.lnk"
SectionEnd

Function .onInstFailed
    DetailPrint "Installation ended before model download completed."
FunctionEnd