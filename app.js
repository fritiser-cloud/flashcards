// app.js
// Настройка marked (если ещё не настроен)
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
} else {
  window.marked = { parse: (txt) => '<pre>' + (window.escapeHtml ? window.escapeHtml(txt) : txt) + '</pre>' };
}

// Функция для обновления статистики на экране настроек
function updateSettingsStats() {
  const guides = window.getGuides ? window.getGuides() : [];
  const notes = window.getNotes ? window.getNotes() : [];
  const atlas = window.getAtlasItems ? window.getAtlasItems() : [];
  
  const guideCount = document.getElementById('settings-guide-count');
  const atlasCount = document.getElementById('settings-atlas-count');
  const notesCount = document.getElementById('settings-notes-count');
  if (guideCount) guideCount.textContent = guides.length;
  if (atlasCount) atlasCount.textContent = atlas.length;
  if (notesCount) notesCount.textContent = notes.length;
  
  window.dbGetAll('decks').then(decks => {
    const deckCount = document.getElementById('settings-deck-count');
    if (deckCount) deckCount.textContent = decks.length;
  }).catch(() => {});
}
window.updateSettingsStats = updateSettingsStats;

// Функция для рендеринга экрана настроек (вызывается при переходе)
function renderSettings() {
  const ghUserInput = document.getElementById('gh-user-input');
  const ghRepoInput = document.getElementById('gh-repo-input');
  if (ghUserInput) ghUserInput.value = localStorage.getItem('gh_user') || 'fritiser-cloud';
  if (ghRepoInput) ghRepoInput.value = localStorage.getItem('gh_repo') || 'flashcards';
  updateSettingsStats();
}
window.renderSettings = renderSettings;

// Сохранение настроек GitHub
function saveSettings() {
  const ghUser = document.getElementById('gh-user-input')?.value.trim() || 'fritiser-cloud';
  const ghRepo = document.getElementById('gh-repo-input')?.value.trim() || 'flashcards';
  localStorage.setItem('gh_user', ghUser);
  localStorage.setItem('gh_repo', ghRepo);
  window.showToast('✓ Настройки сохранены');
}
window.saveSettings = saveSettings;

// Очистка всех данных
function clearAllData() {
  if (!confirm('Удалить все пособия, колоды, заметки и атлас? Отменить нельзя.')) return;
  localStorage.removeItem('bio_guides');
  localStorage.removeItem('notes');
  localStorage.removeItem('atlas');
  localStorage.removeItem('gh_user');
  localStorage.removeItem('gh_repo');
  // Очистка IndexedDB
  window.dbDeleteRange('decks', '');
  window.dbDeleteRange('stats', '');
  window.dbDeleteRange('favorites', '');
  // Перерисовка
  if (window.renderLibrary) window.renderLibrary();
  if (window.renderDecks) window.renderDecks();
  if (window.renderAtlas) window.renderAtlas();
  if (window.renderNotes) window.renderNotes();
  if (window.updateSettingsStats) window.updateSettingsStats();
  window.showToast('🗑 Все данные удалены');
}
window.clearAllData = clearAllData;

// Инициализация приложения
(async function init() {
  try {
    await window.openDB();
    console.log('✓ База данных инициализирована');
    if (window.renderLibrary) window.renderLibrary();
    if (window.renderDecks) await window.renderDecks();
    if (window.renderAtlas) window.renderAtlas();
    if (window.renderNotes) window.renderNotes();
    if (window.navTo) window.navTo('library');
    if (window.updateSettingsStats) window.updateSettingsStats();
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    window.showToast('⚠️ Ошибка инициализации');
    if (window.renderLibrary) window.renderLibrary();
    if (window.navTo) window.navTo('library');
  }
})();

// Обработчики online/offline
window.addEventListener('online', () => {
  window.showToast('🟢 Соединение восстановлено');
  if (window.autoSaveToCloud) window.autoSaveToCloud();
});
window.addEventListener('offline', () => window.showToast('🔴 Нет соединения'));

// Глобальная обработка ошибок
window.addEventListener('error', (event) => console.error('Глобальная ошибка:', event.error));
window.addEventListener('unhandledrejection', (event) => console.error('Необработанное отклонение:', event.reason));

// Для match-screen перерисовка линий при ресайзе
window.addEventListener('resize', () => {
  if (document.getElementById('match-screen')?.classList.contains('active') && window.drawLines) {
    window.drawLines();
  }
});

console.log('📚 Биолаб • Карточки • Заметки v3.0 (с авторизацией Google)');
