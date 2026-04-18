// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================
let currentCat = 'all';
let currentGuideId = null;
let librarySearchQuery = '';

function searchLibrary() {
  const input = document.getElementById('library-search');
  if (input) librarySearchQuery = input.value.toLowerCase();
  renderLibrary();
}
window.searchLibrary = searchLibrary;

function filterCat(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLibrary();
}
window.filterCat = filterCat;

function renderLibrary() {
  const guides = window.getGuides ? window.getGuides() : [];
  const list = document.getElementById('guides-list');
  if (!list) return;
  
  let filtered = currentCat === 'all' ? guides : guides.filter(g => g.category === currentCat);
  if (librarySearchQuery) {
    filtered = filtered.filter(g => 
      (g.name && g.name.toLowerCase().includes(librarySearchQuery)) || 
      (g.desc && g.desc.toLowerCase().includes(librarySearchQuery)) ||
      (g.tags && g.tags.some(tag => tag.toLowerCase().includes(librarySearchQuery)))
    );
  }
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📚</div><div class="empty-text">${guides.length === 0 ? 'Библиотека пуста' : 'Нет пособий в этой категории'}</div></div>`;
    return;
  }
  
  list.innerHTML = '';
  filtered.forEach(guide => {
    const card = document.createElement('div');
    card.className = `guide-card ${guide.category || 'bio'}`;
    const tags = (guide.tags || []).map((t, i) => {
      const cls = ['', 'sage', 'peach', 'sky'][i % 4];
      return `<span class="card-tag ${cls}">${window.escapeHtml(t)}</span>`;
    }).join('');
    card.innerHTML = `
      <div class="card-emoji">${guide.icon || '📖'}</div>
      <div class="card-title">${window.escapeHtml(guide.name)}</div>
      <div class="card-sub">${window.escapeHtml(guide.desc || '')}</div>
      <div class="card-tags">${tags}</div>
      <div class="card-arrow">›</div>`;
    card.onclick = () => openGuide(guide.id);
    list.appendChild(card);
  });
}
window.renderLibrary = renderLibrary;

function openGuide(id) {
  currentGuideId = id;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === id);
  if (!guide) return;
  
  const titleEl = document.getElementById('guide-detail-title');
  if (titleEl) titleEl.textContent = guide.name;
  const nameEl = document.getElementById('guide-name');
  if (nameEl) nameEl.textContent = guide.name;
  const catLabel = document.getElementById('guide-category-label');
  if (catLabel) catLabel.textContent = { bio: '🧬 Биология', ru: '✍️ Русский язык', phys: '⚗️ Химия / Физика' }[guide.category] || '📖 Пособие';
  const descEl = document.getElementById('guide-desc');
  if (descEl) descEl.textContent = guide.desc || '';
  const deleteBtn = document.getElementById('guide-delete-btn');
  if (deleteBtn) deleteBtn.onclick = () => deleteGuide(id);
  const tagsEl = document.getElementById('guide-tags');
  if (tagsEl) tagsEl.innerHTML = (guide.tags || []).map((t,i) => `<span class="card-tag ${['','sage','peach','sky'][i%4]}">${window.escapeHtml(t)}</span>`).join('');
  
  const chapters = guide.chapters || [];
  const statsEl = document.getElementById('guide-stats');
  const chapEl = document.getElementById('guide-chapters-list');
  if (chapters.length) {
    if (statsEl) statsEl.style.display = '';
    const chaptersCount = document.getElementById('stat-chapters');
    if (chaptersCount) chaptersCount.textContent = chapters.length;
    const tasksCount = document.getElementById('stat-tasks');
    if (tasksCount) tasksCount.textContent = chapters.reduce((s,c) => s + (c.tasks || 0), 0);
    if (chapEl) chapEl.innerHTML = chapters.map((ch,i) => `<div class="chapter-item"><div class="chapter-num">${i+1}</div><div class="chapter-info"><div class="chapter-name">${window.escapeHtml(ch.title)}</div><div class="chapter-tasks">${ch.tasks ? ch.tasks + ' задач' : 'Теория'}</div></div><div class="chapter-arrow">›</div></div>`).join('');
  } else {
    if (statsEl) statsEl.style.display = 'none';
    if (chapEl) chapEl.innerHTML = '';
  }

  const mdContainer = document.getElementById('guide-markdown-content');
  const actionsDiv = document.getElementById('guide-action-buttons');
  if (mdContainer && actionsDiv) {
    if (guide.content) {
      mdContainer.innerHTML = marked.parse(guide.content);
      mdContainer.style.display = 'block';
      actionsDiv.innerHTML = guide.url ? `<button class="btn btn-secondary" onclick="openGuideUrl()">🔗 Открыть оригинал</button>` : '';
    } else {
      mdContainer.style.display = 'none';
      actionsDiv.innerHTML = guide.url ? `<button class="btn btn-primary" onclick="openGuideUrl()">📖 Открыть пособие</button>` : '';
    }
  }
  window.showScreen('guide-detail-screen');
}
window.openGuide = openGuide;

function openGuideUrl() {
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === currentGuideId);
  if (guide?.url) window.open(guide.url, '_blank');
  else window.showToast('URL пособия не указан');
}
window.openGuideUrl = openGuideUrl;

function deleteGuide(id) {
  if (!confirm('Удалить пособие?')) return;
  const guides = window.getGuides ? window.getGuides().filter(g => g.id !== id) : [];
  window.saveGuides(guides);
  window.showScreen('library-screen');
  renderLibrary();
  window.showToast('Пособие удалено');
}

// Функции модальных окон (импорт) – они уже определены в вашем проекте, если нет – добавьте их из предыдущих версий
