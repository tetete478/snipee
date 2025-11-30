!macro customInit
  ; Snipeeプロセスを強制終了（起動していなくてもエラーは無視される）
  nsExec::ExecToLog 'taskkill /F /IM Snipee.exe'
  Sleep 2000
  ; 念のためもう一度（ファイルロック解除のため）
  nsExec::ExecToLog 'taskkill /F /IM Snipee.exe'
  Sleep 1000
!macroend

!macro customUnInstall
  ; 設定ファイルを削除（個別スニペットは残す）
  ; config.json を削除
  Delete "$APPDATA\snipee\config.json"
  ; personal-snippets.json は残す（ユーザーの大切なデータ）
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