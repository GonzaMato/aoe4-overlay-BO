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
