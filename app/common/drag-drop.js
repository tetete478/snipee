/**
 * ドラッグ＆ドロップ管理クラス
 * フォルダとアイテムの並び替えを汎用的に処理
 */
class DragDropManager {
  constructor(options) {
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container) 
      : options.container;
    
    this.config = {
      folderSelector: options.folderSelector || '.folder-header',
      itemSelector: options.itemSelector || '.snippet-item',
      listSelector: options.listSelector || '.snippet-list',
      groupSelector: options.groupSelector || '.folder-group',
      groupAttribute: options.groupAttribute || 'data-is-master',
      nameAttribute: options.nameAttribute || 'data-folder',
      idAttribute: options.idAttribute || 'data-id',
      folderAttribute: options.folderAttribute || 'data-folder',
    };
    
    this.callbacks = {
      onFolderReorder: options.onFolderReorder || null,
      onItemReorder: options.onItemReorder || null,
      onItemDropToEnd: options.onItemDropToEnd || null,
    };
    
    // 状態管理
    this.state = {
      draggedType: null,        // 'folder' or 'item'
      draggedId: null,
      draggedFolder: null,
      draggedGroup: null,
      lastTargetFolder: null,
      lastInsertAfter: null,
      lastTargetItem: null,
    };
    
    this.initialized = false;
  }

  init() {
    if (this.initialized || !this.container) return;
    this.initialized = true;
    
    // コンテナレベルのイベント（一度だけ）
    this.container.addEventListener('dragover', (e) => this.handleContainerDragOver(e));
    this.container.addEventListener('drop', (e) => this.handleContainerDrop(e));
  }

  // render後に毎回呼ぶ
  attachEvents() {
    this.attachFolderEvents();
    this.attachItemEvents();
    this.attachListEvents();
  }

  attachFolderEvents() {
    const folders = this.container.querySelectorAll(this.config.folderSelector);
    
    folders.forEach(folder => {
      folder.draggable = true;
      
      folder.addEventListener('dragstart', (e) => {
        this.state.draggedType = 'folder';
        this.state.draggedFolder = folder.getAttribute(this.config.nameAttribute);
        this.state.draggedGroup = folder.getAttribute(this.config.groupAttribute);
        folder.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      folder.addEventListener('dragend', () => {
        folder.classList.remove('dragging');
        this.clearState();
        this.clearHighlights();
      });
    });
  }

  attachItemEvents() {
    const items = this.container.querySelectorAll(this.config.itemSelector);
    
    items.forEach(item => {
      item.draggable = true;
      const itemId = item.getAttribute(this.config.idAttribute);
      const folderName = item.getAttribute(this.config.folderAttribute);
      const group = item.getAttribute(this.config.groupAttribute);
      
      item.addEventListener('dragstart', (e) => {
        this.state.draggedType = 'item';
        this.state.draggedId = itemId;
        this.state.draggedFolder = folderName;
        this.state.draggedGroup = group;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        this.clearState();
        this.clearHighlights();
      });
      
      item.addEventListener('dragover', (e) => this.handleItemDragOver(e, item));
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', (e) => this.handleItemDrop(e, item));
    });
  }

  attachListEvents() {
    const lists = this.container.querySelectorAll(`${this.config.listSelector}.expanded`);
    
    lists.forEach(list => {
      const group = list.closest(this.config.groupSelector);
      const header = group?.querySelector(this.config.folderSelector);
      const folderName = header?.getAttribute(this.config.nameAttribute);
      const isMaster = header?.getAttribute(this.config.groupAttribute);
      
      list.addEventListener('dragover', (e) => this.handleListDragOver(e, list, folderName, isMaster));
      list.addEventListener('dragleave', (e) => {
        if (!list.contains(e.relatedTarget)) {
          list.classList.remove('drag-over-bottom');
        }
      });
      list.addEventListener('drop', (e) => this.handleListDrop(e, list, folderName, isMaster));
    });
  }

  handleContainerDragOver(e) {
    if (this.state.draggedType !== 'folder') return;
    
    e.preventDefault();
    
    const mouseY = e.clientY;
    const selector = `${this.config.folderSelector}[${this.config.groupAttribute}="${this.state.draggedGroup}"]`;
    const headers = Array.from(this.container.querySelectorAll(selector))
      .filter(h => h.getAttribute(this.config.nameAttribute) !== this.state.draggedFolder);
    
    if (headers.length === 0) return;
    
    let targetHeader = null;
    let insertAfter = false;
    
    for (let i = 0; i < headers.length; i++) {
      const rect = headers[i].getBoundingClientRect();
      const middle = rect.top + rect.height / 2;
      
      if (mouseY < middle) {
        targetHeader = headers[i];
        insertAfter = false;
        break;
      } else if (i === headers.length - 1) {
        targetHeader = headers[i];
        insertAfter = true;
      }
    }
    
    if (!targetHeader) return;
    
    const targetName = targetHeader.getAttribute(this.config.nameAttribute);
    
    // 変更なしならスキップ
    if (targetName === this.state.lastTargetFolder && insertAfter === this.state.lastInsertAfter) {
      return;
    }
    
    this.state.lastTargetFolder = targetName;
    this.state.lastInsertAfter = insertAfter;
    
    this.clearHighlights();
    
    if (insertAfter) {
      const group = targetHeader.closest(this.config.groupSelector);
      if (group) group.classList.add('drag-over-bottom');
    } else {
      targetHeader.classList.add('drag-over');
    }
  }

  handleContainerDrop(e) {
    if (this.state.draggedType !== 'folder') return;
    
    e.preventDefault();
    this.clearHighlights();
    
    const mouseY = e.clientY;
    const selector = `${this.config.folderSelector}[${this.config.groupAttribute}="${this.state.draggedGroup}"]`;
    const headers = Array.from(this.container.querySelectorAll(selector))
      .filter(h => h.getAttribute(this.config.nameAttribute) !== this.state.draggedFolder);
    
    if (headers.length === 0) return;
    
    const newOrder = [];
    let inserted = false;
    
    for (const header of headers) {
      const name = header.getAttribute(this.config.nameAttribute);
      const rect = header.getBoundingClientRect();
      const middle = rect.top + rect.height / 2;
      
      if (!inserted && mouseY < middle) {
        newOrder.push(this.state.draggedFolder);
        inserted = true;
      }
      newOrder.push(name);
    }
    
    if (!inserted) {
      newOrder.push(this.state.draggedFolder);
    }
    
    if (this.callbacks.onFolderReorder) {
      this.callbacks.onFolderReorder(newOrder, this.state.draggedGroup === 'true');
    }
  }

  handleItemDragOver(e, item) {
    if (this.state.draggedType !== 'item') return;
    
    const targetFolder = item.getAttribute(this.config.folderAttribute);
    const targetGroup = item.getAttribute(this.config.groupAttribute);
    const targetId = item.getAttribute(this.config.idAttribute);
    
    // 同じフォルダ・グループ内のみ
    if (targetFolder !== this.state.draggedFolder || targetGroup !== this.state.draggedGroup) return;
    if (targetId === this.state.draggedId) return;
    
    // 最後のアイテムの下半分は無視
    const list = item.closest(this.config.listSelector);
    if (list) {
      const items = Array.from(list.querySelectorAll(`${this.config.itemSelector}:not(.dragging)`));
      const isLast = items[items.length - 1] === item;
      
      if (isLast) {
        const rect = item.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;
        if (e.clientY > middle) return;
      }
    }
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (this.state.lastTargetItem === targetId) return;
    this.state.lastTargetItem = targetId;
    
    this.container.querySelectorAll(`${this.config.itemSelector}.drag-over`).forEach(el => {
      el.classList.remove('drag-over');
    });
    
    item.classList.add('drag-over');
  }

  handleItemDrop(e, item) {
    e.preventDefault();
    item.classList.remove('drag-over');
    
    if (this.state.draggedType !== 'item') return;
    
    const targetFolder = item.getAttribute(this.config.folderAttribute);
    const targetGroup = item.getAttribute(this.config.groupAttribute);
    const targetId = item.getAttribute(this.config.idAttribute);
    
    if (targetFolder !== this.state.draggedFolder || targetGroup !== this.state.draggedGroup) return;
    if (targetId === this.state.draggedId) return;
    
    if (this.callbacks.onItemReorder) {
      this.callbacks.onItemReorder(
        this.state.draggedId,
        targetId,
        targetFolder,
        targetGroup === 'true'
      );
    }
  }

  handleListDragOver(e, list, folderName, isMaster) {
    if (this.state.draggedType !== 'item') return;
    if (folderName !== this.state.draggedFolder || isMaster !== this.state.draggedGroup) return;
    
    const hasActiveTarget = list.querySelector(`${this.config.itemSelector}.drag-over`);
    if (hasActiveTarget) {
      list.classList.remove('drag-over-bottom');
      return;
    }
    
    const rect = list.getBoundingClientRect();
    const threshold = rect.bottom - 20;
    
    if (e.clientY > threshold) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over-bottom');
    } else {
      list.classList.remove('drag-over-bottom');
    }
  }

  handleListDrop(e, list, folderName, isMaster) {
    e.preventDefault();
    e.stopPropagation();
    list.classList.remove('drag-over-bottom');
    
    if (this.state.draggedType !== 'item') return;
    if (folderName !== this.state.draggedFolder || isMaster !== this.state.draggedGroup) return;
    
    const rect = list.getBoundingClientRect();
    const threshold = rect.bottom - 20;
    
    if (e.clientY > threshold && this.callbacks.onItemDropToEnd) {
      this.callbacks.onItemDropToEnd(
        this.state.draggedId,
        folderName,
        isMaster === 'true'
      );
    }
  }

  clearState() {
    this.state.draggedType = null;
    this.state.draggedId = null;
    this.state.draggedFolder = null;
    this.state.draggedGroup = null;
    this.state.lastTargetFolder = null;
    this.state.lastInsertAfter = null;
    this.state.lastTargetItem = null;
  }

  clearHighlights() {
    this.container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    this.container.querySelectorAll('.drag-over-bottom').forEach(el => el.classList.remove('drag-over-bottom'));
  }
}

// Electron環境用エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DragDropManager };
}