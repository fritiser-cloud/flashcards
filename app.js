// ==================== НАСТРОЙКИ ИНИЦИАЛИЗАЦИИ ====================

if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
} else {
  window.marked = { parse: (txt) => '<pre>' + (window.escapeHtml ? window.escapeHtml(txt) : txt) + '</pre>' };
}

// ==================== СТАТИСТИКА И НАСТРОЙКИ ====================
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

function renderSettings() {
  const ghUserInput = document.getElementById('gh-user-input');
  const ghRepoInput = document.getElementById('gh-repo-input');
  const yadiskTokenInput = document.getElementById('yadisk-token-input');
  if (ghUserInput) ghUserInput.value = localStorage.getItem('gh_user') || 'fritiser-cloud';
  if (ghRepoInput) ghRepoInput.value = localStorage.getItem('gh_repo') || 'flashcards';
  if (yadiskTokenInput) yadiskTokenInput.value = localStorage.getItem('yadisk_token') || '';
  updateSettingsStats();
}
window.renderSettings = renderSettings;

function saveSettings() {
  const ghUser = document.getElementById('gh-user-input')?.value.trim() || 'fritiser-cloud';
  const ghRepo = document.getElementById('gh-repo-input')?.value.trim() || 'flashcards';
  const yadiskToken = document.getElementById('yadisk-token-input')?.value.trim() || '';
  localStorage.setItem('gh_user', ghUser);
  localStorage.setItem('gh_repo', ghRepo);
  if (yadiskToken) localStorage.setItem('yadisk_token', yadiskToken);
  else localStorage.removeItem('yadisk_token');
  window.showToast('✓ Настройки сохранены');
}
window.saveSettings = saveSettings;

// *** ИСПРАВЛЕНО: полная очистка всех данных, включая баллы ЕГЭ и токен ***
async function clearAllData() {
  if (!confirm('Удалить все пособия, колоды, заметки, атлас и историю повторений? Отменить нельзя.')) return;
  
  // localStorage – очищаем ВСЕ ключи приложения
  const localStorageKeys = [
    'bio_guides', 'notes', 'atlas',
    'gh_user', 'gh_repo', 'gh_token', 'yadisk_token',
    'ege_current_ru', 'ege_current_bio', 'ege_current_chem',
    'ege_history_ru', 'ege_history_bio', 'ege_history_chem'
  ];
  localStorageKeys.forEach(k => localStorage.removeItem(k));
  
  // IndexedDB – используем транзакцию для атомарной очистки всех хранилищ
  const db = await window.openDB();
  const tx = db.transaction(['decks', 'stats', 'favorites', 'reviews'], 'readwrite');
  await Promise.all([
    tx.objectStore('decks').clear(),
    tx.objectStore('stats').clear(),
    tx.objectStore('favorites').clear(),
    tx.objectStore('reviews').clear()
  ]);
  await tx.done;
  
  // Обновление UI
  if (window.invalidateDecksCache) window.invalidateDecksCache();
  if (window.renderLibrary) window.renderLibrary();
  if (window.renderDecks) window.renderDecks();
  if (window.renderAtlas) window.renderAtlas();
  if (window.renderNotes) window.renderNotes();
  if (window.renderCalendar) window.renderCalendar();
  if (window.renderUpcomingReviews) window.renderUpcomingReviews();
  if (window.updateSettingsStats) window.updateSettingsStats();
  if (window.renderScores) window.renderScores();
  
  // Отправить пустое состояние в облако
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  
  window.showToast('🗑 Все данные удалены');
}
window.clearAllData = clearAllData;

// ==================== НАВИГАЦИЯ ====================
function navTo(tab) {
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + tab);
  if (btn) btn.classList.add('active');
  
  if (tab === 'library') {
    window.showScreen('library-screen');
    if (window.renderCategoryPills) window.renderCategoryPills();
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
  } else if (tab === 'scores') {
    window.showScreen('scores-screen');
    if (window.renderScores) window.renderScores();
  } else if (tab === 'settings') {
    window.showScreen('settings-screen');
    if (window.renderSettings) window.renderSettings();
  }
}
window.navTo = navTo;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
(async function init() {
  try {
    await window.openDB();
    console.log('✓ База данных инициализирована');

    if (window.renderCategoryPills) window.renderCategoryPills();
    if (window.renderLibrary) window.renderLibrary();
    if (window.renderDecks) await window.renderDecks();
    if (window.renderAtlas) window.renderAtlas();
    if (window.renderNotes) window.renderNotes();
    if (window.updateSettingsStats) window.updateSettingsStats();

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
window.addEventListener('resize', () => {
  if (document.getElementById('match-screen')?.classList.contains('active') && window.drawLines) {
    window.drawLines();
  }
});

console.log('📚 Биолаб • Карточки • Заметки • Календарь повторений v3.0');