// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================

let currentGuideId = null;
let currentCat = 'all';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function filterLibrary(cat) {
  currentCat = cat;
  const pills = document.querySelectorAll('#library-cats .cat-pill');
  pills.forEach(p => p.classList.remove('active'));
  event.target?.classList.add('active');
  renderLibrary();
}

function renderLibrary() {
  const guides = window.getGuides ? window.getGuides() : [];
  const list = window.getElement('library-list');
  if (!list) return;
  
  const filtered = currentCat === 'all' ? guides : guides.filter(g => g.category === currentCat);
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-text">${guides.length === 0 ? 'Библиотека пуста' : 'Нет пособий в этой категории'}</div>
      <div class="empty-state-sub">Добавьте пособия через GitHub или загрузите JSON файл</div>
    </div>`;
    return;
  }
  
  list.innerHTML = '';
  
  filtered.forEach(guide => {
    const card = document.createElement('div');
    card.className = `guide-card ${guide.category || 'bio'}`;
    
    const tags = (guide.tags || []).map((t, i) => {
      const cls = ['', 'sage', 'peach', 'sky'][i % 4];
      return `<span class="card-tag ${cls}">${escapeHtml(t)}</span>`;
    }).join('');
    
    card.innerHTML = `
      <div class="card-emoji">${guide.icon || '📖'}</div>
      <div class="card-title">${escapeHtml(guide.name)}</div>
      <div class="card-sub">${escapeHtml(guide.desc || '')}</div>
      <div class="card-tags">${tags}</div>
      <div class="card-arrow">›</div>`;
    
    card.onclick = () => openGuide(guide.id);
    list.appendChild(card);
  });
}

function openGuide(id) {
  currentGuideId = id;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === id);
  if (!guide) return;
  
  // Установка заголовка
  const titleEl = window.getElement('guide-title');
  if (titleEl) titleEl.textContent = guide.name;
  
  // Основной контент
  const contentDiv = window.getElement('guide-content');
  if (!contentDiv) return;
  
  contentDiv.innerHTML = '';
  
  // Заголовок пособия
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text3); margin-bottom: 12px;">
      ${{'bio': '🧬 Биология', 'ru': '📖 Русский', 'phys': '⚛️ Физика'}[guide.category] || '📖 Пособие'}
    </div>
    <h1 style="font-family: var(--font-display); font-size: 32px; font-weight: 600; margin-bottom: 12px; line-height: 1.2;">
      ${escapeHtml(guide.name)}
    </h1>
    <p style="font-size: 16px; color: var(--text2); line-height: 1.7; margin-bottom: 24px;">
      ${escapeHtml(guide.desc || '')}
    </p>
  `;
  
  // Теги
  if (guide.tags && guide.tags.length) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'card-tags';
    tagsDiv.innerHTML = guide.tags.map((t, i) => {
      const cls = ['', 'sage', 'peach', 'sky'][i % 4];
      return `<span class="card-tag ${cls}">${escapeHtml(t)}</span>`;
    }).join('');
    header.appendChild(tagsDiv);
  }
  
  contentDiv.appendChild(header);
  
  // Markdown контент
  if (guide.content) {
    const mdDiv = document.createElement('div');
    mdDiv.style.cssText = 'margin-top: 32px; line-height: 1.8;';
    
    try {
      if (typeof marked !== 'undefined') {
        mdDiv.innerHTML = marked.parse(guide.content);
      } else {
        mdDiv.innerHTML = '<pre>' + escapeHtml(guide.content) + '</pre>';
      }
    } catch (e) {
      console.warn('Ошибка рендеринга Markdown:', e);
      mdDiv.innerHTML = '<pre>' + escapeHtml(guide.content) + '</pre>';
    }
    
    contentDiv.appendChild(mdDiv);
  }
  
  // Кнопка ссылки если есть URL
  if (guide.url) {
    const btnDiv = document.createElement('div');
    btnDiv.style.cssText = 'margin-top: 24px;';
    btnDiv.innerHTML = `
      <button class="btn-primary" onclick="window.open('${escapeHtml(guide.url)}', '_blank')" style="width: 100%; padding: 16px; border-radius: var(--radius-sm); border: none; background: var(--lavender-deep); color: white; font-size: 16px; font-weight: 600; cursor: pointer; font-family: var(--font);">
        🔗 Открыть оригинал
      </button>
    `;
    contentDiv.appendChild(btnDiv);
  }
  
  window.showScreen('guide-screen');
}

function addGuideToDecks() {
  if (!currentGuideId) return;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === currentGuideId);
  if (!guide || !guide.cards || !guide.cards.length) {
    if (window.showToast) window.showToast('⚠️ Нет карточек для добавления');
    return;
  }
  
  // Конвертируем пособие в колоду и добавляем через IndexedDB
  const deck = {
    id: Date.now(),
    name: guide.name,
    icon: guide.icon || '📚',
    color: guide.category === 'bio' ? '#E8F5E9' : guide.category === 'ru' ? '#FBE9E7' : '#E3F2FD',
    cards: guide.cards,
    type: 'flashcard'
  };
  
  if (window.dbPut) {
    window.dbPut('decks', deck).then(() => {
      if (window.showToast) window.showToast('✓ Добавлено в карточки');
      if (window.navTo) window.navTo('decks');
    }).catch(err => {
      console.error('Ошибка добавления:', err);
      if (window.showToast) window.showToast('⚠️ Ошибка добавления');
    });
  }
}

// Экспорт функций
window.filterLibrary = filterLibrary;
window.renderLibrary = renderLibrary;
window.openGuide = openGuide;
window.addGuideToDecks = addGuideToDecks;
window.escapeHtml = escapeHtml;
