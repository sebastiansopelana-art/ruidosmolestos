Unicode true
SetCompressor zlib
!include "MUI2.nsh"
Name "MegaHertz Beta 5"
OutFile "MegaHertz-Beta5-Windows-x64-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\MegaHertz-Beta5"
RequestExecutionLevel user
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"
Section "MegaHertz"
 SetOutPath "$INSTDIR"
 File /r "payload\*"
 CreateDirectory "$SMPROGRAMS\MegaHertz Beta 5"
 CreateShortcut "$SMPROGRAMS\MegaHertz Beta 5\MegaHertz.lnk" "$INSTDIR\MegaHertz.exe"
 CreateShortcut "$DESKTOP\MegaHertz Beta 5.lnk" "$INSTDIR\MegaHertz.exe"
 WriteUninstaller "$INSTDIR\Desinstalar.exe"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MegaHertzBeta5" "DisplayName" "MegaHertz Beta 5"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MegaHertzBeta5" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
SectionEnd
Section "Uninstall"
 Delete "$DESKTOP\MegaHertz Beta 5.lnk"
 RMDir /r "$SMPROGRAMS\MegaHertz Beta 5"
 RMDir /r "$INSTDIR"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MegaHertzBeta5"
 ; AppData\Roaming\MegaHertz-Beta5 is deliberately retained.
SectionEnd
