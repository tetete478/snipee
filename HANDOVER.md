# Snipee 開発引き継ぎドキュメント

**バージョン**: v1.5.4  
**最終更新**: 2025-11-25  
**GitHub**: https://github.com/tetete478/snipee

---

## 📌 プロジェクト概要

### 目的
Clipyの代替として、チーム20人で使えるクロスプラットフォーム対応のクリップボード管理ツール。

### 主要機能
- クリップボード履歴管理（最大100件）
- Google Drive経由でのスニペット共有（マスタスニペット）
- ローカルスニペット（個別スニペット）
- カスタマイズ可能なホットキー
- Mac/Windows対応
- **自動アップデート機能**（GitHub Releases経由）
- **ウィンドウサイズ自動調整**（コンテンツに応じて可変）

### 配布方針（最重要）
- **ダブルクリックで起動**（Node.js不要）
- electron-builderで実行可能ファイル生成
- 非エンジニアでも簡単に使える
- **自動アップデート**でユーザーは何もしなくてOK

### ワークフロー
1. てるやがClipyで個人用スニペット管理
2. Clipyからスニペットを**XML形式**でエクスポート
3. Google Driveにアップロード
4. チームメンバーがSnipeeで同期して使用

---

## 🔧 技術スタック

- **フレームワーク**: Electron
- **データ保存**: electron-store
- **XML解析**: xml2js（Clipy互換）
- **自動ペースト**:
  - Windows: PowerShell SendKeys（ネイティブモジュール不要）
  - Mac: AppleScript + System Events
- **自動アップデート**: electron-updater + GitHub Releases
- **ビルド**: electron-builder

---

## 🚀 リリース手順（自動アップデート）

### 初回セットアップ（1回だけ）

#### 1. GitHub Personal Access Tokenを作成
1. https://github.com/settings/tokens にアクセス
2. 「Generate new token (classic)」をクリック
3. 設定:
   - Note: `snipee-release`
   - Expiration: 90 days または No expiration
   - Scopes: ✅ `repo` にチェック
4. 「Generate token」→ トークンをコピー

#### 2. 環境変数に設定
```bash
# 一時的（今回のセッションだけ）
export GH_TOKEN=ghp_ここにトークン

# 永続的（おすすめ）
echo 'export GH_TOKEN=ghp_ここにトークン' >> ~/.zshrc
source ~/.zshrc

# 確認
echo $GH_TOKEN
```

### 新バージョンのリリース手順
```bash
# 1. プロジェクトディレクトリに移動
cd /path/to/snipee

# 2. ソースコードをコミット＆プッシュ
git add .
git commit -m "v1.5.4: 変更内容"
git push

# 3. バージョンを上げる（自動でgit commit & tagも作成）
npm version patch   # 1.5.3 → 1.5.4（バグ修正）
npm version minor   # 1.5.3 → 1.6.0（機能追加）
npm version major   # 1.5.3 → 2.0.0（大きな変更）

# 4. ビルド＆GitHub Releasesにアップロード
npm run publish        # Mac + Windows 両方
npm run publish:win    # Windows版のみ
npm run publish:mac    # Mac版のみ
```

### リリース後の確認
1. https://github.com/tetete478/snipee/releases にアクセス
2. 新しいバージョンがアップロードされているか確認
3. Draft（下書き）状態なら「Edit」→「Publish release」をクリック

### ユーザー側の体験
```
1. Snipeeを普通に起動
     ↓
2. 裏でGitHub Releasesをチェック（自動）
     ↓
3. 新バージョンがあれば裏でダウンロード（自動）
     ↓
4. ダイアログ表示「新しいバージョンがあります。再起動しますか？」
     ↓
5. 「再起動」押す → 自動でインストール＆再起動
     ↓
6. 新バージョンで起動完了
```

**ユーザーがやること**: 起動するだけ！何も操作不要！

---

## 📂 プロジェクト構造
```
snipee/
├── main.js                    # メインプロセス（共通化されたウィンドウ管理）
├── app/
│   ├── index.html             # クリップボード履歴ウィンドウ
│   ├── snippets.html          # スニペット専用ウィンドウ
│   ├── snippet-editor.html    # スニペット編集画面
│   ├── settings.html          # 設定画面
│   ├── permission-guide.html  # アクセシビリティ権限ガイド
│   └── common/
│       ├── variables.css      # CSS変数（色、サイズ、余白など）
│       ├── common.css         # 共通スタイル
│       └── utils.js           # 共通JavaScript関数（KeyboardNavigatorクラス含む）
├── HANDOVER.md               # このファイル（開発者向け）
├── UPDATE_LOG.md             # 更新履歴（ユーザー向け）
└── MANUAL.md                 # ユーザーマニュアル
```

---

## 🎯 現在の状態（v1.5.4）

### ✅ 実装済み機能

#### コード品質・メンテナンス性
- **CSS/JavaScript共通化**:
  - `common/variables.css`: 色、フォントサイズ、余白などの定数管理
  - `common/common.css`: 全ページ共通スタイル
  - `common/utils.js`: 共通JavaScript関数（KeyboardNavigatorクラスなど）
- **main.js共通化**:
  - `createGenericWindow(type)`: ウィンドウ作成の共通化
  - `showGenericWindow(type)`: ウィンドウ表示の共通化
  - `positionAndShowWindow(type, window)`: ポジショニングの共通化
  - `resize-window` IPCハンドラ: 送信元を自動判定してリサイズ
- **コード削減**: 約**150行**削減（v1.5.4）、累計約**940行**削減
- **DRY原則の徹底**: 重複コードを見つけたら即座に共通化

#### ウィンドウサイズ自動調整（v1.5.4）
- **可変サイズ化**:
  - ホーム画面: コンテンツに応じて自動リサイズ
  - サブメニュー展開時: 最大サイズ（460×650px）に拡大
  - サブメニュー閉じる時: ホーム画面サイズに縮小
- **初回起動時のちらつき解消**:
  - `show: false` でウィンドウ作成
  - コンテンツ読み込み完了後に表示
  - `window-ready` イベントで表示タイミング制御

#### 自動ペースト
- **Windows**: PowerShell SendKeys（v1.5.4で実装完了）
  - フォーカス管理の改善
  - 元のアプリを記憶してアクティブ化
  - 確実なペースト実行
- **Mac**: AppleScript + System Events（v1.5.4で実装完了）
  - アクセシビリティ権限必要
  - Bundle IDでアプリ判定
  - System Eventsでキーストローク送信

#### その他の機能
- クリップボード履歴管理（最大100件、ピン留め機能）
- スニペット管理（マスタ/個別、フォルダ階層、並び替え）
- Clipy風コンパクトデザイン
- キーボード完全操作
- Steve Jobs風ミニマリストデザイン
- 自動アップデート（GitHub Releases経由）
- カスタマイズ可能なホットキー

### ⚠️ 既知の制限
- IME有効時のホットキー不安定

---

## ⚠️ 重要な設計原則（失敗から学んだこと）

### 1. ❌ 複数ウィンドウIPC通信は絶対に避ける
**失敗**: サブメニュー用に別ウィンドウ作成 → アプリがフリーズ  
**原因**: Electronは複数ウィンドウ間のIPC通信で頻繁にフリーズする  
**解決**: 単一HTML内でインライン表示  
**教訓**: 新しいウィンドウを作る前に、必ずインライン表示で実装できないか検討する

### 2. ❌ 同期処理で重い操作をしない
**失敗**: 起動時にGoogle Drive同期を同期実行 → 起動に1分かかる  
**原因**: ホットキー登録前に同期処理が走っていた  
**解決**: ホットキー登録を最優先、同期は非同期で実行  
**教訓**: 起動時の処理順序は「ホットキー登録 → UI表示 → データ同期」

### 3. ✅ XML形式とフォーマットを絶対に保持
**理由**: Clipyエクスポートとの互換性維持が最重要  
**実装**: xml2jsで解析、改行・特殊文字・絵文字を完全保持  
**注意**: `preserveChildrenOrder: true`, `explicitArray: false` 設定必須

### 4. ✅ ネイティブモジュールは避ける
**失敗**: robotjsでビルド問題、Electronバージョン互換性問題  
**解決**: PowerShell（Windows）/ AppleScript（Mac）でOS標準機能を使用  
**教訓**: ネイティブモジュールは依存関係が複雑になるため、OS標準機能で代替

### 5. ✅ DRY原則（Don't Repeat Yourself）の徹底
**原則**: 同じコードを2回書かない  
**実践**: 共通化できるコードは必ず `common/` ディレクトリに移動  
**教訓**: コードレビュー時に「これ、他のファイルにもありませんか？」を必ず確認

### 6. ✅ ウィンドウサイズは動的に計算
**原則**: 固定サイズではなくコンテンツに応じて可変  
**実装**: JavaScriptで`getBoundingClientRect()`を使用してサイズ計算  
**教訓**: ユーザー体験向上のため、無駄な余白を減らす

### 7. ✅ 初回表示のちらつきを防ぐ
**原則**: ウィンドウは準備完了後に表示  
**実装**: `show: false` → コンテンツ読み込み → `window-ready` イベント → `show()`  
**教訓**: UXの基本は「完成した状態を見せる」

---

## 🚀 次にやること（優先順位順）

### 🔴 優先度：高

#### 1. 自動ペースト機能の本番テスト（Phase 2）
**現状**: Windows/Mac両方で実装完了、本番環境テスト待ち

**テスト項目**:
```
□ Windows環境テスト
  - メモ帳 → 自動ペースト動作確認
  - Chrome → 自動ペースト動作確認
  - VSCode → 自動ペースト動作確認
  - Excel → 自動ペースト動作確認
  - 日本語IME有効時の動作確認

□ Mac環境テスト
  - TextEdit → 自動ペースト動作確認
  - Chrome → 自動ペースト動作確認
  - VSCode → 自動ペースト動作確認
  - Pages → 自動ペースト動作確認
  - 日本語IME有効時の動作確認
```

**作業見積もり**: 1セッション

---

#### 2. 全Window機能の統一（Phase 2）
**現状**: index.htmlとsnippets.htmlで挙動が微妙に違う

**統一項目**:
- キーボード操作（↑↓←→Enter Esc）
- サブメニュー表示ロジック
- ウィンドウ閉じる挙動
- ホットキートグル動作

**作業見積もり**: 1〜2セッション

---

### 🟡 優先度：中

#### 3. タグ管理機能（Phase 3）
**目的**: フォルダとは独立した分類軸を追加

**実装内容**:
- master-metadata.jsonで説明+マスタタグを管理
- スニペット編集画面にタグ入力欄追加
- タグクリックでフィルタリング機能

**作業見積もり**: 2〜3セッション

---

#### 4. スニペット変数機能（Phase 3）
**目的**: テンプレート変数でスニペットを動的に生成

**変数例**:
```
{日付}     → 2025/01/23
{時刻}     → 14:30
{名前}     → 小松（設定で定義）
{会社名}   → テルヤ株式会社（設定で定義）
{カーソル} → ペースト後のカーソル位置
```

**作業見積もり**: 1〜2セッション

---

#### 5. 履歴専門Window（Phase 3）
**目的**: クリップボード履歴に特化した専用画面

**機能**:
- より広い画面（例：600x700）
- 検索機能（履歴内を全文検索）
- 日付でフィルタ
- ピン留め管理
- 履歴の一括エクスポート（CSV/JSON）

**ホットキー案**: `Command+Control+H` / `Ctrl+Alt+H`

**作業見積もり**: 2〜3セッション

---

### 🟢 優先度：低

#### 6. リリース前のバグ探し（Phase 4）
**手動テストシナリオ**:
1. 初回インストール → 起動 → 設定
2. クリップボード履歴の追加/削除
3. スニペットの追加/編集/削除
4. ドラッグ&ドロップ
5. ホットキーの変更
6. Google Drive同期（成功/失敗）
7. 仮想ディスプレイ切り替え
8. アプリ終了 → 再起動（データ保持確認）

---

## ✅ 完了した作業

### Phase 1: コードの整理（完了 - v1.5.3）
- CSS/JavaScript共通化
- 未使用コード削除（約790行）
- デザイン統一（CSS変数）
- KeyboardNavigatorクラス（約190行削減）
- Steve Jobs風グレーテーマ
- 設定画面キーボードナビゲーション
- 自動アップデート機能
- Windows自動ペーストをPowerShellに変更

### Phase 2: ウィンドウ管理の共通化（完了 - v1.5.4）
- **main.js共通化**:
  - `createGenericWindow(type)`: ウィンドウ作成
  - `showGenericWindow(type)`: ウィンドウ表示
  - `positionAndShowWindow(type, window)`: ポジショニング
  - `resize-window` IPCハンドラ: 送信元自動判定リサイズ
- **約150行のコード削減**
- **ウィンドウサイズ自動調整**:
  - 固定サイズ → 可変サイズ化
  - コンテンツに応じて自動リサイズ
  - 初回起動時のちらつき解消
  - `window-ready` イベントによる表示タイミング制御
- **自動ペースト完成**:
  - Mac: AppleScript + System Events
  - Windows: PowerShell SendKeys
  - フォーカス管理の改善

---

## 🛠️ 開発ルール

### コード修正時の基本ルール
1. **提案してから実装**: 修正内容を先に提示して許可を得る
2. **場所を明示**: ファイル名、行番号、修正タイプ（追加/削除/置換）を明記
3. **部分修正**: `str_replace`で部分修正、新規ファイルのみ`create_file`
4. **完全なコード**: ユーザーが手動で編集できるよう、修正箇所を含む完全なコードを提示
5. **共通化チェック**: 新しいコードを書く前に必ず「これ、common/に入れられないか?」を確認

### デバッグ方法
- **VSCodeターミナル出力**: `ipcRenderer.send('log', 'message')`
- **ブラウザ開発者ツールは使わない**（ユーザーに見せない）

### コードスタイル
- **コメント**: 日本語OK
- **インデント**: 2スペース
- **文字列**: シングルクォート推奨

---

## 🔍 トラブルシューティング

### ホットキーが効かない
**原因1: IME有効時**
- 日本語入力中はホットキーが効かない
- 対処: IMEをオフ（英数モード）にする

**原因2: 他アプリとの競合**
- 対処: 別のホットキーに変更

**原因3: 起動直後**
- 対処: アプリを再起動（ホットキー登録のリトライ機能が動く）

### Google Drive同期が失敗する
**原因1: URL不正**
- 正しい形式: `https://drive.google.com/uc?export=download&id=FILE_ID`

**原因2: 共有設定**
- 「リンクを知っている全員」に設定

**原因3: XML形式エラー**
- Clipyからエクスポートしたファイルか確認

### 自動アップデートが動かない
**原因1: 開発環境**
- `app.isPackaged` が false（開発中）
- 対処: ビルドしたアプリでテスト

**原因2: GitHub Releaseが下書き**
- 対処: GitHub Releasesで「Publish release」をクリック

**原因3: GH_TOKENが切れている**
- 対処: 新しいトークンを作成して環境変数を更新

### 自動ペーストが効かない
**原因1: アクセシビリティ権限未付与（Mac）**
- 対処: システム設定 → プライバシーとセキュリティ → アクセシビリティ → Snipeeにチェック

**原因2: タイミング問題**
- 対処: main.jsの待機時間を調整（現在10ms + 30ms）

**原因3: フォーカス問題**
- 対処: ウィンドウが正しく閉じているか確認、Bundle IDが正しく取得できているか確認

---

## 📚 関連ドキュメント

- **HANDOVER.md**: このファイル（開発者向け）
- **UPDATE_LOG.md**: 更新履歴（ユーザー向け）
- **MANUAL.md**: ユーザーマニュアル（GitHub公開）

---

## 🎓 参考資料

- [Electron公式ドキュメント](https://www.electronjs.org/docs)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [electron-updater](https://www.electron.build/auto-update)
- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)
- [Clipy](https://clipy-app.com/)

---

**開発者**: てるや  
**最終更新**: 2025-11-25  
**現在のバージョン**: v1.5.4