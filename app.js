// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================

// Настройка marked
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true
  });
} else {
  console.warn('marked не загружен');
  window.marked = { 
    parse: (txt) => '<pre>' + (window.escapeHtml ? window.escapeHtml(txt) : txt) + '</pre>' 
  };
}

// Функции для экрана настроек
function updateSettingsStats() {
  const guides = window.getGuides ? window.getGuides() : [];
  const notes = window.getNotes ? window.getNotes() : [];
  const atlas = window.getAtlasItems ? window.getAtlasItems() : [];
  
  const guideCount = window.getElement('settings-guide-count');
  const deckCount = window.getElement('settings-deck-count');
  const atlasCount = window.getElement('settings-atlas-count');
  const notesCount = window.getElement('settings-notes-count');
  
  if (guideCount) guideCount.textContent = guides.length;
  if (atlasCount) atlasCount.textContent = atlas.length;
  if (notesCount) notesCount.textContent = notes.length;
  
  window.dbGetAll('decks').then(decks => {
    if (deckCount) deckCount.textContent = decks.length;
  }).catch(() => {});
}

function clearAllData() {
  if (!confirm('Удалить ВСЕ данные: колоды, заметки, атлас, пособия? Отменить нельзя.')) return;
  
  localStorage.removeItem('notes');
  localStorage.removeItem('atlas');
  localStorage.removeItem('bio_guides');
  localStorage.removeItem('gh_user');
  localStorage.removeItem('gh_repo');
  
  window.dbGetAll('decks').then(decks => {
    for (const deck of decks) {
      window.dbDelete('decks', deck.id);
    }
  }).then(() => {
    if (window.showToast) window.showToast('🗑 Все данные удалены');
    if (window.renderLibrary) window.renderLibrary();
    if (window.renderDecks) window.renderDecks();
    if (window.renderAtlas) window.renderAtlas();
    if (window.renderNotes) window.renderNotes();
    updateSettingsStats();
  }).catch(err => console.error(err));
}

function saveSettings() {
  const ghUser = window.getElement('gh-user-input')?.value.trim() || 'fritiser-cloud';
  const ghRepo = window.getElement('gh-repo-input')?.value.trim() || 'flashcards';
  localStorage.setItem('gh_user', ghUser);
  localStorage.setItem('gh_repo', ghRepo);
  if (window.showToast) window.showToast('✓ Настройки сохранены');
}

// Firebase заглушки (если нет конфига – просто показываем сообщение)
function signInWithGoogle() {
  if (window.showToast) window.showToast('🔐 Авторизация через Google будет доступна в следующей версии');
}

function signOut() {
  if (window.showToast) window.showToast('🔓 Выход из аккаунта (демо-режим)');
  // Обновляем интерфейс (скрываем панель)
  const loggedOut = window.getElement('auth-logged-out');
  const loggedIn = window.getElement('auth-logged-in');
  if (loggedOut) loggedOut.style.display = 'block';
  if (loggedIn) loggedIn.style.display = 'none';
}

// Проверка авторизации (демо)
function checkAuth() {
  // Для демонстрации показываем неавторизованного
  const loggedOut = window.getElement('auth-logged-out');
  const loggedIn = window.getElement('auth-logged-in');
  if (loggedOut) loggedOut.style.display = 'block';
  if (loggedIn) loggedIn.style.display = 'none';
}

// Инициализация
(async function init() {
  try {
    console.log('🚀 Запуск приложения...');
    await window.openDB();
    console.log('✓ База данных инициализирована');
    
    if (window.renderLibrary) window.renderLibrary();
    if (window.navTo) window.navTo('library');
    
    checkAuth();
    updateSettingsStats();
    
    console.log('✓ Приложение готово');
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    if (window.showToast) window.showToast('⚠️ Ошибка инициализации');
    if (window.renderLibrary) window.renderLibrary();
    if (window.navTo) window.navTo('library');
  }
})();

window.addEventListener('online', () => {
  if (window.showToast) window.showToast('🟢 Соединение восстановлено');
});

window.addEventListener('offline', () => {
  if (window.showToast) window.showToast('🔴 Нет соединения');
});

window.addEventListener('error', (event) => {
  console.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанное отклонение промиса:', event.reason);
});

window.updateSettingsStats = updateSettingsStats;
window.clearAllData = clearAllData;
window.saveSettings = saveSettings;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;

console.log('📚 Биолаб • Карточки • Заметки v3.0');
