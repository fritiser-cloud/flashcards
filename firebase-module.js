// firebase-module.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlGPZkNsKMbfezIVwmky4EeXDUOJ-sUpw",
  authDomain: "biolab-app-dc4df.firebaseapp.com",
  projectId: "biolab-app-dc4df",
  storageBucket: "biolab-app-dc4df.firebasestorage.app",
  messagingSenderId: "1070438650586",
  appId: "1:1070438650586:web:0e77c4a873412a8be60be3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let _unsubscribeSnapshot = null;
let _isSaving = false;
let _lastLocalChange = 0; // когда последний раз пользователь что-то менял

// ==================== АВТОРИЗАЦИЯ ====================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    // Грузим всё из Firebase — оно главное
    await loadFromCloud();
    startRealtimeSync();
  } else {
    if (_unsubscribeSnapshot) { _unsubscribeSnapshot(); _unsubscribeSnapshot = null; }
  }
});

function updateAuthUI(user) {
  const loggedIn = document.getElementById('auth-logged-in');
  const loggedOut = document.getElementById('auth-logged-out');
  if (!loggedIn || !loggedOut) return;
  if (user) {
    loggedIn.style.display = 'block';
    loggedOut.style.display = 'none';
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = user.displayName || 'Пользователь';
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.src = user.photoURL || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="72" height="72"%3E%3Ccircle cx="36" cy="36" r="36" fill="%239575CD"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="32"%3E👤%3C/text%3E%3C/svg%3E';
  } else {
    loggedIn.style.display = 'none';
    loggedOut.style.display = 'block';
  }
}

window.signInWithGoogle = async function() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    window.showToast('✓ Успешный вход!');
  } catch (error) {
    console.error('Ошибка входа:', error);
    let message = '⚠️ Ошибка входа';
    if (error.code === 'auth/popup-closed-by-user') message = '⏸️ Вход отменён';
    else if (error.code === 'auth/popup-blocked') message = '🚫 Всплывающие окна заблокированы';
    window.showToast(message);
  }
};

window.signOut = async function() {
  if (!confirm('Выйти из аккаунта?')) return;
  try {
    await firebaseSignOut(auth);
    window.showToast('✓ Вы вышли');
  } catch (error) {
    console.error('Ошибка выхода:', error);
    window.showToast('⚠️ Ошибка выхода');
  }
};

// ==================== ЗАГРУЗКА ИЗ FIREBASE (главный источник) ====================

// Полная перезапись store из облака
async function replaceStore(storeName, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const existing = await window.dbGetAll(storeName);
  await Promise.all(existing.map(item => window.dbDelete(storeName, item.id)));
  await Promise.all(items.map(item => window.dbPut(storeName, item)));
}

// Загрузить всё из Firebase и перезаписать локальный кеш
async function loadFromCloud() {
  if (!currentUser) return;
  updateSyncStatus('syncing', 'Загрузка...');
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Новый пользователь — сохраняем локальные данные в облако
      await saveToCloud();
      updateSyncStatus('success', 'Синхронизировано');
      return;
    }

    const cloud = userDoc.data();

    // --- localStorage: перезаписываем из облака ---
    if (cloud.notes)     localStorage.setItem('notes',      JSON.stringify(cloud.notes));
    if (cloud.atlas)     localStorage.setItem('atlas',      JSON.stringify(cloud.atlas));
    if (cloud.guides)    localStorage.setItem('bio_guides', JSON.stringify(cloud.guides));

    for (const subj of ['ru', 'bio', 'chem']) {
      if (cloud['scores_current_' + subj])
        localStorage.setItem('ege_current_' + subj, JSON.stringify(cloud['scores_current_' + subj]));
      if (cloud['scores_history_' + subj])
        localStorage.setItem('ege_history_' + subj, JSON.stringify(cloud['scores_history_' + subj]));
    }

    // --- IndexedDB: перезаписываем из облака ---
    if (cloud.decks)     await replaceStore('decks',     cloud.decks);
    if (cloud.stats)     await replaceStore('stats',     cloud.stats);
    if (cloud.favorites) await replaceStore('favorites', cloud.favorites);
    if (cloud.reviews)   await replaceStore('reviews',   cloud.reviews);

    // --- Обновляем UI ---
    if (window.invalidateDecksCache) window.invalidateDecksCache();
    if (window.renderDecks)          window.renderDecks();
    if (window.renderNotes)          window.renderNotes();
    if (window.renderAtlas)          window.renderAtlas();
    if (window.renderLibrary)        window.renderLibrary();
    if (window.renderScores)         window.renderScores();
    if (window.renderCalendar)       window.renderCalendar();
    if (window.renderUpcomingReviews) window.renderUpcomingReviews();

    updateSyncStatus('success', 'Синхронизировано');
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('ru-RU');
  } catch (error) {
    console.error('Ошибка загрузки из облака:', error);
    updateSyncStatus('error', 'Ошибка загрузки');
  }
}

// ==================== СОХРАНЕНИЕ В FIREBASE ====================

async function saveToCloud() {
  if (!currentUser) return;
  _isSaving = true;
  updateSyncStatus('syncing', 'Сохранение...'); // показываем только здесь, не в debounce
  try {
    const notes     = window.getNotes      ? window.getNotes()      : [];
    const atlas     = window.getAtlasItems ? window.getAtlasItems() : [];
    const guides    = window.getGuides     ? window.getGuides()     : [];
    const decks     = await window.dbGetAll('decks');
    const stats     = await window.dbGetAll('stats');
    const favorites = await window.dbGetAll('favorites');
    const reviews   = await window.dbGetAll('reviews');

    const data = {
      notes, atlas, guides,
      decks, stats, favorites, reviews,
      updatedAt: serverTimestamp()
    };

    for (const subj of ['ru', 'bio', 'chem']) {
      data['scores_current_' + subj] = JSON.parse(localStorage.getItem('ege_current_' + subj) || '{}');
      data['scores_history_' + subj] = JSON.parse(localStorage.getItem('ege_history_' + subj) || '[]');
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, data, { merge: true });

    updateSyncStatus('success', 'Сохранено');
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('ru-RU');
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    updateSyncStatus('error', 'Ошибка сохранения');
  } finally {
    // Держим флаг 5 секунд — чтобы эхо-snapshot от нашей же записи не вызвал перезагрузку
    setTimeout(() => { _isSaving = false; }, 5000);
  }
}

// Debounce 2 секунды — достаточно быстро, но не дёргает на каждый символ
let _autoSaveTimer = null;
window.autoSaveToCloud = function() {
  if (!currentUser) return;
  _lastLocalChange = Date.now();
  clearTimeout(_autoSaveTimer);
  // Показываем индикатор только когда реально начинаем сохранять, не при каждом нажатии
  _autoSaveTimer = setTimeout(() => saveToCloud(), 2000);
};

// ==================== REALTIME SYNC ====================

function startRealtimeSync() {
  if (_unsubscribeSnapshot) _unsubscribeSnapshot();
  const userDocRef = doc(db, 'users', currentUser.uid);
  _unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
    if (_isSaving) return; // игнорируем эхо от своих записей
    // Не прерываем пользователя если он активно работает (менял что-то < 6 сек назад)
    if (Date.now() - _lastLocalChange < 6000) return;
    if (docSnap.exists()) loadFromCloud();
  });
}

// ==================== ИНДИКАТОР СТАТУСА ====================

function updateSyncStatus(status, text) {
  const statusEl = document.getElementById('sync-status');
  if (!statusEl) return;
  const iconEl = statusEl.querySelector('.sync-icon');
  const textEl = document.getElementById('sync-text');
  if (!iconEl || !textEl) return;
  if (status === 'syncing') {
    iconEl.className = 'sync-icon';
    iconEl.textContent = '🔄';
  } else if (status === 'success') {
    iconEl.className = 'sync-icon success';
    iconEl.textContent = '☁️';
  } else {
    iconEl.className = 'sync-icon';
    iconEl.textContent = '⚠️';
  }
  textEl.textContent = text;
}

// ==================== СЖАТИЕ И ЗАГРУЗКА ИЗОБРАЖЕНИЙ ====================

// Сжать base64-изображение через Canvas (max 1200px, JPEG 80%)
function compressImage(base64, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // если не удалось — вернуть оригинал
    img.src = base64;
  });
}

// Сжать и загрузить на Яндекс Диск (если токен есть), иначе вернуть сжатый base64
window.uploadImage = async function(base64) {
  const compressed = await compressImage(base64);
  if (window.uploadToYadisk) return await window.uploadToYadisk(compressed);
  return compressed;
};
