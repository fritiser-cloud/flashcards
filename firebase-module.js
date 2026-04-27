// firebase-module.js
// Uses Firebase Compat SDK (loaded via <script> tags in index.html)

// Определяем функцию СРАЗУ — до инициализации Firebase
// Чтобы кнопка работала даже если Firebase ещё не загрузился
window.signInWithGoogle = function() {
  if (window.Android && typeof window.Android.signInWithGoogle === 'function') {
    window.showToast && window.showToast('Открываем вход...');
    window.Android.signInWithGoogle();
  } else {
    window.showToast && window.showToast('⚠️ Firebase ещё не готов, попробуй позже');
  }
};

window.receiveGoogleIdToken = function(idToken) {
  window.showToast && window.showToast('Получен токен, выполняем вход...');
  if (window._firebaseAuth) {
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    window._firebaseAuth.signInWithCredential(credential)
      .then(() => window.showToast && window.showToast('✓ Успешный вход!'))
      .catch(e => window.showToast && window.showToast('⚠️ ' + e.message));
  } else {
    window.showToast && window.showToast('⚠️ Firebase auth не готов');
  }
};

window.signOut = function() {
  if (!confirm('Выйти из аккаунта?')) return;
  if (window._firebaseAuth) {
    window._firebaseAuth.signOut()
      .then(() => window.showToast && window.showToast('✓ Вы вышли'))
      .catch(e => window.showToast && window.showToast('⚠️ ' + e.message));
  }
};

// Инициализация Firebase — в try/catch чтобы не ломать кнопку
try {

const firebaseConfig = {
  apiKey: "AIzaSyAlGPZkNsKMbfezIVwmky4EeXDUOJ-sUpw",
  authDomain: "biolab-app-dc4df.firebaseapp.com",
  projectId: "biolab-app-dc4df",
  storageBucket: "biolab-app-dc4df.firebasestorage.app",
  messagingSenderId: "1070438650586",
  appId: "1:1070438650586:web:0e77c4a873412a8be60be3"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
window._firebaseAuth = auth; // доступен для receiveGoogleIdToken
let currentUser = null;
let _unsubscribeSnapshot = null;
let _isSaving = false;
let _isLoadingFromCloud = false;
let _lastLocalChange = 0;

// Переопределяем signInWithGoogle с полной реализацией
window.signInWithGoogle = async function() {
  if (window.Android && typeof window.Android.signInWithGoogle === 'function') {
    window.showToast('Открываем вход через Google...');
    window.Android.signInWithGoogle();
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    window.showToast('✓ Успешный вход!');
  } catch (error) {
    let message = '⚠️ Ошибка входа: ' + error.code;
    if (error.code === 'auth/popup-closed-by-user') message = '⏸️ Вход отменён';
    window.showToast(message);
  }
};

window.receiveGoogleIdToken = async function(idToken) {
  try {
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    await auth.signInWithCredential(credential);
    window.showToast('✓ Успешный вход!');
  } catch (e) {
    window.showToast('⚠️ ' + e.message);
  }
};

window.signOut = async function() {
  if (!confirm('Выйти из аккаунта?')) return;
  try {
    await auth.signOut();
    window.showToast('✓ Вы вышли');
  } catch (e) {
    window.showToast('⚠️ ' + e.message);
  }
};

// ==================== АВТОРИЗАЦИЯ ====================

auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
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
  // В Android-приложении используем нативный Google Sign-In через мост
  if (window.Android && typeof window.Android.signInWithGoogle === 'function') {
    window.showToast('Открываем вход через Google...');
    window.Android.signInWithGoogle();
    return;
  }
  // В браузере — стандартный popup
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    window.showToast('✓ Успешный вход!');
  } catch (error) {
    console.error('Ошибка входа:', error);
    let message = '⚠️ Ошибка входа';
    if (error.code === 'auth/popup-closed-by-user') message = '⏸️ Вход отменён';
    else if (error.code === 'auth/popup-blocked') message = '🚫 Всплывающие окна заблокированы';
    window.showToast(message);
  }
};

// Вызывается из Android после успешного нативного Google Sign-In
window.receiveGoogleIdToken = async function(idToken) {
  try {
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    await auth.signInWithCredential(credential);
    window.showToast('✓ Успешный вход!');
  } catch (error) {
    console.error('Ошибка signInWithCredential:', error);
    window.showToast('⚠️ Ошибка входа: ' + (error.message || error.code));
  }
};

window.signOut = async function() {
  if (!confirm('Выйти из аккаунта?')) return;
  try {
    await auth.signOut();
    window.showToast('✓ Вы вышли');
  } catch (error) {
    console.error('Ошибка выхода:', error);
    window.showToast('⚠️ Ошибка выхода');
  }
};

// ==================== SMART MERGE ====================
// Merges two item arrays by id, keeping the newer version of each item.
// Items only in local (not yet synced) are always preserved.
// Deleted items (deleted:true) win if they have a newer updatedAt.
function _mergeArrays(local, cloud) {
  const map = new Map();
  for (const item of (cloud || [])) map.set(item.id, item);
  for (const item of (local || [])) {
    const cloudItem = map.get(item.id);
    if (!cloudItem) {
      // Only in local — keep (not yet synced to cloud)
      map.set(item.id, item);
    } else {
      const lt = item.updatedAt || item.createdAt || 0;
      const ct = cloudItem.updatedAt || cloudItem.createdAt || 0;
      if (lt >= ct) map.set(item.id, item); // local is newer or same age
    }
  }
  return [...map.values()];
}

// Same merge for IndexedDB stores
async function mergeStore(storeName, cloudItems) {
  if (!Array.isArray(cloudItems)) return;
  const local = await window.dbGetAll(storeName);
  const merged = _mergeArrays(local, cloudItems);
  await Promise.all(local.map(item => window.dbDelete(storeName, item.id)));
  await Promise.all(merged.map(item => window.dbPut(storeName, item)));
}

// ==================== ЗАГРУЗКА ИЗ FIREBASE ====================

async function loadFromCloud() {
  if (!currentUser) return;
  // Don't overwrite local data if there are unsaved local changes
  if (_pendingSave) {
    console.log('loadFromCloud skipped: pending local changes');
    return;
  }
  if (_isLoadingFromCloud) {
    console.log('loadFromCloud skipped: already loading');
    return;
  }
  _isLoadingFromCloud = true;
  updateSyncStatus('syncing', 'Загрузка...');
  try {
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      await saveToCloud();
      updateSyncStatus('success', 'Синхронизировано');
      return;
    }

    const cloud = userDoc.data();

    // Smart merge: combine local + cloud, keep newer item by updatedAt
    const lsKeys = {
      notes:    { localKey: 'notes',       cloudKey: 'notes' },
      atlas:    { localKey: 'atlas',       cloudKey: 'atlas' },
      guides:   { localKey: 'bio_guides',  cloudKey: 'guides' },
      pdf_lib:  { localKey: 'pdf_library', cloudKey: 'pdf_library' },
    };

    for (const { localKey, cloudKey } of Object.values(lsKeys)) {
      if (cloud[cloudKey]) {
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        const merged = _mergeArrays(local, cloud[cloudKey]);
        localStorage.setItem(localKey, JSON.stringify(merged));
      }
    }

    // pdf_downloaded: simple object merge (union of keys, local wins on conflict)
    if (cloud.pdf_downloaded) {
      const localDl = JSON.parse(localStorage.getItem('pdf_downloaded') || '{}');
      localStorage.setItem('pdf_downloaded', JSON.stringify({ ...cloud.pdf_downloaded, ...localDl }));
    }

    // schedule: merge per task — union of cloud + local, done=true wins over done=false
    if (cloud.schedule) {
      const localSched = JSON.parse(localStorage.getItem('study_schedule') || '{}');
      const allKeys = new Set([...Object.keys(cloud.schedule), ...Object.keys(localSched)]);
      const merged = {};
      for (const dateKey of allKeys) {
        const cloudTasks = cloud.schedule[dateKey] || [];
        const localTasks = localSched[dateKey] || [];
        if (localTasks.length === 0) { merged[dateKey] = cloudTasks; continue; }
        if (cloudTasks.length === 0) { merged[dateKey] = localTasks; continue; }
        // Merge by task id: done=true wins
        const cloudMap = new Map(cloudTasks.map(t => [t.id, t]));
        merged[dateKey] = localTasks.map(t => {
          const ct = cloudMap.get(t.id);
          if (!ct) return t;
          return { ...t, done: t.done || ct.done };
        });
        // Add cloud tasks missing locally
        const localIds = new Set(localTasks.map(t => t.id));
        for (const ct of cloudTasks) {
          if (!localIds.has(ct.id)) merged[dateKey].push(ct);
        }
      }
      localStorage.setItem('study_schedule', JSON.stringify(merged));
    }

    if (cloud.glossary) {
      // Merge: cloud terms not present locally get added; local always wins by id
      const local = JSON.parse(localStorage.getItem('glossary_terms') || '[]');
      const localMap = new Map(local.map(t => [t.id, t]));
      for (const ct of cloud.glossary) {
        const lt = localMap.get(ct.id);
        if (!lt || ct.updatedAt > (lt.updatedAt || 0)) localMap.set(ct.id, ct);
      }
      localStorage.setItem('glossary_terms', JSON.stringify([...localMap.values()]));
    }

    for (const subj of ['ru', 'bio', 'chem']) {
      if (cloud['scores_current_' + subj])
        localStorage.setItem('ege_current_' + subj, JSON.stringify(cloud['scores_current_' + subj]));
      if (cloud['scores_history_' + subj])
        localStorage.setItem('ege_history_' + subj, JSON.stringify(cloud['scores_history_' + subj]));
    }

    if (cloud.decks)     await mergeStore('decks',     cloud.decks);
    if (cloud.stats)     await mergeStore('stats',     cloud.stats);
    if (cloud.favorites) await mergeStore('favorites', cloud.favorites);
    if (cloud.reviews)   await mergeStore('reviews',   cloud.reviews);

    if (window.invalidateDecksCache) window.invalidateDecksCache();
    if (window.renderDecks)          window.renderDecks();
    if (window.renderNotes)          window.renderNotes();
    if (window.renderAtlas)          window.renderAtlas();
    if (window.renderLibrary)        window.renderLibrary();
    if (window.renderScores)         window.renderScores();
    if (window.renderCalendar)        window.renderCalendar();
    if (window.renderScheduleScreen)  window.renderScheduleScreen();
    if (window.renderTodayPlanWidget) window.renderTodayPlanWidget();
    if (window.renderUpcomingReviews) window.renderUpcomingReviews();

    updateSyncStatus('success', 'Синхронизировано');
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('ru-RU');
  } catch (error) {
    console.error('Ошибка загрузки из облака:', error);
    updateSyncStatus('error', 'Ошибка загрузки');
  } finally {
    _isLoadingFromCloud = false;
  }
}

// ==================== СОХРАНЕНИЕ В FIREBASE ====================

let _pendingSave = false;
let _saveRetryTimer = null;

async function saveToCloud() {
  if (!currentUser) return;
  _isSaving = true;
  clearTimeout(_saveRetryTimer);
  updateSyncStatus('syncing', 'Сохранение...');
  try {
    const notes     = window.getNotes      ? window.getNotes()      : [];
    // Strip base64 image data — keep Yandex Disk URLs, remove only raw base64 (1MB limit)
    const atlas     = (window.getAtlasItems ? window.getAtlasItems() : [])
                        .map(item => {
                          if (item.image && item.image.startsWith('data:')) {
                            const { image: _img, ...rest } = item;
                            return rest;
                          }
                          return item;
                        });
    const guides    = window.getGuides     ? window.getGuides()     : [];
    const decks     = await window.dbGetAll('decks');
    const stats     = await window.dbGetAll('stats');
    const favorites = await window.dbGetAll('favorites');
    const reviews   = await window.dbGetAll('reviews');

    const schedule = JSON.parse(localStorage.getItem('study_schedule') || '{}');
    const glossary = JSON.parse(localStorage.getItem('glossary_terms') || '[]');

    const data = {
      notes, atlas, guides,
      decks, stats, favorites, reviews,
      schedule,
      glossary,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    for (const subj of ['ru', 'bio', 'chem']) {
      data['scores_current_' + subj] = JSON.parse(localStorage.getItem('ege_current_' + subj) || '{}');
      data['scores_history_' + subj] = JSON.parse(localStorage.getItem('ege_history_' + subj) || '[]');
    }

    await db.collection('users').doc(currentUser.uid).set(data, { merge: true });

    _pendingSave = false;
    updateSyncStatus('success', 'Сохранено');
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('ru-RU');
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    _pendingSave = true;
    updateSyncStatus('error', 'Нет связи — данные сохранены локально');
    // Retry in 30s
    _saveRetryTimer = setTimeout(() => {
      if (_pendingSave && currentUser) saveToCloud();
    }, 30000);
  } finally {
    _isSaving = false;
  }
}

let _autoSaveTimer = null;
window.autoSaveToCloud = function() {
  if (!currentUser) return;
  _lastLocalChange = Date.now();
  _pendingSave = true; // mark as pending immediately so realtime sync won't overwrite
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveToCloud(), 2000);
};

// ==================== REALTIME SYNC ====================

function startRealtimeSync() {
  if (_unsubscribeSnapshot) _unsubscribeSnapshot();
  _unsubscribeSnapshot = db.collection('users').doc(currentUser.uid).onSnapshot((docSnap) => {
    if (_isSaving) return;
    if (_pendingSave) return; // unsaved local changes — don't overwrite
    if (_isLoadingFromCloud) return; // already loading
    if (Date.now() - _lastLocalChange < 30000) return; // 30s grace after any local edit
    if (docSnap.exists) loadFromCloud();
  });
}

// Retry pending saves when network comes back
window.addEventListener('online', () => {
  if (_pendingSave && currentUser) {
    clearTimeout(_saveRetryTimer);
    saveToCloud();
  }
});

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

// ==================== ИЗОБРАЖЕНИЯ ====================

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
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

window.uploadImage = async function(base64) {
  const compressed = await compressImage(base64);
  if (window.uploadToYadisk) return await window.uploadToYadisk(compressed);
  return compressed;
};

} catch (e) {
  // Firebase не инициализировался — кнопки входа уже определены выше с заглушкой
  console.error('Firebase init error:', e);
}
