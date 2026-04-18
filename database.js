// ==================== INDEXEDDB ====================
const DB_NAME = 'flashcards_db', DB_VER = 2;
let db;
let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((res, rej) => {
    if (db) return res(db);
    
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('decks')) d.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('stats')) d.createObjectStore('stats', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('favorites')) d.createObjectStore('favorites', { keyPath: 'id' });
    };
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror = () => rej(req.error);
  });
  
  return dbPromise;
}

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call openDB() first.'));
      return;
    }
    
    try {
      const transaction = db.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    try {
      const request = db.transaction(store, 'readonly').objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function dbPut(store, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    try {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    try {
      const request = db.transaction(store, 'readwrite').objectStore(store).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// ==================== LOCALSTORAGE ФУНКЦИИ ====================
function getNotes() {
  try { 
    return JSON.parse(localStorage.getItem('notes') || '[]'); 
  } catch { 
    return []; 
  }
}

function getAtlasItems() {
  try { 
    return JSON.parse(localStorage.getItem('atlas') || '[]'); 
  } catch { 
    return []; 
  }
}

function getGuides() {
  try { 
    return JSON.parse(localStorage.getItem('bio_guides') || '[]'); 
  } catch { 
    return []; 
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem('notes', JSON.stringify(notes));
    if (window.autoSaveToCloud) window.autoSaveToCloud();
  } catch (e) {
    if (e.name === 'QuotaExceededError' && window.showToast) {
      window.showToast('⚠️ Недостаточно места');
    }
  }
}

function saveAtlasItems(items) {
  try {
    localStorage.setItem('atlas', JSON.stringify(items));
    if (window.autoSaveToCloud) window.autoSaveToCloud();
  } catch (e) {
    if (e.name === 'QuotaExceededError' && window.showToast) {
      window.showToast('⚠️ Недостаточно места');
    }
  }
}

function saveGuides(guides) {
  try {
    localStorage.setItem('bio_guides', JSON.stringify(guides));
    if (window.autoSaveToCloud) window.autoSaveToCloud();
  } catch (e) {
    if (e.name === 'QuotaExceededError' && window.showToast) {
      window.showToast('⚠️ Недостаточно места');
    }
  }
}

// Экспорт
window.openDB = openDB;
window.dbGet = dbGet;
window.dbGetAll = dbGetAll;
window.dbPut = dbPut;
window.dbDelete = dbDelete;
window.getNotes = getNotes;
window.getAtlasItems = getAtlasItems;
window.getGuides = getGuides;
window.saveNotes = saveNotes;
window.saveAtlasItems = saveAtlasItems;
window.saveGuides = saveGuides;
