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

// Конфигурация Firebase (замените на свои данные, если нужно)
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
let _unsubscribeSnapshot = null; // функция отписки от realtime listener
let _isSaving = false;           // флаг: мы сами сейчас пишем — не реагировать на свой snapshot

// Следим за состоянием авторизации
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    startRealtimeSync();
  } else {
    // Отписываемся от listener при выходе
    if (_unsubscribeSnapshot) { _unsubscribeSnapshot(); _unsubscribeSnapshot = null; }
  }
});

// Обновление интерфейса в настройках
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

// Глобальная функция для входа (вызывается из кнопки)
window.signInWithGoogle = async function() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    window.showToast('✓ Успешный вход!');
  } catch (error) {
    console.error('Ошибка входа:', error);
    let message = '⚠️ Ошибка входа';
    if (error.code === 'auth/popup-closed-by-user') {
      message = '⏸️ Вход отменён';
    } else if (error.code === 'auth/popup-blocked') {
      message = '🚫 Всплывающие окна заблокированы';
    }
    window.showToast(message);
  }
};

// Глобальная функция для выхода
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

// Слияние по id (побеждает более новый updatedAt)
function mergeArrays(local, cloud) {
  const map = new Map();
  for (const item of local) {
    if (item.id != null) map.set(String(item.id), item);
  }
  for (const item of cloud) {
    if (item.id == null) continue;
    const key = String(item.id);
    const existing = map.get(key);
    if (!existing || (item.updatedAt || 0) > (existing.updatedAt || 0)) map.set(key, item);
  }
  return [...map.values()];
}

// Слияние колод по name (autoIncrement id может конфликтовать между устройствами)
function mergeDecks(local, cloud) {
  const map = new Map();
  for (const d of local) map.set(d.name, d);
  for (const d of cloud) {
    const existing = map.get(d.name);
    if (!existing || (d.updatedAt || d.createdAt || 0) > (existing.updatedAt || existing.createdAt || 0)) map.set(d.name, d);
  }
  return [...map.values()];
}

// Слияние повторений по name+subject (autoIncrement id конфликтует)
function mergeReviews(local, cloud) {
  const key = r => (r.name || '') + '::' + (r.subject || '');
  const map = new Map();
  for (const r of local) map.set(key(r), r);
  for (const r of cloud) {
    const k = key(r);
    const existing = map.get(k);
    if (!existing || (r.updatedAt || 0) > (existing.updatedAt || 0)) map.set(k, r);
  }
  return [...map.values()];
}

// Полная замена содержимого store: удалить всё, записать merged
async function replaceStore(storeName, items) {
  const existing = await window.dbGetAll(storeName);
  await Promise.all(existing.map(item => window.dbDelete(storeName, item.id)));
  await Promise.all(items.map(item => window.dbPut(storeName, item)));
}

// Синхронизация: сливаем локальные данные с облачными (побеждает новее)
async function syncAllData() {
  if (!currentUser) return;
  updateSyncStatus('syncing', 'Синхронизация...');
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const cloudData = userDoc.data();

      // --- localStorage stores ---
      if (cloudData.notes && cloudData.notes.length > 0) {
        const merged = mergeArrays(window.getNotes ? window.getNotes() : [], cloudData.notes);
        localStorage.setItem('notes', JSON.stringify(merged));
        if (window.renderNotes) window.renderNotes();
      }
      if (cloudData.atlas && cloudData.atlas.length > 0) {
        const merged = mergeArrays(window.getAtlasItems ? window.getAtlasItems() : [], cloudData.atlas);
        localStorage.setItem('atlas', JSON.stringify(merged));
        if (window.renderAtlas) window.renderAtlas();
      }
      if (cloudData.guides && cloudData.guides.length > 0) {
        const merged = mergeArrays(window.getGuides ? window.getGuides() : [], cloudData.guides);
        localStorage.setItem('bio_guides', JSON.stringify(merged));
        if (window.renderLibrary) window.renderLibrary();
      }

      // --- Scores (localStorage) ---
      for (const subj of ['ru', 'bio', 'chem']) {
        if (cloudData['scores_current_' + subj]) {
          const local = JSON.parse(localStorage.getItem('ege_current_' + subj) || '{}');
          const cloud = cloudData['scores_current_' + subj];
          // Побеждает более новый по метке времени _savedAt
          const localTs = local._savedAt || 0;
          const cloudTs = cloud._savedAt || 0;
          if (cloudTs > localTs) localStorage.setItem('ege_current_' + subj, JSON.stringify(cloud));
        }
        if (cloudData['scores_history_' + subj]) {
          const local = JSON.parse(localStorage.getItem('ege_history_' + subj) || '[]');
          const cloud = cloudData['scores_history_' + subj];
          // Объединяем историю по label+date уникальности
          const merged = [...local];
          for (const entry of cloud) {
            const key = entry.label + '::' + (entry.date || entry.savedAt);
            if (!merged.find(e => e.label + '::' + (e.date || e.savedAt) === key)) merged.push(entry);
          }
          merged.sort((a, b) => (b.date || b.savedAt || 0) - (a.date || a.savedAt || 0));
          localStorage.setItem('ege_history_' + subj, JSON.stringify(merged.slice(0, 30)));
        }
      }

      // --- IndexedDB stores ---
      if (cloudData.decks && cloudData.decks.length > 0) {
        const localDecks = await window.dbGetAll('decks');
        const merged = mergeDecks(localDecks, cloudData.decks);
        await replaceStore('decks', merged);
        if (window.invalidateDecksCache) window.invalidateDecksCache();
        if (window.renderDecks) window.renderDecks();
      }
      // *** ИСПРАВЛЕНО: добавлены stats, favorites, reviews ***
      if (cloudData.stats && cloudData.stats.length > 0) {
        const localStats = await window.dbGetAll('stats');
        const merged = mergeArrays(localStats, cloudData.stats);
        await replaceStore('stats', merged);
      }
      if (cloudData.favorites && cloudData.favorites.length > 0) {
        const localFavs = await window.dbGetAll('favorites');
        const merged = mergeArrays(localFavs, cloudData.favorites);
        await replaceStore('favorites', merged);
      }
      if (cloudData.reviews && cloudData.reviews.length > 0) {
        const localReviews = await window.dbGetAll('reviews');
        const merged = mergeReviews(localReviews, cloudData.reviews);
        await replaceStore('reviews', merged);
        if (window.renderCalendar) window.renderCalendar();
        if (window.renderUpcomingReviews) window.renderUpcomingReviews();
      }
    }

    if (window.renderScores) window.renderScores();
    updateSyncStatus('success', 'Синхронизировано');
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('ru-RU');
  } catch (error) {
    console.error('Ошибка синхронизации:', error);
    updateSyncStatus('error', 'Ошибка синхронизации');
  }
}

// Сохранение всех локальных данных в облако
async function saveToCloud() {
  if (!currentUser) return;
  _isSaving = true;
  try {
    const notes = window.getNotes ? window.getNotes() : [];
    const atlas = window.getAtlasItems ? window.getAtlasItems() : [];
    const guides = window.getGuides ? window.getGuides() : [];
    const decks = await window.dbGetAll('decks');
    // *** ИСПРАВЛЕНО: добавлены stats, favorites, reviews ***
    const stats = await window.dbGetAll('stats');
    const favorites = await window.dbGetAll('favorites');
    const reviews = await window.dbGetAll('reviews');

    const data = {
      notes, atlas, guides,
      decks, stats, favorites, reviews,
      updatedAt: serverTimestamp()
    };

    // Scores (localStorage)
    for (const subj of ['ru', 'bio', 'chem']) {
      data['scores_current_' + subj] = JSON.parse(localStorage.getItem('ege_current_' + subj) || '{}');
      data['scores_history_' + subj] = JSON.parse(localStorage.getItem('ege_history_' + subj) || '[]');
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, data, { merge: true });
  } catch (error) {
    console.error('Ошибка сохранения в облако:', error);
  } finally {
    setTimeout(() => { _isSaving = false; }, 2000);
  }
}

// Debounce: не бьём в Firestore при каждом нажатии, а ждём 3 секунды тишины
let _autoSaveTimer = null;
window.autoSaveToCloud = function() {
  if (!currentUser) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveToCloud(), 3000);
};

// Обновление индикатора синхронизации в настройках
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

// Подписка на realtime-обновления (вызывается при авторизации)
function startRealtimeSync() {
  if (_unsubscribeSnapshot) _unsubscribeSnapshot();
  const userDocRef = doc(db, 'users', currentUser.uid);
  _unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
    if (_isSaving) return; // игнорируем свои же изменения
    if (docSnap.exists()) {
      // В реальном времени обновляем только если данные изменились не нами
      syncAllData(); // можно реализовать более тонкое обновление
    }
  });
}