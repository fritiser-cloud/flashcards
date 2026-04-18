// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================
let currentCat = 'all';
let currentGuideId = null;
let currentAddType = 'guide';
let ghTabLoaded = false;
let GITHUB_USER = localStorage.getItem('gh_user') || 'fritiser-cloud';
let GITHUB_REPO = localStorage.getItem('gh_repo') || 'flashcards';

function filterCat(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLibrary();
}
window.filterCat = filterCat;

function renderLibrary() {
  const guides = getGuides();
  const list = getElement('guides-list');
  if (!list) return;
  const filtered = currentCat === 'all' ? guides : guides.filter(g => g.category === currentCat);
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📚</div><div class="empty-text">${guides.length === 0 ? 'Библиотека пуста' : 'Нет пособий в этой категории'}</div></div>`;
    return;
  }
  list.innerHTML = '';
  filtered.forEach(guide => {
    const card = document.createElement('div');
    card.className = `guide-card ${guide.category || 'bio'}`;
    const tags = (guide.tags || []).map((t, i) => `<span class="card-tag ${['', 'sage', 'peach', 'sky'][i % 4]}">${escapeHtml(t)}</span>`).join('');
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
window.renderLibrary = renderLibrary;

function openGuide(id) {
  currentGuideId = id;
  const guide = getGuides().find(g => g.id === id);
  if (!guide) return;
  getElement('guide-detail-title').textContent = guide.name;
  getElement('guide-name').textContent = guide.name;
  getElement('guide-category-label').textContent = { bio: '🧬 Биология', ru: '✍️ Русский язык', phys: '⚗️ Химия / Физика' }[guide.category] || '📖 Пособие';
  getElement('guide-desc').textContent = guide.desc || '';
  getElement('guide-delete-btn').onclick = () => deleteGuide(id);
  getElement('guide-tags').innerHTML = (guide.tags || []).map((t, i) => `<span class="card-tag ${['', 'sage', 'peach', 'sky'][i % 4]}">${escapeHtml(t)}</span>`).join('');
  
  const chapters = guide.chapters || [];
  if (chapters.length) {
    getElement('guide-stats').style.display = '';
    getElement('stat-chapters').textContent = chapters.length;
    getElement('stat-tasks').textContent = chapters.reduce((s, c) => s + (c.tasks || 0), 0);
    getElement('guide-chapters-list').innerHTML = chapters.map((ch, i) => `<div class="chapter-item"><div class="chapter-num">${i+1}</div><div class="chapter-info"><div class="chapter-name">${escapeHtml(ch.title)}</div><div class="chapter-tasks">${ch.tasks ? ch.tasks + ' задач' : 'Теория'}</div></div><div class="chapter-arrow">›</div></div>`).join('');
  } else {
    getElement('guide-stats').style.display = 'none';
    getElement('guide-chapters-list').innerHTML = '';
  }
  
  const md = getElement('guide-markdown-content');
  const actions = getElement('guide-action-buttons');
  if (guide.content) {
    md.innerHTML = marked.parse(guide.content);
    md.style.display = 'block';
    actions.innerHTML = guide.url ? `<button class="btn btn-secondary" onclick="openGuideUrl()">🔗 Открыть оригинал</button>` : '';
  } else {
    md.style.display = 'none';
    actions.innerHTML = guide.url ? `<button class="btn btn-primary" onclick="openGuideUrl()">📖 Открыть пособие</button>` : '';
  }
  showScreen('guide-detail-screen');
}
window.openGuide = openGuide;

function openGuideUrl() {
  const guide = getGuides().find(g => g.id === currentGuideId);
  if (guide?.url) window.open(guide.url, '_blank');
  else showToast('URL пособия не указан');
}
window.openGuideUrl = openGuideUrl;

function deleteGuide(id) {
  if (!confirm('Удалить пособие?')) return;
  saveGuides(getGuides().filter(g => g.id !== id));
  showScreen('library-screen');
  renderLibrary();
  showToast('Пособие удалено');
}

// Модальные окна импорта
function openAddModal(type) {
  currentAddType = type;
  ghTabLoaded = false;
  getElement('modal-title').textContent = type === 'guide' ? 'Добавить пособие' : 'Добавить колоду';
  getElement('modal-sub').textContent = type === 'guide' ? 'Загрузи JSON с описанием пособия' : 'Загрузи JSON с карточками или паронимами';
  getElement('add-modal').classList.add('open');
  document.querySelectorAll('.modal-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
  getElement('add-tab-file').style.display = '';
  getElement('add-tab-github').style.display = 'none';
  const loading = getElement('gh-loading');
  if (loading) loading.style.display = '';
  const list = getElement('gh-list');
  if (list) list.innerHTML = '';
  const error = getElement('gh-error');
  if (error) error.style.display = 'none';
}
window.openAddModal = openAddModal;

function closeAddModal(e) {
  if (!e || e.target === getElement('add-modal')) getElement('add-modal')?.classList.remove('open');
}
window.closeAddModal = closeAddModal;

function switchAddTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  getElement('add-tab-file').style.display = tab === 'file' ? '' : 'none';
  getElement('add-tab-github').style.display = tab === 'github' ? '' : 'none';
  if (tab === 'github' && !ghTabLoaded) { ghTabLoaded = true; loadGithubList(); }
}
window.switchAddTab = switchAddTab;

function triggerFileAdd() {
  closeAddModal();
  getElement('file-input')?.click();
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
      const guides = getGuides();
      const existing = guides.findIndex(g => g.name === data.name);
      if (existing >= 0) guides[existing] = data;
      else guides.push({ ...data, id: Date.now() });
      saveGuides(guides);
      renderLibrary();
    } else {
      if (!data.name || !Array.isArray(data.cards)) throw new Error('bad format');
      const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
      const deck = {
        name: data.name, icon: data.icon || '📚', type: data.type || 'flashcard',
        color: data.color || colors[Math.floor(Math.random() * colors.length)],
        cards: data.cards, createdAt: Date.now()
      };
      await dbPut('decks', deck);
      renderDecks();
    }
    closeAddModal();
    showToast(`✓ ${data.name} добавлено`);
  } catch (e) {
    showToast('Ошибка: неверный формат файла');
  }
}
window.handleFileAdd = handleFileAdd;

async function loadGithubList() {
  const loading = getElement('gh-loading');
  const errEl = getElement('gh-error');
  const list = getElement('gh-list');
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
          ? getGuides().find(g => g.sourceFile === f.name)
          : (await dbGetAll('decks')).find(d => d.sourceFile === f.name);
        const el = document.createElement('div');
        el.className = 'gh-item' + (existing ? ' loaded' : '');
        el.innerHTML = `<div class="gh-item-icon">${existing ? '✓' : '📄'}</div><div class="gh-item-info"><div class="gh-item-name">${escapeHtml(f.data.name || f.name)}</div><div class="gh-item-sub">${(f.size/1024).toFixed(1)} КБ</div></div><div class="gh-item-btn">${existing ? 'Добавлено' : 'Добавить'}</div>`;
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
    const guides = getGuides();
    const existing = guides.findIndex(g => g.name === data.name);
    if (existing >= 0) guides[existing] = { ...data, sourceFile: filename };
    else guides.push({ ...data, id: Date.now(), sourceFile: filename });
    saveGuides(guides);
    renderLibrary();
  } else {
    const deck = { ...data, sourceFile: filename, createdAt: Date.now() };
    await dbPut('decks', deck);
    renderDecks();
  }
  closeAddModal();
  showToast(`✓ ${data.name || filename} добавлено`);
}
window.importFromGithub = importFromGithub;

function openSampleModal() {
  closeAddModal();
  const title = getElement('sample-title');
  const sub = getElement('sample-sub');
  const pre = getElement('sample-pre');
  if (currentAddType === 'guide') {
    if (title) title.textContent = 'Формат guide.json';
    if (sub) sub.textContent = 'Добавь файл с таким форматом в свой GitHub репозиторий:';
    if (pre) pre.textContent = `{
  "name": "Название пособия",
  "type": "guide",
  "category": "bio",
  "icon": "🧬",
  "color": "lavender",
  "desc": "Краткое описание",
  "tags": ["ЕГЭ 2026", "Задание 27"],
  "chapters": [
    { "title": "Глава 1", "tasks": 14 }
  ],
  "url": "https://ссылка-на-файл.pdf"
}`;
  } else {
    if (title) title.textContent = 'Формат колоды';
    if (sub) sub.textContent = 'Для flashcard (обычные карточки) или match (паронимы):';
    if (pre) pre.textContent = `// Флеш-карточки
{
  "name": "Ударения ЕГЭ",
  "type": "flashcard",
  "icon": "🗣️",
  "cards": [{"q": "вручит", "a": "вручИт"}]
}

// Паронимы (match)
{
  "name": "Паронимы ЕГЭ",
  "type": "match",
  "cards": [
    {
      "pairs": [
        {"word": "Абонемент", "example": "...", "hint": "..."},
        {"word": "Абонент", "example": "...", "hint": "..."}
      ]
    }
  ]
}`;
  }
  getElement('sample-modal')?.classList.add('open');
}
window.openSampleModal = openSampleModal;

function closeSampleModal(e) {
  if (!e || e.target === getElement('sample-modal')) getElement('sample-modal')?.classList.remove('open');
}
window.closeSampleModal = closeSampleModal;
