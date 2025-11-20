const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu, systemPreferences, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const xml2js = require('xml2js');

// robotjsをロード（Windowsのみ）
let robot = null;
if (process.platform === 'win32') {
  try {
    robot = require('robotjs');
    console.log('✅ robotjs loaded successfully');
  } catch (error) {
    console.log('⚠️ robotjs not available:', error.message);
  }
}

// ストアの初期化
const store = new Store();

// デフォルトホットキー設定
const DEFAULT_CLIPBOARD_SHORTCUT = process.platform === 'darwin' ? 'Command+Control+C' : 'Ctrl+Alt+C';
const DEFAULT_SNIPPET_SHORTCUT = process.platform === 'darwin' ? 'Command+Control+V' : 'Ctrl+Alt+V';

let mainWindow;
let clipboardWindow;
let snippetWindow;
let permissionWindow;
let submenuWindow = null;
let tray = null;
let snippetEditorWindow = null;

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

// Google DriveのマスターJSONファイルURL
const MASTER_SNIPPET_URL = store.get('masterSnippetUrl', '');

// 設定ウィンドウ作成
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
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
    width: 460,
    height: 650,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    hasShadow: false,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,  // ← これを追加
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  clipboardWindow.loadFile(path.join(__dirname, 'index.html'));

  // ウィンドウ位置を保存
  clipboardWindow.on('moved', () => {
    if (clipboardWindow) {
      const bounds = clipboardWindow.getBounds();
      store.set('clipboardWindowPosition', { x: bounds.x, y: bounds.y });
    }
  });
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
    width: 460,
    height: 650,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    movable: true,
    hasShadow: false,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,  // ← これを追加
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  snippetWindow.loadFile(path.join(__dirname, 'snippets.html'));

  // ウィンドウ位置を保存
  snippetWindow.on('moved', () => {
    if (snippetWindow) {
      const bounds = snippetWindow.getBounds();
      store.set('snippetWindowPosition', { x: bounds.x, y: bounds.y });
    }
  });
}

// スニペット編集ウィンドウ作成
function createSnippetEditorWindow() {
  snippetEditorWindow = new BrowserWindow({
    width: 900,
    height: 600,
    show: false,
    frame: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  snippetEditorWindow.loadFile(path.join(__dirname, 'snippet-editor.html'));

  snippetEditorWindow.once('ready-to-show', () => {
    snippetEditorWindow.show();
  });

  snippetEditorWindow.on('closed', () => {
    snippetEditorWindow = null;
  });
}

// グローバルショートカット登録（リトライ機能付き）
function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  const mainHotkey = store.get('customHotkeyMain', DEFAULT_CLIPBOARD_SHORTCUT);
  const snippetHotkey = store.get('customHotkeySnippet', DEFAULT_SNIPPET_SHORTCUT);

  // リトライ処理付きで登録
  const registerWithRetry = (accelerator, callback, retries = 3) => {
    const attempt = (remaining) => {
      try {
        const success = globalShortcut.register(accelerator, callback);
        if (success) {
          console.log(`✅ Successfully registered: ${accelerator}`);
          return true;
        } else if (remaining > 0) {
          console.log(`⚠️ Failed to register ${accelerator}, retrying... (${remaining} attempts left)`);
          setTimeout(() => attempt(remaining - 1), 500);
        } else {
          console.error(`❌ Failed to register ${accelerator} after all retries`);
          return false;
        }
      } catch (error) {
        console.error(`❌ Error registering ${accelerator}:`, error);
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 500);
        }
      }
    };
    attempt(retries);
  };

  registerWithRetry(mainHotkey, () => {
    showClipboardWindow();
  });

  registerWithRetry(snippetHotkey, () => {
    showSnippetWindow();
  });
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
    clipboardWindow.hide();
  } else {
    positionAndShowClipboard();
  }
}

function positionAndShowClipboard() {
  const { screen } = require('electron');
  
  // macOSの場合、表示前に必ず設定を適用
  if (process.platform === 'darwin') {
    clipboardWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    clipboardWindow.setAlwaysOnTop(true, 'floating');
  }
  
  // ウィンドウ位置設定を取得
  const positionMode = store.get('windowPositionMode', 'cursor');

  if (positionMode === 'previous') {
    // 前回の位置に表示
    const savedPosition = store.get('clipboardWindowPosition');
    if (savedPosition) {
      clipboardWindow.setPosition(savedPosition.x, savedPosition.y);
    } else {
      // 初回は画面中央
      const display = screen.getPrimaryDisplay();
      const x = Math.floor((display.bounds.width - 460) / 2);
      const y = Math.floor((display.bounds.height - 650) / 2);
      clipboardWindow.setPosition(x, y);
    }
  } else {
    // マウスカーソル位置に表示
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    
    let x = point.x - 210;
    let y = point.y - 100;

    if (x + 460 > display.bounds.x + display.bounds.width) {
      x = display.bounds.x + display.bounds.width - 470;
    }
    
    if (y + 650 > display.bounds.y + display.bounds.height) {
      y = display.bounds.y + display.bounds.height - 660;
    }

    clipboardWindow.setPosition(Math.floor(x), Math.floor(y));
  }
  
  clipboardWindow.show();
  clipboardWindow.focus();
}

// スニペットウィンドウを表示
function showSnippetWindow() {
  if (!snippetWindow || snippetWindow.isDestroyed()) {
    createSnippetWindow();
  }

  if (snippetWindow.isVisible()) {
    snippetWindow.hide();
  } else {
    positionAndShowSnippet();
  }
}

function positionAndShowSnippet() {
  const { screen } = require('electron');
  
  // macOSの場合、表示前に必ず設定を適用
  if (process.platform === 'darwin') {
    snippetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    snippetWindow.setAlwaysOnTop(true, 'floating');
  }
  
  const positionMode = store.get('windowPositionMode', 'cursor');

  if (positionMode === 'previous') {
    const savedPosition = store.get('snippetWindowPosition');
    if (savedPosition) {
      snippetWindow.setPosition(savedPosition.x, savedPosition.y);
    } else {
      const display = screen.getPrimaryDisplay();
      const x = Math.floor((display.bounds.width - 460) / 2);
      const y = Math.floor((display.bounds.height - 650) / 2);
      snippetWindow.setPosition(x, y);
    }
  } else {
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    
    let x = point.x - 210;
    let y = point.y - 100;

    if (x + 460 > display.bounds.x + display.bounds.width) {
      x = display.bounds.x + display.bounds.width - 470;
    }
    
    if (y + 650 > display.bounds.y + display.bounds.height) {
      y = display.bounds.y + display.bounds.height - 660;
    }

    snippetWindow.setPosition(Math.floor(x), Math.floor(y));
  }
  
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
  submenuWindow.focus();
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
      normalizeTags: true,
      attrkey: '$',
      charkey: '_',
      explicitCharkey: false,
      mergeAttrs: false
    });
    const result = await parser.parseStringPromise(xmlData);

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

  // IMEの初期化を待つために少し遅延してからホットキー登録
  setTimeout(() => {
    registerGlobalShortcuts();
  }, 1000);

  syncSnippets();

  setInterval(syncSnippets, 5 * 60 * 1000);
});

// デバッグログ
ipcMain.on('debug-log', (event, message) => {
  console.log(message);
});

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
    
    // 両方のホットキーを再登録（リトライ機能付き）
    registerGlobalShortcuts();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-all-hotkeys', () => {
  store.delete('customHotkeyMain');
  store.delete('customHotkeySnippet');
  
  // リトライ機能付きで再登録
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
    // ピン留め解除
    pinnedItems.splice(index, 1);
  } else {
    // ピン留め
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
  return { x: 0, y: 0, width: 460, height: 650 };
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

// サブメニューアイテム選択（改善版）
ipcMain.handle('select-submenu-item', async (event, item) => {
  clipboard.writeText(item.content);
  lastClipboardText = item.content;

  // ウィンドウを非表示にしてフォーカスを元に戻す
  hideSubmenu();
  if (clipboardWindow) {
    clipboardWindow.hide();
  }

  // フォーカスが戻るまで待機
  await new Promise(resolve => setTimeout(resolve, 200));

  // プラットフォームごとのペースト処理
  if (process.platform === 'win32' && robot) {
    try {
      // robotjsを使用して Ctrl+V を送信
      robot.keyTap('v', ['control']);
      console.log('✅ Auto-paste executed');
    } catch (error) {
      console.error('❌ Paste error:', error);
    }
  } else if (process.platform === 'darwin') {
    // Macはセキュリティ上の理由で自動ペースト不可（コピーのみ）
    console.log('📋 Mac: Text copied to clipboard (paste manually with Cmd+V)');
  }
  
  return true;
});

// クリップボードにコピー & 自動ペースト（改善版）
ipcMain.handle('paste-text', async (event, text) => {
  clipboard.writeText(text);
  lastClipboardText = text;

  // ウィンドウを非表示にしてフォーカスを元に戻す
  if (clipboardWindow) {
    clipboardWindow.hide();
  }

  if (snippetWindow) {
    snippetWindow.hide();
  }

  // フォーカスが戻るまで待機
  await new Promise(resolve => setTimeout(resolve, 200));

  // プラットフォームごとのペースト処理
  if (process.platform === 'win32' && robot) {
    try {
      // robotjsを使用して Ctrl+V を送信
      robot.keyTap('v', ['control']);
      console.log('✅ Auto-paste executed');
    } catch (error) {
      console.error('❌ Paste error:', error);
    }
  } else if (process.platform === 'darwin') {
    // Macはセキュリティ上の理由で自動ペースト不可（コピーのみ）
    console.log('📋 Mac: Text copied to clipboard (paste manually with Cmd+V)');
  }

  return true;
});

// 個別スニペット管理
ipcMain.handle('get-personal-snippets', () => {
  return {
    folders: store.get('personalFolders', ['未分類']),
    snippets: store.get('personalSnippets', [])
  };
});

ipcMain.handle('save-personal-folders', (event, folders) => {
  store.set('personalFolders', folders);
  return true;
});

ipcMain.handle('save-personal-snippets', (event, snippets) => {
  store.set('personalSnippets', snippets);
  
  // 簡易ホームとスニペット専用ホームに更新を通知
  if (clipboardWindow && !clipboardWindow.isDestroyed()) {
    clipboardWindow.webContents.send('personal-snippets-updated');
  }
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    snippetWindow.webContents.send('personal-snippets-updated');
  }
  
  return true;
});

ipcMain.handle('open-snippet-editor', () => {
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

// スニペットウィンドウの位置を取得
ipcMain.handle('get-snippet-window-bounds', () => {
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    return snippetWindow.getBounds();
  }
  return { x: 0, y: 0, width: 460, height: 650 };
});

// サブメニューからユーザーが閉じたときの通知
ipcMain.on('submenu-closed-by-user', () => {
  hideSubmenu();
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    snippetWindow.webContents.send('reset-submenu-flag');
    setTimeout(() => {
      snippetWindow.focus();
    }, 50);
  }
});

// ウィンドウ位置設定の取得と保存
ipcMain.handle('get-window-position-mode', () => {
  return store.get('windowPositionMode', 'cursor');
});

ipcMain.handle('set-window-position-mode', (event, mode) => {
  store.set('windowPositionMode', mode);
  return true;
});

// 非表示フォルダの取得と保存
ipcMain.handle('get-hidden-folders', () => {
  return store.get('hiddenFolders', []);
});

ipcMain.handle('set-hidden-folders', (event, folders) => {
  store.set('hiddenFolders', folders);
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