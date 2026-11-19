; The installer's and uninstaller's pages, drawn here instead of with the
; Modern UI wizard. Installer: one page to install or upgrade, the progress
; page and a finish page. Uninstaller: a confirmation page, the progress page
; and a done page. Light or dark as Windows apps are set, in GoodGood's palette.
; Included by installer-template.nsi after the languages, so the strings can
; be per language. Text comes from locales/*/installer.json through bundle.mjs.
;
; Sizes are pixels at 96 DPI; GoodGoodScale converts them for the window's DPI
; (the installer is per-monitor DPI aware). Registers: the macros use $R0–$R9
; as scratch; page functions keep their own values in $1–$7.

!include nsDialogs.nsh

; Window styles, combined here because System::Call cannot OR them.
!define GOODGOOD_TEXT 0x50000181 ; WS_CHILD | WS_VISIBLE | SS_CENTER | SS_NOTIFY | SS_NOPREFIX
!define GOODGOOD_LABEL 0x50000180 ; WS_CHILD | WS_VISIBLE | SS_NOTIFY | SS_NOPREFIX
!define GOODGOOD_PATH 0x50008180 ; … | SS_PATHELLIPSIS
!define GOODGOOD_BUTTON 0x50018080 ; WS_CHILD | WS_VISIBLE | WS_TABSTOP | BS_BITMAP | BS_FLAT
!define GOODGOOD_ICON 0x50000043 ; WS_CHILD | WS_VISIBLE | SS_ICON | SS_REALSIZECONTROL
!define GOODGOOD_CHECK 0x50010003 ; WS_CHILD | WS_VISIBLE | WS_TABSTOP | BS_AUTOCHECKBOX
!define /ifndef SS_CENTER 0x1
!define /ifndef SS_PATHELLIPSIS 0x8000
!define /ifndef STM_SETICON 0x170
!define /ifndef STM_SETIMAGE 0x172
!define /ifndef PBM_SETBARCOLOR 0x409
!define /ifndef PBM_SETBKCOLOR 0x2001
!define /ifndef PBS_SMOOTH 0x1
!define /ifndef GWL_STYLE -16
!define /ifndef GWL_EXSTYLE -20

; ---- Strings ------------------------------------------------------------------


; ---- Theme --------------------------------------------------------------------

; GoodGood's palette (resources/theme.json). SetCtlColors takes colors only as
; constants, so each role is painted from one of two fixed sets; GoodGood's
; default accent is used rather than the Windows one, for the same reason.
!define GOODGOOD_LIGHT_BG ECEFF4
!define GOODGOOD_LIGHT_INK 1B1C22
!define GOODGOOD_LIGHT_INK2 5B5F6D
!define GOODGOOD_LIGHT_INK3 80848F
!define GOODGOOD_LIGHT_ACCENT 0067C0
!define GOODGOOD_LIGHT_ON_ACCENT FFFFFF
!define GOODGOOD_LIGHT_TRACK D5D9E2
!define GOODGOOD_DARK_BG 1C1D24
!define GOODGOOD_DARK_INK F1F2F6
!define GOODGOOD_DARK_INK2 A9ADBB
!define GOODGOOD_DARK_INK3 7A7E8F
!define GOODGOOD_DARK_ACCENT 4CC2FF
!define GOODGOOD_DARK_ON_ACCENT 00213B
!define GOODGOOD_DARK_TRACK 33353F

; Paints HWND in a ROLE: page, ink, ink2, ink3 or link. Text sits on the page
; color rather than a transparent background, which needs no repainting order.
!macro GoodGoodPaint HWND ROLE
  ${If} $GoodGoodDark = 1
    !insertmacro GoodGoodPaint_${ROLE} ${HWND} DARK
  ${Else}
    !insertmacro GoodGoodPaint_${ROLE} ${HWND} LIGHT
  ${EndIf}
!macroend
!macro GoodGoodPaint_page HWND T
  SetCtlColors ${HWND} ${GOODGOOD_${T}_INK} ${GOODGOOD_${T}_BG}
!macroend
!macro GoodGoodPaint_ink HWND T
  SetCtlColors ${HWND} ${GOODGOOD_${T}_INK} ${GOODGOOD_${T}_BG}
!macroend
!macro GoodGoodPaint_ink2 HWND T
  SetCtlColors ${HWND} ${GOODGOOD_${T}_INK2} ${GOODGOOD_${T}_BG}
!macroend
!macro GoodGoodPaint_ink3 HWND T
  SetCtlColors ${HWND} ${GOODGOOD_${T}_INK3} ${GOODGOOD_${T}_BG}
!macroend
!macro GoodGoodPaint_link HWND T
  SetCtlColors ${HWND} ${GOODGOOD_${T}_ACCENT} ${GOODGOOD_${T}_BG}
!macroend

Var GoodGoodDpi
Var GoodGoodWidth ; page size at 96 DPI
Var GoodGoodHeight
Var GoodGoodInner ; page width less the side margins
Var GoodGoodDark
Var GoodGoodClientWidth ; in pixels
Var GoodGoodClientHeight
Var GoodGoodBgRef ; palette colors as COLORREF (0x00BBGGRR), for drawing
Var GoodGoodAccentRef
Var GoodGoodOnAccentRef
Var GoodGoodTrackRef
Var GoodGoodInk3Ref
Var GoodGoodFontHero
Var GoodGoodFontTitle
Var GoodGoodFontBody
Var GoodGoodFontSmall
Var GoodGoodFontButton
Var GoodGoodCheckBox ; the page's check box (see GoodGoodCheck)
Var GoodGoodButtonBitmap
Var GoodGoodMainButton
Var GoodGoodButtonState
Var GoodGoodHoverRef
Var GoodGoodPressedRef

!macro GoodGoodScale VAR VALUE
  IntOp ${VAR} ${VALUE} * $GoodGoodDpi
  IntOp ${VAR} ${VAR} / 96
!macroend
!define GoodGoodScale "!insertmacro GoodGoodScale"

; RRGGBB to a COLORREF (0x00BBGGRR).
!macro GoodGoodColorRef VAR HEX
  IntOp $R8 0x${HEX} + 0
  IntOp $R9 $R8 & 0xFF
  IntOp $R9 $R9 << 16
  IntOp ${VAR} $R8 & 0xFF00
  IntOp ${VAR} ${VAR} | $R9
  IntOp $R8 $R8 >> 16
  IntOp ${VAR} ${VAR} | $R8
!macroend

; A font PX pixels high (at 96 DPI) in the language's face.
!macro GoodGoodFont VAR PX WEIGHT
  ${GoodGoodScale} $R0 ${PX}
  IntOp $R0 0 - $R0
  System::Call 'gdi32::CreateFontW(i R0, i 0, i 0, i 0, i ${WEIGHT}, i 0, i 0, i 0, i 1, i 0, i 0, i 5, i 0, w "$(GoodGoodFace)") p .s'
  Pop ${VAR}
!macroend

; Calls or names one of the shared functions below, in the installer's or the
; uninstaller's copy as the code around it is.
!macro GoodGoodCall NAME
  !ifdef __UNINSTALL__
    Call un.${NAME}
  !else
    Call ${NAME}
  !endif
!macroend
!macro GoodGoodOnClick HWND NAME
  !ifdef __UNINSTALL__
    ${NSD_OnClick} ${HWND} un.${NAME}
  !else
    ${NSD_OnClick} ${HWND} ${NAME}
  !endif
!macroend

; ---- Controls -----------------------------------------------------------------

; OUT = a control at X, Y, W × H (pixels at 96 DPI). PARENT "dialog" puts it on
; the current nsDialogs page (so NSD_OnClick works); a window handle puts it
; on that window (a built-in page).
!macro GoodGoodControl OUT PARENT CLASS STYLE EXSTYLE X Y W H TEXT FONT
  ${GoodGoodScale} $R1 ${X}
  ${GoodGoodScale} $R2 ${Y}
  ${GoodGoodScale} $R3 ${W}
  ${GoodGoodScale} $R4 ${H}
  !if "${PARENT}" == "dialog"
    nsDialogs::CreateControl ${CLASS} ${STYLE} ${EXSTYLE} $R1 $R2 $R3 $R4 "${TEXT}"
  !else
    System::Call 'user32::CreateWindowExW(i ${EXSTYLE}, w "${CLASS}", w "${TEXT}", i ${STYLE}, i R1, i R2, i R3, i R4, p ${PARENT}, p 0, p 0, p 0) p .s'
  !endif
  Pop ${OUT}
  !if "${FONT}" != "0"
    SendMessage ${OUT} ${WM_SETFONT} ${FONT} 1
  !endif
!macroend

; OUT = the width of TEXT in FONT, in pixels at 96 DPI.
!macro GoodGoodTextWidth OUT TEXT FONT
  System::Call 'user32::GetDC(p 0) p .R7'
  System::Call 'gdi32::SelectObject(p R7, p ${FONT}) p .R8'
  StrLen $R9 "${TEXT}"
  System::Call '*(i, i) p .R6'
  System::Call 'gdi32::GetTextExtentPoint32W(p R7, w "${TEXT}", i R9, p R6)'
  System::Call '*$R6(i .R9)'
  System::Free $R6
  System::Call 'gdi32::SelectObject(p R7, p R8)'
  System::Call 'user32::ReleaseDC(p 0, p R7)'
  IntOp ${OUT} $R9 * 96
  IntOp ${OUT} ${OUT} / $GoodGoodDpi
!macroend

; A line of text centered on the page.
!macro GoodGoodText OUT PARENT Y H TEXT FONT ROLE
  !insertmacro GoodGoodControl ${OUT} ${PARENT} STATIC ${GOODGOOD_TEXT} 0 24 ${Y} $GoodGoodInner ${H} "${TEXT}" ${FONT}
  !insertmacro GoodGoodPaint ${OUT} ${ROLE}
!macroend

; A link-colored line of text centered at Y. nsDialogs draws a link's text
; from the control's left edge in a box 2 pixels wider than the text, so the
; control is that wide.
!macro GoodGoodLink OUT Y TEXT
  !insertmacro GoodGoodTextWidth $R5 "${TEXT}" $GoodGoodFontBody
  IntOp $R5 $R5 + 2
  IntOp $R0 $GoodGoodWidth - $R5
  IntOp $R0 $R0 / 2
  !insertmacro GoodGoodControl ${OUT} dialog LINK ${__NSD_Link_STYLE} 0 $R0 ${Y} $R5 22 "${TEXT}" $GoodGoodFontBody
  !insertmacro GoodGoodPaint ${OUT} link
!macroend

; A native button keeps keyboard navigation, accessibility, pressed/focus/hot
; feedback. Its bitmap supplies the accent color and rounded face.
!macro GoodGoodButton OUT Y W TEXT ENABLED
  IntOp $R0 $GoodGoodWidth - ${W}
  IntOp $R0 $R0 / 2
  !insertmacro GoodGoodControl ${OUT} dialog BUTTON ${GOODGOOD_BUTTON} 0 $R0 ${Y} ${W} 40 "${TEXT}" $GoodGoodFontButton
  EnableWindow ${OUT} ${ENABLED}
  StrCpy $GoodGoodMainButton ${OUT}
  StrCpy $GoodGoodButtonState -1
  Push ${OUT}
  Push "${TEXT}"
  Push ${ENABLED}
  !insertmacro GoodGoodCall GoodGoodDrawButton
  !ifdef __UNINSTALL__
    ${NSD_CreateTimer} un.GoodGoodButtonFeedback 50
  !else
    ${NSD_CreateTimer} GoodGoodButtonFeedback 50
  !endif
!macroend

; A check box with its label, centered together at Y; OUT is the box. A themed
; check box draws its own text color, so the label is a separate control, and
; clicking it toggles the box. The label has room to spare on its right, which
; the centering leaves out.
!macro GoodGoodCheck OUT Y TEXT CHECKED
  !insertmacro GoodGoodTextWidth $R5 "${TEXT}" $GoodGoodFontBody
  IntOp $R0 $R5 + 24
  IntOp $R5 $R5 + 8
  IntOp $R0 $GoodGoodWidth - $R0
  IntOp $R0 $R0 / 2
  IntOp $R6 ${Y} + 2
  !insertmacro GoodGoodControl ${OUT} dialog BUTTON ${GOODGOOD_CHECK} 0 $R0 $R6 16 18 "" 0
  !insertmacro GoodGoodPaint ${OUT} page
  ${If} $GoodGoodDark = 1
    System::Call 'uxtheme::SetWindowTheme(p ${OUT}, w "DarkMode_Explorer", p 0)'
  ${EndIf}
  ${If} ${CHECKED} = 1
    SendMessage ${OUT} ${BM_SETCHECK} ${BST_CHECKED} 0
  ${EndIf}
  StrCpy $GoodGoodCheckBox ${OUT}
  IntOp $R0 $R0 + 24
  !insertmacro GoodGoodControl $R6 dialog STATIC ${GOODGOOD_LABEL} 0 $R0 ${Y} $R5 22 "${TEXT}" $GoodGoodFontBody
  !insertmacro GoodGoodPaint $R6 ink2
  !insertmacro GoodGoodOnClick $R6 GoodGoodToggleCheck
!macroend

; The app icon, SIZE pixels square (at 96 DPI), centered at Y.
!macro GoodGoodLogo OUT PARENT Y SIZE
  IntOp $R0 $GoodGoodWidth - ${SIZE}
  IntOp $R0 $R0 / 2
  !insertmacro GoodGoodControl ${OUT} ${PARENT} STATIC ${GOODGOOD_ICON} 0 $R0 ${Y} ${SIZE} ${SIZE} "" 0
  !insertmacro GoodGoodPaint ${OUT} page
  ${GoodGoodScale} $R6 ${SIZE}
  System::Call 'kernel32::GetModuleHandleW(p 0) p .R5'
  ; Resource 103 is the (un)installer icon, built from the app's icon.ico with all its sizes.
  System::Call 'user32::LoadImageW(p R5, i 103, i 1, i R6, i R6, i 0) p .R5'
  SendMessage ${OUT} ${STM_SETICON} $R5 0
!macroend

; ---- Shared functions -----------------------------------------------------------

!macro GoodGoodSharedFunctions UN

Function ${UN}GoodGoodLoadTheme
  System::Call 'user32::GetDpiForWindow(p $HWNDPARENT) i .s'
  Pop $GoodGoodDpi
  ${If} $GoodGoodDpi < 96
    StrCpy $GoodGoodDpi 96
  ${EndIf}

  ClearErrors
  ReadRegDWORD $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" "AppsUseLightTheme"
  ${If} ${Errors}
    StrCpy $0 1
  ${EndIf}
  ${If} $0 = 0
    StrCpy $GoodGoodDark 1
    !insertmacro GoodGoodColorRef $GoodGoodBgRef ${GOODGOOD_DARK_BG}
    !insertmacro GoodGoodColorRef $GoodGoodAccentRef ${GOODGOOD_DARK_ACCENT}
    !insertmacro GoodGoodColorRef $GoodGoodOnAccentRef ${GOODGOOD_DARK_ON_ACCENT}
    !insertmacro GoodGoodColorRef $GoodGoodTrackRef ${GOODGOOD_DARK_TRACK}
    !insertmacro GoodGoodColorRef $GoodGoodInk3Ref ${GOODGOOD_DARK_INK3}
    !insertmacro GoodGoodColorRef $GoodGoodHoverRef 67CCFF
    !insertmacro GoodGoodColorRef $GoodGoodPressedRef 3AA5DB
  ${Else}
    StrCpy $GoodGoodDark 0
    !insertmacro GoodGoodColorRef $GoodGoodBgRef ${GOODGOOD_LIGHT_BG}
    !insertmacro GoodGoodColorRef $GoodGoodAccentRef ${GOODGOOD_LIGHT_ACCENT}
    !insertmacro GoodGoodColorRef $GoodGoodOnAccentRef ${GOODGOOD_LIGHT_ON_ACCENT}
    !insertmacro GoodGoodColorRef $GoodGoodTrackRef ${GOODGOOD_LIGHT_TRACK}
    !insertmacro GoodGoodColorRef $GoodGoodInk3Ref ${GOODGOOD_LIGHT_INK3}
    !insertmacro GoodGoodColorRef $GoodGoodHoverRef 005BAA
    !insertmacro GoodGoodColorRef $GoodGoodPressedRef 005094
  ${EndIf}

  ; GDI+ draws the buttons (anti-aliased corners).
  System::Call '*(i 1, p 0, i 0, i 0) p .r1'
  System::Call 'gdiplus::GdiplusStartup(*p .r0, p r1, p 0)'
  System::Free $1

  !insertmacro GoodGoodFont $GoodGoodFontHero 30 600
  !insertmacro GoodGoodFont $GoodGoodFontTitle 24 600
  !insertmacro GoodGoodFont $GoodGoodFontBody 14 400
  !insertmacro GoodGoodFont $GoodGoodFontSmall 12 400
  !insertmacro GoodGoodFont $GoodGoodFontButton 14 600
FunctionEnd

; Called once the main window exists: the wizard's header, separators,
; branding and buttons go, and the page area takes the whole window.
Function ${UN}GoodGoodGuiInit
  Call ${UN}GoodGoodLoadTheme
  !insertmacro GoodGoodPaint $HWNDPARENT page

  ; Windows 11: a title bar in the page color, dark with the dark theme.
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 20, *i $GoodGoodDark, i 4)'
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 35, *i $GoodGoodBgRef, i 4)'

  ; Branding (1028, 1256), header (1034, 1037–1039) and separators (1035, 1036).
  ${ForEach} $1 1028 1039 + 1
    GetDlgItem $0 $HWNDPARENT $1
    ${If} $0 <> 0
      ShowWindow $0 ${SW_HIDE}
    ${EndIf}
  ${Next}
  GetDlgItem $0 $HWNDPARENT 1256
  ShowWindow $0 ${SW_HIDE}
  Call ${UN}GoodGoodHideButtons

  ; One window size in every language (NSIS sizes the dialog by the language's
  ; font), kept centered where NSIS put it.
  System::Call '*(i, i, i, i) p .r1'
  System::Call 'user32::GetWindowRect(p $HWNDPARENT, p r1)'
  System::Call '*$1(i .r4, i .r5, i .r6, i .r7)'
  System::Call 'user32::GetClientRect(p $HWNDPARENT, p r1)'
  System::Call '*$1(i, i, i .r2, i .r3)'
  System::Free $1
  IntOp $6 $6 - $4 ; window size
  IntOp $7 $7 - $5
  ${GoodGoodScale} $8 500 ; new client size
  ${GoodGoodScale} $9 360
  IntOp $0 $6 - $2 ; plus the frame
  IntOp $0 $0 + $8
  IntOp $1 $7 - $3
  IntOp $1 $1 + $9
  IntOp $2 $6 - $0 ; recentered
  IntOp $2 $2 / 2
  IntOp $4 $4 + $2
  IntOp $3 $7 - $1
  IntOp $3 $3 / 2
  IntOp $5 $5 + $3
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i r4, i r5, i r0, i r1, i 0x14)'
  System::Call '*(i, i, i, i) p .r1'
  System::Call 'user32::GetClientRect(p $HWNDPARENT, p r1)'
  System::Call '*$1(i, i, i .r2, i .r3)'
  System::Free $1
  GetDlgItem $0 $HWNDPARENT 1018
  System::Call 'user32::SetWindowPos(p r0, p 0, i 0, i 0, i r2, i r3, i 0x14)'
  StrCpy $GoodGoodClientWidth $2
  StrCpy $GoodGoodClientHeight $3
  IntOp $GoodGoodWidth $2 * 96
  IntOp $GoodGoodWidth $GoodGoodWidth / $GoodGoodDpi
  IntOp $GoodGoodHeight $3 * 96
  IntOp $GoodGoodHeight $GoodGoodHeight / $GoodGoodDpi
  IntOp $GoodGoodInner $GoodGoodWidth - 48
FunctionEnd

; The Back, Next and Cancel buttons (3, 1, 2), which NSIS shows again on every
; page. Next stays the default button, so Enter still moves on.
Function ${UN}GoodGoodHideButtons
  ${ForEach} $1 1 3 + 1
    GetDlgItem $0 $HWNDPARENT $1
    ShowWindow $0 ${SW_HIDE}
  ${Next}
FunctionEnd

; Native buttons handle input. Poll only their visual state, redrawing once
; per change. Release the timer and bitmap when the page closes.
Function ${UN}GoodGoodButtonFeedback
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  System::Call 'user32::IsWindowEnabled(p $GoodGoodMainButton) i .r0'
  ${If} $0 <> 0
    StrCpy $0 1
    SendMessage $GoodGoodMainButton ${BM_GETSTATE} 0 0 $1
    IntOp $2 $1 & 8 ; BST_FOCUS
    ${If} $2 <> 0
      IntOp $0 $0 | 2
    ${EndIf}
    IntOp $2 $1 & 4 ; BST_PUSHED
    ${If} $2 <> 0
      IntOp $0 $0 | 8
    ${EndIf}
    System::Call '*(i, i) p .r1'
    System::Call 'user32::GetCursorPos(p r1)'
    System::Call '*$1(l .r2)'
    System::Call 'user32::WindowFromPoint(l r2) p .r3'
    System::Free $1
    ${If} $3 = $GoodGoodMainButton
      IntOp $0 $0 | 4
    ${EndIf}
  ${EndIf}
  ${If} $0 <> $GoodGoodButtonState
    StrCpy $GoodGoodButtonState $0
    System::Call 'user32::GetWindowTextW(p $GoodGoodMainButton, w .r1, i ${NSIS_MAX_STRLEN})'
    Push $GoodGoodMainButton
    Push $1
    Push $0
    Call ${UN}GoodGoodDrawButton
  ${EndIf}
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

Function ${UN}GoodGoodReleaseButton
  ${NSD_KillTimer} ${UN}GoodGoodButtonFeedback
  System::Call 'gdi32::DeleteObject(p $GoodGoodButtonBitmap)'
  StrCpy $GoodGoodButtonBitmap 0
  StrCpy $GoodGoodMainButton 0
FunctionEnd

; Draws the button bitmap for the native control on the stack (see GoodGoodButton).
Function ${UN}GoodGoodDrawButton
  Pop $R9 ; visual state: enabled, focused, hovered, pressed
  Pop $R8 ; text
  Pop $R7 ; control
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9
  IntOp $0 $R9 & 1
  ${If} $0 <> 0
    StrCpy $8 $GoodGoodAccentRef
    StrCpy $9 $GoodGoodOnAccentRef
    IntOp $0 $R9 & 4
    ${If} $0 <> 0
      StrCpy $8 $GoodGoodHoverRef
    ${EndIf}
    IntOp $0 $R9 & 8
    ${If} $0 <> 0
      StrCpy $8 $GoodGoodPressedRef
    ${EndIf}
  ${Else}
    StrCpy $8 $GoodGoodTrackRef
    StrCpy $9 $GoodGoodInk3Ref
  ${EndIf}

  System::Call '*(i, i, i, i) p .r6'
  System::Call 'user32::GetClientRect(p R7, p r6)'
  System::Call '*$6(i, i, i .r4, i .r5)'
  System::Call 'user32::GetDC(p 0) p .r0'
  System::Call 'gdi32::CreateCompatibleDC(p r0) p .r1'
  System::Call 'user32::ReleaseDC(p 0, p r0)'
  ; A top-down 24-bit bitmap: in a 32-bit one GDI's text would leave alpha 0,
  ; and the static control would blend those pixels away.
  IntOp $7 0 - $5
  System::Call '*(i 40, i r4, i r7, &i2 1, &i2 24, i 0, i 0, i 0, i 0, i 0, i 0, i 0) p .r0'
  System::Call 'gdi32::CreateDIBSection(p r1, p r0, i 0, *p .r7, p 0, i 0) p .r2'
  System::Free $0
  System::Call 'gdi32::SelectObject(p r1, p r2) p .r3'

  ; The page color around the corners.
  System::Call 'gdi32::CreateSolidBrush(i $GoodGoodBgRef) p .r0'
  System::Call 'user32::FillRect(p r1, p r6, p r0)'
  System::Call 'gdi32::DeleteObject(p r0)'

  ; The rounded rectangle, in GDI+'s ARGB: two rectangles and four circles
  ; (System::Call cannot pass the REAL angles of a path's arcs).
  IntOp $0 $8 & 0xFF
  IntOp $0 $0 << 16
  IntOp $7 $8 & 0xFF00
  IntOp $0 $0 | $7
  IntOp $7 $8 >> 16
  IntOp $7 $7 & 0xFF
  IntOp $0 $0 | $7
  IntOp $8 $0 | 0xFF000000
  System::Call 'gdiplus::GdipCreateFromHDC(p r1, *p .r0)'
  System::Call 'gdiplus::GdipSetSmoothingMode(p r0, i 4)'
  System::Call 'gdiplus::GdipCreateSolidFill(i r8, *p .r8)'
  ${GoodGoodScale} $R6 6 ; corner radius
  IntOp $R3 $R6 * 2
  IntOp $R4 $4 - $R3
  IntOp $R5 $5 - $R3
  System::Call 'gdiplus::GdipFillRectangleI(p r0, p r8, i R6, i 0, i R4, i r5)'
  System::Call 'gdiplus::GdipFillRectangleI(p r0, p r8, i 0, i R6, i r4, i R5)'
  System::Call 'gdiplus::GdipFillEllipseI(p r0, p r8, i 0, i 0, i R3, i R3)'
  System::Call 'gdiplus::GdipFillEllipseI(p r0, p r8, i R4, i 0, i R3, i R3)'
  System::Call 'gdiplus::GdipFillEllipseI(p r0, p r8, i 0, i R5, i R3, i R3)'
  System::Call 'gdiplus::GdipFillEllipseI(p r0, p r8, i R4, i R5, i R3, i R3)'
  System::Call 'gdiplus::GdipDeleteBrush(p r8)'
  System::Call 'gdiplus::GdipDeleteGraphics(p r0)'

  ; The label.
  System::Call 'gdi32::SelectObject(p r1, p $GoodGoodFontButton)'
  System::Call 'gdi32::SetBkMode(p r1, i 1)'
  System::Call 'gdi32::SetTextColor(p r1, i r9)'
  System::Call 'user32::DrawTextW(p r1, w R8, i -1, p r6, i 0x25)' ; DT_CENTER | DT_VCENTER | DT_SINGLELINE

  IntOp $0 $R9 & 2
  ${If} $0 <> 0
    ${GoodGoodScale} $0 4
    IntOp $4 $4 - $0
    IntOp $5 $5 - $0
    System::Call '*$6(i r0, i r0, i r4, i r5)'
    System::Call 'user32::DrawFocusRect(p r1, p r6)'
  ${EndIf}

  System::Call 'gdi32::SelectObject(p r1, p r3)'
  System::Call 'gdi32::DeleteDC(p r1)'
  System::Free $6
  SendMessage $R7 ${BM_SETIMAGE} 0 $2 $0
  StrCpy $GoodGoodButtonBitmap $2
  ${If} $0 <> 0
    System::Call 'gdi32::DeleteObject(p r0)'
  ${EndIf}
  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; Click handlers: on to the next page (past the last one, the window closes),
; and the check box's label.
Function ${UN}GoodGoodNext
  Pop $0
  SendMessage $HWNDPARENT 0x408 1 0
FunctionEnd

Function ${UN}GoodGoodToggleCheck
  Pop $0
  SendMessage $GoodGoodCheckBox ${BM_GETCHECK} 0 0 $0
  ${If} $0 = ${BST_CHECKED}
    SendMessage $GoodGoodCheckBox ${BM_SETCHECK} ${BST_UNCHECKED} 0
  ${Else}
    SendMessage $GoodGoodCheckBox ${BM_SETCHECK} ${BST_CHECKED} 0
  ${EndIf}
FunctionEnd

; Restyles the built-in progress page, with the title on the stack.
Function ${UN}GoodGoodStyleProgress
  Pop $6
  Call ${UN}GoodGoodHideButtons
  FindWindow $5 "#32770" "" $HWNDPARENT
  !insertmacro GoodGoodPaint $5 page
  ; NSIS keeps a built-in page at its template size; this one takes the window.
  System::Call 'user32::SetWindowPos(p r5, p 0, i 0, i 0, i $GoodGoodClientWidth, i $GoodGoodClientHeight, i 0x16)'

  ; The details list and its button stay out of sight.
  GetDlgItem $0 $5 1016
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $5 1027
  ShowWindow $0 ${SW_HIDE}

  !insertmacro GoodGoodLogo $1 $5 70 64
  !insertmacro GoodGoodText $1 $5 146 36 "$6" $GoodGoodFontTitle ink

  ; A thin, flat bar in the accent color.
  GetDlgItem $0 $5 1004
  System::Call 'uxtheme::SetWindowTheme(p r0, w "", w "")'
  System::Call 'user32::GetWindowLongW(p r0, i ${GWL_STYLE}) i .r1'
  IntOp $1 $1 | ${PBS_SMOOTH}
  System::Call 'user32::SetWindowLongW(p r0, i ${GWL_STYLE}, i r1)'
  System::Call 'user32::SetWindowLongW(p r0, i ${GWL_EXSTYLE}, i 0)'
  SendMessage $0 ${PBM_SETBARCOLOR} 0 $GoodGoodAccentRef
  SendMessage $0 ${PBM_SETBKCOLOR} 0 $GoodGoodTrackRef
  IntOp $1 $GoodGoodWidth * 15
  IntOp $1 $1 / 100
  IntOp $2 $GoodGoodWidth * 70
  IntOp $2 $2 / 100
  ${GoodGoodScale} $1 $1
  ${GoodGoodScale} $2 $2
  ${GoodGoodScale} $3 200
  ${GoodGoodScale} $4 4
  System::Call 'user32::SetWindowPos(p r0, p 0, i r1, i r3, i r2, i r4, i 0x34)'

  ; What it is doing, under the bar.
  GetDlgItem $0 $5 1006
  SendMessage $0 ${WM_SETFONT} $GoodGoodFontSmall 1
  !insertmacro GoodGoodPaint $0 ink3
  System::Call 'user32::GetWindowLongW(p r0, i ${GWL_STYLE}) i .r1'
  ; The low five bits are the static's type (here SS_LEFTNOWORDWRAP); OR-ing
  ; SS_CENTER into it would make it owner-drawn.
  IntOp $1 $1 & 0xFFFFFFE0
  IntOp $1 $1 | ${SS_CENTER}
  IntOp $1 $1 | ${SS_PATHELLIPSIS}
  System::Call 'user32::SetWindowLongW(p r0, i ${GWL_STYLE}, i r1)'
  ${GoodGoodScale} $1 24
  ${GoodGoodScale} $2 $GoodGoodInner
  ${GoodGoodScale} $3 216
  ${GoodGoodScale} $4 20
  System::Call 'user32::SetWindowPos(p r0, p 0, i r1, i r3, i r2, i r4, i 0x34)'
FunctionEnd

!macroend
!insertmacro GoodGoodSharedFunctions ""
!insertmacro GoodGoodSharedFunctions "un."

; ---- Installer: install or upgrade ------------------------------------------------

Var GoodGoodOldVersion
Var GoodGoodCompare ; 2: not installed; 1: upgrade; 0: same version; -1: newer installed
Var GoodGoodLocationText

Function GoodGoodDetect
  StrCpy $GoodGoodCompare 2
  ReadRegStr $GoodGoodOldVersion SHCTX "${UNINSTKEY}" "DisplayVersion"
  ReadRegStr $0 SHCTX "${UNINSTKEY}" "UninstallString"
  ${If} $0 != ""
    ${If} $GoodGoodOldVersion == ""
      StrCpy $GoodGoodCompare 1
    ${Else}
      ExecWait '"$PLUGINSDIR\goodgood-version.exe" --goodgood-compare-version "$GoodGoodOldVersion"' $GoodGoodCompare
      ${If} $GoodGoodCompare = 2
        StrCpy $GoodGoodCompare -1
      ${EndIf}
    ${EndIf}
  ${EndIf}
FunctionEnd

Function GoodGoodPageMain
  Call GoodGoodDetect
  ${IfThen} $PassiveMode = 1 ${|} Abort ${|}

  nsDialogs::Create 1018
  Pop $0
  !insertmacro GoodGoodPaint $0 page

  !insertmacro GoodGoodLogo $1 dialog 34 64
  !insertmacro GoodGoodText $1 dialog 108 44 "${PRODUCTNAME}" $GoodGoodFontHero ink
  !insertmacro GoodGoodText $1 dialog 154 44 "$(GoodGoodTagline)" $GoodGoodFontBody ink2

  ${If} $GoodGoodCompare = 1
    StrCpy $6 "$(GoodGoodUpgradeFrom)"
    StrCpy $7 "$(GoodGoodUpgrade)"
  ${ElseIf} $GoodGoodCompare = 0
    StrCpy $6 "$(GoodGoodSameVersion)"
    StrCpy $7 "$(GoodGoodReinstall)"
  ${ElseIf} $GoodGoodCompare = -1
    StrCpy $6 "$(GoodGoodNewerInstalled)"
    StrCpy $7 "$(GoodGoodInstall)"
  ${Else}
    StrCpy $6 "$(GoodGoodVersion)"
    StrCpy $7 "$(GoodGoodInstall)"
  ${EndIf}
  !insertmacro GoodGoodText $1 dialog 204 36 "$6" $GoodGoodFontSmall ink3

  ${If} $GoodGoodCompare = -1
    StrCpy $2 0
  ${Else}
    StrCpy $2 1
  ${EndIf}
  !insertmacro GoodGoodButton $1 250 176 "$7" $2
  ${If} $2 = 1
    ${NSD_OnClick} $1 GoodGoodNext
  ${EndIf}

  ; Bottom line: where it goes and, for a new install, a way to change it.
  IntOp $2 $GoodGoodHeight - 40
  IntOp $3 $GoodGoodWidth - 120
  !insertmacro GoodGoodControl $GoodGoodLocationText dialog STATIC ${GOODGOOD_PATH} 0 24 $2 $3 20 "$(GoodGoodLocation)" $GoodGoodFontSmall
  !insertmacro GoodGoodPaint $GoodGoodLocationText ink3
  ${If} $GoodGoodCompare = 2
    IntOp $3 $GoodGoodWidth - 88
    !insertmacro GoodGoodControl $1 dialog LINK ${__NSD_Link_STYLE} 0 $3 $2 64 20 "$(GoodGoodChange)" $GoodGoodFontSmall
    !insertmacro GoodGoodPaint $1 link
    ${NSD_OnClick} $1 GoodGoodChangeLocation
  ${EndIf}

  Call GoodGoodHideButtons
  nsDialogs::Show
  Call GoodGoodReleaseButton
FunctionEnd

Function GoodGoodPageMainLeave
  ; A newer version blocks the button; Enter must not get past it either.
  ${IfThen} $GoodGoodCompare = -1 ${|} Abort ${|}
FunctionEnd

Function GoodGoodChangeLocation
  Pop $0
  nsDialogs::SelectFolderDialog "$(GoodGoodChooseFolder)" $INSTDIR
  Pop $0
  ${If} $0 != error
  ${AndIf} $0 != ""
    ; Like the directory page: a chosen parent folder gets a folder of its own.
    ; A drive root comes back with its backslash ("D:\").
    StrCpy $1 $0 1 -1
    ${If} $1 == "\"
      StrCpy $0 $0 -1
    ${EndIf}
    StrLen $1 "${PRODUCTNAME}"
    IntOp $1 0 - $1
    StrCpy $2 $0 "" $1
    ${If} $2 != "${PRODUCTNAME}"
      StrCpy $0 "$0\${PRODUCTNAME}"
    ${EndIf}
    StrCpy $INSTDIR $0
    SendMessage $GoodGoodLocationText ${WM_SETTEXT} 0 "STR:$(GoodGoodLocation)"
  ${EndIf}
FunctionEnd

Function GoodGoodPageProgress
  ${If} $UpdateMode = 1
  ${OrIf} $GoodGoodCompare = 1
    Push "$(GoodGoodUpdating)"
  ${Else}
    Push "$(GoodGoodInstalling)"
  ${EndIf}
  Call GoodGoodStyleProgress
FunctionEnd

; ---- Installer: finish ---------------------------------------------------------

Var GoodGoodLaunchApp

Function GoodGoodPageFinish
  ${IfThen} $PassiveMode = 1 ${|} Abort ${|}

  nsDialogs::Create 1018
  Pop $0
  !insertmacro GoodGoodPaint $0 page
  StrCpy $GoodGoodLaunchApp 1

  !insertmacro GoodGoodLogo $1 dialog 34 64
  !insertmacro GoodGoodText $1 dialog 110 36 "$(GoodGoodInstalled)" $GoodGoodFontTitle ink
  !insertmacro GoodGoodText $1 dialog 150 22 "$(GoodGoodInstalledText)" $GoodGoodFontBody ink2
  ${If} $UpdateMode = 1
    StrCpy $2 0
  ${Else}
    StrCpy $2 1
  ${EndIf}
  !insertmacro GoodGoodCheck $1 185 "$(GoodGoodDesktopShortcut)" $2
  !insertmacro GoodGoodButton $1 228 176 "$(GoodGoodLaunch)" 1
  ${NSD_OnClick} $1 GoodGoodNext
  !insertmacro GoodGoodLink $1 280 "$(GoodGoodClose)"
  ${NSD_OnClick} $1 GoodGoodCloseOnly

  Call GoodGoodHideButtons
  nsDialogs::Show
  Call GoodGoodReleaseButton
FunctionEnd

Function GoodGoodCloseOnly
  Pop $0
  StrCpy $GoodGoodLaunchApp 0
  SendMessage $HWNDPARENT 0x408 1 0
FunctionEnd

Function GoodGoodPageFinishLeave
  SendMessage $GoodGoodCheckBox ${BM_GETCHECK} 0 0 $0
  ${If} $0 = ${BST_CHECKED}
    Call CreateOrUpdateDesktopShortcut
  ${EndIf}
  ${If} $GoodGoodLaunchApp = 1
    Call RunMainBinary
  ${EndIf}
FunctionEnd

; ---- Uninstaller ----------------------------------------------------------------

Function un.GoodGoodPageConfirm
  ${IfThen} $PassiveMode = 1 ${|} Abort ${|}

  nsDialogs::Create 1018
  Pop $0
  !insertmacro GoodGoodPaint $0 page

  !insertmacro GoodGoodLogo $1 dialog 34 64
  !insertmacro GoodGoodText $1 dialog 110 36 "$(GoodGoodUninstallTitle)" $GoodGoodFontTitle ink
  !insertmacro GoodGoodText $1 dialog 150 22 "$(GoodGoodUninstallText)" $GoodGoodFontBody ink2
  !insertmacro GoodGoodCheck $1 185 "$(GoodGoodDeleteData)" 0
  !insertmacro GoodGoodButton $1 228 176 "$(GoodGoodUninstall)" 1
  ${NSD_OnClick} $1 un.GoodGoodNext
  !insertmacro GoodGoodLink $1 280 "$(GoodGoodCancel)"
  ${NSD_OnClick} $1 un.GoodGoodQuit

  Call un.GoodGoodHideButtons
  nsDialogs::Show
  Call un.GoodGoodReleaseButton
FunctionEnd

Function un.GoodGoodPageConfirmLeave
  ; Read by the Uninstall section.
  SendMessage $GoodGoodCheckBox ${BM_GETCHECK} 0 0 $DeleteAppDataCheckboxState
  ; Straight on to the done page once the files are gone.
  SetAutoClose true
FunctionEnd

Function un.GoodGoodQuit
  Pop $0
  Quit
FunctionEnd

Function un.GoodGoodPageProgress
  Push "$(GoodGoodUninstalling)"
  Call un.GoodGoodStyleProgress
FunctionEnd

Function un.GoodGoodPageDone
  ${If} $PassiveMode = 1
  ${OrIf} $UpdateMode = 1
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  !insertmacro GoodGoodPaint $0 page

  !insertmacro GoodGoodLogo $1 dialog 34 64
  !insertmacro GoodGoodText $1 dialog 110 36 "$(GoodGoodUninstalled)" $GoodGoodFontTitle ink
  !insertmacro GoodGoodText $1 dialog 150 22 "$(GoodGoodUninstalledText)" $GoodGoodFontBody ink2
  !insertmacro GoodGoodButton $1 228 176 "$(GoodGoodClose)" 1
  ${NSD_OnClick} $1 un.GoodGoodNext

  Call un.GoodGoodHideButtons
  nsDialogs::Show
  Call un.GoodGoodReleaseButton
FunctionEnd
