; Ask for the language on every run, preselecting the last choice. The app keeps
; that choice in sync with its own setting, so changing it here is deliberate and
; the app switches to it (see NSIS_HOOK_POSTINSTALL and locale.rs).
!define MUI_LANGDLL_ALWAYSSHOW

; Up to 0.3.6 the publisher was derived from "com.gonzalo.aoe4-overlay", so the
; install location lived under Software\gonzalo. The reinstall page looks for it
; under the current publisher to run the old uninstaller in place; without it the
; recommended "uninstall before installing" choice fails. Copy it over before any
; page is shown. This file is included before the template's own defines, hence
; the literal key names (installMode is currentUser, so the context is HKCU).
;
; It also closes a running copy before any page is shown (see below), because the
; reinstall page's "uninstall first" runs the installed version's uninstaller, and
; those up to 0.3.8 cannot close the app themselves.
!define MUI_CUSTOMFUNCTION_GUIINIT AdoptLegacyInstallLocation

; The template finds a running copy through Restart Manager, which does not see
; this app (a tray process whose windows are hidden). The exe then stays locked:
; the uninstaller leaves it behind with the app still running, and installing
; over it fails to replace it. Find and close the user's copy by name instead,
; asking first when $R3 is 1. FAIL is a macro that stops with the message in $R1.
; Tauri's process plugin can't be used: its folder is added after this file.
!macro AOE4_FIND_APP EXE
  ; Leaves 0 on the stack when the current user runs EXE.
  nsExec::Exec '"$SYSDIR\cmd.exe" /c "tasklist /NH /FI "IMAGENAME eq ${EXE}" /FI "USERNAME eq %USERNAME%" | "$SYSDIR\find.exe" /I "${EXE}""'
!macroend

!macro AOE4_CLOSE_RUNNING_APP EXE FAIL
  !insertmacro AOE4_FIND_APP "${EXE}"
  Pop $R0
  ${If} $R0 = 0
    StrCpy $R2 1
    ${If} $R3 = 1
      MessageBox MB_OKCANCEL|MB_ICONINFORMATION "$(aoe4AppOpenClose)" IDOK +2
        StrCpy $R2 0
    ${EndIf}
    ${If} $R2 = 0
      StrCpy $R1 "$(aoe4AppOpen)"
      !insertmacro ${FAIL}
    ${EndIf}
    nsExec::Exec '"$SYSDIR\cmd.exe" /c ""$SYSDIR\taskkill.exe" /F /FI "IMAGENAME eq ${EXE}" /FI "USERNAME eq %USERNAME%""'
    Pop $R0
    ; Let the process and its WebView2 helpers go before files are replaced or deleted.
    Sleep 1500
    !insertmacro AOE4_FIND_APP "${EXE}"
    Pop $R0
    ${If} $R0 = 0
      StrCpy $R1 "$(aoe4AppNotClosed)"
      !insertmacro ${FAIL}
    ${EndIf}
  ${EndIf}
!macroend

!macro AOE4_FAIL_SECTION
  Abort $R1
!macroend

!macro AOE4_FAIL_WINDOW
  MessageBox MB_ICONEXCLAMATION $R1
  Quit
!macroend

; The template's defines and variables don't exist yet here: literal names, and
; the passive flag read from the command line.
Function AdoptLegacyInstallLocation
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  ReadRegStr $R0 HKCU "Software\AoE4 Overlay\AoE4 Overlay" ""
  ${If} $R0 == ""
    ReadRegStr $R0 HKCU "Software\gonzalo\AoE4 Overlay" ""
    ${If} $R0 != ""
      WriteRegStr HKCU "Software\AoE4 Overlay\AoE4 Overlay" "" $R0
    ${EndIf}
  ${EndIf}

  StrCpy $R3 1
  ClearErrors
  ${GetOptions} $CMDLINE "/P" $R0
  ${IfNot} ${Errors}
    StrCpy $R3 0
  ${EndIf}
  !insertmacro AOE4_CLOSE_RUNNING_APP "aoe4-overlay.exe" AOE4_FAIL_WINDOW

  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
FunctionEnd

; Again right before copying or deleting files, in case it was reopened meanwhile,
; and for silent runs, which skip the function above.
!macro AOE4_CLOSE_RUNNING_APP_IN_SECTION
  StrCpy $R3 1
  ${If} ${Silent}
  ${OrIf} $PassiveMode = 1
    StrCpy $R3 0
  ${EndIf}
  !insertmacro AOE4_CLOSE_RUNNING_APP "${MAINBINARYNAME}.exe" AOE4_FAIL_SECTION
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro AOE4_CLOSE_RUNNING_APP_IN_SECTION
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro AOE4_CLOSE_RUNNING_APP_IN_SECTION
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Remove the legacy installer key; the app moves the user's data on first launch.
  DeleteRegKey HKCU "Software\gonzalo\AoE4 Overlay"
  DeleteRegKey /ifempty HKCU "Software\gonzalo"

  ; The language selector preselects the saved choice, which the app keeps equal to
  ; its own language. A different pick here is a request to switch: leave it for
  ; the app, which applies it over its saved setting on the next launch. The saved
  ; choice is only overwritten after this section, when the files page is left.
  Push $R0
  ReadRegStr $R0 HKCU "${MANUPRODUCTKEY}" "Installer Language"
  ${If} $R0 != $LANGUAGE
    WriteRegStr HKCU "${MANUPRODUCTKEY}" "Pending Language" $LANGUAGE
  ${EndIf}
  Pop $R0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    Push $R0
    ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AoE4 Overlay"
    ${If} $R0 == "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" --background"
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AoE4 Overlay"
    ${EndIf}
    Pop $R0
  ${EndIf}
!macroend
