const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu, systemPreferences, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const xml2js = require('xml2js');

// ストアの初期化
const store = new Store();

// デフォルトホットキー設定
const DEFAULT_CLIPBOARD_SHORTCUT = process.platform === 'darwin' ? 'Option+Shift+C' : 'Alt+Shift+C';
const DEFAULT_SNIPPET_SHORTCUT = process.platform === 'darwin' ? 'Option+Shift+V' : 'Alt+Shift+V';

let mainWindow;
let clipboardWindow;
let snippetWindow;
let permissionWindow;
let submenuWindow = null;
let tray = null;

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
let lastClipboardText = '';
const MAX_HISTORY = 100;

// Google DriveのマスターJSONファイルURL
const MASTER_SNIPPET_URL = store.get('masterSnippetUrl', '');

// 設定ウィンドウ作成
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,  // 500 → 800
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'settings.html'));
  
  mainWindow.once('ready-to-show', () => {
    // 起動時は表示しない
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// クリップボードウィンドウ作成
function createClipboardWindow() {
  clipboardWindow = new BrowserWindow({
    width: 420,
    height: 550,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  clipboardWindow.loadFile(path.join(__dirname, 'index.html'));
}

// サブメニューウィンドウ作成
function createSubmenuWindow() {
  submenuWindow = new BrowserWindow({
    width: 280,
    height: 400,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  submenuWindow.loadFile(path.join(__dirname, 'submenu.html'));
}

// スニペットウィンドウ作成
function createSnippetWindow() {
  snippetWindow = new BrowserWindow({
    width: 420,
    height: 550,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  snippetWindow.loadFile(path.join(__dirname, 'snippets.html'));
}

// 権限案内ウィンドウ作成
function createPermissionWindow() {
  permissionWindow = new BrowserWindow({
    width: 700,
    height: 600,
    show: false,
    resizable: false,
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
    : path.join(__dirname, '../build/icon.png');
  
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

// クリップボードウィンドウを表示
function showClipboardWindow() {
  if (!clipboardWindow || clipboardWindow.isDestroyed()) {
    createClipboardWindow();
  }

  if (clipboardWindow.isVisible()) {
    clipboardWindow.hide();  // 開いていたら閉じる (これだけ)
  } else {
    positionAndShowClipboard();  // 閉じていたら開く
  }
}

function positionAndShowClipboard() {
  const { screen } = require('electron');
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  
  let x = point.x - 210;  // 185 → 210 (420の半分)
  let y = point.y - 275;

  if (x + 420 > display.bounds.x + display.bounds.width) {  // 370 → 420
    x = display.bounds.x + display.bounds.width - 430;  // 380 → 430
  }
  
  if (y + 550 > display.bounds.y + display.bounds.height) {
    y = display.bounds.y + display.bounds.height - 560;
  }

  clipboardWindow.setPosition(Math.floor(x), Math.floor(y));
  clipboardWindow.show();
  clipboardWindow.focus();
}

// スニペットウィンドウを表示
function showSnippetWindow() {
  if (!snippetWindow || snippetWindow.isDestroyed()) {
    createSnippetWindow();
  }

  if (snippetWindow.isVisible()) {
    snippetWindow.hide();  // 開いていたら閉じる (これだけ)
  } else {
    positionAndShowSnippet();  // 閉じていたら開く
  }
}

function positionAndShowSnippet() {
  const { screen } = require('electron');
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  
  let x = point.x - 210;  // 180 → 210 (420の半分)
  let y = point.y - 275;

  if (x + 420 > display.bounds.x + display.bounds.width) {  // 360 → 420
    x = display.bounds.x + display.bounds.width - 430;  // 370 → 430
  }
  
  if (y + 550 > display.bounds.y + display.bounds.height) {
    y = display.bounds.y + display.bounds.height - 560;
  }

  snippetWindow.setPosition(Math.floor(x), Math.floor(y));
  snippetWindow.show();
  snippetWindow.focus();
}

// サブメニューを表示
function showSubmenu(items, targetBounds) {
  if (!submenuWindow || submenuWindow.isDestroyed()) {
    createSubmenuWindow();
  }

  submenuWindow.webContents.once('did-finish-load', () => {
    submenuWindow.webContents.send('show-items', { items });
  });

  if (submenuWindow.webContents.getURL()) {
    submenuWindow.webContents.send('show-items', { items });
  }

  const x = targetBounds.x + targetBounds.width - 5;
  const y = targetBounds.y;

  submenuWindow.setPosition(Math.floor(x), Math.floor(y));
  submenuWindow.show();
}

// サブメニューを隠す
function hideSubmenu() {
  if (submenuWindow && !submenuWindow.isDestroyed()) {
    submenuWindow.hide();
  }
}

// Google Driveから共有スニペットを取得（XML形式）
async function fetchMasterSnippets() {
  const url = store.get('masterSnippetUrl', '');
  if (!url) return null;

  try {
    const fileId = extractFileIdFromUrl(url);
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    
    const response = await axios.get(downloadUrl, { responseType: 'text' });
    const xmlData = response.data;

    // XMLをパース（絵文字・特殊文字対応）
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      strict: false,
      trim: true,
      normalize: false,
      normalizeTags: true,        // ← これをtrueに変更
      attrkey: '$',
      charkey: '_',
      explicitCharkey: false,
      mergeAttrs: false
    });
    const result = await parser.parseStringPromise(xmlData);

    // XMLパース結果の詳細ログ
    console.log('=== Raw Parse Result ===');
    console.log(JSON.stringify(result, null, 2).substring(0, 500)); // 最初の500文字だけ
    console.log('========================');

    // Clipy形式のXMLをSnipee内部形式に変換
    const snippets = [];
    
    // 大文字・小文字両方に対応
    const foldersData = result.folders || result.FOLDERS;
    if (foldersData && (foldersData.folder || foldersData.FOLDER)) {
      const folderArray = Array.isArray(foldersData.folder || foldersData.FOLDER) 
        ? (foldersData.folder || foldersData.FOLDER)
        : [foldersData.folder || foldersData.FOLDER];
      
      folderArray.forEach(folder => {
        const snippetArray = folder.snippets && folder.snippets.snippet
          ? (Array.isArray(folder.snippets.snippet) 
              ? folder.snippets.snippet 
              : [folder.snippets.snippet])
          : [];
        
        snippetArray.forEach(snippet => {
          snippets.push({
            id: Date.now().toString() + Math.random(),
            title: snippet.title || '',
            content: snippet.content || '',
            folder: folder.title || 'Uncategorized'
          });
        });
      });
    }

    // デバッグ用ログ
    console.log('=== XML Parse Result ===');
    console.log('Result keys:', Object.keys(result));
    console.log('Folders found:', result.folders ? 'Yes' : 'No');
    if (result.folders && result.folders.folder) {
      const folderArray = Array.isArray(result.folders.folder) 
        ? result.folders.folder 
        : [result.folders.folder];
      console.log('Number of folders:', folderArray.length);
      console.log('First folder:', folderArray[0]?.title);
    }
    console.log('Total snippets:', snippets.length);
    console.log('First snippet:', snippets[0]);
    console.log('========================');

    return { snippets };
  } catch (error) {
    console.error('XML parse error:', error);
    return null;
  }
}

function extractFileIdFromUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

// スニペット同期
async function syncSnippets() {
  const masterSnippets = await fetchMasterSnippets();
  if (masterSnippets) {
    store.set('masterSnippets', masterSnippets);
    store.set('lastSync', new Date().toISOString());
    return true;
  }
  return false;
}

// アプリ起動
app.whenReady().then(() => {
  createMainWindow();
  createClipboardWindow();
  createTray();

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

  // 簡易ホーム用ホットキー
  const mainHotkey = store.get('customHotkeyMain', DEFAULT_CLIPBOARD_SHORTCUT);
  const registered = globalShortcut.register(mainHotkey, () => {
    showClipboardWindow();
  });

  // スニペット専用ホットキー
  const snippetHotkey = store.get('customHotkeySnippet', DEFAULT_SNIPPET_SHORTCUT);
  const snippetRegistered = globalShortcut.register(snippetHotkey, () => {
    showSnippetWindow();
  });

  syncSnippets();

  setInterval(syncSnippets, 5 * 60 * 1000);
});

// デバッグログ
ipcMain.on('debug-log', (event, message) => {
  // console.log(message);
});

ipcMain.handle('get-all-items', () => {
  const masterSnippets = store.get('masterSnippets', { snippets: [] });
  
  return {
    history: clipboardHistory,
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
    
    // 両方のホットキーを再登録
    globalShortcut.unregisterAll();
    
    const mainHotkey = store.get('customHotkeyMain', DEFAULT_CLIPBOARD_SHORTCUT);
    const snippetHotkey = store.get('customHotkeySnippet', DEFAULT_SNIPPET_SHORTCUT);
    
    const registered = globalShortcut.register(mainHotkey, () => {
      showClipboardWindow();
    });
    
    globalShortcut.register(snippetHotkey, () => {
      showSnippetWindow();
    });
    
    if (registered) {
      return { success: true };
    } else {
      return { success: false, error: 'このホットキーは登録できません（他のアプリで使用中の可能性があります）' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-all-hotkeys', () => {
  store.delete('customHotkeyMain');
  store.delete('customHotkeySnippet');
  globalShortcut.unregisterAll();
  
  globalShortcut.register(DEFAULT_CLIPBOARD_SHORTCUT, () => {
    showClipboardWindow();
  });
  
  globalShortcut.register(DEFAULT_SNIPPET_SHORTCUT, () => {
    showSnippetWindow();
  });
  
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

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  lastClipboardText = text;
  return true;
});

ipcMain.handle('set-master-url', (event, url) => {
  store.set('masterSnippetUrl', url);
  return syncSnippets();
});

ipcMain.handle('manual-sync', async () => {
  const success = await syncSnippets();
  return {
    success,
    lastSync: store.get('lastSync', null)
  };
});

ipcMain.handle('hide-window', () => {
  hideSubmenu();
  
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

ipcMain.handle('quit-app', () => {
  app.quit();
  return true;
});

ipcMain.handle('show-settings', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});

ipcMain.handle('hide-settings-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  return true;
});

// サブメニュー表示
ipcMain.handle('show-submenu', (event, data) => {
  showSubmenu(data.items, data.bounds);
  return true;
});

// サブメニュー非表示
ipcMain.handle('hide-submenu', () => {
  hideSubmenu();
  return true;
});

// ウィンドウの位置を取得
ipcMain.handle('get-window-bounds', () => {
  if (clipboardWindow && !clipboardWindow.isDestroyed()) {
    return clipboardWindow.getBounds();
  }
  return { x: 0, y: 0, width: 320, height: 550 };
});

// マウストラッキング
let isMouseOverClipboard = false;
let isMouseOverSubmenu = false;
let clipboardCloseTimer = null;
let submenuCloseTimer = null;

ipcMain.on('clipboard-mouse-enter', () => {
  isMouseOverClipboard = true;
  
  if (clipboardCloseTimer) {
    clearTimeout(clipboardCloseTimer);
    clipboardCloseTimer = null;
  }
  if (submenuCloseTimer) {
    clearTimeout(submenuCloseTimer);
    submenuCloseTimer = null;
  }
});

ipcMain.on('clipboard-mouse-leave', () => {
  isMouseOverClipboard = false;
  
  if (clipboardCloseTimer) {
    clearTimeout(clipboardCloseTimer);
  }
  
  clipboardCloseTimer = setTimeout(() => {
    const isSubmenuShowing = submenuWindow && !submenuWindow.isDestroyed() && submenuWindow.isVisible();
    
    if (isSubmenuShowing) {
      return;
    }
    
    if (!isMouseOverClipboard) {
      if (clipboardWindow) {
        clipboardWindow.hide();
      }
    }
  }, 150);
});

ipcMain.on('submenu-mouse-enter', () => {
  isMouseOverSubmenu = true;
  
  if (submenuCloseTimer) {
    clearTimeout(submenuCloseTimer);
    submenuCloseTimer = null;
  }
});

ipcMain.on('submenu-mouse-leave', () => {
  isMouseOverSubmenu = false;
  
  if (submenuCloseTimer) {
    clearTimeout(submenuCloseTimer);
  }
  
  submenuCloseTimer = setTimeout(() => {
    if (isMouseOverSubmenu || isMouseOverClipboard) {
      return;
    }
    
    hideSubmenu();
    
    if (clipboardWindow) {
      clipboardWindow.hide();
    }
  }, 150);
});

ipcMain.handle('is-mouse-over-submenu', () => {
  return isMouseOverSubmenu;
});

// サブメニューアイテム選択
ipcMain.handle('select-submenu-item', async (event, item) => {
  clipboard.writeText(item.content);
  lastClipboardText = item.content;

  hideSubmenu();
  if (clipboardWindow) {
    clipboardWindow.hide();
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"', 
      (error) => {
        if (error) console.error('Paste error:', error);
      }
    );
  } else if (process.platform === 'darwin') {
    if (hasAccessibilityPermission()) {
      const { exec } = require('child_process');
      exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
        (error) => {
          if (error) console.error('Paste error:', error);
        }
      );
    }
  }
  
  return true;
});

// クリップボードにコピー & 自動ペースト
ipcMain.handle('paste-text', async (event, text) => {
  clipboard.writeText(text);
  lastClipboardText = text;

  if (clipboardWindow) {
    clipboardWindow.hide();
  }

  if (snippetWindow) {
    snippetWindow.hide();
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"', 
      (error) => {
        if (error) console.error('Paste error:', error);
      }
    );
  } else if (process.platform === 'darwin') {
    if (hasAccessibilityPermission()) {
      const { exec } = require('child_process');
      exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
        (error) => {
          if (error) console.error('Paste error:', error);
        }
      );
    }
  }

  return true;
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