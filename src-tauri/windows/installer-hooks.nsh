; Up to 0.3.6 the publisher was derived from "com.gonzalo.aoe4-overlay", so the
; install location lived under Software\gonzalo. The reinstall page looks for it
; under the current publisher to run the old uninstaller in place; without it the
; recommended "uninstall before installing" choice fails. Copy it over before any
; page is shown. This file is included before the template's own defines, hence
; the literal key names (installMode is currentUser, so the context is HKCU).
!define MUI_CUSTOMFUNCTION_GUIINIT AdoptLegacyInstallLocation
Function AdoptLegacyInstallLocation
  Push $R0
  ReadRegStr $R0 HKCU "Software\AoE4 Overlay\AoE4 Overlay" ""
  ${If} $R0 == ""
    ReadRegStr $R0 HKCU "Software\gonzalo\AoE4 Overlay" ""
    ${If} $R0 != ""
      WriteRegStr HKCU "Software\AoE4 Overlay\AoE4 Overlay" "" $R0
    ${EndIf}
  ${EndIf}
  Pop $R0
FunctionEnd

!macro NSIS_HOOK_POSTINSTALL
  ; Remove the legacy installer key; the app moves the user's data on first launch.
  DeleteRegKey HKCU "Software\gonzalo\AoE4 Overlay"
  DeleteRegKey /ifempty HKCU "Software\gonzalo"
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
