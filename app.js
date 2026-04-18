// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================

// Настройка marked для поддержки одиночных переносов строк
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,  // Включает перенос строк как <br>
    gfm: true      // GitHub Flavored Markdown
  });
} else {
  console.warn('marked не загружен, используется простой рендеринг');
  window.marked = { 
    parse: (txt) => '<pre>' + (window.escapeHtml ? window.escapeHtml(txt) : txt) + '</pre>' 
  };
}

// Инициализация приложения
(async function init() {
  try {
    console.log('🚀 Запуск приложения...');
    
    // Инициализация базы данных
    await window.openDB();
    console.log('✓ База данных инициализирована');
    
    // Рендеринг начального экрана
    if (window.renderLibrary) {
      window.renderLibrary();
    }
    
    // Навигация на главный экран
    if (window.navTo) {
      window.navTo('library');
    }
    
    console.log('✓ Приложение готово');
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    if (window.showToast) {
      window.showToast('⚠️ Ошибка инициализации');
    }
    
    // Попытка загрузить хотя бы библиотеку
    if (window.renderLibrary) {
      window.renderLibrary();
    }
    if (window.navTo) {
      window.navTo('library');
    }
  }
})();

// Обработка событий online/offline
window.addEventListener('online', () => {
  if (window.showToast) window.showToast('🟢 Соединение восстановлено');
  if (window.autoSaveToCloud) window.autoSaveToCloud();
});

window.addEventListener('offline', () => {
  if (window.showToast) window.showToast('🔴 Нет соединения');
});

// Глобальная обработка ошибок
window.addEventListener('error', (event) => {
  console.error('Глобальная ошибка:', event.error);
  if (window.showToast) window.showToast('⚠️ Произошла ошибка');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Необработанное отклонение промиса:', event.reason);
  if (window.showToast) window.showToast('⚠️ Ошибка загрузки данных');
});

// Обработка изменения размера окна для match-screen
window.addEventListener('resize', () => {
  const matchScreen = window.getElement && window.getElement('match-screen');
  if (matchScreen && matchScreen.classList.contains('active')) {
    // Перерисовка линий при изменении размера
    if (window.drawLines) window.drawLines();
  }
});

console.log('📚 Биолаб • Карточки • Заметки v3.0');
