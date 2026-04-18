// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================
let currentCat = 'all';
let currentGuideId = null;
let currentAddType = 'guide';
let ghTabLoaded = false;
let GITHUB_USER = localStorage.getItem('gh_user') || 'fritiser-cloud';
let GITHUB_REPO = localStorage.getItem('gh_repo') || 'flashcards';
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

// ==================== МОДАЛЬНЫЕ ОКНА ИМПОРТА ====================
function openAddModal(type) {
  currentAddType = type;
  ghTabLoaded = false;
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) modalTitle.textContent = type === 'guide' ? 'Добавить пособие' : 'Добавить колоду';
  const modalSub = document.getElementById('modal-sub');
  if (modalSub) modalSub.textContent = type === 'guide' ? 'Загрузи JSON с описанием пособия' : 'Загрузи JSON с карточками или паронимами';
  const addModal = document.getElementById('add-modal');
  if (addModal) addModal.classList.add('open');
  document.querySelectorAll('.modal-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
  const tabFile = document.getElementById('add-tab-file');
  if (tabFile) tabFile.style.display = '';
  const tabGithub = document.getElementById('add-tab-github');
  if (tabGithub) tabGithub.style.display = 'none';
  const loading = document.getElementById('gh-loading');
  if (loading) loading.style.display = '';
  const list = document.getElementById('gh-list');
  if (list) list.innerHTML = '';
  const error = document.getElementById('gh-error');
  if (error) error.style.display = 'none';
}
window.openAddModal = openAddModal;

function closeAddModal(e) {
  if (!e || e.target === document.getElementById('add-modal')) {
    const modal = document.getElementById('add-modal');
    if (modal) modal.classList.remove('open');
  }
}
window.closeAddModal = closeAddModal;

function switchAddTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tabFile = document.getElementById('add-tab-file');
  if (tabFile) tabFile.style.display = tab === 'file' ? '' : 'none';
  const tabGithub = document.getElementById('add-tab-github');
  if (tabGithub) tabGithub.style.display = tab === 'github' ? '' : 'none';
  if (tab === 'github' && !ghTabLoaded) {
    ghTabLoaded = true;
    loadGithubList();
  }
}
window.switchAddTab = switchAddTab;

function triggerFileAdd() {
  closeAddModal();
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.click();
}
window.triggerFileAdd = triggerFileAdd;

async function handleFileAdd(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (currentAddType === 'guide') {
      if (!data.name || !data.category) throw new Error('bad format');
      const guides = window.getGuides ? window.getGuides() : [];
      const existing = guides.findIndex(g => g.name === data.name);
      if (existing >= 0) guides[existing] = data;
      else guides.push({ ...data, id: Date.now() });
      window.saveGuides(guides);
      renderLibrary();
    } else {
      if (!data.name || !Array.isArray(data.cards)) throw new Error('bad format');
      const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
      const deck = {
        name: data.name, icon: data.icon || '📚', type: data.type || 'flashcard',
        color: data.color || colors[Math.floor(Math.random() * colors.length)],
        cards: data.cards, createdAt: Date.now()
      };
      await window.dbPut('decks', deck);
      if (window.renderDecks) window.renderDecks();
    }
    closeAddModal();
    window.showToast(`✓ ${data.name} добавлено`);
  } catch (e) {
    window.showToast('⚠️ Ошибка: неверный формат файла');
  }
}
window.handleFileAdd = handleFileAdd;

async function loadGithubList() {
  const loading = document.getElementById('gh-loading');
  const errEl = document.getElementById('gh-error');
  const list = document.getElementById('gh-list');
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) throw new Error(res.status);
    const files = await res.json();
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.name !== 'manifest.json' && f.type === 'file');
    if (loading) loading.style.display = 'none';
    const filtered = [];
    for (const f of jsonFiles) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${f.name}`;
        const resp = await fetch(rawUrl);
        const data = await resp.json();
        if ((currentAddType === 'guide' && data.type === 'guide') ||
            (currentAddType === 'deck' && (data.type === 'flashcard' || data.type === 'match'))) {
          filtered.push({ ...f, data });
        }
      } catch (e) { /* skip */ }
    }
    if (filtered.length === 0) {
      if (list) list.innerHTML = '<div class="gh-loading">Нет подходящих JSON файлов</div>';
      return;
    }
    if (list) {
      list.innerHTML = '';
      for (const f of filtered) {
        const existing = currentAddType === 'guide'
          ? (window.getGuides ? window.getGuides().find(g => g.sourceFile === f.name) : null)
          : (await window.dbGetAll('decks')).find(d => d.sourceFile === f.name);
        const el = document.createElement('div');
        el.className = 'gh-item' + (existing ? ' loaded' : '');
        el.innerHTML = `
          <div class="gh-item-icon">${existing ? '✓' : '📄'}</div>
          <div class="gh-item-info">
            <div class="gh-item-name">${window.escapeHtml(f.data.name || f.name)}</div>
            <div class="gh-item-sub">${(f.size / 1024).toFixed(1)} КБ</div>
          </div>
          <div class="gh-item-btn">${existing ? 'Добавлено' : 'Добавить'}</div>`;
        el.onclick = () => importFromGithub(f.data, f.name, existing);
        list.appendChild(el);
      }
    }
  } catch (e) {
    if (loading) loading.style.display = 'none';
    if (errEl) {
      errEl.textContent = `Ошибка загрузки: ${e.message}`;
      errEl.style.display = '';
    }
  }
}
window.loadGithubList = loadGithubList;

async function importFromGithub(data, filename, alreadyExists) {
  if (alreadyExists) return;
  if (currentAddType === 'guide') {
    const guides = window.getGuides ? window.getGuides() : [];
    const existing = guides.findIndex(g => g.name === data.name);
    if (existing >= 0) guides[existing] = { ...data, sourceFile: filename };
    else guides.push({ ...data, id: Date.now(), sourceFile: filename });
    window.saveGuides(guides);
    renderLibrary();
  } else {
    const deck = { ...data, sourceFile: filename, createdAt: Date.now() };
    await window.dbPut('decks', deck);
    if (window.renderDecks) window.renderDecks();
  }
  closeAddModal();
  window.showToast(`✓ ${data.name || filename} добавлено`);
}
window.importFromGithub = importFromGithub;

function openSampleModal() {
  closeAddModal();
  const title = document.getElementById('sample-title');
  const sub = document.getElementById('sample-sub');
  const pre = document.getElementById('sample-pre');
  if (currentAddType === 'guide') {
    if (title) title.textContent = 'Формат guide.json';
    if (sub) sub.textContent = 'Добавь файл с таким форматом в свой GitHub репозиторий:';
    if (pre) pre.textContent = `{\n  "name": "Название пособия",\n  "type": "guide",\n  "category": "bio",\n  "icon": "🧬",\n  "color": "lavender",\n  "desc": "Краткое описание",\n  "tags": ["ЕГЭ 2026", "Задание 27"],\n  "chapters": [\n    { "title": "Глава 1", "tasks": 14 }\n  ],\n  "url": "https://ссылка-на-файл.pdf"\n}`;
  } else {
    if (title) title.textContent = 'Формат колоды';
    if (sub) sub.textContent = 'Для flashcard (обычные карточки) или match (паронимы):';
    if (pre) pre.textContent = `// Флеш-карточки\n{\n  "name": "Ударения ЕГЭ",\n  "type": "flashcard",\n  "icon": "🗣️",\n  "cards": [{"q": "вручит", "a": "вручИт"}]\n}\n\n// Паронимы (match)\n{\n  "name": "Паронимы ЕГЭ",\n  "type": "match",\n  "cards": [\n    {\n      "pairs": [\n        {"word": "Абонемент", "example": "...", "hint": "..."},\n        {"word": "Абонент", "example": "...", "hint": "..."}\n      ]\n    }\n  ]\n}`;
  }
  const sampleModal = document.getElementById('sample-modal');
  if (sampleModal) sampleModal.classList.add('open');
}
window.openSampleModal = openSampleModal;

function closeSampleModal(e) {
  if (!e || e.target === document.getElementById('sample-modal')) {
    const modal = document.getElementById('sample-modal');
    if (modal) modal.classList.remove('open');
  }
}
window.closeSampleModal = closeSampleModal;
// Экспорт в глобальную область
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.switchAddTab = switchAddTab;
window.triggerFileAdd = triggerFileAdd;
window.handleFileAdd = handleFileAdd;
window.loadGithubList = loadGithubList;
window.importFromGithub = importFromGithub;
window.openSampleModal = openSampleModal;
window.closeSampleModal = closeSampleModal;
