# Snipee 開発引き継ぎドキュメント

**バージョン**: v1.5.16  
**最終更新**: 2025-11-29  
**GitHub**: https://github.com/tetete478/snipee

---

## 📌 プロジェクト概要

### 目的

Clipy の代替として、チーム 20 人で使えるクロスプラットフォーム対応のクリップボード管理ツール。

### 主要機能

- クリップボード履歴管理（最大 100 件）
- Google Drive 経由でのスニペット共有（マスタスニペット）
- ローカルスニペット（個別スニペット）
- カスタマイズ可能なホットキー
- Mac/Windows 対応
- **自動アップデート機能**（GitHub Releases 経由）
- **変数機能**（日付、名前などの動的挿入）
- **マスタ編集モード**（パスワード認証でマスタスニペット編集）
- **XML エクスポート機能**（Clipy 互換形式で出力）
- **履歴専用ウィンドウ**（専用ホットキーで起動）

### 配布方針（最重要）

- **ダブルクリックで起動**（Node.js 不要）
- electron-builder で実行可能ファイル生成
- 非エンジニアでも簡単に使える
- **自動アップデート**でユーザーは何もしなくて OK

### ワークフロー（Snipee 完結）

1. Snipee でマスタ編集モード ON（パスワード: `1108`）
2. スニペットの追加・編集・削除を実行
3. XML エクスポート → Google Drive に上書き
4. チームメンバーが Snipee 起動時に自動同期

**⚡ Clipy はもう使わなくて OK！Snipee だけで完結！**

---

## 🔧 技術スタック

- **フレームワーク**: Electron
- **データ保存**: electron-store
- **XML 解析**: xml2js（Clipy 互換）
- **自動ペースト（Windows）**: PowerShell（SetForegroundWindow + Alt キートリック）+ robotjs
- **自動ペースト（Mac）**: AppleScript + Bundle ID 方式（元アプリに確実に戻る）
- **キー入力**: robotjs（Mac/Windows 共通）
- **自動アップデート**: electron-updater + GitHub Releases
- **ビルド**: electron-builder
- **CI/CD**: GitHub Actions（タグプッシュで自動ビルド＆リリース）

---

## 🚀 リリース手順（GitHub Actions 自動ビルド）

### 初回セットアップ（1 回だけ）

#### 1. GitHub Personal Access Token を作成

1. https://github.com/settings/tokens にアクセス
2. 「Generate new token (classic)」をクリック
3. 設定:
   - Note: `snipee-release`
   - Expiration: 90 days または No expiration
   - Scopes: ✅ `repo` にチェック
4. 「Generate token」→ トークンをコピー

#### 2. GitHub Secrets に登録

1. GitHub → リポジトリ → **Settings**
2. 左メニュー → **Secrets and variables** → **Actions**
3. **New repository secret** をクリック
4. 入力:
   - Name: `GH_TOKEN`
   - Secret: （作成したトークン）
5. **Add secret**

#### 3. リポジトリを Public に設定（重要）

**electron-updater が GitHub Releases にアクセスするために必須！**

1. GitHub → リポジトリ → **Settings**
2. 一番下の **Danger Zone** までスクロール
3. **Change repository visibility** → **Change visibility**
4. **Make public** を選択
5. リポジトリ名を入力して確認

⚠️ Private のままだとアップデートチェックが失敗する

### 新バージョンのリリース手順

```bash
# 1. プロジェクトディレクトリに移動
cd /path/to/snipee

# 2. ソースコードをコミット＆プッシュ
git add .
git commit -m "変更内容"
git push

# 3. バージョンを上げる（自動でgit commit & tagも作成）
npm version patch   # 1.5.9 → 1.5.10（バグ修正）
npm version minor   # 1.5.9 → 1.6.0（機能追加）
npm version major   # 1.5.9 → 2.0.0（大きな変更）

# 4. タグをプッシュ → GitHub Actions が自動でビルド＆リリース
git push origin main --tags
```

### 自動で実行されること（GitHub Actions）

```
タグをプッシュ（v1.5.16など）
     ↓
GitHub Actions が起動
     ↓
Mac / Windows 並行ビルド
     ↓
GitHub Releases に自動アップロード
  - Snipee Setup X.X.X.exe（Windows）
  - Snipee-X.X.X-arm64.dmg（Mac Apple Silicon）
  - Snipee-X.X.X.dmg（Mac Intel）
  - latest.yml（Windows自動アップデート用）
  - latest-mac.yml（Mac自動アップデート用）
```

### リリース後の確認

1. GitHub → **Actions** タブで両方のジョブが成功しているか確認
2. https://github.com/tetete478/snipee/releases にアクセス
3. 新しいバージョンがアップロードされているか確認
4. Draft（下書き）状態なら「Edit」→「Publish release」をクリック

### ローカルでの開発（npm start）

**注意**: robotjs はネイティブモジュールなので、ローカル開発時は再ビルドが必要

```bash
npx electron-rebuild
npm start
```

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

### トラブルシューティング

| 問題                            | 原因             | 解決策                                  |
| ------------------------------- | ---------------- | --------------------------------------- |
| GitHub Actions が起動しない     | タグ形式が不正   | `v` で始まるタグを使う（例: `v1.5.16`） |
| Actions でビルド失敗            | Secrets 未設定   | Settings → Secrets に `GH_TOKEN` を登録 |
| Releases にアップロードされない | トークン権限不足 | トークン作成時に `repo` にチェック      |
| ユーザーに更新通知が来ない      | Draft 状態のまま | GitHub Releases で「Publish release」   |
| ローカル `npm start` でエラー   | robotjs 未ビルド | `npx electron-rebuild` を実行           |

---

## 📂 プロジェクト構造

```
snipee/
├── main.js                    # メインプロセス
├── app/
│   ├── index.html             # 簡易ホーム（クリップボード履歴）
│   ├── snippets.html          # スニペット専用ホーム
│   ├── history.html           # 履歴専用ウィンドウ
│   ├── snippet-editor.html    # スニペット編集画面
│   ├── settings.html          # 設定画面
│   ├── permission-guide.html  # アクセシビリティ権限ガイド
│   └── common/
│       ├── variables.css      # CSS変数（色、サイズ、余白など）
│       ├── common.css         # 共通スタイル（レイアウト、スクロールバー、サブメニューなど）
│       ├── utils.js           # 共通JavaScript関数（KeyboardNavigatorクラス含む）
│       └── drag-drop.js       # ドラッグ&ドロップ共通処理
├── HANDOVER.md               # このファイル
├── UPDATE_LOG.md             # 更新履歴（ユーザー向け）
└── manuals/                  # ユーザーマニュアル（Google Drive）
    ├── 01_インストール.docx
    ├── 02_スニペットを貼り付ける.docx
    ├── 03_クリップボード履歴を使う.docx
    └── 04_困ったとき.docx
```

---

## 🎯 現在の状態（v1.5.16）

### ✅ 実装済み機能

#### 変数機能

スニペット内に以下の変数を記述すると、貼り付け時に自動置換される：

| 変数                                              | 出力例                | 説明                                |
| ------------------------------------------------- | --------------------- | ----------------------------------- |
| `{今日:MM/DD}`                                    | `11/27`               | 今日の日付                          |
| `{明日:MM/DD}`                                    | `11/28`               | 明日の日付                          |
| `{2日後:M月D日:曜日短（毎月1日は除外して3日後）}` | `11月29日（金）`      | 2 日後（1 日なら 3 日後に自動調整） |
| `{3日後:M月D日:曜日短（毎月1日は除外して4日後）}` | `11月30日（土）`      | 3 日後（1 日なら 4 日後に自動調整） |
| `{タイムスタンプ}`                                | `2024/11/27 14:30:45` | 年月日＋時分秒                      |
| `{名前}`                                          | `小松`                | 設定画面で登録した名前              |

**実装箇所**: `main.js` の `replaceVariables()` 関数

#### マスタ編集モード

- **パスワード認証**: `1108` で有効化
- **編集可能な操作**:
  - マスタスニペットの内容・説明の編集
  - マスタスニペットの削除
  - マスタフォルダへのスニペット追加
  - マスタフォルダの追加・削除
- **実装箇所**: `snippet-editor.html` の `showMasterPasswordDialog()`, `verifyMasterPassword()`

#### XML エクスポート機能

- **Clipy 互換形式**で出力
- **チェックボックス式フォルダ選択**: エクスポートするフォルダを選択可能
- **実装箇所**: `snippet-editor.html` の `showExportDialog()`, `executeExport()`, `generateClipyXML()`

#### 自動ペースト

- **Mac**: AppleScript + Bundle ID 方式（元アプリに確実に戻る）
- **Windows**: PowerShell（SetForegroundWindow + Alt キートリック）+ robotjs
- **実装箇所**: `main.js` の `registerGlobalShortcuts()`, `paste-text` ハンドラ

#### Google Drive 同期

- **同期タイミング**: アプリ起動時のみ（5 分ごとの定期同期は削除済み）
- **手動同期**: 設定画面の「今すぐ同期」ボタン
- **XML の並び順**: そのまま反映される
- **マスタフォルダも同期**: XML から削除されたフォルダは自動で消える（v1.5.16）

#### コード品質・メンテナンス性

- **CSS/JavaScript 共通化**:
  - `common/variables.css`: 色、フォントサイズ、余白などの定数管理
  - `common/common.css`: 全ページ共通スタイル
  - `common/utils.js`: 共通 JavaScript 関数
- **DRY 原則の徹底**: 重複コードを見つけたら即座に共通化を実施

#### クリップボード履歴

- 最大 100 件保存
- 10 件ずつグループ化
- ピン留め機能
- インラインサブメニュー表示
- **履歴専用ウィンドウ**（Cmd+Ctrl+X / Ctrl+Alt+X）

#### スニペット管理

- **マスタスニペット**: Google Drive XML 同期（Clipy 互換）
- **個別スニペット**: ローカル保存
- フォルダ階層管理
- ドラッグ&ドロップで並び替え（同一フォルダ内のみ）
- ダブルクリックで名前編集

#### UI/UX

- Clipy 風コンパクトデザイン
- キーボード完全操作
- **マウスホバーでフォーカス、クリックで実行**（簡易ホーム 2 種）
- インラインサブメニュー（単一 HTML 内）
- Steve Jobs 風ミニマリストデザイン（グレーテーマ）
- 簡易ホーム・サブメニューに枠線（視認性向上）
- スクロールバー幅統一（4px）

#### 自動アップデート

- GitHub Releases 経由の自動アップデート
- 起動時にバージョンチェック
- バックグラウンドでダウンロード
- ダイアログで再起動を促す
- **設定画面「更新」タブで手動チェック可能**
- **最新/失敗の区別表示**（v1.5.15）

#### ホットキー

- **デフォルト**:
  - 簡易ホーム: Mac `Command+Control+C` / Windows `Ctrl+Alt+C`
  - スニペット専用: Mac `Command+Control+V` / Windows `Ctrl+Alt+V`
  - 履歴専用: Mac `Command+Control+X` / Windows `Ctrl+Alt+X`
- カスタマイズ可能
- リトライ機能実装

#### マニュアル

- **Mac/Windows 両対応の完全版マニュアル 4 部作**
- 設定画面の「一般」タブからリンクでアクセス可能
- Google Drive でホスト

### ⚠️ 既知の制限

- IME 有効時のホットキー不安定

---

## ⚠️ 重要な設計原則（失敗から学んだこと）

### 1. ❌ 複数ウィンドウ IPC 通信は絶対に避ける

**失敗**: サブメニュー用に別ウィンドウ作成 → アプリがフリーズ  
**原因**: Electron は複数ウィンドウ間の IPC 通信で頻繁にフリーズする  
**解決**: 単一 HTML 内でインライン表示（index.html の成功パターンを踏襲）  
**実装**: submenu.html を完全廃止し、インラインサブメニュー方式に統一（v1.5.0 完了）  
**教訓**: 新しいウィンドウを作る前に、必ずインライン表示で実装できないか検討する

### 2. ❌ 同期処理で重い操作をしない

**失敗**: 起動時に Google Drive 同期を同期実行 → 起動に 1 分かかる、ホットキーが効かない  
**原因**: ホットキー登録前に同期処理が走っていた  
**解決**: ホットキー登録を最優先、同期は非同期で実行  
**教訓**: 起動時の処理順序は「ホットキー登録 → UI 表示 → データ同期」

### 3. ✅ XML 形式とフォーマットを絶対に保持

**理由**: Clipy エクスポートとの互換性維持が最重要  
**実装**: xml2js で解析、改行・特殊文字・絵文字を完全保持  
**注意**: `preserveChildrenOrder: true`, `explicitArray: false` 設定必須

### 4. ❌ デフォルトホットキーで競合しない

**失敗**: `Cmd+C/V` → 標準コピペと競合  
**失敗**: `Alt+Cmd+C/V` → IME 有効時に文字入力される  
**解決**: `Command+Control+C/V` (Mac), `Ctrl+Alt+C/V` (Windows)  
**教訓**: 修飾キー 2 つ以上使うこと

### 5. ❌ 同期処理で UI 更新しない

**失敗**: スニペット名編集後、blur イベントで同期保存 → UI freeze  
**解決**: UI 更新を先に実行、保存は非同期で  
**教訓**: `await`は必ず UI 更新の**後**に実行

### 6. ✅ フォルダ間移動は削除してシンプルに

**失敗**: ドラッグ&ドロップでフォルダ間移動を実装 → 複雑で不安定  
**解決**: 同一フォルダ内の並び替えのみに制限  
**教訓**: 複雑な機能は削除して、シンプルで安定した実装を優先

### 7. ✅ デバッグは VSCode ターミナルで

**方法**: `ipcRenderer.send('log', 'message')` を使用  
**理由**: ブラウザ開発者ツールは使わない（ユーザーに見せたくない）  
**実装**: main.js で `ipcMain.on('log', (event, msg) => console.log(msg))`

### 8. ✅ ネイティブモジュールは避ける

**失敗**: robotjs でビルド問題、Electron バージョン互換性問題  
**解決**: GitHub Actions で各プラットフォーム別にビルド  
**教訓**: 可能な限り純粋な JavaScript で実装、ネイティブモジュールは最小限に

---

## 🗓️ TODO（優先度順）

### 次にやること（インストーラー改善）

#### 1. 自動アップデート改善 ⭐ 最優先

**目的**: ユーザー体験向上

**現状**:

- 起動時に自動チェック ✅
- 新バージョンあればダイアログ表示 ✅
- 手動チェックボタン ✅

**改善内容**:

- トースト通知で「新バージョンあります」表示
- ワンクリックでダウンロード＆再起動
- バックグラウンドダウンロードの進捗表示

**作業見積もり**: 1〜2 セッション

---

#### 2. 初回ウェルカム画面

**目的**: 初回起動時のユーザー体験向上

**機能**:

- 名前の入力（変数機能用）
- ホットキーの説明
- 基本的な使い方ガイド

**注意**: マスター URL 自動設定は既に実装済み（main.js にハードコード）

**作業見積もり**: 1 セッション

---

#### 3. アンインストーラー改善（Windows）

**目的**: クリーンなアンインストール

**改善内容**:

- 設定ファイル削除（`%APPDATA%/snipee`）
- 起動中でもアンインストール可能に
  - Snipee プロセスを検出
  - 「Snipee を終了してアンインストールしますか？」と確認
  - 自動で終了させてからアンインストール続行

**実装方法**: NSIS スクリプトで設定

**作業見積もり**: 1 セッション

---

#### 4. Windows 署名（優先度低）

**目的**: 「不明な発行元」警告を減らす

**料金**:

- 安いところ: Certum（約$200/年）
- メジャーなところ: DigiCert、Sectigo（$400〜$500/年）

**判断**: 20 人のチーム用なら、警告出ても「詳細 → 実行」で進めるから今は不要

---

### Phase 3: 新機能追加

#### 1. タグ機能

**目的**: スニペットの横断的な分類

**仕様**:

- **マスタスニペットタグ**: XML に含まれる、全員共有
- **個別スニペットタグ**: 個人が自由に設定、ローカル保存

**作業見積もり**: 2〜3 セッション

---

#### 2. リリース前のバグ探し（Phase 4）

**手動テストシナリオ**:

1. 初回インストール → 起動 → 設定
2. クリップボード履歴の追加/削除
3. スニペットの追加/編集/削除
4. ドラッグ&ドロップ
5. ホットキーの変更
6. Google Drive 同期（成功/失敗）
7. 仮想ディスプレイ切り替え
8. アプリ終了 → 再起動（データ保持確認）

---

## ✅ 完了した作業

### Phase 1: コードの整理（完了 - v1.5.3）

#### 1. 重複コードの共通化 ✅

**実装内容**:

```
app/common/
├── variables.css   # 色、フォントサイズ、余白などの定数
├── common.css      # 共通レイアウト、スクロールバー、サブメニュー等
└── utils.js        # 共通JavaScript関数（KeyboardNavigatorクラス含む）
```

**共通化された関数・クラス**:

- `escapeHtml()` - HTML エスケープ
- `escapeAttr()` - 属性値エスケープ
- `decodeHtmlEntities()` - HTML エンティティデコード
- `groupByFolder()` - フォルダごとにグループ化
- `hideInlineSubmenu()` - サブメニューを非表示
- `updateSubmenuSelection()` - サブメニュー選択更新
- `showInlineSubmenu()` - サブメニュー表示（基本版）
- `moveSelection()` - キーボード選択移動
- `updateVisualSelection()` - 視覚的選択更新
- `KeyboardNavigator` - キーボードナビゲーション管理クラス

#### 2. 未使用コードの削除 ✅

**総削減**: 約 790 行（v1.5.0〜v1.5.3 累計）

#### 3. デザイン統一 ✅

- CSS 変数で一括変更可能
- フォントサイズ統一（11px/13px）
- 余白統一
- カラースキーム統一
- サブメニュースタイル統一（index.html ⇄ snippets.html）

#### 4. キーボードナビゲーション共通化 ✅（v1.5.3）

**KeyboardNavigator クラス**:

- index.html、snippets.html、settings.html で共通使用
- 約 190 行のコード削減
- メイン選択とサブメニュー選択を一元管理

#### 5. デザイン刷新 ✅（v1.5.3）

**Steve Jobs 風グレーテーマ**:

- 背景: 真っ白 → 薄いグレー（`#f7f7f7`）
- プライマリ: 青 → グレー（`#8a8a8a`）
- 影: 軽量化（`0 4px 16px rgba(0,0,0,0.12)`）
- 角丸: 12px → 8px（よりフラット）
- アイコン: 絵文字 → 線画風 Unicode 記号

#### 6. 自動アップデート機能 ✅（v1.5.3）

- electron-updater + GitHub Releases
- 起動時に自動でバージョンチェック
- バックグラウンドでダウンロード
- ダイアログで再起動を促す

**Phase 1 完了日**: 2025-11-24（v1.5.3）

---

### Phase 2: 自動ペースト・変数機能（完了 - v1.5.16）

#### 1. Windows 自動ペーストを PowerShell + robotjs に変更 ✅（v1.5.10）

**変更理由**:

- PowerShell SendKeys が不安定
- フォーカス復帰が必要（UIPI 制限対策）

**新実装**:

```javascript
// 1. ホットキー押下時にHWND取得
const hwnd = execSync(
  `powershell -NoProfile -Command "...GetForegroundWindow()..."`
);

// 2. ペースト時にフォーカス復帰（Altキートリック）
exec(`powershell -NoProfile -Command "...SetForegroundWindow()..."`);

// 3. robotjsでCtrl+V
robot.keyTap("v", "control");
```

**メリット**:

- SetForegroundWindow + Alt キートリックで確実にフォーカス復帰
- robotjs で Mac/Windows 共通のキー入力コード

**デメリット**:

- PowerShell 起動オーバーヘッドで遅い（300-500ms）

#### 2. GitHub Actions CI/CD 構築 ✅（v1.5.10）

**ファイル**: `.github/workflows/build.yml`

**機能**:

- Windows/Mac を別ジョブで並行ビルド（クロスコンパイル問題を回避）
- Mac は Intel（x64）と Apple Silicon（arm64）両方ビルド
- タグプッシュ（v\*）で自動発火
- electron-rebuild 自動実行（robotjs 対応）
- GitHub Releases に自動アップロード（latest.yml 含む）
- 手動実行可能（workflow_dispatch）

#### 3. Mac 自動ペースト実装 ✅（v1.5.5）

**実装方式**: Bundle ID + AppleScript

```javascript
// ホットキー押下時にBundle IDを取得・記憶
const bundleId = execSync(
  "osascript -e 'tell application \"System Events\" to get bundle identifier of first application process whose frontmost is true'"
)
  .toString()
  .trim();
previousActiveApp = bundleId;

// ペースト時に元アプリをアクティブ化
exec(`osascript -e 'tell application id "${previousActiveApp}" to activate'`);

// Cmd+Vを送信
exec(
  'osascript -e \'tell application "System Events" to keystroke "v" using command down\''
);
```

**メリット**:

- アプリ名ではなく Bundle ID で特定するため確実
- 追加ツール不要、macOS 標準機能のみ

#### 4. 変数機能実装 ✅（v1.5.5）

**実装した変数**:

| 変数                                              | 出力例                | 説明                   |
| ------------------------------------------------- | --------------------- | ---------------------- |
| `{今日:MM/DD}`                                    | `11/27`               | 今日の日付             |
| `{明日:MM/DD}`                                    | `11/28`               | 明日の日付             |
| `{2日後:M月D日:曜日短（毎月1日は除外して3日後）}` | `11月29日（金）`      | 2 日後（1 日除外）     |
| `{3日後:M月D日:曜日短（毎月1日は除外して4日後）}` | `11月30日（土）`      | 3 日後（1 日除外）     |
| `{タイムスタンプ}`                                | `2024/11/27 14:30:45` | 年月日＋時分秒         |
| `{名前}`                                          | `小松`                | 設定画面で登録した名前 |

**実装箇所**: `main.js` の `replaceVariables()` 関数

#### 5. マスタ編集モード実装 ✅（v1.5.5〜v1.5.11）

- パスワード認証（`1108`）
- マスタスニペットの内容・説明編集
- マスタスニペットの削除
- マスタフォルダへのスニペット追加
- マスタフォルダの追加・削除
- XML エクスポート機能
- Backspace バグ修正

#### 6. XML エクスポート機能 ✅（v1.5.5）

- チェックボックス式フォルダ選択
- Clipy 互換形式で出力
- `generateClipyXML()` 関数で生成

#### 7. Google Drive 同期の改善 ✅（v1.5.5）

- 5 分ごとの定期同期を削除（起動時のみに変更）
- ローカル編集が上書きされる問題を解決

#### 8. 設定画面（settings.html）完成 ✅（v1.5.5〜v1.5.12）

- 5 タブ構成（一般、ホットキー、同期、表示、更新）
- 名前入力欄追加（変数機能用）
- ウィンドウ表示位置設定
- フォルダ非表示設定
- マニュアルへのリンク追加
- 手動アップデートチェック機能

#### 9. ユーザーマニュアル作成 ✅（v1.5.5）

- 01\_インストール.docx（Mac/Windows 両対応）
- 02\_スニペットを貼り付ける.docx（Mac/Windows 両対応）
- 03\_クリップボード履歴を使う.docx（Mac/Windows 両対応）
- 04\_困ったとき.docx（Mac/Windows 両対応）
- Google Drive にホスト、設定画面からリンク

#### 10. UI 改善 ✅（v1.5.5〜v1.5.12）

- 簡易ホーム・サブメニューに枠線追加（シャドウ → ボーダーに変更）
- スクロールバー幅統一（4px）
- グレー系カラーテーマ調整
- スニペット編集画面のフォントサイズ調整（12px）
- 説明パネル幅拡大（160px → 190px）
- リサイズ時の不要な再計算を防止
- **マウスホバーでフォーカス、クリックで実行**（簡易ホーム 2 種）
- **キーボードナビゲーション改善**（右矢印でサブメニューフォーカス移動）

#### 11. バグ修正 ✅（v1.5.12）

- 個別スニペットへのマスタフォルダ混入バグ修正
- 空マスタフォルダでもマスタ編集ボタン表示

#### 12. 履歴専用ウィンドウ実装 ✅（v1.5.13）

- 専用ホットキー: Mac `Command+Control+X` / Windows `Ctrl+Alt+X`
- blur-to-hide 機能
- フォーカスリセット機能
- history.html として独立実装

#### 13. 履歴グループ表示バグ修正 ✅（v1.5.15）

- 16-30、31-45 などのグループが正しく表示されない問題を修正
- data-group-index 方式に変更

#### 14. アップデートチェック UX 改善 ✅（v1.5.15）

- 「最新の状態です」と「確認に失敗しました」を区別して表示
- エラー時の詳細メッセージ表示

#### 15. マスタフォルダ同期バグ修正 ✅（v1.5.16）

- XML から削除されたマスタフォルダが残り続ける問題を修正
- `syncSnippets()` で `masterFolders` も更新するように改善

**Phase 2 完了日**: 2025-11-29（v1.5.16）

---

## 🛠️ 開発ルール

### コード修正時の基本ルール

1. **提案してから実装**: 修正内容を先に提示して許可を得る
2. **場所を明示**: ファイル名、行番号、修正タイプ（追加/削除/置換）を明記
3. **部分修正**: `str_replace` で部分修正、新規ファイルのみ `create_file`
4. **完全なコード**: ユーザーが手動で編集できるよう、修正箇所を含む完全なコードを提示
5. **共通化チェック**: 新しいコードを書く前に必ず「これ、common/ に入れられないか?」を確認

### デバッグ方法

- **VSCode ターミナル出力**: `ipcRenderer.send('log', 'message')`
- **ブラウザ開発者ツールは使わない**（ユーザーに見せない）

### コードスタイル

- **コメント**: 日本語 OK
- **インデント**: 2 スペース
- **文字列**: シングルクォート推奨

---

## 🔍 トラブルシューティング

### ホットキーが効かない

**原因 1: IME 有効時**

- 日本語入力中はホットキーが効かない
- 対処: IME をオフ（英数モード）にする

**原因 2: 他アプリとの競合**

- 対処: 別のホットキーに変更

**原因 3: 起動直後**

- 対処: アプリを再起動（ホットキー登録のリトライ機能が動く）

### Google Drive 同期が失敗する

**原因 1: URL 不正**

- 正しい形式: `https://drive.google.com/file/d/FILE_ID/view`

**原因 2: 共有設定**

- 「リンクを知っている全員」に設定

**原因 3: XML 形式エラー**

- Clipy からエクスポートしたファイルか確認

### ウィンドウが別の Space に移動する（Mac）

**原因**: macOS の仮想デスクトップ機能
**対処**: `visibleOnAllWorkspaces: true` が設定されているか確認

### 自動アップデートが動かない

**原因 1: 開発環境**

- `app.isPackaged` が false（開発中）
- 対処: ビルドしたアプリでテスト

**原因 2: GitHub Release が下書き**

- 対処: GitHub Releases で「Publish release」をクリック

**原因 3: GH_TOKEN が切れている**

- 対処: 新しいトークンを作成して環境変数を更新

**原因 4: リポジトリが Private**

- electron-updater は Public リポジトリにしかアクセスできない
- 対処: Settings → Danger Zone → Change visibility → Make public

### アップデート確認に失敗する

**原因**: GitHub リポジトリが Private になっている

**対処**:

1. https://github.com/tetete478/snipee → Settings
2. Danger Zone → Change visibility
3. Make public を選択

### マスタ編集が保存されない

**原因**: Google Drive 同期で上書きされる

**対処**:

- 同期は起動時のみなので、編集後にアプリを終了しない
- 編集後は XML エクスポート → Google Drive に上書き

### Mac で「壊れているため開けません」と表示される

**原因**: macOS の Gatekeeper がアプリをブロック

**対処法 1: ターミナルで解除（確実）**

```bash
xattr -cr /Applications/Snipee.app
```

**対処法 2: システム設定から許可**

1. システム設定 → プライバシーとセキュリティ
2. 下の方に「"Snipee"は開発元を確認できないため〜」と表示
3. 「このまま開く」をクリック

**対処法 3: 右クリックで開く**

1. Finder で Snipee.app を右クリック
2. 「開く」を選択
3. 警告ダイアログで「開く」をクリック

---

## 📚 関連ドキュメント

- **HANDOVER.md**: このファイル（開発者向け）
- **UPDATE_LOG.md**: 更新履歴（ユーザー向け）
- **manuals/**: ユーザーマニュアル（Google Drive）

---

## 🎓 参考資料

- [Electron 公式ドキュメント](https://www.electronjs.org/docs)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [electron-updater](https://www.electron.build/auto-update)
- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)
- [Clipy](https://clipy-app.com/)

---

**開発者**: てるや  
**最終更新**: 2025-11-29  
**現在のバージョン**: v1.5.16
