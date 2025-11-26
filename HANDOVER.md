# Snipee 開発引き継ぎドキュメント

**バージョン**: v1.5.5  
**最終更新**: 2025-11-27  
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
- **XMLエクスポート機能**（Clipy互換形式で出力）

### 配布方針（最重要）

- **ダブルクリックで起動**（Node.js 不要）
- electron-builder で実行可能ファイル生成
- 非エンジニアでも簡単に使える
- **自動アップデート**でユーザーは何もしなくて OK

### ワークフロー

**従来のフロー（Clipy経由）** ※もう使わなくてOK:
1. てるやが Clipy で個人用スニペット管理
2. Clipy からスニペットを**XML 形式**でエクスポート
3. Google Drive にアップロード
4. チームメンバーが Snipee で同期して使用

**新フロー（Snipee完結）** ⭐推奨:
1. Snipeeでマスタ編集モードON（パスワード: `1108`）
2. スニペットの追加・編集・削除を実行
3. XMLエクスポート → Google Driveに上書き
4. チームメンバーがSnipee起動時に自動同期

**⚡ Clipyはもう使わなくてOK！Snipeeだけで完結！**

---

## 🔧 技術スタック

- **フレームワーク**: Electron
- **データ保存**: electron-store
- **XML 解析**: xml2js（Clipy 互換）
- **自動ペースト（Windows）**: PowerShell SendKeys（ネイティブモジュール不要）
- **自動ペースト（Mac）**: AppleScript + Bundle ID方式（元アプリに確実に戻る）
- **自動アップデート**: electron-updater + GitHub Releases
- **ビルド**: electron-builder

---

## 🚀 リリース手順（自動アップデート）

### 初回セットアップ（1 回だけ）

#### 1. GitHub Personal Access Token を作成

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
git commit -m "v1.5.5: 変更内容"
git push

# 3. バージョンを上げる（自動でgit commit & tagも作成）
npm version patch   # 1.5.4 → 1.5.5（バグ修正）
npm version minor   # 1.5.4 → 1.6.0（機能追加）
npm version major   # 1.5.4 → 2.0.0（大きな変更）

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

### トラブルシューティング

| 問題                            | 原因             | 解決策                                |
| ------------------------------- | ---------------- | ------------------------------------- |
| `npm run publish` が失敗        | GH_TOKEN 未設定  | `echo $GH_TOKEN` で確認、設定し直す   |
| Releases にアップロードされない | トークン権限不足 | トークン作成時に `repo` にチェック    |
| ユーザーに更新通知が来ない      | Draft 状態のまま | GitHub Releases で「Publish release」 |

---

## 📂 プロジェクト構造
```
snipee/
├── main.js                    # メインプロセス
├── app/
│   ├── index.html             # 簡易ホーム（クリップボード履歴）
│   ├── snippets.html          # スニペット専用ホーム
│   ├── snippet-editor.html    # スニペット編集画面
│   ├── settings.html          # 設定画面
│   ├── permission-guide.html  # アクセシビリティ権限ガイド
│   └── common/
│       ├── variables.css      # CSS変数（色、サイズ、余白など）
│       ├── common.css         # 共通スタイル（レイアウト、スクロールバー、サブメニューなど）
│       └── utils.js           # 共通JavaScript関数（KeyboardNavigatorクラス含む）
├── HANDOVER.md               # このファイル
├── UPDATE_LOG.md             # 更新履歴（ユーザー向け）
└── manuals/                  # ユーザーマニュアル（Google Drive）
    ├── 01_インストール.docx
    ├── 02_スニペットを貼り付ける.docx
    ├── 03_クリップボード履歴を使う.docx
    └── 04_困ったとき.docx
```

---

## 🎯 現在の状態（v1.5.5 正式リリース）

### ✅ 実装済み機能

#### 変数機能（v1.5.5で実装完了）

スニペット内に以下の変数を記述すると、貼り付け時に自動置換される：

| 変数 | 出力例 | 説明 |
|------|--------|------|
| `{今日:MM/DD}` | `11/27` | 今日の日付 |
| `{明日:MM/DD}` | `11/28` | 明日の日付 |
| `{2日後:M月D日:曜日短（毎月1日は除外して3日後）}` | `11月29日（金）` | 2日後（1日なら3日後に自動調整） |
| `{3日後:M月D日:曜日短（毎月1日は除外して4日後）}` | `11月30日（土）` | 3日後（1日なら4日後に自動調整） |
| `{タイムスタンプ}` | `2024/11/27 14:30:45` | 年月日＋時分秒 |
| `{名前}` | `小松` | 設定画面で登録した名前 |

**実装箇所**: `main.js` の `replaceVariables()` 関数

#### マスタ編集モード（v1.5.5で実装）

- **パスワード認証**: `1108` で有効化
- **編集可能な操作**:
  - マスタスニペットの内容・説明の編集 ✅
  - マスタスニペットの削除 ⚠️ 未完成（後述のTODO参照）
  - マスタフォルダへのスニペット追加 ⚠️ 未完成（後述のTODO参照）
  - マスタフォルダの追加・削除 ⚠️ 未完成（後述のTODO参照）
- **実装箇所**: `snippet-editor.html` の `showMasterPasswordDialog()`, `verifyMasterPassword()`

#### XMLエクスポート機能（v1.5.5で実装完了）

- **Clipy互換形式**で出力
- **チェックボックス式フォルダ選択**: エクスポートするフォルダを選択可能
- **実装箇所**: `snippet-editor.html` の `showExportDialog()`, `executeExport()`, `generateClipyXML()`

#### Mac自動ペースト（v1.5.5で実装完了）

- **Bundle ID方式**: ホットキー押下時に元アプリのBundle IDを記憶
- **確実なアプリ復帰**: `tell application id "xxx" to activate` で元アプリに戻る
- **実装箇所**: `main.js` の `registerGlobalShortcuts()`, `paste-text` ハンドラ
```javascript
// ホットキー押下時にBundle IDを取得
const bundleId = execSync('osascript -e \'tell application "System Events" to get bundle identifier of first application process whose frontmost is true\'').toString().trim();

// ペースト時に元アプリをアクティブ化
exec(`osascript -e 'tell application id "${previousActiveApp}" to activate'`);
```

#### Google Drive同期

- **同期タイミング**: アプリ起動時のみ（5分ごとの定期同期は削除済み）
- **手動同期**: 設定画面の「今すぐ同期」ボタン
- **XMLの並び順**: そのまま反映される

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

#### スニペット管理

- **マスタスニペット**: Google Drive XML 同期（Clipy 互換）
- **個別スニペット**: ローカル保存
- フォルダ階層管理
- ドラッグ&ドロップで並び替え（同一フォルダ内のみ）
- ダブルクリックで名前編集

#### UI/UX

- Clipy 風コンパクトデザイン
- キーボード完全操作
- インラインサブメニュー（単一 HTML 内）
- Steve Jobs 風ミニマリストデザイン（グレーテーマ）
- 簡易ホーム・サブメニューに枠線（視認性向上）
- スクロールバー幅統一（4px）

#### 自動アップデート

- GitHub Releases 経由の自動アップデート
- 起動時にバージョンチェック
- バックグラウンドでダウンロード
- ダイアログで再起動を促す

#### 自動ペースト

- **Windows**: PowerShell SendKeys で実装
- **Mac**: AppleScript + Bundle ID方式で実装

#### ホットキー

- **デフォルト**:
  - Mac: `Command+Control+C/V`
  - Windows: `Ctrl+Alt+C/V`
- カスタマイズ可能
- リトライ機能実装

#### マニュアル（v1.5.5で実装完了）

- **Mac/Windows両対応の完全版マニュアル4部作**
- 設定画面の「一般」タブからリンクでアクセス可能
- Google Driveでホスト

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
**解決**: PowerShell（Windows）/ AppleScript（Mac）で OS 標準機能を使用  
**教訓**: ネイティブモジュールは依存関係が複雑になるため、OS 標準機能で代替できないか検討

### 9. ✅ DRY 原則（Don't Repeat Yourself）の徹底

**原則**: 同じコードを 2 回書かない  
**実践**: 共通化できるコードは必ず `common/` ディレクトリに移動  
**教訓**: コードレビュー時に「これ、他のファイルにもありませんか？」を必ず確認

### 10. ✅ Mac自動ペーストはBundle ID方式で

**失敗**: アプリ名で復帰しようとすると、同名の別アプリに切り替わることがある  
**解決**: Bundle IDを使って正確に元アプリを特定  
**教訓**: macOSではアプリ名よりBundle IDの方が信頼できる

---

## 🚀 次にやること（優先順位順）

### 🔴 優先度：高（バグ修正・機能不完全）

#### 1. マスタ編集モードの完全実装 ⚠️

**現状**: マスタ編集モードONにしても、削除・追加が正しく動作しない

**問題点**:
- マスタスニペット削除 → 動作しない or エラー
- マスタフォルダへのスニペット追加 → **個別スニペットの方に追加されてしまう**
- マスタフォルダの追加 → **個別フォルダとして追加されてしまう**
- マスタフォルダの削除 → 動作しない or エラー

**修正方針**:
- `addSnippet()` でマスタフォルダ判定時に `save-master-snippet` を呼ぶ
- `addFolder()` でマスタ編集モード時に別の保存先を使う
- `deleteSnippet()`, `deleteFolder()` でマスタ判定を正しく行う

**作業見積もり**: 1セッション

---

### 🟡 優先度：中

#### 2. Windows 環境での動作確認

- 全機能テスト（自動ペースト、ホットキー、UI）
- 各種 Windows アプリでの互換性チェック

**作業見積もり**: 1 セッション

---

#### 3. ホットキー登録可能な組み合わせの確認・ドキュメント化

- 登録可能なホットキーの組み合わせを整理
- 制限事項（IME、他アプリとの競合など）を明確化
- ユーザーマニュアルに反映

---

#### 4. XML スニペット仕様の説明ドキュメント

- Clipy 互換 XML 形式の詳細
- フォルダ階層、改行、特殊文字の扱い
- 変数の記述方法

---

### 🟢 優先度：低

#### 5. タグ管理機能（Phase 3）

**目的**: フォルダとは独立した分類軸を追加

**タグの種類**:
- **マスタスニペットタグ**: 管理者が設定、チーム全体で共有
- **個別スニペットタグ**: 個人が自由に設定、ローカル保存

**作業見積もり**: 2〜3 セッション

---

#### 6. 履歴専門 Window（Phase 3）

**目的**: クリップボード履歴に特化した専用画面

**機能**:
- より広い画面（例：600x700）
- 検索機能（履歴内を全文検索）
- 日付でフィルタ
- ピン留め管理
- 履歴の一括エクスポート（CSV/JSON）

**ホットキー案**: `Command+Control+H` / `Ctrl+Alt+H`

**作業見積もり**: 2〜3 セッション

---

#### 7. リリース前のバグ探し（Phase 4）

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

### Phase 2: 自動ペースト・変数機能（完了 - v1.5.5）

#### 1. Windows 自動ペーストを PowerShell に変更 ✅（v1.5.4）

**変更理由**:

- robotjs はネイティブモジュールでビルド問題が発生しやすい
- Electron バージョンとの互換性問題

**新実装**:
```javascript
exec(
  "powershell -command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')\""
);
```

**メリット**:

- ネイティブモジュール不要
- Windows 標準機能で確実
- ビルド問題なし

#### 2. Mac 自動ペースト実装 ✅（v1.5.5）

**実装方式**: Bundle ID + AppleScript
```javascript
// ホットキー押下時にBundle IDを取得・記憶
const bundleId = execSync('osascript -e \'tell application "System Events" to get bundle identifier of first application process whose frontmost is true\'').toString().trim();
previousActiveApp = bundleId;

// ペースト時に元アプリをアクティブ化
exec(`osascript -e 'tell application id "${previousActiveApp}" to activate'`);

// Cmd+Vを送信
exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
```

**メリット**:

- アプリ名ではなくBundle IDで特定するため確実
- 追加ツール不要、macOS標準機能のみ

#### 3. 変数機能実装 ✅（v1.5.5）

**実装した変数**:

| 変数 | 出力例 | 説明 |
|------|--------|------|
| `{今日:MM/DD}` | `11/27` | 今日の日付 |
| `{明日:MM/DD}` | `11/28` | 明日の日付 |
| `{2日後:M月D日:曜日短（毎月1日は除外して3日後）}` | `11月29日（金）` | 2日後（1日除外） |
| `{3日後:M月D日:曜日短（毎月1日は除外して4日後）}` | `11月30日（土）` | 3日後（1日除外） |
| `{タイムスタンプ}` | `2024/11/27 14:30:45` | 年月日＋時分秒 |
| `{名前}` | `小松` | 設定画面で登録した名前 |

**実装箇所**: `main.js` の `replaceVariables()` 関数

#### 4. マスタ編集モード実装 ✅（v1.5.5）

- パスワード認証（`1108`）
- マスタスニペットの内容・説明編集
- XMLエクスポート機能
- Backspaceバグ修正

#### 5. XMLエクスポート機能 ✅（v1.5.5）

- チェックボックス式フォルダ選択
- Clipy互換形式で出力
- `generateClipyXML()` 関数で生成

#### 6. Google Drive同期の改善 ✅（v1.5.5）

- 5分ごとの定期同期を削除（起動時のみに変更）
- ローカル編集が上書きされる問題を解決

#### 7. 設定画面（settings.html）完成 ✅（v1.5.5）

- 3タブ構成（一般、ホットキー、スニペット）
- 名前入力欄追加（変数機能用）
- ウィンドウ表示位置設定
- フォルダ非表示設定
- マニュアルへのリンク追加

#### 8. ユーザーマニュアル作成 ✅（v1.5.5）

- 01_インストール.docx（Mac/Windows両対応）
- 02_スニペットを貼り付ける.docx（Mac/Windows両対応）
- 03_クリップボード履歴を使う.docx（Mac/Windows両対応）
- 04_困ったとき.docx（Mac/Windows両対応）
- Google Driveにホスト、設定画面からリンク

#### 9. UI改善 ✅（v1.5.5）

- 簡易ホーム・サブメニューに枠線追加（シャドウ→ボーダーに変更）
- スクロールバー幅統一（4px）
- グレー系カラーテーマ調整
- スニペット編集画面のフォントサイズ調整（12px）
- 説明パネル幅拡大（160px → 190px）
- リサイズ時の不要な再計算を防止

**Phase 2 完了日**: 2025-11-27（v1.5.5）

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

### マスタ編集が保存されない

**原因**: Google Drive同期で上書きされる

**対処**: 
- 同期は起動時のみなので、編集後にアプリを終了しない
- 編集後はXMLエクスポート → Google Driveに上書き

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
**最終更新**: 2025-11-27  
**現在のバージョン**: v1.5.5