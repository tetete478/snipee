/**
 * Snipee テーマ管理
 * 
 * 使い方:
 * 1. HTMLに <script src="common/theme.js"></script> を追加
 * 2. DOMContentLoaded後に ThemeManager.init() を呼び出す
 */

const ThemeManager = {
  // テーマ定義
  themes: {
    'space-gray': { name: 'Space Gray', color: '#1d1d1f', textColor: '#f5f5f7' },
    'silver': { name: 'Silver', color: '#f5f5f7', textColor: '#1d1d1f' },
    'pearl': { name: 'Pearl', color: '#faf9f7', textColor: '#1d1d1f' },
    'blush': { name: 'Blush', color: '#fdf6f6', textColor: '#1d1d1f' },
    'peach': { name: 'Peach', color: '#fef8f4', textColor: '#1d1d1f' },
    'cream': { name: 'Cream', color: '#fdfbf4', textColor: '#1d1d1f' },
    'pistachio': { name: 'Pistachio', color: '#f5faf6', textColor: '#1d1d1f' },
    'aqua': { name: 'Aqua', color: '#f4fafb', textColor: '#1d1d1f' },
    'periwinkle': { name: 'Periwinkle', color: '#f5f6fc', textColor: '#1d1d1f' },
    'wisteria': { name: 'Wisteria', color: '#f9f6fb', textColor: '#1d1d1f' }
  },

  // デフォルトテーマ
  defaultTheme: 'silver',

  /**
   * 初期化（保存されたテーマを適用）
   */
  init() {
    const savedTheme = this.getSavedTheme();
    this.apply(savedTheme);
  },

  /**
   * 保存されたテーマを取得
   */
  getSavedTheme() {
    try {
      const Store = require('electron-store');
      const store = new Store();
      return store.get('colorTheme', this.defaultTheme);
    } catch (e) {
      // electron-storeが使えない場合はlocalStorage
      return localStorage.getItem('colorTheme') || this.defaultTheme;
    }
  },

  /**
   * テーマを保存
   */
  saveTheme(themeName) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      store.set('colorTheme', themeName);
    } catch (e) {
      localStorage.setItem('colorTheme', themeName);
    }
  },

  /**
   * テーマを適用
   */
  apply(themeName) {
    if (!this.themes[themeName]) {
      themeName = this.defaultTheme;
    }
    
    document.documentElement.setAttribute('data-theme', themeName);
    this.saveTheme(themeName);
    
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: themeName }));
  },

  /**
   * 現在のテーマを取得
   */
  getCurrent() {
    return document.documentElement.getAttribute('data-theme') || this.defaultTheme;
  },

  /**
   * テーマ一覧を取得
   */
  getAll() {
    return this.themes;
  }
};

// DOMContentLoaded時に自動初期化
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
  });
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}