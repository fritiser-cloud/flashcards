// ==================== НАСТРОЙКИ И ИНИЦИАЛИЗАЦИЯ ====================

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
  if (!confirm('Удалить все пособия, колоды, заметки, атлас и историю повторений? Отменить нельзя.')) return;
  localStorage.removeItem('bio_guides');
  localStorage.removeItem('notes');
  localStorage.removeItem('atlas');
  localStorage.removeItem('gh_user');
  localStorage.removeItem('gh_repo');
  // Очистка IndexedDB
  window.dbDeleteRange('decks', '');
  window.dbDeleteRange('stats', '');
  window.dbDeleteRange('favorites', '');
  window.dbDeleteRange('reviews', ''); // очищаем таблицу повторений
  // Перерисовка
  if (window.renderLibrary) window.renderLibrary();
  if (window.renderDecks) window.renderDecks();
  if (window.renderAtlas) window.renderAtlas();
  if (window.renderNotes) window.renderNotes();
  if (window.renderCalendar) window.renderCalendar();
  if (window.renderUpcomingReviews) window.renderUpcomingReviews();
  if (window.updateSettingsStats) window.updateSettingsStats();
  window.showToast('🗑 Все данные удалены');
}
window.clearAllData = clearAllData;

// ==================== НАВИГАЦИЯ (с поддержкой календаря) ====================
function navTo(tab) {
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tab);
  if (btn) btn.classList.add('active');
  
  if (tab === 'library') {
    window.showScreen('library-screen');
    if (window.renderLibrary) window.renderLibrary();
  } else if (tab === 'decks') {
    window.showScreen('decks-screen');
    if (window.renderDecks) window.renderDecks();
  } else if (tab === 'atlas') {
    window.showScreen('atlas-screen');
    if (window.renderAtlas) window.renderAtlas();
  } else if (tab === 'notes') {
    window.showScreen('notes-screen');
    if (window.renderNotes) window.renderNotes();
  } else if (tab === 'calendar') {
    window.showScreen('calendar-screen');
    if (window.renderCalendar) {
      window.renderCalendar();
      if (window.renderUpcomingReviews) window.renderUpcomingReviews();
    }
  } else if (tab === 'settings') {
    window.showScreen('settings-screen');
    if (window.renderSettings) window.renderSettings();
  }
}
window.navTo = navTo;

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
(async function init() {
  try {
    await window.openDB();
    console.log('✓ База данных инициализирована');
    
    // Первоначальный рендеринг всех разделов (кроме календаря, он не активен)
    if (window.renderLibrary) window.renderLibrary();
    if (window.renderDecks) await window.renderDecks();
    if (window.renderAtlas) window.renderAtlas();
    if (window.renderNotes) window.renderNotes();
    if (window.updateSettingsStats) window.updateSettingsStats();
    
    // Запускаем с экрана библиотеки
    if (window.navTo) window.navTo('library');
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    window.showToast('⚠️ Ошибка инициализации');
    if (window.renderLibrary) window.renderLibrary();
    if (window.navTo) window.navTo('library');
  }
})();

// ==================== ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ====================
window.addEventListener('online', () => {
  window.showToast('🟢 Соединение восстановлено');
  if (window.autoSaveToCloud) window.autoSaveToCloud();
});
window.addEventListener('offline', () => window.showToast('🔴 Нет соединения'));

window.addEventListener('error', (event) => console.error('Глобальная ошибка:', event.error));
window.addEventListener('unhandledrejection', (event) => console.error('Необработанное отклонение:', event.reason));

// Перерисовка линий в match-экране при изменении размера окна
window.addEventListener('resize', () => {
  if (document.getElementById('match-screen')?.classList.contains('active') && window.drawLines) {
    window.drawLines();
  }
});

console.log('📚 Биолаб • Карточки • Заметки • Календарь повторений v3.0');
