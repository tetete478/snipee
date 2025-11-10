# Snipee 開発引き継ぎドキュメント

## プロジェクト概要

Mac/Windows 対応のクリップボード管理ツール（Electron 製）

- **目的**: チーム 20 人向けの本家 Clipy のクロスプラットフォーム版
- **プロジェクト名**: Snipee (スニッピー)
- **場所**: `~/Desktop/clipy-windows-with-permission/`

## 技術スタック

- Electron (デスクトップアプリ)
- electron-store (設定保存)
- axios (HTTP 通信)
- xml2js (XML パース)
- Node.js

## ファイル構成

```
clipy-windows-with-permission/
├── app/
│   ├── main.js              # メインプロセス（バックエンド）
│   ├── index.html           # 簡易ホーム（クリップボード履歴＋スニペット）
│   ├── snippets.html        # スニペット専用ウィンドウ
│   ├── submenu.html         # サブメニュー（ホバー展開用）
│   ├── settings.html        # 設定画面
│   └── permission-guide.html # Mac権限案内画面
├── package.json
├── HANDOVER.md              # このファイル
└── README.md
```

## 実装済み機能 ✅

### 1. クリップボード履歴

- 自動監視（500ms 間隔）
- 最大 100 件保存
- 重複削除
- 検索機能
- 15 個ずつグループ化表示（最大 30 個＝ 2 グループ）

### 2. スニペット機能

- **共有スニペット**: Google Drive 連携（XML 形式）
- **本家 Clipy 完全互換**: Clipy のエクスポート XML をそのまま使用可能
- フォルダ分類機能
- 絵文字・特殊文字完全対応

### 3. Google Drive 連携（XML 対応）⭐NEW

- Clipy エクスポート XML（`snippets.xml`）の読み込み
- 手動同期・自動同期（5 分ごと）
- XML パース処理（大文字小文字両対応）
- 絵文字・特殊文字・改行の完全保持

### 4. ホットキー

- **簡易ホーム**: Alt+Command+C (Mac) / Alt+Control+C (Win)
  - クリップボード履歴 + 共有スニペット
- **スニペット専用**: Alt+Command+V (Mac) / Alt+Control+V (Win)
  - 共有スニペットのみ
- カスタマイズ可能（設定画面で変更）

### 5. UI/UX

- 320x550px（簡易ホーム）/ 640x550px（透明拡大版）
- マウスカーソル位置に表示
- ホバーでサブメニュー展開（フォルダ・履歴グループ）
- キーボード操作完全対応（↑↓→←Enter Esc）
- Mac/Windows 自動ペースト機能

### 6. Mac 権限管理

- アクセシビリティ権限チェック
- 権限案内ウィンドウ（初回のみ）
- 自動ペースト対応

## 最新の実装状況（2025-11-10）

### XML 対応実装完了 🎉

#### 修正したファイル

**`app/main.js`**

#### 主な変更点

1. **xml2js パッケージの追加**

```javascript
const xml2js = require("xml2js");
```

2. **fetchMasterSnippets() 関数の完全書き換え**

- Google Drive から XML ファイルをダウンロード
- XML パーサーで解析（大文字小文字両対応）
- Clipy 形式 XML を Snipee 内部形式に変換

#### XML パーサー設定

```javascript
const parser = new xml2js.Parser({
  explicitArray: false,
  strict: false, // エラー許容モード
  trim: true, // 前後の空白を削除
  normalize: false, // 改行を保持
  normalizeTags: true, // タグを小文字に統一
  attrkey: "$",
  charkey: "_",
  explicitCharkey: false,
  mergeAttrs: false,
});
```

#### データ変換処理

- XML の `<folders><folder><snippets><snippet>` 構造を解析
- 各スニペットに以下の情報を付与:
  - `id`: 一意の ID
  - `title`: スニペット名
  - `content`: スニペット内容
  - `folder`: 所属フォルダ名

#### Google Drive URL 形式

```javascript
const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
```

## 重要な実装パターン

### Electron ウィンドウ管理

```javascript
// ウィンドウ作成
function createClipboardWindow() {
  clipboardWindow = new BrowserWindow({
    width: 640,
    height: 550,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
}
```

### ホットキー管理

1. IPC ハンドラーは `app.whenReady()` の**後**に書く
2. ホットキー登録は起動時に `store.get('customHotkey')` を読み込む
3. グローバルショートカットは必ず `unregisterAll()` してから再登録
4. Mac の物理キーは `e.code` で取得（`e.key` は特殊文字になる）

### クリップボード履歴のグループ化

```javascript
// 15個ずつ、最大30個（2グループ）まで
function groupHistoryItems(items) {
  const groups = [];
  for (let i = 0; i < Math.min(totalCount, 30); i += 15) {
    const start = i + 1;
    const end = Math.min(i + 15, totalCount);
    groups.push({
      start,
      end,
      label: `${start} - ${end}`,
      items: allItems.history.slice(i, i + 15),
    });
  }
  return groups;
}
```

### サブメニュー展開

```javascript
// グローバル変数で状態管理
let isSubmenuOpen = false;
let submenuSelectedIndex = 0;
let submenuItems = [];
let currentHoveredGroupId = null;

// ホバー時
function handleHistoryHover(groupId) {
  if (currentHoveredGroupId === groupId) return;
  currentHoveredGroupId = groupId;
  // サブメニュー表示処理...
}
```

### XML 形式からの変換処理

```javascript
// 大文字・小文字両方に対応
const foldersData = result.folders || result.FOLDERS;
if (foldersData && (foldersData.folder || foldersData.FOLDER)) {
  const folderArray = Array.isArray(foldersData.folder || foldersData.FOLDER)
    ? foldersData.folder || foldersData.FOLDER
    : [foldersData.folder || foldersData.FOLDER];

  folderArray.forEach((folder) => {
    const snippetArray =
      folder.snippets && folder.snippets.snippet
        ? Array.isArray(folder.snippets.snippet)
          ? folder.snippets.snippet
          : [folder.snippets.snippet]
        : [];

    snippetArray.forEach((snippet) => {
      snippets.push({
        id: Date.now().toString() + Math.random(),
        title: snippet.title || "",
        content: snippet.content || "",
        folder: folder.title || "Uncategorized",
      });
    });
  });
}
```

## 開発のベストプラクティス

### ファイル編集時

- 既存コードは `str_replace` で部分修正
- 新規ファイルのみ `create_file`
- 修正箇所を明示して、ユーザーが手動で編集できるように手順を提示

### デバッグ

- `console.log()` はターミナル出力用
- 開発者ツールは本番では非表示

## 運用フロー

### スニペット更新手順

1. Teruya さんが本家 Clipy でスニペット編集
2. Clipy でエクスポート（`snippets.xml`）
3. Google Drive にアップロード（上書き）
4. チーム全員の Snipee に自動同期（5 分ごと）

## 今後の改善 TODO 📋

### 改善 ① スニペット一覧の表示最適化 🎯

**優先度**: 高

**現状**:

- スニペットの中身がプレビュー表示されている
- プレビューで画面スペースを圧迫
- 一覧性が低い

**改善案**:

- プレビュー表示を削除
- スニペットタイトルのみを表示
- より多くのスニペットを一覧で確認できるように
- 可読性の向上

**影響範囲**:

- `app/index.html` の CSS（`.menu-item-text`）
- `app/snippets.html` の CSS（`.menu-item-text`）
- 表示ロジックの調整

---

### 改善 ② フォルダの表示/非表示機能 🎯

**優先度**: 中

**現状**:

- すべてのフォルダが常に表示されている
- 使わないフォルダも表示されて邪魔
- フォルダ数が多いと可読性が低下

**改善案**:

- フォルダごとに表示/非表示を切り替え可能に
- チェックボックスまたはトグルボタンで制御
- よく使うフォルダだけを表示
- 設定を `electron-store` に保存して次回起動時も反映

**実装方針**:

1. 設定画面にフォルダ一覧表示
2. 各フォルダにチェックボックス追加
3. `store.set('hiddenFolders', [...])`で保存
4. 表示時にフィルタリング処理

**影響範囲**:

- `app/settings.html` に設定 UI 追加
- `app/main.js` の `get-all-items` ハンドラー
- フィルタリングロジック追加

---

### 改善 ③ Windows 環境でのテスト 🧪

**優先度**: 中

**目的**:

- Windows 環境での動作確認
- クロスプラットフォーム対応の検証
- Windows 特有の問題があれば修正

**確認項目**:

- ホットキー動作（Alt+Control+C / Alt+Control+V）
- 自動ペースト機能
- ウィンドウ表示位置
- トレイアイコン表示
- Google Drive 同期
- XML パース処理

**テスト環境**:

- Windows 10/11

---

## トラブルシューティング

### Google Drive からダウンロードできない

- **症状**: `Google Drive - Virus scan warning` が返される
- **原因**: ファイルサイズが大きい、または共有設定が間違っている
- **解決策**:
  - 共有設定を「リンクを知っている全員」に変更
  - URL を `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t` 形式に変更

### XML パースエラー

- **症状**: `Unexpected close tag` などのエラー
- **原因**: XML の構造エラー、特殊文字のエスケープ問題
- **解決策**:
  - パーサーオプションで `strict: false` に設定
  - `normalizeTags: true` で大文字小文字を統一

### スニペットが表示されない

- **確認事項**:
  1. Google Drive URL が正しいか
  2. XML ファイルが正しくアップロードされているか
  3. `console.log` でデバッグログを確認
  4. `store.get('masterSnippets')` の中身を確認

---

## 次のトークルームでの開発開始方法

新しいトークルームで以下のように伝えてください：

```
Snipeeの開発を継続します。
プロジェクトナレッジのHANDOVER.mdを確認して、
TODOの改善①から進めてください。

ルール:
- すぐにコード修正しない（改善案を出して許可を取る）
- 毎回コード全部修正しない（修正箇所だけ明記）
- 修正箇所は「ファイル名、場所、修正方法（追加/削除/置き換え）」を明記
```

---

**このドキュメントがあれば、Gemini や他の AI、または新しい Claude チャットでも開発を継続できます！**

```

---

## ✅ 完成しました！

このHANDOVER.mdを保存すれば、次のトークルームでスムーズに開発を継続できます！

次のトークルームでは以下のように伝えればOKです：
```

Snipee の開発を継続します。
プロジェクトナレッジの HANDOVER.md を確認して、
TODO の改善 ① から進めてください。

ルール:

- すぐにコード修正しない（改善案を出して許可を取る）
- 毎回コード全部修正しない（修正箇所だけ明記）
- 修正箇所は「ファイル名、場所、修正方法（追加/削除/置き換え）」を明記
