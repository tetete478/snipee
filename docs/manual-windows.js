const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
        HeadingLevel, PageBreak, Header, Footer, PageNumber } = require('docx');
const fs = require('fs');

// 共通スタイル
const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// ヘルパー関数
const heading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, bold: true, size: 32, color: "2B579A" })]
});

const heading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  children: [new TextRun({ text, bold: true, size: 26, color: "404040" })]
});

const heading3 = (text) => new Paragraph({
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, bold: true, size: 22, color: "505050" })]
});

const para = (text, options = {}) => new Paragraph({
  spacing: { after: 120 },
  ...options,
  children: [new TextRun({ text, size: 22 })]
});

const paraBold = (text) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, size: 22, bold: true })]
});

const paraHighlight = (text) => new Paragraph({
  spacing: { after: 120 },
  shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "💡 " + text, size: 22 })]
});

const paraWarning = (text) => new Paragraph({
  spacing: { after: 120 },
  shading: { fill: "F8D7DA", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "⚠️ " + text, size: 22 })]
});

const paraSuccess = (text) => new Paragraph({
  spacing: { after: 120 },
  shading: { fill: "D4EDDA", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "✅ " + text, size: 22 })]
});

const paraInfo = (text) => new Paragraph({
  spacing: { after: 120 },
  shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "ℹ️ " + text, size: 22 })]
});

const emptyPara = () => new Paragraph({ children: [] });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ドキュメント作成
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Yu Gothic UI", size: 22 }
      }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "2B579A", font: "Yu Gothic UI" },
        paragraph: { spacing: { before: 400, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "404040", font: "Yu Gothic UI" },
        paragraph: { spacing: { before: 300, after: 150 } } }
    ]
  },
  numbering: {
    config: [
      { reference: "install-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "setup-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "history-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "snippet-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "display-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "trouble-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-list2",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-list3",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ 
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Snipee 完全マニュアル", size: 18, color: "888888" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ 
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "- ", size: 18 }), new TextRun({ children: [PageNumber.CURRENT], size: 18 }), new TextRun({ text: " -", size: 18 })]
      })] })
    },
    children: [
      // ===== 表紙 =====
      emptyPara(),
      emptyPara(),
      emptyPara(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "📋", size: 120 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "Snipee", bold: true, size: 72, color: "2B579A" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "完全マニュアル", size: 36 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "〜 Windows版 全機能ガイド 〜", size: 24, color: "666666" })]
      }),
      emptyPara(),
      emptyPara(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "初めての方でも安心！", size: 24, color: "888888" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "インストールから全機能まで、", size: 24, color: "888888" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "やさしく解説します", size: 24, color: "888888" })]
      }),

      pageBreak(),

      // ===== 目次 =====
      heading1("📖 目次"),
      emptyPara(),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "1. Snipeeとは？ ............................................................ 3", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "2. インストール方法 ...................................................... 4", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "3. 初期設定 ................................................................... 5", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "4. 基本の使い方", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "    4-1. 簡易ホーム（全体メニュー）............................ 6", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "    4-2. スニペット簡易ホーム .................................... 8", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "    4-3. 履歴ホーム ...................................................... 10", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "5. マスタスニペットについて ...................................... 12", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "6. スニペット編集画面の使い方 .................................. 14", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "7. 便利な変数機能 ........................................................ 16", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "8. 環境設定（全機能解説） .......................................... 17", size: 22 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "9. 困ったときは ............................................................ 20", size: 22 })] }),

      pageBreak(),

      // ===== 1. Snipeeとは？ =====
      heading1("1. Snipeeとは？"),
      emptyPara(),
      para("Snipee（スナイピー）は、仕事を効率化するためのツールです。"),
      emptyPara(),
      
      heading2("🎯 Snipeeでできること"),
      emptyPara(),
      
      // できること表
      new Table({
        columnWidths: [1500, 7000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 1500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "機能", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 7000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "説明", bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 1500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "📋", size: 28 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7000, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "クリップボード履歴", bold: true, size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "過去にコピーした内容を100件まで保存。いつでも呼び出せます。", size: 20, color: "666666" })] })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 1500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "📝", size: 28 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7000, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "スニペット（定型文）", bold: true, size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "よく使う文章を登録しておいて、ワンクリックで貼り付け。", size: 20, color: "666666" })] })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 1500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "☁️", size: 28 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7000, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "チーム共有（マスタスニペット）", bold: true, size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Google Driveを使って、チーム全員で同じスニペットを共有。", size: 20, color: "666666" })] })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 1500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "🔄", size: 28 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7000, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "自動アップデート", bold: true, size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "新しいバージョンがあれば自動で通知。再起動するだけ。", size: 20, color: "666666" })] })
                ]
              })
            ]
          })
        ]
      }),

      emptyPara(),
      paraHighlight("毎回「お世話になっております」と打つ手間から解放されます！"),

      pageBreak(),

      // ===== 2. インストール方法 =====
      heading1("2. インストール方法"),
      emptyPara(),
      para("Snipeeをパソコンにインストールしましょう。"),
      emptyPara(),

      heading2("📥 インストール手順"),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "install-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "以下のURLから「Snipee Setup.exe」をダウンロード", size: 22, bold: true })]
      }),
      new Paragraph({
        spacing: { after: 100 },
        shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "https://drive.google.com/file/d/1J7gFnD3mzgCmI2eq_vYn2avT5ilfYzJg/view", size: 18, color: "0066CC" })]
      }),
      para("    → ダウンロード先：デスクトップでもOK"),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "install-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "ダウンロードした「Snipee Setup.exe」をダブルクリック", size: 22, bold: true })]
      }),
      paraWarning("「WindowsによってPCが保護されました」と表示されたら「詳細情報」→「実行」をクリック"),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "install-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "インストールが自動で始まります（数秒で完了）", size: 22, bold: true })]
      }),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "install-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "インストール完了！Snipeeが自動で起動します", size: 22, bold: true })]
      }),
      emptyPara(),

      paraSuccess("画面右下のタスクトレイに「📋」アイコンが表示されたら成功です！"),
      emptyPara(),

      // タスクトレイの説明
      heading3("💡 タスクトレイとは？"),
      para("画面右下の時計の横にあるアイコンが並んでいる場所です。"),
      para("Snipeeは常にここに常駐しています。"),
      emptyPara(),
      paraHighlight("アイコンが見当たらない場合は「∧」（上向き矢印）をクリックすると隠れているアイコンが表示されます"),

      pageBreak(),

      // ===== 3. 初期設定 =====
      heading1("3. 初期設定"),
      emptyPara(),
      para("チームで共有しているスニペットを使えるように設定しましょう。"),
      emptyPara(),

      heading2("⚙️ 設定手順"),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "タスクトレイの「📋」アイコンを右クリック", size: 22, bold: true })]
      }),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "メニューから「環境設定」をクリック", size: 22, bold: true })]
      }),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "「一般」タブで自分の名前を入力【必須】", size: 22, bold: true })]
      }),
      para("    → スニペット内の「{名前}」が自動で置き換わるようになります"),
      para("    → 例：「{名前}です。」→「山田です。」"),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "「同期」タブをクリック", size: 22, bold: true })]
      }),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "「Google Drive URL」に以下のURLを貼り付け", size: 22, bold: true })]
      }),
      new Paragraph({
        spacing: { after: 100 },
        shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "https://drive.google.com/file/d/1MIHYx_GUjfqv591h6rzIbcxm_FQZwAXY/view", size: 18, color: "0066CC" })]
      }),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "「保存」ボタンをクリック", size: 22, bold: true })]
      }),
      emptyPara(),

      new Paragraph({
        numbering: { reference: "setup-steps", level: 0 },
        spacing: { after: 200 },
        children: [new TextRun({ text: "「今すぐ同期」ボタンをクリック", size: 22, bold: true })]
      }),
      emptyPara(),

      paraSuccess("「同期成功」と表示されたら完了です！"),

      pageBreak(),

      // ===== 4-1. 簡易ホーム（全体メニュー） =====
      heading1("4. 基本の使い方"),
      emptyPara(),

      heading2("4-1. 簡易ホーム（全体メニュー）"),
      emptyPara(),
      para("Snipeeの全機能にアクセスできるメインメニューです。"),
      para("最もよく使う画面なので、まずはこれを覚えましょう！"),
      emptyPara(),

      heading3("🔑 呼び出し方"),
      emptyPara(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "Ctrl ＋ Alt ＋ C", bold: true, size: 36 })]
      }),
      emptyPara(),
      para("または、タスクトレイの「📋」アイコンをクリックでも開けます。"),
      emptyPara(),

      heading3("📋 簡易ホームでできること"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "項目", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "説明", bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "📋 クリップボード履歴", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "最近コピーした内容が表示されます。クリックで貼り付け。", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "📁 スニペットフォルダ", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "登録済みのスニペットにアクセス。フォルダをクリックで展開。", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "🗑️ 履歴をクリア", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "クリップボード履歴を一括削除（ピン留めは残ります）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "⚙️ 環境設定", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "各種設定画面を開く", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "✏️ スニペット編集", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "個別スニペットの追加・編集画面を開く", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),

      heading3("💡 使い方のコツ"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "上下キー（↑↓）で項目を選択、Enterキーで実行", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "フォルダは右矢印キー（→）で展開、左矢印キー（←）で閉じる", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "ESCキーで閉じる", size: 22 })]
      }),
      emptyPara(),
      paraHighlight("迷ったらとりあえず Ctrl+Alt+C！すべての機能にアクセスできます"),

      pageBreak(),

      // ===== 4-2. スニペット簡易ホーム =====
      heading2("4-2. スニペット簡易ホーム"),
      emptyPara(),
      para("スニペット（定型文）だけを表示するシンプルな画面です。"),
      para("スニペットをすぐに使いたいときはこちらが便利！"),
      emptyPara(),

      heading3("🔑 呼び出し方"),
      emptyPara(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { fill: "D4EDDA", type: ShadingType.CLEAR },
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "Ctrl ＋ Alt ＋ V", bold: true, size: 36 })]
      }),
      emptyPara(),

      heading3("📝 スニペットの使い方"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 150 },
        children: [new TextRun({ text: "フォルダをクリックして開く", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 150 },
        children: [new TextRun({ text: "使いたいスニペットをクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 150 },
        children: [new TextRun({ text: "自動で貼り付けされます！", size: 22 })]
      }),
      emptyPara(),

      heading3("🎨 スニペットの種類"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "6B7B8A", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "🔒 マスタ", bold: true, size: 22, color: "FFFFFF" })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "チーム全員で共有しているスニペット（変更不可）", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "9AA5B0", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "📄 個別", bold: true, size: 22, color: "FFFFFF" })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "自分だけのスニペット（自由に追加・編集可能）", size: 22 })] })]
              })
            ]
          })
        ]
      }),
      emptyPara(),
      paraInfo("マスタスニペットには「🔒」アイコン、個別スニペットには「📄」アイコンが表示されます"),
      emptyPara(),

      heading3("💡 簡易ホームとの違い"),
      emptyPara(),
      new Table({
        columnWidths: [4000, 4500],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "簡易ホーム（Ctrl+Alt+C）", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "D4EDDA", type: ShadingType.CLEAR },
                width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "スニペット簡易ホーム（Ctrl+Alt+V）", bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "履歴 + スニペット + 設定など全部入り", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "スニペットのみ（シンプル）", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),
      paraHighlight("スニペットだけ使いたいなら Ctrl+Alt+V が最速！"),

      pageBreak(),

      // ===== 4-3. 履歴ホーム =====
      heading2("4-3. 履歴ホーム"),
      emptyPara(),
      para("クリップボード履歴だけを表示する専用画面です。"),
      para("過去にコピーした内容を素早く呼び出せます。"),
      emptyPara(),

      heading3("🔑 呼び出し方"),
      emptyPara(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "Ctrl ＋ Alt ＋ X", bold: true, size: 36 })]
      }),
      emptyPara(),

      heading3("📋 履歴の使い方"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "history-steps", level: 0 },
        spacing: { after: 150 },
        children: [new TextRun({ text: "履歴一覧から貼り付けたい項目をクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "history-steps", level: 0 },
        spacing: { after: 150 },
        children: [new TextRun({ text: "自動で貼り付けされます！", size: 22 })]
      }),
      emptyPara(),
      paraHighlight("キーボードの上下キー（↑↓）で選択して、Enterキーで貼り付けもできます"),
      emptyPara(),

      heading3("📌 ピン留め機能"),
      para("よく使う履歴は「ピン留め」できます。"),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "項目にカーソルを合わせる → 右側に「○」が表示される", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「○」をクリックすると「●」に変わり、ピン留め完了", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "ピン留めした項目は削除されず、一覧の上部に固定されます", size: 22 })]
      }),
      emptyPara(),

      heading3("🗑️ 履歴の削除"),
      para("不要な履歴は削除できます。"),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "項目にカーソルを合わせる → 右側に「×」が表示される", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「×」をクリックすると削除", size: 22 })]
      }),
      emptyPara(),

      heading3("📊 3つのホットキーまとめ"),
      emptyPara(),
      new Table({
        columnWidths: [2800, 2800, 2900],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2800, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ctrl+Alt+C", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "D4EDDA", type: ShadingType.CLEAR },
                width: { size: 2800, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ctrl+Alt+V", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
                width: { size: 2900, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ctrl+Alt+X", bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "簡易ホーム", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "スニペット", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2900, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "履歴", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "全部入り", size: 20, color: "666666" })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "定型文だけ", size: 20, color: "666666" })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2900, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "コピー履歴だけ", size: 20, color: "666666" })] })] })
            ]
          })
        ]
      }),

      pageBreak(),

      // ===== 5. マスタスニペットについて =====
      heading1("5. マスタスニペットについて"),
      emptyPara(),
      
      heading2("⭐ マスタスニペットとは"),
      emptyPara(),
      para("小松が普段から使っている「最強のメッセ対応テンプレート」です。"),
      para("チーム全員で同じスニペットを使えるよう、Google Driveで共有しています。"),
      emptyPara(),

      // 重要な警告
      new Paragraph({
        spacing: { before: 200, after: 200 },
        shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
        children: [
          new TextRun({ text: "⚠️ 重要：使う前に必ず「説明」を読んでください！", bold: true, size: 24 })
        ]
      }),
      para("マスタスニペットは小松が作成したものです。"),
      para("各スニペットには「どんな場面で使うか」「注意点」などの説明があります。"),
      para("間違った使い方を防ぐため、必ず説明を確認してから使いましょう。"),
      emptyPara(),

      heading3("📖 説明の確認方法"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "簡易ホーム（Ctrl+Alt+C）または スニペット編集 を開く", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "マスタフォルダ内のスニペットをクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "右側に「説明」と「内容」が表示される", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "説明をよく読んでから使用する", size: 22 })]
      }),
      emptyPara(),

      heading3("✨ マスタスニペットの特徴"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "📱 スマホ最適化", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "スマホ閲覧に最適な改行設定済み。お客様がスマホで見ても読みやすい！", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "🎯 場面対応", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "挨拶・お礼・謝罪・案内など、多数の場面に対応したテンプレートを用意", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "🔄 自動更新", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "小松がテンプレを更新すると、全員のSnipeeに自動で反映", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⚡ 変数対応", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "「{名前}」「{今日}」などが自動で置き換わる", size: 22 })] })]
              })
            ]
          })
        ]
      }),
      emptyPara(),

      heading3("📁 フォルダ構成の例"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "挨拶：お世話になっております、はじめまして、など", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "お礼：ご連絡ありがとうございます、お問い合わせありがとうございます、など", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "案内：お支払い方法、配送について、など", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "謝罪：お待たせして申し訳ございません、など", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list3", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "締め：よろしくお願いいたします、など", size: 22 })]
      }),
      emptyPara(),
      paraHighlight("フォルダ構成は小松が随時更新します。新しいテンプレが追加されることも！"),

      pageBreak(),

      heading2("🔒 マスタスニペットは変更できません"),
      emptyPara(),
      para("マスタスニペットはチーム共有のため、個人での変更はできません。"),
      para("これは、チーム全員が同じ高品質なテンプレートを使うための仕組みです。"),
      emptyPara(),

      heading3("💡 自分用にアレンジしたい場合"),
      para("マスタスニペットをベースに自分用のスニペットを作成できます。"),
      para("詳しくは次の「6. スニペット編集画面の使い方」をご覧ください。"),
      emptyPara(),
      paraInfo("個別スニペットは自由に追加・編集・削除できます"),

      pageBreak(),

      // ===== 6. スニペット編集画面の使い方 =====
      heading1("6. スニペット編集画面の使い方"),
      emptyPara(),
      para("自分だけの「個別スニペット」を追加・編集できる画面です。"),
      emptyPara(),

      heading2("📝 開き方"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "簡易ホーム（Ctrl+Alt+C）→ 「スニペット編集」をクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "または、タスクトレイ右クリック → 「スニペット編集」", size: 22 })]
      }),
      emptyPara(),

      heading2("🖥️ 画面の構成"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "場所", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "内容", bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "左側", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "フォルダ一覧（マスタ / 個別）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "右側", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "選択したスニペットの詳細（タイトル・説明・内容）", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),

      heading2("➕ 新しいスニペットを追加する"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "左側の「個別」フォルダをクリックして選択", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "画面上部の「＋スニペット追加」ボタンをクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "右側に入力欄が表示される", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「タイトル」「説明」「内容」を入力", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "snippet-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「保存」ボタンをクリック", size: 22 })]
      }),
      emptyPara(),
      paraSuccess("これで新しいスニペットが追加されました！"),
      emptyPara(),

      heading2("✏️ 既存のスニペットを編集する"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "history-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "編集したいスニペットをクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "history-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "右側の内容を修正", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "history-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「保存」ボタンをクリック", size: 22 })]
      }),
      emptyPara(),
      paraWarning("マスタスニペットは編集できません（閲覧のみ）"),

      pageBreak(),

      heading2("🗑️ スニペットを削除する"),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "削除したいスニペットをクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「削除」ボタンをクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "display-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "確認メッセージで「OK」をクリック", size: 22 })]
      }),
      emptyPara(),
      paraWarning("削除したスニペットは元に戻せません。ご注意ください。"),
      emptyPara(),

      heading2("📁 フォルダを追加する"),
      emptyPara(),
      para("スニペットを整理するためのフォルダを追加できます。"),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「個別」を右クリック → 「フォルダ追加」", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "フォルダ名を入力 → 「OK」", size: 22 })]
      }),
      emptyPara(),

      heading2("💡 マスタスニペットを参考にする"),
      emptyPara(),
      para("マスタスニペットをベースに自分用のスニペットを作る方法："),
      emptyPara(),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "マスタスニペットをクリックして内容を確認", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「内容」欄のテキストをコピー（Ctrl+C）", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "個別フォルダで「＋スニペット追加」", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "コピーした内容を貼り付けてアレンジ", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "「保存」で完成！", size: 22 })]
      }),
      emptyPara(),
      paraHighlight("変数（{名前}など）も自分のスニペットで使えます！"),

      pageBreak(),

      // ===== 7. 便利な変数機能 =====
      heading1("7. 便利な変数機能"),
      emptyPara(),
      para("スニペット内に特別な文字を入れると、貼り付け時に自動で置き換わります。"),
      emptyPara(),

      heading2("📅 使える変数一覧"),
      emptyPara(),

      new Table({
        columnWidths: [4000, 4500],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "スニペットに書く内容", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders: cellBorders,
                shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
                width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "貼り付け時の結果", bold: true, size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{名前}", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "設定した名前（例：山田）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{今日:MM/DD}", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "今日の日付（例：11/29）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{明日:MM/DD}", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "明日の日付（例：11/30）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{今日:M月D日}", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "今日の日付（例：11月29日）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 4000, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "{タイムスタンプ}", size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4500, type: WidthType.DXA },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "例：2024/11/29 14:30:45", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),

      heading3("💡 使用例"),
      emptyPara(),
      paraBold("スニペットに登録する内容："),
      new Paragraph({
        spacing: { after: 100 },
        shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "お世話になっております。{名前}です。", size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 100 },
        shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "{明日:M月D日}までにご連絡いただけますと幸いです。", size: 22 })]
      }),
      emptyPara(),
      paraBold("貼り付け時に置き換わった結果："),
      new Paragraph({
        spacing: { after: 100 },
        shading: { fill: "D4EDDA", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "お世話になっております。山田です。", size: 22 })]
      }),
      new Paragraph({
        spacing: { after: 100 },
        shading: { fill: "D4EDDA", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "11月30日までにご連絡いただけますと幸いです。", size: 22 })]
      }),

      pageBreak(),

      // ===== 8. 環境設定（全機能解説） =====
      heading1("8. 環境設定（全機能解説）"),
      emptyPara(),
      para("タスクトレイの「📋」アイコンを右クリック → 「環境設定」で設定画面を開けます。"),
      emptyPara(),

      heading2("📌 一般タブ"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "名前", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "スニペット内の「{名前}」に置き換わる文字を設定【必須】", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "スタートアップ", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "Windowsログイン時にSnipeeを自動起動するかどうか", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "マニュアル", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "このマニュアルを開くリンク", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),

      heading2("⌨️ ホットキータブ"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "簡易ホーム", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "全体メニューを開く（初期値：Ctrl+Alt+C）", size: 22 })] }),
                          new Paragraph({ children: [new TextRun({ text: "履歴・スニペット・環境設定などにアクセス可能", size: 20, color: "666666" })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "スニペット", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "スニペット専用画面を開く（初期値：Ctrl+Alt+V）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "履歴専用", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "クリップボード履歴専用画面を開く（初期値：Ctrl+Alt+X）", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),
      paraHighlight("ホットキーが他のアプリと競合する場合は変更できます"),

      pageBreak(),

      heading2("☁️ 同期タブ"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "Google Drive URL", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "マスタスニペットのXMLファイルのURL", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "今すぐ同期", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "手動でマスタスニペットを最新状態に更新", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),
      paraInfo("同期はアプリ起動時にも自動で行われます"),
      emptyPara(),

      heading2("👁️ 表示タブ"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "ウィンドウ位置", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "ポップアップの表示位置（マウス位置 / 画面中央 など）", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "フォルダ表示/非表示", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "使わないフォルダを非表示にできます", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),
      paraHighlight("使わないフォルダを非表示にすると、一覧がスッキリして使いやすくなります"),
      emptyPara(),

      heading2("🔄 更新タブ"),
      emptyPara(),
      new Table({
        columnWidths: [2500, 6000],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "現在のバージョン", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "インストールされているSnipeeのバージョン", size: 22 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, shading: { fill: "F5F5F5", type: ShadingType.CLEAR }, width: { size: 2500, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "アップデート確認", bold: true, size: 22 })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 6000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "新しいバージョンがあるか手動でチェック", size: 22 })] })] })
            ]
          })
        ]
      }),
      emptyPara(),
      paraInfo("通常は自動でアップデート通知が届くので、この画面を開く必要はありません"),

      pageBreak(),

      // ===== 9. 困ったときは =====
      heading1("9. 困ったときは"),
      emptyPara(),

      heading2("❓ よくある質問"),
      emptyPara(),

      // Q1
      paraBold("Q1. ショートカットキーが効かない"),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "日本語入力（IME）がONになっていませんか？→ 半角英数モードにしてください", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "タスクトレイにSnipeeのアイコンがありますか？→ なければ再起動してください", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "trouble-steps", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "他のアプリとショートカットが競合していませんか？→ 環境設定で変更できます", size: 22 })]
      }),
      emptyPara(),

      // Q2
      paraBold("Q2. スニペットが表示されない"),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "環境設定 → 「同期」タブ → 「今すぐ同期」をクリック", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "Google Drive URLが正しく設定されているか確認", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "インターネット接続を確認", size: 22 })]
      }),
      emptyPara(),

      // Q3
      paraBold("Q3. 貼り付けされない"),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "貼り付け先のアプリがアクティブ（選択されている）か確認", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "カーソルが入力欄にあるか確認", size: 22 })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list2", level: 0 },
        spacing: { after: 100 },
        children: [new TextRun({ text: "もう一度試してみてください", size: 22 })]
      }),
      emptyPara(),

      // Q4
      paraBold("Q4. {名前}が置き換わらない"),
      para("環境設定 → 「一般」タブで名前が登録されているか確認してください。"),
      emptyPara(),

      // Q5
      paraBold("Q5. アップデートの通知が来た"),
      para("「再起動」ボタンをクリックするだけでOK！自動で最新版になります。"),
      emptyPara(),

      // Q6
      paraBold("Q6. 特定のフォルダを非表示にしたい"),
      para("環境設定 → 「表示」タブで、使わないフォルダのチェックを外してください。"),
      emptyPara(),

      heading2("📞 それでも解決しない場合"),
      emptyPara(),
      para("小松またはIT担当者にご連絡ください。"),
      emptyPara(),
      emptyPara(),

      // 最後のメッセージ
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { fill: "E7F3FF", type: ShadingType.CLEAR },
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text: "🎉 Snipeeで仕事を効率化しましょう！ 🎉", size: 28, bold: true, color: "2B579A" })]
      })
    ]
  }]
});

// ファイル出力
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("./docs/Snipee_Windows_完全マニュアル.docx", buffer);
  console.log("✅ マニュアル作成完了: Snipee_Windows_完全マニュアル.docx");
});