// ==================== УТИЛИТЫ ====================

// Универсальная функция получения элемента
function getElement(id) {
  return document.getElementById(id);
}

// Показ экрана
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = getElement(screenId);
  if (screen) screen.classList.add('active');
  
  // Обновление навигации
  document.querySelectorAll('.bottom-nav-btn').forEach(btn => btn.classList.remove('active'));
  if (screenId === 'library-screen') {
    document.querySelectorAll('.bottom-nav-btn')[0]?.classList.add('active');
  } else if (screenId === 'decks-screen') {
    document.querySelectorAll('.bottom-nav-btn')[1]?.classList.add('active');
  } else if (screenId === 'atlas-screen') {
    document.querySelectorAll('.bottom-nav-btn')[2]?.classList.add('active');
  } else if (screenId === 'notes-screen') {
    document.querySelectorAll('.bottom-nav-btn')[3]?.classList.add('active');
  } else if (screenId === 'settings-screen') {
    document.querySelectorAll('.bottom-nav-btn')[4]?.classList.add('active');
  }
}

// Навигация
function navTo(screen) {
  if (screen === 'library') {
    showScreen('library-screen');
    if (window.renderLibrary) renderLibrary();
  } else if (screen === 'decks') {
    showScreen('decks-screen');
    if (window.renderDecks) renderDecks();
  } else if (screen === 'atlas') {
    showScreen('atlas-screen');
    if (window.renderAtlas) renderAtlas();
  } else if (screen === 'notes') {
    showScreen('notes-screen');
    if (window.renderNotes) renderNotes();
  } else if (screen === 'settings') {
    showScreen('settings-screen');
    if (window.updateSettingsStats) window.updateSettingsStats();
  }
}

// Toast уведомления
let toastTimeout;
function showToast(message) {
  let toast = getElement('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('show');
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Экспорт
window.getElement = getElement;
window.showScreen = showScreen;
window.navTo = navTo;
window.showToast = showToast;
