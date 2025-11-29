!macro customInit
  ; 起動中のSnipeeを検出して終了を促す
  FindWindow $0 "" "Snipee"
  StrCmp $0 0 notRunning
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "Snipeeが起動中です。$\n$\nインストールを続行するには、Snipeeを終了してください。$\n$\n[OK] を押すと自動的に終了します。" IDOK killApp IDCANCEL cancelInstall
  killApp:
    ; プロセスを終了
    nsExec::ExecToLog 'taskkill /F /IM Snipee.exe'
    Sleep 1000
    Goto notRunning
  cancelInstall:
    Abort
  notRunning:
!macroend

!macro customUnInstall
  ; 設定ファイルを削除するか確認
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "設定ファイルも削除しますか？$\n$\n[はい] クリップボード履歴やスニペット設定も削除$\n[いいえ] 設定を残す（再インストール時に復元）" IDYES deleteSettings IDNO keepSettings
  deleteSettings:
    ; 設定フォルダを削除
    RMDir /r "$APPDATA\snipee"
    Goto done
  keepSettings:
  done:
!macroend


!macro customInstall
  ; スタートアップ登録の確認
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Windows起動時にSnipeeを自動起動しますか？$\n$\n後から設定画面で変更できます。" IDYES addStartup IDNO skipStartup
  addStartup:
    ; スタートアップにショートカット作成
    CreateShortCut "$SMSTARTUP\Snipee.lnk" "$INSTDIR\Snipee.exe"
    Goto startupDone
  skipStartup:
  startupDone:
!macroend