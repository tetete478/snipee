const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu, systemPreferences, shell, dialog } = require('electron');

// 単一インスタンスを保証
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  // 通知を表示
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    new Notification({
      title: 'Snipee',
      body: 'Snipeeは既に起動しています。タスクトレイのアイコンから操作してください。'
    }).show();
  }
  
  // クリップボードウィンドウを表示
  showClipboardWindow();
});

const path = require('path');
const Store = require('electron-store');
const fs = require('fs');

const axios = require('axios');
const xml2js = require('xml2js');
const { autoUpdater } = require('electron-updater');

// Windows自動ペースト用
const { exec, execSync } = require('child_process');

// koffi（Windows用 - 高速なWindows API呼び出し）
let user32 = null;
let GetForegroundWindow = null;
let SetForegroundWindow = null;
let keybd_event = null;

if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    user32 = koffi.load('user32.dll');
    GetForegroundWindow = user32.func('GetForegroundWindow', 'void*', []);
    SetForegroundWindow = user32.func('SetForegroundWindow', 'bool', ['void*']);
    keybd_event = user32.func('keybd_event', 'void', ['uint8', 'uint8', 'uint32', 'void*']);
  } catch (error) {
    // koffi読み込み失敗時は自動ペースト無効
  }
}

// キー定数（Windows用）
const VK_CONTROL = 0x11;
const VK_V = 0x56;
const VK_MENU = 0x12; // Alt
const KEYEVENTF_KEYUP = 0x0002;

// ストアの初期化
const store = new Store();

// 個別スニペット専用ストア（別ファイルに保存 - アンインストールで消えない）
const personalStore = new Store({ name: 'personal-snippets' });

// デフォルトホットキー設定
const DEFAULT_CLIPBOARD_SHORTCUT = process.platform === 'darwin' ? 'Command+Control+C' : 'Ctrl+Alt+C';
const DEFAULT_SNIPPET_SHORTCUT = process.platform === 'darwin' ? 'Command+Control+V' : 'Ctrl+Alt+V';
const DEFAULT_HISTORY_SHORTCUT = process.platform === 'darwin' ? 'Command+Control+X' : 'Ctrl+Alt+X';

let mainWindow;
let clipboardWindow;
let snippetWindow;
let historyWindow;
let permissionWindow;
let tray = null;
let snippetEditorWindow = null;
let welcomeWindow = null;
let previousActiveApp = null;  // 元のアクティブアプリを記憶

// 元のアクティブアプリを記憶
function captureActiveApp() {
  if (process.platform === 'darwin') {
    try {
      const bundleId = execSync('osascript -e \'tell application "System Events" to get bundle identifier of first application process whose frontmost is true\'').toString().trim();
      if (bundleId !== 'com.electron.snipee' && bundleId !== 'com.github.Electron') {
        previousActiveApp = bundleId;
      }
    } catch (error) {
      console.log('Mac: Bundle ID取得スキップ:', error.message);
    }
  } else if (process.platform === 'win32') {
    try {
      if (GetForegroundWindow) {
        previousActiveApp = GetForegroundWindow();
      }
    } catch (error) {
      // HWND取得失敗時はスキップ
    }
  }
}

// アクセシビリティ権限チェック
function hasAccessibilityPermission() {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.isTrustedAccessibilityClient(false);
}

// アクセシビリティ権限をリクエスト
function requestAccessibilityPermission() {
  if (process.platform !== 'darwin') return;
  systemPreferences.isTrustedAccessibilityClient(true);
}

// クリップボード履歴管理
let clipboardHistory = [];
let pinnedItems = store.get('pinnedItems', []);
let lastClipboardText = '';
const MAX_HISTORY = 100;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    show: false,
    frame: false,
    visibleOnAllWorkspaces: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'settings.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Mac: 表示のたびに全Workspaceで表示を再設定
  if (process.platform === 'darwin') {
    mainWindow.on('show', () => {
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    });
  }
}

// 汎用ウィンドウ作成関数
function createGenericWindow(type) {
  const config = {
    clipboard: {
      htmlFile: 'index.html',
      positionKey: 'clipboardWindowPosition'
    },
    snippet: {
      htmlFile: 'snippets.html',
      positionKey: 'snippetWindowPosition'
    },
    history: {
      htmlFile: 'history.html',
      positionKey: 'historyWindowPosition'
    }
  };

  const { htmlFile, positionKey } = config[type];

  const window = new BrowserWindow({
    width: 230,
    height: 600,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    movable: true,
    hasShadow: false,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  window.loadFile(path.join(__dirname, htmlFile));

  window.on('moved', () => {
    if (window && !window.isDestroyed()) {
      const bounds = window.getBounds();
      store.set(positionKey, { x: bounds.x, y: bounds.y });
    }
  });

  // フォーカスを失ったら自動的にhide
  window.on('blur', () => {
    if (window && !window.isDestroyed() && window.isVisible()) {
      window.hide();
    }
  });

  return window;
}

// ラッパー関数
function createClipboardWindow() {
  clipboardWindow = createGenericWindow('clipboard');
}

function createSnippetWindow() {
  snippetWindow = createGenericWindow('snippet');
}

function createHistoryWindow() {
  historyWindow = createGenericWindow('history');
}

// スニペット編集ウィンドウ作成
function createSnippetEditorWindow() {
  // 既存のウィンドウがあれば再利用
  if (snippetEditorWindow && !snippetEditorWindow.isDestroyed()) {
    snippetEditorWindow.show();
    snippetEditorWindow.focus();
    return;
  }

  snippetEditorWindow = new BrowserWindow({
    width: 720,
    height: 600,
    frame: true,
    resizable: true,
    visibleOnAllWorkspaces: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  snippetEditorWindow.loadFile(path.join(__dirname, 'snippet-editor.html'));

  snippetEditorWindow.once('ready-to-show', () => {
    // Mac: 全Workspaceで表示
    if (process.platform === 'darwin') {
      snippetEditorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    snippetEditorWindow.show();
  });

  snippetEditorWindow.on('closed', () => {
    snippetEditorWindow = null;
  });
}

// ウェルカムウィンドウ作成
function createWelcomeWindow() {
  welcomeWindow = new BrowserWindow({
    width: 480,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  welcomeWindow.loadFile(path.join(__dirname, 'welcome.html'));

  welcomeWindow.once('ready-to-show', () => {
    welcomeWindow.show();
  });

  welcomeWindow.on('closed', () => {
    welcomeWindow = null;
  });
}

// グローバルショートカット登録(リトライ機能付き)
function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  const mainHotkey = store.get('customHotkeyMain', DEFAULT_CLIPBOARD_SHORTCUT);
  const snippetHotkey = store.get('customHotkeySnippet', DEFAULT_SNIPPET_SHORTCUT);

  const registerWithRetry = (accelerator, callback, retries = 3) => {
    const attempt = (remaining) => {
      try {
        const success = globalShortcut.register(accelerator, callback);
        if (!success && remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 500);
        }
      } catch (error) {
        console.log(`ホットキー登録エラー: ${accelerator} -> ${error.message}`);
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 500);
        }
      }
    };
    attempt(retries);
  };

  registerWithRetry(mainHotkey, () => {
    captureActiveApp();
    showClipboardWindow();
  });

  registerWithRetry(snippetHotkey, () => {
    captureActiveApp();
    showSnippetWindow();
  });

  const historyHotkey = store.get('customHotkeyHistory', DEFAULT_HISTORY_SHORTCUT);
  registerWithRetry(historyHotkey, () => {
    captureActiveApp();
    showHistoryWindow();
  });
}

// 権限案内ウィンドウ作成
function createPermissionWindow() {
  permissionWindow = new BrowserWindow({
    width: 700,
    height: 600,
    show: false,
    resizable: false,
    visibleOnAllWorkspaces: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  permissionWindow.loadFile(path.join(__dirname, 'permission-guide.html'));

  permissionWindow.once('ready-to-show', () => {
    permissionWindow.show();
  });

  permissionWindow.on('closed', () => {
    permissionWindow = null;
  });
}

// システムトレイ作成
function createTray() {
  const iconPath = process.platform === 'win32' 
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/tray_icon_16.png');
  
  try {
    tray = new Tray(iconPath);
  } catch (error) {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'クリップボード履歴を開く', 
      click: () => showClipboardWindow() 
    },
    { type: 'separator' },
    { 
      label: '設定', 
      click: () => {
        if (mainWindow) {
          if (process.platform === 'darwin') {
            mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          }
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    { 
      label: '終了', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Snipee');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    showClipboardWindow();
  });
}

// クリップボード監視
function startClipboardMonitoring() {
  lastClipboardText = clipboard.readText();
  clipboardHistory = store.get('clipboardHistory', []);

  setInterval(() => {
    const currentText = clipboard.readText();
    
    if (currentText && currentText !== lastClipboardText) {
      lastClipboardText = currentText;
      addToClipboardHistory(currentText);
    }
  }, 500);
}

// クリップボード履歴に追加
function addToClipboardHistory(text) {
  clipboardHistory = clipboardHistory.filter(item => item.content !== text);

  clipboardHistory.unshift({
    id: Date.now().toString(),
    content: text,
    timestamp: new Date().toISOString(),
    type: 'history'
  });

  if (clipboardHistory.length > MAX_HISTORY) {
    clipboardHistory = clipboardHistory.slice(0, MAX_HISTORY);
  }

  store.set('clipboardHistory', clipboardHistory);

  if (clipboardWindow && !clipboardWindow.isDestroyed()) {
    clipboardWindow.webContents.send('clipboard-updated');
  }
}

// 汎用ウィンドウ表示関数
function showGenericWindow(type) {
  const windowMap = {
    clipboard: { window: clipboardWindow, create: createClipboardWindow },
    snippet: { window: snippetWindow, create: createSnippetWindow },
    history: { window: historyWindow, create: createHistoryWindow }
  };

  const { window, create } = windowMap[type];
  let currentWindow = type === 'clipboard' ? clipboardWindow : 
                      type === 'snippet' ? snippetWindow : historyWindow;

  // 他のウィンドウを閉じる
  const allWindows = [
    { win: clipboardWindow, type: 'clipboard' },
    { win: snippetWindow, type: 'snippet' },
    { win: historyWindow, type: 'history' }
  ];
  
  allWindows.forEach(({ win, type: winType }) => {
    if (winType !== type && win && !win.isDestroyed() && win.isVisible()) {
      win.hide();
    }
  });

  if (!currentWindow || currentWindow.isDestroyed()) {
    create();
    currentWindow = type === 'clipboard' ? clipboardWindow : 
                    type === 'snippet' ? snippetWindow : historyWindow;
  }

  if (currentWindow.isVisible()) {
    currentWindow.hide();
  } else {
    positionAndShowWindow(type, currentWindow);
  }
}

// ラッパー関数
function showClipboardWindow() {
  showGenericWindow('clipboard');
}

function showSnippetWindow() {
  showGenericWindow('snippet');
}

function showHistoryWindow() {
  showGenericWindow('history');
}

// 汎用ポジショニング&表示関数
function positionAndShowWindow(type, window) {
  const { screen } = require('electron');
  
  if (process.platform === 'darwin') {
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, 'floating');
  }
  
  const positionKey = type === 'clipboard' ? 'clipboardWindowPosition' : 
                      type === 'snippet' ? 'snippetWindowPosition' : 'historyWindowPosition';
  const positionMode = store.get('windowPositionMode', 'cursor');

  if (positionMode === 'previous') {
    const savedPosition = store.get(positionKey);
    if (savedPosition) {
      window.setPosition(savedPosition.x, savedPosition.y);
    } else {
      const display = screen.getPrimaryDisplay();
      const x = Math.floor((display.bounds.width - 460) / 2);
      const y = Math.floor((display.bounds.height - 650) / 2);
      window.setPosition(x, y);
    }
  } else {
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    
    let x = point.x + 25;
    let y = point.y + 100;

    if (x + 460 > display.bounds.x + display.bounds.width) {
      x = display.bounds.x + display.bounds.width - 470;
    }
    
    if (y + 650 > display.bounds.y + display.bounds.height) {
      y = display.bounds.y + display.bounds.height - 660;
    }

    window.setPosition(Math.floor(x), Math.floor(y));
  }

  window.show();
  window.focus();
}

// Google Driveから共有スニペットを取得
async function fetchMasterSnippets() {
  const url = store.get('masterSnippetUrl', 'https://drive.google.com/file/d/1MIHYx_GUjfqv591h6rzIbcxm_FQZwAXY/view?usp=sharing');
  if (!url) return { error: 'URLが設定されていません' };

  try {
    const fileId = extractFileIdFromUrl(url);
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    
    const response = await axios.get(downloadUrl, { responseType: 'text' });
    const xmlData = response.data;

    // HTMLエラーページが返ってきた場合を検出(大文字小文字両対応)
    const lowerData = xmlData.toLowerCase();
    if (lowerData.includes('<!doctype html>') || lowerData.includes('<html')) {
      return { error: 'アクセスが制限されています。Google Driveの共有設定で「リンクを知っている全員」に変更してください。' };
    }

    // XMLとして有効かチェック
    if (!xmlData.includes('<folders>') && !xmlData.includes('<FOLDERS>')) {
      return { error: 'XMLファイルの形式が正しくありません。Clipyのエクスポート形式を確認してください。' };
    }

    // XMLをパース
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      strict: false,
      trim: true,
      normalize: false,
      normalizeTags: true,
      attrkey: '$',
      charkey: '_',
      explicitCharkey: false,
      mergeAttrs: false
    });
    const result = await parser.parseStringPromise(xmlData);

    // Clipy形式のXMLをSnipee内部形式に変換
    const snippets = [];
    
    const foldersData = result.folders || result.FOLDERS;
    if (foldersData && (foldersData.folder || foldersData.FOLDER)) {
      const folderArray = Array.isArray(foldersData.folder || foldersData.FOLDER) 
        ? (foldersData.folder || foldersData.FOLDER)
        : [foldersData.folder || foldersData.FOLDER];
      
      folderArray.forEach(folder => {
        const folderName = folder.title || 'Uncategorized';
        
        const snippetArray = folder.snippets && folder.snippets.snippet
          ? (Array.isArray(folder.snippets.snippet) 
              ? folder.snippets.snippet 
              : [folder.snippets.snippet])
          : [];
        
        snippetArray.forEach(snippet => {
          const title = snippet.title || '';
          const content = snippet.content || '';
          const description = snippet.description || '';
          
          const id = snippet.id || generateSnippetId(folderName, title, content);
          
          snippets.push({
            id,
            title,
            content,
            description,
            folder: folderName
          });
        });
      });
    }

    return { snippets };
  } catch (error) {
    return { error: `同期エラー: ${error.message}` };
  }
}

function extractFileIdFromUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

// スニペット同期
async function syncSnippets() {
  const result = await fetchMasterSnippets();
  
  // エラーチェック
  if (!result || result.error) {
    return { success: false, error: result?.error || '同期に失敗しました' };
  }

  // snippetsが存在するかチェック
  if (!result.snippets || !Array.isArray(result.snippets)) {
    return { success: false, error: 'スニペットデータが無効です' };
  }

  const xmlSnippets = result.snippets;
  
  // 既存のマスタスニペット取得
  const existingMaster = store.get('masterSnippets', { snippets: [] });
  let masterSnippets = existingMaster.snippets || [];
  
  // XMLに存在するスニペットのID一覧
  const xmlIds = xmlSnippets.map(s => s.id);
  
  // 同期処理
  xmlSnippets.forEach(xmlSnip => {
    const existing = masterSnippets.find(s => s.id === xmlSnip.id);
    
    if (existing) {
      existing.title = xmlSnip.title;
      existing.folder = xmlSnip.folder;
      existing.content = xmlSnip.content;
      
      if (!existing.description) {
        existing.description = xmlSnip.description;
      }
    } else {
      masterSnippets.push(xmlSnip);
    }
  });
  
  // XMLに存在しないマスタスニペットを削除
  masterSnippets = masterSnippets.filter(s => xmlIds.includes(s.id));
  
  // XMLに存在するフォルダ一覧でmasterFoldersも更新
  const xmlFolders = [...new Set(xmlSnippets.map(s => s.folder))];
  store.set('masterFolders', xmlFolders);
  
  // 保存
  store.set('masterSnippets', { snippets: masterSnippets });
  store.set('lastSync', new Date().toISOString());
  
  return { success: true };
}

// アプリ起動
app.whenReady().then(() => {
  // window-ready イベントハンドラ（グローバルに1回だけ登録）
  ipcMain.on('window-ready', (event) => {
  const sender = event.sender;
  
  if (clipboardWindow && !clipboardWindow.isDestroyed() && sender === clipboardWindow.webContents) {
    if (!clipboardWindow.isVisible()) {
      clipboardWindow.show();
    }
  } else if (snippetWindow && !snippetWindow.isDestroyed() && sender === snippetWindow.webContents) {
    if (!snippetWindow.isVisible()) {
      snippetWindow.show();
    }
  } else if (historyWindow && !historyWindow.isDestroyed() && sender === historyWindow.webContents) {
    if (!historyWindow.isVisible()) {
      historyWindow.show();
    }
  }
});

  // ホットキー登録
  setTimeout(() => {
    registerGlobalShortcuts();
  }, 500);

  // 自動アップデートチェック（本番環境のみ）
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  
  createMainWindow();
  createTray();

  // 初回起動時はウェルカム画面を表示
  if (!store.get('welcomeCompleted', false)) {
    createWelcomeWindow();
  }

  // 個別スニペットが既に存在する場合はスキップ（再インストール対応）
    const existingSnippets = personalStore.get('snippets', []);
    if (!store.get('initialSnippetsCreated', false) && existingSnippets.length === 0) {
    const defaultFolders = ['Sample1', 'Sample2', 'Sample3'];
    const defaultSnippets = [
      { id: Date.now().toString() + '-1', title: 'Sample1-1', content: 'Sample1-1\nSample1-1\nSample1-1', folder: 'Sample1' },
      { id: Date.now().toString() + '-2', title: 'Sample1-2', content: 'Sample1-2の内容', folder: 'Sample1' },
      { id: Date.now().toString() + '-3', title: 'Sample1-3', content: 'Sample1-3の内容', folder: 'Sample1' },
      { id: Date.now().toString() + '-4', title: 'Sample2-1', content: 'Sample2-1の内容', folder: 'Sample2' },
      { id: Date.now().toString() + '-5', title: 'Sample2-2', content: 'Sample2-2の内容', folder: 'Sample2' },
      { id: Date.now().toString() + '-6', title: 'Sample2-3', content: 'Sample2-3の内容', folder: 'Sample2' },
      { id: Date.now().toString() + '-7', title: 'Sample3-1', content: 'Sample3-1の内容', folder: 'Sample3' },
      { id: Date.now().toString() + '-8', title: 'Sample3-2', content: 'Sample3-2の内容', folder: 'Sample3' },
      { id: Date.now().toString() + '-9', title: 'Sample3-3', content: 'Sample3-3の内容', folder: 'Sample3' },
    ];

    // 個別スニペットは専用ストアに保存（アンインストールで消えない）
    personalStore.set('folders', defaultFolders);
    personalStore.set('snippets', defaultSnippets);
    store.set('initialSnippetsCreated', true);
  }

  if (process.platform === 'darwin') {
    const hasPermission = hasAccessibilityPermission();
    
    if (!hasPermission && !store.get('permissionGuideShown', false)) {
      store.set('permissionGuideShown', true);
      setTimeout(() => {
        createPermissionWindow();
      }, 1000);
    }
  }

  startClipboardMonitoring();

  // Google Drive同期(非同期実行)
  syncSnippets();
});

// IPCハンドラー
ipcMain.handle('get-all-items', () => {
  const masterSnippets = store.get('masterSnippets', { snippets: [] });
  const personalSnippets = store.get('personalSnippets', []);
  
  return {
    history: clipboardHistory,
    personalSnippets: personalSnippets,
    masterSnippets: masterSnippets.snippets || [],
    lastSync: store.get('lastSync', null),
    hasPermission: hasAccessibilityPermission()
  };
});

ipcMain.handle('check-permission', () => {
  return hasAccessibilityPermission();
});

ipcMain.handle('request-permission', () => {
  requestAccessibilityPermission();
  return true;
});

ipcMain.handle('open-system-preferences', () => {
  if (process.platform === 'darwin') {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  }
  return true;
});

ipcMain.handle('close-permission-window', () => {
  if (permissionWindow) {
    permissionWindow.close();
  }
  return true;
});

// ホットキー管理
ipcMain.handle('get-current-hotkey', (event, type) => {
  if (type === 'main') {
    return store.get('customHotkeyMain', DEFAULT_CLIPBOARD_SHORTCUT);
  } else if (type === 'snippet') {
    return store.get('customHotkeySnippet', DEFAULT_SNIPPET_SHORTCUT);
  }
  return DEFAULT_CLIPBOARD_SHORTCUT;
});

ipcMain.handle('set-hotkey', (event, type, accelerator) => {
  try {
    if (type === 'main') {
      store.set('customHotkeyMain', accelerator);
    } else if (type === 'snippet') {
      store.set('customHotkeySnippet', accelerator);
    }
    
    registerGlobalShortcuts();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-all-hotkeys', () => {
  store.delete('customHotkeyMain');
  store.delete('customHotkeySnippet');
  registerGlobalShortcuts();
  return true;
});

ipcMain.handle('get-snippets', () => {
  const masterSnippets = store.get('masterSnippets', { snippets: [] });
  
  return {
    master: masterSnippets,
    lastSync: store.get('lastSync', null)
  };
});

ipcMain.handle('save-master-snippet', (event, snippet) => {
  const masterSnippets = store.get('masterSnippets', { snippets: [] });
  masterSnippets.snippets.push(snippet);
  store.set('masterSnippets', masterSnippets);
  return true;
});

ipcMain.handle('update-master-snippet', (event, snippet) => {
  const masterSnippets = store.get('masterSnippets', { snippets: [] });
  const index = masterSnippets.snippets.findIndex(s => s.id === snippet.id);
  if (index !== -1) {
    masterSnippets.snippets[index] = snippet;
    store.set('masterSnippets', masterSnippets);
  }
  return true;
});

ipcMain.handle('delete-master-snippet', (event, snippetId) => {
  const masterSnippets = store.get('masterSnippets', { snippets: [] });
  masterSnippets.snippets = masterSnippets.snippets.filter(s => s.id !== snippetId);
  store.set('masterSnippets', masterSnippets);
  return true;
});

ipcMain.handle('delete-history-item', (event, itemId) => {
  clipboardHistory = clipboardHistory.filter(item => item.id !== itemId);
  store.set('clipboardHistory', clipboardHistory);
  return true;
});

ipcMain.handle('clear-all-history', () => {
  clipboardHistory = [];
  store.set('clipboardHistory', []);
  return true;
});

ipcMain.handle('toggle-pin-item', (event, itemId) => {
  const index = pinnedItems.indexOf(itemId);
  
  if (index > -1) {
    pinnedItems.splice(index, 1);
  } else {
    pinnedItems.push(itemId);
  }
  
  store.set('pinnedItems', pinnedItems);
  return { pinnedItems };
});

ipcMain.handle('get-pinned-items', () => {
  return pinnedItems;
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  lastClipboardText = text;
  return true;
});

ipcMain.handle('set-master-url', async (event, url) => {
  store.set('masterSnippetUrl', url);
  const result = await syncSnippets();
  return result;
});

ipcMain.handle('manual-sync', async () => {
  const result = await syncSnippets();
  return {
    success: result.success,
    error: result.error,
    lastSync: store.get('lastSync', null)
  };
});

ipcMain.handle('remove-master-url', async () => {
  try {
    store.delete('masterSnippetUrl');
    store.set('masterSnippets', { snippets: [] });
    store.delete('lastSync');
    
    const orderFile = path.join(app.getPath('userData'), 'master-snippets-order.json');
    try {
      require('fs').unlinkSync(orderFile);
    } catch (e) {
      // ファイルが存在しない場合は無視
    }
    
    return true;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('hide-window', () => {
  if (clipboardWindow) {
    clipboardWindow.hide();
  }
  return true;
});

ipcMain.handle('hide-snippet-window', () => {
  if (snippetWindow) {
    snippetWindow.hide();
  }
  return true;
});

ipcMain.handle('hide-history-window', () => {
  if (historyWindow) {
    historyWindow.hide();
  }
  return true;
});

ipcMain.handle('quit-app', () => {
  app.quit();
  return true;
});

ipcMain.handle('show-settings', () => {
  if (clipboardWindow && !clipboardWindow.isDestroyed()) {
    clipboardWindow.destroy();
    clipboardWindow = null;
  }
  
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    snippetWindow.destroy();
    snippetWindow = null;
  }
  
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.destroy();
    historyWindow = null;
  }
  
  // 設定画面を表示
  if (mainWindow) {
    if (process.platform === 'darwin') {
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle('hide-settings-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  return true;
});

// マウストラッキング
let isMouseOverClipboard = false;
let clipboardCloseTimer = null;

ipcMain.on('log', (event, msg) => {
  console.log(msg);
});

ipcMain.on('clipboard-mouse-enter', () => {
  isMouseOverClipboard = true;
  
  if (clipboardCloseTimer) {
    clearTimeout(clipboardCloseTimer);
    clipboardCloseTimer = null;
  }
});

ipcMain.on('clipboard-mouse-leave', () => {
  isMouseOverClipboard = false;
  
  if (clipboardCloseTimer) {
    clearTimeout(clipboardCloseTimer);
  }
  
  clipboardCloseTimer = setTimeout(() => {
    if (!isMouseOverClipboard) {
      if (clipboardWindow) {
        clipboardWindow.hide();
      }
    }
  }, 150);
});

ipcMain.handle('paste-text', async (event, text) => {
  // 変数を置換
  const processedText = replaceVariables(text);
  
  clipboard.writeText(processedText);

  // 使用した履歴を最新に移動
  const existingIndex = clipboardHistory.findIndex(item => item.content === processedText);
  if (existingIndex > 0) {
    const [usedItem] = clipboardHistory.splice(existingIndex, 1);
    usedItem.timestamp = new Date().toISOString();
    clipboardHistory.unshift(usedItem);
    store.set('clipboardHistory', clipboardHistory);
  }

  lastClipboardText = processedText;

  if (clipboardWindow) clipboardWindow.hide();
  if (snippetWindow) snippetWindow.hide();
  if (historyWindow) historyWindow.hide();

  // ウィンドウ閉じ待ち
  await new Promise(resolve => setTimeout(resolve, 10));

  // Mac: 元のアプリをアクティブにする
  if (process.platform === 'darwin' && previousActiveApp) {
    await new Promise((resolve) => {
      exec(`osascript -e 'tell application id "${previousActiveApp}" to activate'`, () => resolve());
    });
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  // Windows: フォーカスを戻してペースト（koffi使用）
  if (process.platform === 'win32' && previousActiveApp) {
    keybd_event(VK_MENU, 0, 0, null);
    SetForegroundWindow(previousActiveApp);
    keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, null);
    
    await new Promise(resolve => setTimeout(resolve, 20));
    
    keybd_event(VK_CONTROL, 0, 0, null);
    keybd_event(VK_V, 0, 0, null);
    keybd_event(VK_V, 0, KEYEVENTF_KEYUP, null);
    keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, null);
  }

  // Mac: ペースト（osascript使用）
  if (process.platform === 'darwin') {
    exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
  }

  return { success: true };
});

// 個別スニペット管理
ipcMain.handle('get-personal-snippets', () => {
  // 旧データの移行チェック（一度だけ実行）
  if (!store.get('personalDataMigrated', false)) {
    const oldFolders = store.get('personalFolders', null);
    const oldSnippets = store.get('personalSnippets', null);
    
    if (oldFolders !== null || oldSnippets !== null) {
      // 旧データがあれば移行
      if (oldFolders) personalStore.set('folders', oldFolders);
      if (oldSnippets) personalStore.set('snippets', oldSnippets);
      
      // 旧データを削除
      store.delete('personalFolders');
      store.delete('personalSnippets');
    }
    store.set('personalDataMigrated', true);
  }
  
  return {
    folders: personalStore.get('folders', []),
    snippets: personalStore.get('snippets', [])
  };
});

ipcMain.handle('save-personal-folders', (event, folders) => {
  personalStore.set('folders', folders);
  return true;
});

ipcMain.handle('save-personal-snippets', (event, snippets) => {
  personalStore.set('snippets', snippets);
  
  if (clipboardWindow && !clipboardWindow.isDestroyed()) {
    clipboardWindow.webContents.send('personal-snippets-updated');
  }
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    snippetWindow.webContents.send('personal-snippets-updated');
  }
  
  return true;
});

ipcMain.handle('open-snippet-editor', () => {
  if (clipboardWindow && !clipboardWindow.isDestroyed()) {
    clipboardWindow.destroy();
    clipboardWindow = null;
  }
  
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    snippetWindow.destroy();
    snippetWindow = null;
  }
  
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.destroy();
    historyWindow = null;
  }
  
  if (!snippetEditorWindow || snippetEditorWindow.isDestroyed()) {
    createSnippetEditorWindow();
  } else {
    snippetEditorWindow.show();
    snippetEditorWindow.focus();
  }
  return true;
});

ipcMain.handle('close-snippet-editor', () => {
  if (snippetEditorWindow) {
    snippetEditorWindow.close();
  }
  return true;
});

ipcMain.handle('get-snippet-window-bounds', () => {
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    return snippetWindow.getBounds();
  }
  return { x: 0, y: 0, width: 460, height: 650 };
});

ipcMain.handle('get-window-position-mode', () => {
  return store.get('windowPositionMode', 'cursor');
});

ipcMain.handle('set-window-position-mode', (event, mode) => {
  store.set('windowPositionMode', mode);
  return true;
});

ipcMain.handle('get-hidden-folders', () => {
  return store.get('hiddenFolders', []);
});

ipcMain.handle('set-hidden-folders', (event, folders) => {
  store.set('hiddenFolders', folders);
  return true;
});

ipcMain.handle('update-master-description', (event, snippetId, description) => {
  const masterData = store.get('masterSnippets', { snippets: [] });
  const snippet = masterData.snippets.find(s => s.id === snippetId);
  
  if (snippet) {
    snippet.description = description;
    store.set('masterSnippets', masterData);
    return { success: true };
  }
  
  return { success: false };
});

// マスタフォルダ保存
ipcMain.handle('save-master-folders', (event, folders) => {
  store.set('masterFolders', folders);
  return true;
});

// マスタフォルダ取得
ipcMain.handle('get-master-folders', () => {
  return store.get('masterFolders', []);
});

ipcMain.handle('save-master-order', async (event, orderData) => {
  try {
    const orderFile = path.join(app.getPath('userData'), 'master-snippets-order.json');
    require('fs').writeFileSync(orderFile, JSON.stringify(orderData, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-master-order', async () => {
  try {
    const orderFile = path.join(app.getPath('userData'), 'master-snippets-order.json');
    const data = require('fs').readFileSync(orderFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('resize-window', (event, size) => {
  const sender = event.sender;
  
  if (clipboardWindow && !clipboardWindow.isDestroyed() && sender === clipboardWindow.webContents) {
    const currentBounds = clipboardWindow.getBounds();
    clipboardWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: size.width,
      height: size.height
    });
  } else if (snippetWindow && !snippetWindow.isDestroyed() && sender === snippetWindow.webContents) {
    const currentBounds = snippetWindow.getBounds();
    snippetWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: size.width,
      height: size.height
    });
  } else if (historyWindow && !historyWindow.isDestroyed() && sender === historyWindow.webContents) {
    const currentBounds = historyWindow.getBounds();
    historyWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: size.width,
      height: size.height
    });
  }
  
  return true;
});

ipcMain.handle('export-snippets-xml', async (event, { xml, filename }) => {
  try {
    const { dialog } = require('electron');
    const fs = require('fs');
    
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [
        { name: 'XML Files', extensions: ['xml'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, cancelled: true };
    }
    
    fs.writeFileSync(result.filePath, xml, 'utf-8');
    
    return { success: true, path: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// マスタ編集パスワード
const MASTER_EDIT_PASSWORD = '1108';

ipcMain.handle('verify-master-password', (event, password) => {
  return password === MASTER_EDIT_PASSWORD;
});

ipcMain.handle('close-welcome-window', () => {
  if (welcomeWindow) {
    welcomeWindow.close();
  }
  return true;
});

// 設定の取得・保存
ipcMain.on('get-config', (event, key) => {
  event.returnValue = store.get(key);
});

ipcMain.on('save-config', (event, key, value) => {
  store.set(key, value);
});

// アプリ終了時
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// スニペットID生成関数
function generateSnippetId(folder, title, content) {
  const base = `${folder}_${title}_${content.substring(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash = hash & hash;
  }
  return `snippet_${Math.abs(hash).toString(36)}`;
}


// ========================================
// 変数置換機能
// ========================================

/**
 * 日付をフォーマット
 */
function formatDate(date, format) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (format === 'MM/DD') {
    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  }
  
  if (format === 'M月D日') {
    return `${month}月${day}日`;
  }
  
  return date.toLocaleDateString('ja-JP');
}

/**
 * 曜日を取得（短縮形）
 */
function getWeekdayShort(date) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `（${weekdays[date.getDay()]}）`;
}

/**
 * N日後の日付を取得（1日を除外）
 */
function addDaysExcluding1st(date, days, alternativeDays) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  
  // 1日だったら代替日数を使用
  if (result.getDate() === 1) {
    const alternative = new Date(date);
    alternative.setDate(alternative.getDate() + alternativeDays);
    return alternative;
  }
  
  return result;
}

/**
 * 日付と曜日をフォーマット
 */
function formatDateWithWeekday(date) {
  return formatDate(date, 'M月D日') + getWeekdayShort(date);
}

/**
 * タイムスタンプをフォーマット
 */
function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * スニペット内の変数を実際の値に置換
 */
function replaceVariables(text) {
  const now = new Date();
  const userName = store.get('userName', '');
  
  // {今日:MM/DD}
  text = text.replace(/\{今日:MM\/DD\}/g, formatDate(now, 'MM/DD'));
  
  // {明日:MM/DD}
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  text = text.replace(/\{明日:MM\/DD\}/g, formatDate(tomorrow, 'MM/DD'));
  
  // 連動する日程計算（1日をスキップ、かつ重複しない）
  const schedule1 = addDaysExcluding1st(now, 2, 3);
  
  // 日程2は日程1の翌日（ただし1日ならスキップ）
  const schedule2Base = new Date(schedule1);
  schedule2Base.setDate(schedule2Base.getDate() + 1);
  const schedule2 = schedule2Base.getDate() === 1 
    ? new Date(schedule2Base.setDate(schedule2Base.getDate() + 1))
    : schedule2Base;
  
  // {2日後:M月D日:曜日短（毎月1日は除外して3日後）}
  text = text.replace(
    /\{2日後:M月D日:曜日短（毎月1日は除外して3日後）\}/g,
    formatDateWithWeekday(schedule1) 
  );
  
  // {3日後:M月D日:曜日短（毎月1日は除外して4日後）}
  text = text.replace(
    /\{3日後:M月D日:曜日短（毎月1日は除外して4日後）\}/g,
    formatDateWithWeekday(schedule2)
  );
  
  // {タイムスタンプ}
  text = text.replace(/\{タイムスタンプ\}/g, formatTimestamp(now));
  
  // {名前}
  text = text.replace(/\{名前\}/g, userName);
  
  return text;
}

// =====================================
// 自動アップデート
// =====================================
// 設定画面からの手動ダウンロード用フラグ
let isManualDownload = false;

autoUpdater.on('update-downloaded', () => {
  // 手動ダウンロードの場合は設定画面に通知
  if (isManualDownload && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded');
    isManualDownload = false;
    return;
  }
  
  // 自動ダウンロードの場合はダイアログ表示
  dialog.showMessageBox({
    type: 'info',
    title: 'Snipee アップデート',
    message: '新しいバージョンがダウンロードされました。再起動して適用しますか？',
    buttons: ['再起動', '後で']
  }).then((result) => {
    if (result.response === 0) {
      app.isQuitting = true;
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

// ダウンロード進捗
autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', progressObj.percent);
  }
});

// 手動ダウンロード開始
ipcMain.on('download-update', () => {
  isManualDownload = true;
  autoUpdater.downloadUpdate();
});

// 再起動してインストール
ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

// =====================================
// アップデートチェック（手動）
// =====================================
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  try {
    if (!app.isPackaged) {
      // 開発環境ではダミーレスポンス
      return { updateAvailable: false, currentVersion: app.getVersion(), message: '開発環境です' };
    }
    
    const result = await autoUpdater.checkForUpdates();
    
    if (result && result.updateInfo) {
      const currentVersion = app.getVersion();
      const latestVersion = result.updateInfo.version;
      
      if (latestVersion === currentVersion) {
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion,
          message: '最新バージョンです！'
        };
      }
      
      return {
        updateAvailable: true,
        currentVersion,
        latestVersion,
        message: `新しいバージョン v${latestVersion} があります`
      };
    }
    
    return { 
      updateAvailable: false, 
      currentVersion: app.getVersion(),
      message: '最新バージョンです！'
    };
  } catch (error) {
    console.error('Update check failed:', error);
    return { 
      updateAvailable: false, 
      currentVersion: app.getVersion(),
      error: true,
      message: 'アップデートの確認に失敗しました'
    };
  }
});