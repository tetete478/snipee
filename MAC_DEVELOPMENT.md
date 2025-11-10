# Mac環境での開発ガイド 🍎

## 📋 必要な環境

- macOS
- Node.js 16以上
- npm または yarn

## 🚀 セットアップ（初回のみ）

```bash
# プロジェクトフォルダに移動
cd clipy-windows

# 依存関係をインストール
npm install

# Macで動作確認
npm start
```

## 💻 Mac環境での開発

### 1. 開発モードで起動

```bash
npm start
```

**Mac用のショートカットキー:**
- `Command + Shift + V` でクリップボード履歴を開く

### 2. コード編集

ファイルを編集して保存したら、アプリを再起動すれば反映されます:
- `app/main.js` - バックエンドロジック
- `app/index.html` - メインUI
- `app/settings.html` - 設定画面

### 3. 動作確認

1. アプリ起動
2. テキストをコピー（Command + C）
3. `Command + Shift + V` を押す
4. クリップボード履歴が表示される

## 📦 Windows版をビルド（Mac上で）

### 必要な追加パッケージ

MacからWindows版をビルドする場合、wine は不要です（electron-builderが自動で処理）:

```bash
# Windows版ビルド（Mac上で実行可能）
npm run build:win
```

**完成ファイル:**
- `dist/ClipyWindows Setup 2.0.0.exe` - インストーラー（推奨）
- `dist/ClipyWindows 2.0.0.exe` - ポータブル版

### Mac版もビルドしたい場合

```bash
# Mac版ビルド
npm run build:mac

# 完成: dist/ClipyWindows-2.0.0.dmg
```

### 両方まとめてビルド

```bash
npm run build:all
```

## 🎯 チームへの配布方法

### 方法1: インストーラーを配布（推奨）

1. `npm run build:win` を実行
2. `dist/ClipyWindows Setup 2.0.0.exe` をチームに配布
3. チームメンバーはインストーラーを実行するだけ

### 方法2: ポータブル版を配布

1. `npm run build:win` を実行
2. `dist/ClipyWindows 2.0.0.exe` を配布
3. チームメンバーは実行するだけ（インストール不要）

## 📁 ビルド結果の場所

```
dist/
├── ClipyWindows Setup 2.0.0.exe    # Windowsインストーラー
├── ClipyWindows 2.0.0.exe          # Windowsポータブル版
└── ClipyWindows-2.0.0.dmg          # Mac版（オプション）
```

## 🔧 開発時のTips

### ホットリロードはない

Electronはホットリロードに対応していないので、コード変更後は:
1. アプリを終了（Command + Q）
2. `npm start` で再起動

### デバッグモード

```bash
npm run dev
```

これでDevToolsが開いた状態で起動します。

### システムトレイアイコンについて

開発時はアイコンファイルがなくてもOKです。
配布時にアイコンが欲しい場合:

```bash
# build フォルダを作成
mkdir -p build

# アイコンを配置（512x512のPNG推奨）
# build/icon.png または build/icon.icns
```

electron-builderが自動でアイコン変換してくれます。

## ⚠️ トラブルシューティング

### "electron-builder not found"

```bash
npm install --save-dev electron-builder
```

### Windowsビルドが失敗する

1. Node.jsが最新か確認: `node -v`
2. 依存関係を再インストール:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Macで動作確認できない

Macでは`Command + Shift + V`を使用:
- `app/main.js`の52行目がMac用ショートカット設定

## 📝 よくある質問

### Q: MacとWindows両対応にしたい

A: 既に対応済みです!
- Mac: `Command + Shift + V`
- Windows: `Ctrl + Shift + V`

`main.js`で自動判定しています。

### Q: Mac版も配布したい

```bash
npm run build:mac
```

### Q: ビルドサイズが大きい

Electronアプリは100-150MB程度が普通です。
これはChromiumエンジンが含まれるためです。

### Q: 自動更新機能は?

現状は手動配布です。必要なら`electron-updater`を追加できます。

## 🎨 カスタマイズ

### アプリ名を変更

`package.json`の:
```json
"productName": "ClipyWindows"
```

### ショートカットキーを変更

`app/main.js`の52-53行目:
```javascript
const shortcut = process.platform === 'darwin' ? 'Command+Shift+V' : 'Control+Shift+V';
```

### 履歴の最大件数を変更

`app/main.js`の15行目:
```javascript
const MAX_HISTORY = 100; // ここを変更
```

## 🚀 デプロイチェックリスト

配布前に確認:

- [ ] Mac環境で動作確認
- [ ] Windows版をビルド
- [ ] マスタースニペットJSONを準備
- [ ] Google Drive共有リンクを取得
- [ ] README.mdにセットアップ手順を記載
- [ ] チームに配布

---

**Happy Coding! 🎉**
