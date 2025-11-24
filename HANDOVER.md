# Snipee 開発引き継ぎドキュメント

**バージョン**: v1.5.3  
**最終更新**: 2025-11-24  
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

### 配布方針（最重要）

- **ダブルクリックで起動**（Node.js 不要）
- electron-builder で実行可能ファイル生成
- 非エンジニアでも簡単に使える
- **自動アップデート**でユーザーは何もしなくて OK

### ワークフロー

1. てるやが Clipy で個人用スニペット管理
2. Clipy からスニペットを**XML 形式**でエクスポート
3. Google Drive にアップロード
4. チームメンバーが Snipee で同期して使用

---

## 🔧 技術スタック

- **フレームワーク**: Electron
- **データ保存**: electron-store
- **XML 解析**: xml2js（Clipy 互換）
- **自動ペースト**: robotjs（Windows）
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

# 2. バージョンを上げる（自動でgit commit & tagも作成）
npm version patch   # 1.5.3 → 1.5.4（バグ修正）
npm version minor   # 1.5.3 → 1.6.0（機能追加）
npm version major   # 1.5.3 → 2.0.0（大きな変更）

# 3. ビルド＆GitHub Releasesにアップロード
npm run publish        # Mac版をビルド＆公開
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
└── MANUAL.md                 # ユーザーマニュアル
```

---

## 🎯 現在の状態（v1.5.3）

### ✅ 実装済み機能

#### コード品質・メンテナンス性

- **CSS/JavaScript 共通化**:
  - `common/variables.css`: 色、フォントサイズ、余白などの定数管理
  - `common/common.css`: 全ページ共通スタイル（レイアウト、スクロールバー、サブメニューなど）
  - `common/utils.js`: 共通 JavaScript 関数（HTML エスケープ、データ処理、サブメニュー管理、KeyboardNavigator クラスなど）
- **コード重複削除**: escapeHtml、escapeAttr、groupByFolder などの重複関数を削除
- **一貫性のあるデザイン**: CSS 変数で統一されたカラースキームとスペーシング
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
- 統一されたサブメニュースタイル（index.html ⇄ snippets.html）

#### 自動アップデート

- GitHub Releases 経由の自動アップデート
- 起動時にバージョンチェック
- バックグラウンドでダウンロード
- ダイアログで再起動を促す

#### ホットキー

- **デフォルト**:
  - Mac: `Command+Control+C/V`
  - Windows: `Ctrl+Alt+C/V`
- カスタマイズ可能
- リトライ機能実装

### ⚠️ 既知の制限

- Mac 自動ペースト未実装（macOS 制限）
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

### 8. ❌ Windows 自動ペースト問題

**失敗**: Enter キー押してもペーストされない  
**原因**: ウィンドウが閉じる前に Enter 処理が走る、フォーカスが戻らない  
**解決**: ウィンドウを非表示 → 150ms 待機 → フォーカス復帰 → ペースト実行  
**教訓**: Windows 環境ではタイミング調整が必須

### 9. ✅ DRY 原則（Don't Repeat Yourself）の徹底

**原則**: 同じコードを 2 回書かない  
**実践**: 共通化できるコードは必ず `common/` ディレクトリに移動  
**教訓**: コードレビュー時に「これ、他のファイルにもありませんか？」を必ず確認

---

## 🚀 次にやること（優先順位順）

### 🔴 優先度：高

#### 1. 全 Window 機能の統一（Phase 2）

**現状**: index.html と snippets.html で挙動が微妙に違う

**統一項目**:

- キーボード操作（↑↓←→Enter Esc）
- サブメニュー表示ロジック
- ウィンドウ閉じる挙動
- ホットキートグル動作

**作業見積もり**: 1〜2 セッション

---

#### 2. Windows 自動ペーストの確認・安定化（Phase 2）

**現状**: robotjs で実装済みだが、まだ不安定な可能性

**確認項目**:

- 複数アプリでテスト（Excel, Word, Chrome, VSCode）
- 日本語・英語入力中のテスト
- IME 有効/無効でのテスト
- タイミング調整（150ms → 調整必要なら変更）

**Windows テスト項目**:

```
□ 起動テスト
  - アプリが正常に起動するか
  - ホットキーが登録されるか
  - ウィンドウが表示されるか

□ ペーストテスト
  - クリップボード履歴からペースト
  - マスタスニペットからペースト
  - 個別スニペットからペースト

□ 自動ペーストテスト
  - Excel → 自動ペースト動作確認
  - Word → 自動ペースト動作確認
  - Chrome → 自動ペースト動作確認
  - VSCode → 自動ペースト動作確認
  - メモ帳 → 自動ペースト動作確認
  - 日本語IME有効時の動作確認
  - 英語入力時の動作確認
```

**作業見積もり**: 1 セッション（テスト中心）

---

#### 3. Mac 自動ペーストの実装（Phase 2）

**現状**: macOS 制限により未実装

**推奨実装**: AppleScript + System Events

```javascript
// main.js
const { exec } = require("child_process");

function pasteOnMac(text) {
  clipboard.writeText(text);

  const script = `
    tell application "System Events"
      keystroke "v" using command down
    end tell
  `;

  exec(`osascript -e '${script}'`, (error) => {
    if (error) console.error("Paste failed:", error);
  });
}
```

**メリット**: 追加ツール不要、macOS 標準機能のみ  
**注意**: アクセシビリティ権限が必要

**作業見積もり**: 1〜2 セッション

---

### 🟡 優先度：中

#### 4. タグ管理機能（Phase 3）

**目的**: フォルダとは独立した分類軸を追加

**タグの種類**:

- **マスタスニペットタグ**: 管理者が設定、チーム全体で共有
- **個別スニペットタグ**: 個人が自由に設定、ローカル保存

**実装内容**:

- master-metadata.json で説明 + マスタタグを管理
- スニペット編集画面にタグ入力欄追加
- タグクリックでフィルタリング機能

**作業見積もり**: 2〜3 セッション

---

#### 5. スニペット変数機能（Phase 3）

**目的**: テンプレート変数でスニペットを動的に生成

**変数例**:

```
{日付}     → 2025/01/23
{時刻}     → 14:30
{名前}     → 小松（設定で定義）
{会社名}   → テルヤ株式会社（設定で定義）
{カーソル} → ペースト後のカーソル位置
```

**実装箇所**:

- settings.html: 変数定義 UI 追加
- main.js: 変数置換ロジック追加

**作業見積もり**: 1〜2 セッション

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

### 🟢 優先度：低

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

#### 8. インストール時の自動同期（Phase 4）

**目的**: 初心者が設定なしで使える

**実装案**: デフォルト URL 埋め込み or 初回起動時セットアップウィザード

---

#### 9. ホットキー設定の拡張（Phase 4）

**拡張案**:

- 履歴専門 Window 用のホットキー追加
- スニペット検索用のホットキー追加

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

**共通化された CSS**:

- サブメニュー用スクロールバースタイル（グレー系）
- サブメニューコンテナスタイル（`.submenu-overlay`, `.submenu-container`）

#### 2. 未使用コードの削除 ✅

**v1.5.2 で削除（約 280 行）**:

- main.js から submenu 関連コードを完全削除:
  - submenu 関連変数: 3 個（`submenuWindow`, `isMouseOverSubmenu`, `submenuCloseTimer`）
  - submenu 関連関数: 3 個（`createSubmenuWindow()`, `showSubmenu()`, `hideSubmenu()`）
  - submenu 関連 IPC ハンドラー: 9 個
- permission-guide.html から未使用 CSS クラスを削除（約 23 行）
- index.html のサブメニュー構造を snippets.html と統一
- index.html の重複 CSS を削除し common.css に移動

**v1.5.0〜v1.5.1 で削除（約 320 行）**:

- submenu.html ファイル完全削除
- デバッグログ、開発メモコメント、未使用変数の削除

**総削減**: 約 790 行（v1.5.0〜v1.5.3 累計）

#### 3. デザイン統一 ✅

- CSS 変数で一括変更可能
- フォントサイズ統一（11px/13px）
- 余白統一
- カラースキーム統一
- サブメニュースタイル統一（index.html ⇄ snippets.html）

#### 4. メンテナンス性向上 ✅

- 定数ファイルで共有設定管理
- コメント追加（日本語 OK）
- 関数の責務を明確に
- DRY 原則の徹底

#### 5. キーボードナビゲーション共通化 ✅（v1.5.3）

**KeyboardNavigator クラス**:

- index.html、snippets.html、settings.html で共通使用
- 約 190 行のコード削減
- メイン選択とサブメニュー選択を一元管理

#### 6. デザイン刷新 ✅（v1.5.3）

**Steve Jobs 風グレーテーマ**:

- 背景: 真っ白 → 薄いグレー（`#f7f7f7`）
- プライマリ: 青 → グレー（`#8a8a8a`）
- 影: 軽量化（`0 4px 16px rgba(0,0,0,0.12)`）
- 角丸: 12px → 8px（よりフラット）
- アイコン: 絵文字 → 線画風 Unicode 記号

#### 7. 設定画面キーボードナビゲーション ✅（v1.5.3）

- `←` `→`: タブ切り替え
- `↑` `↓`: タブ内アイテム選択
- `Enter`: 選択実行
- `Esc`: 設定画面を閉じる

#### 8. スニペット編集画面ペイン移動 ✅（v1.5.3）

- `→`: sidebar → content → description
- `←`: description → content → sidebar
- `Esc`: sidebar に戻る

#### 9. 自動アップデート機能 ✅（v1.5.3）

- electron-updater + GitHub Releases
- 起動時に自動でバージョンチェック
- バックグラウンドでダウンロード
- ダイアログで再起動を促す

**Phase 1 完了日**: 2025-11-24（v1.5.3）

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

- 正しい形式: `https://drive.google.com/uc?export=download&id=FILE_ID`

**原因 2: 共有設定**

- 「リンクを知っている全員」に設定

**原因 3: XML 形式エラー**

- Clipy からエクスポートしたファイルか確認

### ウィンドウが別の Space に移動する（Mac）

**原因**: macOS の仮想デスクトップ機能
**対処**: `visibleOnAllWorkspaces: true` が設定されているか確認

### Windows 版でビルドに失敗する

**原因**: robotjs のネイティブモジュールビルド
**対処**:

```bash
npm rebuild robotjs --runtime=electron --target=XX.X.X --disturl=https://electronjs.org/headers --abi=XXX
```

### 自動アップデートが動かない

**原因 1: 開発環境**

- `app.isPackaged` が false（開発中）
- 対処: ビルドしたアプリでテスト

**原因 2: GitHub Release が下書き**

- 対処: GitHub Releases で「Publish release」をクリック

**原因 3: GH_TOKEN が切れている**

- 対処: 新しいトークンを作成して環境変数を更新

---

## 📚 関連ドキュメント

- **HANDOVER.md**: このファイル（開発者向け）
- **UPDATE_LOG.md**: 更新履歴（ユーザー向け）
- **MANUAL.md**: ユーザーマニュアル（GitHub 公開）

---

## 🎓 参考資料

- [Electron 公式ドキュメント](https://www.electronjs.org/docs)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [electron-updater](https://www.electron.build/auto-update)
- [robotjs](https://github.com/octalmage/robotjs)
- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)
- [Clipy](https://clipy-app.com/)

---

**開発者**: てるや  
**最終更新**: 2025-11-24  
**現在のバージョン**: v1.5.3
