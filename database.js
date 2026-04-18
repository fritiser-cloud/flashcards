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
window.openDB = openDB;

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
window.dbGet = dbGet;

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
window.dbGetAll = dbGetAll;

function dbPut(store, value) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
window.dbPut = dbPut;

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
window.dbDelete = dbDelete;

function dbGetRange(store, prefix) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }
    const range = IDBKeyRange.bound(prefix + '_', prefix + '_\uffff');
    const req = db.transaction(store, 'readonly').objectStore(store).getAll(range);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
window.dbGetRange = dbGetRange;

function dbDeleteRange(store, prefix) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    const range = IDBKeyRange.bound(prefix + '_', prefix + '_\uffff');
    const req = objectStore.openCursor(range);
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
      else resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
window.dbDeleteRange = dbDeleteRange;

// ==================== LOCALSTORAGE ====================
function getNotes() {
  try { return JSON.parse(localStorage.getItem('notes') || '[]'); } catch { return []; }
}
function getAtlasItems() {
  try { return JSON.parse(localStorage.getItem('atlas') || '[]'); } catch { return []; }
}
function getGuides() {
  try { return JSON.parse(localStorage.getItem('bio_guides') || '[]'); } catch { return []; }
}
function saveNotes(notes) {
  localStorage.setItem('notes', JSON.stringify(notes));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}
function saveAtlasItems(items) {
  localStorage.setItem('atlas', JSON.stringify(items));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}
function saveGuides(guides) {
  localStorage.setItem('bio_guides', JSON.stringify(guides));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}
window.getNotes = getNotes;
window.getAtlasItems = getAtlasItems;
window.getGuides = getGuides;
window.saveNotes = saveNotes;
window.saveAtlasItems = saveAtlasItems;
window.saveGuides = saveGuides;
