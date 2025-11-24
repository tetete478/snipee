const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu, systemPreferences, shell, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const xml2js = require('xml2js');
const { autoUpdater } = require('electron-updater');

// robotjsをロード(Windowsのみ)
let robot = null;
if (process.platform === 'win32') {
  try {
    robot = require('robotjs');
  } catch (error) {
    // robotjs利用不可
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

// 設定ウィンドウ作成
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
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  clipboardWindow.loadFile(path.join(__dirname, 'index.html'));

  clipboardWindow.on('moved', () => {
    if (clipboardWindow) {
      const bounds = clipboardWindow.getBounds();
      store.set('clipboardWindowPosition', { x: bounds.x, y: bounds.y });
    }
  });
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
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  snippetWindow.loadFile(path.join(__dirname, 'snippets.html'));

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
    snippetEditorWindow.show();
  });

  snippetEditorWindow.on('closed', () => {
    if (snippetWindow && !snippetWindow.isDestroyed()) {
      snippetWindow.hide();
    }
    snippetEditorWindow = null;
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
  
  if (process.platform === 'darwin') {
    clipboardWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    clipboardWindow.setAlwaysOnTop(true, 'floating');
  }
  
  const positionMode = store.get('windowPositionMode', 'cursor');

  if (positionMode === 'previous') {
    const savedPosition = store.get('clipboardWindowPosition');
    if (savedPosition) {
      clipboardWindow.setPosition(savedPosition.x, savedPosition.y);
    } else {
      const display = screen.getPrimaryDisplay();
      const x = Math.floor((display.bounds.width - 460) / 2);
      const y = Math.floor((display.bounds.height - 650) / 2);
      clipboardWindow.setPosition(x, y);
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

// Google Driveから共有スニペットを取得
async function fetchMasterSnippets() {
  const url = store.get('masterSnippetUrl', '');
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
  
  // 保存
  store.set('masterSnippets', { snippets: masterSnippets });
  store.set('lastSync', new Date().toISOString());
  
  return { success: true };
}

// アプリ起動
app.whenReady().then(() => {
  // ホットキー登録
  setTimeout(() => {
    registerGlobalShortcuts();
  }, 500);

  // 自動アップデートチェック（本番環境のみ）
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  
  createMainWindow();
  createClipboardWindow();
  createTray();

  // 初回起動時のデフォルトスニペット設定
  if (!store.get('initialSnippetsCreated', false)) {
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

    store.set('personalFolders', defaultFolders);
    store.set('personalSnippets', defaultSnippets);
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
  setInterval(syncSnippets, 5 * 60 * 1000);
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

// マウストラッキング
let isMouseOverClipboard = false;
let clipboardCloseTimer = null;

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
  clipboard.writeText(text);
  lastClipboardText = text;

  if (clipboardWindow) {
    clipboardWindow.hide();
  }

  if (snippetWindow) {
    snippetWindow.hide();
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  if (process.platform === 'win32' && robot) {
    try {
      robot.keyTap('v', ['control']);
    } catch (error) {
      // Auto-paste failed
    }
  }

  return true;
});

// 個別スニペット管理
ipcMain.handle('get-personal-snippets', () => {
  return {
    folders: store.get('personalFolders', []),
    snippets: store.get('personalSnippets', [])
  };
});

ipcMain.handle('save-personal-folders', (event, folders) => {
  store.set('personalFolders', folders);
  return true;
});

ipcMain.handle('save-personal-snippets', (event, snippets) => {
  store.set('personalSnippets', snippets);
  
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
    clipboardWindow.hide();
  }
  
  if (snippetWindow && !snippetWindow.isDestroyed()) {
    snippetWindow.hide();
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

// =====================================
// 自動アップデート
// =====================================
autoUpdater.on('update-available', () => {
  console.log('アップデートがあります');
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Snipee アップデート',
    message: '新しいバージョンがダウンロードされました。再起動して適用しますか？',
    buttons: ['再起動', '後で']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (error) => {
  console.error('アップデートエラー:', error);
});