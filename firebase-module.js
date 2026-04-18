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

// Следим за состоянием авторизации
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    syncAllData();      // загружаем данные из облака
  } else {
    // Если пользователь вышел, ничего не делаем, локальные данные остаются
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

// Синхронизация: загружаем данные из Firestore в localStorage
async function syncAllData() {
  if (!currentUser) return;
  updateSyncStatus('syncing', 'Синхронизация...');
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const cloudData = userDoc.data();
      // Восстанавливаем заметки
      if (cloudData.notes) {
        localStorage.setItem('notes', JSON.stringify(cloudData.notes));
        if (window.renderNotes) window.renderNotes();
      }
      // Восстанавливаем атлас
      if (cloudData.atlas) {
        localStorage.setItem('atlas', JSON.stringify(cloudData.atlas));
        if (window.renderAtlas) window.renderAtlas();
      }
      // Восстанавливаем пособия
      if (cloudData.guides) {
        localStorage.setItem('bio_guides', JSON.stringify(cloudData.guides));
        if (window.renderLibrary) window.renderLibrary();
      }
      // Колоды не синхронизируем через Firestore (они в IndexedDB), но можно добавить при желании
    }
    // После загрузки облачных данных сохраняем текущие локальные данные обратно в облако
    await saveToCloud();
    updateSyncStatus('success', 'Синхронизировано');
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) lastSyncEl.textContent = new Date().toLocaleTimeString('ru-RU');
  } catch (error) {
    console.error('Ошибка синхронизации:', error);
    updateSyncStatus('error', 'Ошибка синхронизации');
  }
}

// Сохранение локальных данных в облако
async function saveToCloud() {
  if (!currentUser) return;
  try {
    const notes = window.getNotes ? window.getNotes() : [];
    const atlas = window.getAtlasItems ? window.getAtlasItems() : [];
    const guides = window.getGuides ? window.getGuides() : [];
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, {
      notes: notes,
      atlas: atlas,
      guides: guides,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('✅ Данные сохранены в облако');
  } catch (error) {
    console.error('Ошибка сохранения в облако:', error);
  }
}

// Функция для автоматического сохранения (вызывается после любых изменений)
window.autoSaveToCloud = function() {
  if (currentUser) saveToCloud();
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