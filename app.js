// ==================== НАСТРОЙКИ И ИНИЦИАЛИЗАЦИЯ ====================
function renderSettings() {
  const userInput = getElement('gh-user-input');
  if (userInput) userInput.value = localStorage.getItem('gh_user') || 'fritiser-cloud';
  const repoInput = getElement('gh-repo-input');
  if (repoInput) repoInput.value = localStorage.getItem('gh_repo') || 'flashcards';
  getElement('settings-guide-count').textContent = getGuides().length;
  getElement('settings-atlas-count').textContent = getAtlasItems().length;
  getElement('settings-notes-count').textContent = getNotes().length;
  dbGetAll('decks').then(decks => { getElement('settings-deck-count').textContent = decks.length; });
}
window.renderSettings = renderSettings;

function saveSettings() {
  const userInput = getElement('gh-user-input');
  const repoInput = getElement('gh-repo-input');
  if (userInput && repoInput) {
    localStorage.setItem('gh_user', userInput.value.trim());
    localStorage.setItem('gh_repo', repoInput.value.trim());
    showToast('✓ Настройки сохранены');
  }
}
window.saveSettings = saveSettings;

function clearAllData() {
  if (!confirm('Удалить все пособия, колоды, заметки и атлас?')) return;
  localStorage.removeItem('bio_guides');
  localStorage.removeItem('notes');
  localStorage.removeItem('atlas');
  dbDeleteRange('decks', '');
  dbDeleteRange('stats', '');
  dbDeleteRange('favorites', '');
  renderLibrary();
  renderDecks();
  renderNotes();
  renderAtlas();
  showToast('Все данные удалены');
}
window.clearAllData = clearAllData;

// ==================== FIREBASE (из модуля) ====================
// Импорт из модуля будет выполнен в HTML через type="module"
// Здесь оставляем заглушки, которые переопределятся в модуле
window.signInWithGoogle = function() { console.log('Google sign in - see module'); };
window.signOut = function() { console.log('Sign out - see module'); };
window.autoSaveToCloud = function() { console.log('Auto save - see module'); };

// Обработчики online/offline
window.addEventListener('online', () => { showToast('🟢 Соединение восстановлено'); if (window.autoSaveToCloud) autoSaveToCloud(); });
window.addEventListener('offline', () => showToast('🔴 Нет соединения'));
window.addEventListener('error', (event) => console.error('Global error:', event.error));
window.addEventListener('unhandledrejection', (event) => console.error('Unhandled rejection:', event.reason));

// Инициализация приложения
(async function init() {
  try {
    await openDB();
    console.log('✓ Database initialized');
    if (window.renderLibrary) renderLibrary();
    if (window.renderDecks) await renderDecks();
    if (window.navTo) navTo('library');
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('⚠️ Ошибка инициализации');
    if (window.renderLibrary) renderLibrary();
    if (window.navTo) navTo('library');
  }
})();

// Перерисовка линий в match при изменении размера окна
window.addEventListener('resize', () => {
  if (getElement('match-screen')?.classList.contains('active')) drawLines();
});
