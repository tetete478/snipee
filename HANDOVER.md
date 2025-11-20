# Snipee 開発引き継ぎドキュメント

**最終更新**: 2025 年 11 月 20 日  
**現在のバージョン**: 1.3.0

---

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [ファイル構成](#ファイル構成)
4. [開発履歴](#開発履歴)
5. [重要な実装ポイント](#重要な実装ポイント)
6. [トラブルシューティング](#トラブルシューティング)
7. [今後の拡張案](#今後の拡張案)

---

## プロジェクト概要

### 目的

Snipee は、Clipy の代替として開発されたクロスプラットフォーム対応のクリップボード管理＆スニペット管理ツールです。

### 主な機能

- **クリップボード履歴管理**: 最大 100 件の履歴を自動保存
- **スニペット管理**: 個別スニペット（ローカル）＋マスタースニペット（Google Drive 同期）
- **ホットキー対応**: カスタマイズ可能なショートカットキー
- **フォルダ管理**: スニペットをフォルダで整理
- **自動ペースト**: クリップボードへのコピー＋自動貼り付け

### 技術スタック

- **Electron**: デスクトップアプリケーションフレームワーク
- **electron-store**: データ永続化
- **axios**: HTTP 通信（Google Drive 連携）
- **xml2js**: XML 解析（Clipy 互換性）

---

## アーキテクチャ

### プロセス構成

```
main.js (Mainプロセス)
├── index.html (簡易ホーム: 履歴＋スニペット)
├── snippets.html (スニペット専用ホーム)
├── snippet-editor.html (スニペット編集ウィンドウ)
├── settings.html (環境設定)
└── permission-guide.html (Mac権限案内)
```

### データフロー

```
1. クリップボード監視 (500ms間隔)
   ↓
2. electron-store に保存
   ↓
3. ウィンドウに送信 (IPC通信)
   ↓
4. UI更新
```

### Google Drive 連携

```
1. ClipyからXMLエクスポート
   ↓
2. Google Driveにアップロード
   ↓
3. 共有リンクを設定に登録
   ↓
4. 5分ごとに自動同期
```

---

## ファイル構成

### 主要ファイル

```
clipy-windows-with-permission/
├── app/
│   ├── main.js                    # メインプロセス
│   ├── index.html                 # 簡易ホーム
│   ├── snippets.html              # スニペット専用ホーム
│   ├── snippet-editor.html        # スニペット編集
│   ├── settings.html              # 環境設定
│   └── permission-guide.html      # Mac権限案内
├── build/
│   ├── icon.png                   # アイコン (Mac)
│   └── icon.ico                   # アイコン (Windows)
├── package.json                   # 依存関係
└── README.md                      # プロジェクト説明
```

### ⚠️ 削除されたファイル

- ~~`submenu.html`~~: v1.3.0 でインラインサブメニューに統一したため削除

### データ保存先

- **Mac**: `~/Library/Application Support/Snipee/config.json`
- **Windows**: `%APPDATA%\Snipee\config.json`

---

## 開発履歴

### Version 1.0.0 (2025-11-11)

**🎉 初回リリース**

- クリップボード履歴管理（最大 100 件）
- Google Drive 連携による共有スニペット
- ホットキーカスタマイズ
- フォルダの表示/非表示設定
- Mac 権限管理
- クロスプラットフォーム対応

---

### Version 1.1.0 (2025-11-11)

**🎯 新機能**

- **ウィンドウ位置の記憶**: 前回の位置に表示可能（環境設定で切り替え）
- **クリップボード履歴のピン留め**: よく使う項目を常に上部に表示

**🔧 改善**

- スニペット専用ホームの表示位置を調整
- サブメニューの幅を 160px→200px に拡大
- サブメニューのテキストを 1 行表示（25 文字以上は省略）
- 起動時のログ削除（本番環境用に最適化）
- サブメニューの高さを可変にして全項目を表示
- アイコンを変更（履歴: 📄、フォルダ: 📁）
- フッターを 2 段表示に変更
- フォントサイズを 13px に統一
- アクションアイテムのフォントサイズを 12px に調整
- サブメニューのスクロール速度を改善
- ウィンドウの黒枠を削除（hasShadow: false）
- サブメニューのスクロールバーをカスタマイズ（4px 幅、クリーム色）
- 環境設定でヘッダーのみドラッグ可能に

**🐛 バグ修正**

- 履歴データの型情報が失われていた問題を修正
- ピン留めボタンがクリックできなかった問題を修正
- デバッグログを全削除

---

### Version 1.2.0 (2025-11-19)

**🎯 新機能**

- **個別スニペット機能**: ローカル保存の編集可能なスニペットを追加
  - 専用編集ウィンドウ（900×600px）
  - フォルダ分類機能
  - スニペットの CRUD 機能
  - 簡易ホームに「✏️ スニペット編集」メニューを追加
  - 個別スニペットとマスタースニペットを統合表示

**📝 仕様**

- **個別スニペット**: ローカル保存、編集可能、個人用
- **マスタースニペット**: Google Drive 連携、読み取り専用、チーム共有

**🔧 改善**

- `snippet-editor.html` を Clipy ライクなシンプルデザインに変更

  - フォルダ階層表示（折りたたみ可能）
  - Apple ライクな洗練された UI
  - タイトルと内容のみのシンプルな編集エリア
  - 自動保存機能

- `main.js` の修正

  - `createSnippetWindow()` の width を 420px → 210px に変更
  - `positionAndShowSnippet()` のウィンドウ位置計算を修正

- `settings.html` の修正
  - ホットキー変更モーダルの背景クリック処理を追加
  - Esc キーでモーダルを閉じる処理を追加
  - モーダルが残る問題を解決

**🐛 バグ修正**

- スニペット専用ホームで透明な巨大ウィンドウが表示される問題を修正
- ホットキー変更時に「CC」と表示される問題を修正
- モーダルが閉じずに画面操作できなくなる問題を修正

---

### Version 1.3.0 (2025-11-20)

**🎯 新機能**

- **スニペット専用ホームの UI 改善**: インラインサブメニュー構造に統一

**🔧 改善**

- 表示順をマスタ → 個別に統一
- フォントサイズを 11px に統一
- itemHeight を最適化（22px）
- ウィンドウサイズを 460×650px に変更
- サブメニュー幅を 250px に変更
- サブメニューの表示位置を上部から表示

**🐛 バグ修正**

- Electron での複数ウィンドウ間 IPC 通信によるフリーズ問題を修正

**⚠️ 重要な設計変更**

- submenu.html を削除し、インラインサブメニューに統一
- 複数ウィンドウ間の IPC 通信を廃止

---

## 重要な実装ポイント

### 1. ウィンドウサイズと位置

#### 簡易ホーム（index.html）

- **サイズ**: 460×650px
  - メインコンテンツ: 210px
  - サブメニュー用スペース: 250px
- **位置**: カーソル位置 or 前回の位置

#### スニペット専用ホーム（snippets.html）

- **サイズ**: 460×650px
  - メインコンテンツ: 210px
  - サブメニュー用スペース: 250px
- **位置**: カーソル位置 or 前回の位置

#### サブメニュー（インライン）

- **サイズ**: 250× 可変
- **位置**: ウィンドウ上部から margin 10px
- **表示方法**: 同一 HTML 内の `<div class="submenu-overlay">` 内に表示

#### スニペット編集（snippet-editor.html）

- **サイズ**: 900×600px
- **位置**: 画面中央

---

### 2. データ構造

#### クリップボード履歴

```javascript
{
  id: "1234567890",
  content: "テキスト内容",
  timestamp: "2025-11-19T12:00:00.000Z",
  type: "history"
}
```

#### 個別スニペット

```javascript
{
  id: "1234567890",
  title: "スニペットタイトル",
  content: "スニペット内容",
  folder: "フォルダ名"
}
```

#### マスタースニペット（Google Drive）

```javascript
{
  snippets: [
    {
      id: "1234567890",
      title: "スニペットタイトル",
      content: "スニペット内容",
      folder: "フォルダ名",
    },
  ];
}
```

---

### 3. IPC 通信

#### 主要な IPC ハンドラー

```javascript
// データ取得
ipcMain.handle('get-all-items', () => {...})
ipcMain.handle('get-personal-snippets', () => {...})

// データ保存
ipcMain.handle('save-personal-folders', (event, folders) => {...})
ipcMain.handle('save-personal-snippets', (event, snippets) => {...})

// ウィンドウ制御
ipcMain.handle('hide-window', () => {...})
ipcMain.handle('hide-snippet-window', () => {...})
ipcMain.handle('open-snippet-editor', () => {...})

// スニペット操作
ipcMain.handle('paste-text', async (event, text) => {...})
```

---

### 4. ホットキー設定

#### デフォルト設定

- **Mac**:

  - 簡易ホーム: `Option+Shift+C`
  - スニペット専用: `Option+Shift+V`

- **Windows**:
  - 簡易ホーム: `Alt+Shift+C`
  - スニペット専用: `Alt+Shift+V`

#### カスタマイズ方法

1. 環境設定を開く
2. ホットキー設定セクション
3. 「変更」ボタンをクリック
4. 新しいキーの組み合わせを押す
5. 「保存」ボタンをクリック

---

### 5. Google Drive 連携

#### XML ファイルの構造（Clipy 互換）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<folders>
  <folder>
    <title>フォルダ名</title>
    <snippets>
      <snippet>
        <title>スニペットタイトル</title>
        <content>スニペット内容</content>
      </snippet>
    </snippets>
  </folder>
</folders>
```

#### 同期処理

1. Google Drive 共有リンクを URL に変換
2. `https://drive.usercontent.google.com/download?id={fileId}&export=download&confirm=t`
3. XML をダウンロード
4. `xml2js` でパース
5. `electron-store` に保存
6. 5 分ごとに自動同期

---

### 6. Mac 権限管理

#### アクセシビリティ権限の必要性

自動ペースト機能を使用するために、Mac ではアクセシビリティ権限が必要です。

#### 権限チェック

```javascript
function hasAccessibilityPermission() {
  if (process.platform !== "darwin") return true;
  return systemPreferences.isTrustedAccessibilityClient(false);
}
```

#### 権限リクエスト

```javascript
function requestAccessibilityPermission() {
  if (process.platform !== "darwin") return;
  systemPreferences.isTrustedAccessibilityClient(true);
}
```

---

### 7. Electron での複数ウィンドウ間 IPC 通信の問題

#### 問題

- 複数の BrowserWindow 間でキーボードイベントや IPC 通信を行うと、フォーカス管理が複雑になりフリーズ・エラーが発生
- 特にサブメニューのような短時間で開閉するウィンドウは不安定

#### 解決策

- サブメニューは**別ウィンドウではなく、同じ HTML 内にインラインで実装**
- `<div class="submenu-overlay">` として同一ファイル内に配置
- キーボード操作も全て 1 つの JavaScript 内で完結

#### 成功パターン

- `index.html`（簡易ホーム）: インラインサブメニュー ✅
- `snippets.html`（スニペット専用ホーム）: インラインサブメニュー ✅

#### NG パターン

- ~~`submenu.html` として別ウィンドウを作る~~ ❌
- ~~`ipcRenderer.send('submenu-closed')` で通信~~ ❌

**これは非常に重要な設計原則です！**

---

## トラブルシューティング

### 問題 0: サブメニューが表示されない / フリーズする

**原因**: submenu.html を使った別ウィンドウ方式を使用している

**解決方法**: インラインサブメニュー方式に変更

```javascript
// ❌ NG: 別ウィンドウ方式
const submenuWindow = new BrowserWindow({ ... });
submenuWindow.loadFile('submenu.html');

// ✅ OK: インライン方式
<div class="submenu-overlay">
  <div class="submenu-container" id="inline-submenu"></div>
</div>
```

`index.html` と `snippets.html` は両方ともインラインサブメニュー方式を採用しています。

---

### 問題 1: スニペット専用ホームで透明な壁が表示される

**原因**: `main.js` の `createSnippetWindow()` で width が 420px になっている

**解決方法**:

```javascript
// main.js の 117行目あたり
function createSnippetWindow() {
  snippetWindow = new BrowserWindow({
    width: 460, // ← 正しいサイズ
    height: 650,
    // ...
  });
}
```

---

### 問題 2: ホットキー変更時に「CC」と表示される

**原因**: Command キーを押した瞬間に反応してしまっている

**解決方法**: `settings.html` のホットキー入力処理を修正

```javascript
// Modifier単体は無効
if (
  [
    "MetaLeft",
    "MetaRight",
    "ControlLeft",
    "ControlRight",
    "AltLeft",
    "AltRight",
    "ShiftLeft",
    "ShiftRight",
  ].includes(key)
) {
  return;
}
```

---

### 問題 3: モーダルが閉じずに画面操作できなくなる

**原因**: モーダル背景のクリックイベントが正しく登録されていない

**解決方法**: `settings.html` でイベントリスナーを `DOMContentLoaded` 内に移動

```javascript
window.addEventListener("DOMContentLoaded", async () => {
  // ... 既存のコード ...

  // モーダル背景クリックで閉じる
  document.getElementById("hotkey-modal").addEventListener("click", (e) => {
    if (e.target.id === "hotkey-modal") {
      closeHotkeyModal();
    }
  });
});
```

---

### 問題 4: スニペットの改行が保存されない

**原因**: `\n` がエスケープされている

**解決方法**: XML パース時に `normalize: false` を設定

```javascript
const parser = new xml2js.Parser({
  explicitArray: false,
  strict: false,
  trim: true,
  normalize: false, // ← これが重要
  // ...
});
```

---

## 今後の拡張案

### 優先度: 高

1. **クリップボード履歴の検索機能**

   - 全文検索
   - 日付フィルター

2. **スニペットのインポート/エクスポート**

   - JSON 形式
   - CSV 形式

3. **スニペットのプレビュー機能**
   - ホバー時に内容をプレビュー

### 優先度: 中

4. **履歴の自動削除設定**

   - 保存期間の設定（1 週間、1 ヶ月など）

5. **テーマ機能**

   - ダークモード
   - カスタムカラー

6. **マルチカーソル対応**
   - 複数画面での表示位置最適化

### 優先度: 低

7. **クラウド同期**

   - Dropbox 対応
   - OneDrive 対応

8. **履歴の暗号化**

   - 機密情報の保護

9. **プラグインシステム**
   - サードパーティ拡張

---

## 開発環境

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発モードで起動
npm start

# ビルド
npm run build
```

### 推奨環境

- **Node.js**: v16 以上
- **npm**: v8 以上
- **OS**: macOS 11 以上 or Windows 10 以上

---

## 参考資料

- [Electron 公式ドキュメント](https://www.electronjs.org/docs)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [Clipy 公式サイト](https://clipy-app.com/)

---

**開発者**: てるや  
**GitHub**: https://github.com/tetete478/snipee  
**最終更新**: 2025 年 11 月 20 日
