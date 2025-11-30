!macro customInit
  ; Snipeeプロセスを強制終了（起動していなくてもエラーは無視される）
  nsExec::ExecToLog 'taskkill /F /IM Snipee.exe'
  Sleep 2000
  ; 念のためもう一度（ファイルロック解除のため）
  nsExec::ExecToLog 'taskkill /F /IM Snipee.exe'
  Sleep 1000
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