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

const CAT_NAMES = { bio: '🧬 Биология', ru: '✍️ Русский язык', phys: '⚗️ Химия / Физика' };

function openGuide(id) {
  currentGuideId = id;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === id);
  if (!guide) return;

  // Breadcrumb
  const catName = CAT_NAMES[guide.category] || '📖 Пособие';
  const bcCat = document.getElementById('breadcrumb-category');
  if (bcCat) bcCat.textContent = catName;
  const bcTitle = document.getElementById('breadcrumb-title');
  if (bcTitle) bcTitle.textContent = guide.name;

  // Hero section
  const heroIcon = document.getElementById('guide-hero-icon');
  if (heroIcon) heroIcon.textContent = guide.icon || '📖';
  const nameEl = document.getElementById('guide-name');
  if (nameEl) nameEl.textContent = guide.name;
  const catLabel = document.getElementById('guide-category-label');
  if (catLabel) catLabel.textContent = catName;
  const descEl = document.getElementById('guide-desc');
  if (descEl) descEl.textContent = guide.desc || '';
  const tagsEl = document.getElementById('guide-tags');
  if (tagsEl) tagsEl.innerHTML = (guide.tags || []).map((t,i) => `<span class="card-tag ${['','sage','peach','sky'][i%4]}">${window.escapeHtml(t)}</span>`).join('');

  const deleteBtn = document.getElementById('guide-delete-btn');
  if (deleteBtn) deleteBtn.onclick = () => deleteGuide(id);

  // Chapters
  const chapters = guide.chapters || [];
  const statsEl = document.getElementById('guide-stats');
  const chapEl = document.getElementById('guide-chapters-list');
  if (chapters.length) {
    if (statsEl) statsEl.style.display = 'grid';
    const chaptersCount = document.getElementById('stat-chapters');
    if (chaptersCount) chaptersCount.textContent = chapters.length;
    const tasksCount = document.getElementById('stat-tasks');
    if (tasksCount) tasksCount.textContent = chapters.reduce((s,c) => s + (c.tasks || 0), 0);
    if (chapEl) {
      chapEl.innerHTML = `<div class="guide-sections-title">Содержание</div>` +
        chapters.map((ch,i) => `
          <div class="guide-chapter-card" style="margin: 0 24px 10px">
            <div class="guide-chapter-num">${i+1}</div>
            <div class="guide-chapter-info">
              <div class="guide-chapter-name">${window.escapeHtml(ch.title)}</div>
              <div class="guide-chapter-tasks">${ch.tasks ? ch.tasks + ' задач' : 'Теория'}</div>
            </div>
          </div>`).join('');
    }
  } else {
    if (statsEl) statsEl.style.display = 'none';
    if (chapEl) chapEl.innerHTML = '';
  }

  // Markdown content
  const mdContainer = document.getElementById('guide-markdown-content');
  if (mdContainer) {
    if (guide.content) {
      mdContainer.innerHTML = window.safeMarkdown(guide.content);
      mdContainer.style.display = '';
    } else {
      mdContainer.innerHTML = '';
      mdContainer.style.display = 'none';
    }
  }

  // Action buttons
  const actionsDiv = document.getElementById('guide-action-buttons');
  if (actionsDiv) {
    const btns = [];
    if (guide.pdf) btns.push(`<button class="btn btn-primary" onclick="openPdfViewer('${window.escapeHtml(guide.pdf)}', '${window.escapeHtml(guide.name)}')">📄 Открыть PDF</button>`);
    if (guide.url && !guide.pdf) btns.push(`<button class="btn btn-secondary" onclick="openGuideUrl()">🔗 Открыть оригинал</button>`);
    else if (guide.url) btns.push(`<button class="btn btn-secondary" onclick="openGuideUrl()">🔗 Оригинал</button>`);
    actionsDiv.innerHTML = btns.join('');
  }

  // Reset progress bar and scroll
  const fill = document.getElementById('reading-progress-fill');
  if (fill) fill.style.width = '0%';
  const content = document.getElementById('guide-reader-content');
  if (content) content.scrollTop = 0;

  window.showScreen('guide-detail-screen');

  // Build TOC after render
  requestAnimationFrame(() => buildTOC());
}
window.openGuide = openGuide;

function updateReadingProgress() {
  const el = document.getElementById('guide-reader-content');
  const fill = document.getElementById('reading-progress-fill');
  if (!el || !fill) return;
  const scrollable = el.scrollHeight - el.clientHeight;
  if (scrollable <= 0) return;
  fill.style.width = Math.min(100, el.scrollTop / scrollable * 100) + '%';
}
window.updateReadingProgress = updateReadingProgress;

function buildTOC() {
  const content = document.getElementById('guide-markdown-content');
  const list = document.getElementById('toc-list');
  const tocBtn = document.getElementById('toc-toggle-btn');
  if (!content || !list) return;
  const headings = content.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    if (tocBtn) tocBtn.style.display = 'none';
    return;
  }
  if (tocBtn) tocBtn.style.display = 'flex';
  list.innerHTML = '';
  headings.forEach((h, i) => {
    h.id = 'h-' + i;
    const btn = document.createElement('button');
    btn.className = 'toc-item' + (h.tagName === 'H3' ? ' toc-item-sub' : '');
    btn.textContent = h.textContent;
    btn.onclick = () => {
      const reader = document.getElementById('guide-reader-content');
      if (reader) reader.scrollTo({ top: h.offsetTop - 60, behavior: 'smooth' });
      closeTOC();
    };
    list.appendChild(btn);
  });
}
window.buildTOC = buildTOC;

function toggleTOC() {
  const overlay = document.getElementById('toc-overlay');
  const btn = document.getElementById('toc-toggle-btn');
  if (!overlay) return;
  const isOpen = overlay.classList.toggle('open');
  if (btn) btn.classList.toggle('toc-active', isOpen);
}
window.toggleTOC = toggleTOC;

function closeTOC() {
  const overlay = document.getElementById('toc-overlay');
  const btn = document.getElementById('toc-toggle-btn');
  if (overlay) overlay.classList.remove('open');
  if (btn) btn.classList.remove('toc-active');
}
window.closeTOC = closeTOC;

function openPdfViewer(url, title) {
  const overlay = document.getElementById('pdf-viewer-overlay');
  const frame = document.getElementById('pdf-viewer-frame');
  const titleEl = document.getElementById('pdf-viewer-title');
  if (!overlay || !frame) return;
  if (titleEl) titleEl.textContent = title || 'PDF';
  // Use Google Docs viewer for remote PDFs, direct for blob/data URLs
  const src = url.startsWith('blob:') || url.startsWith('data:') ? url
    : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  frame.src = src;
  overlay.classList.add('open');
}
window.openPdfViewer = openPdfViewer;

function closePdfViewer() {
  const overlay = document.getElementById('pdf-viewer-overlay');
  const frame = document.getElementById('pdf-viewer-frame');
  if (overlay) overlay.classList.remove('open');
  if (frame) frame.src = '';
}
window.closePdfViewer = closePdfViewer;

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
  if (modalSub) modalSub.textContent = type === 'guide' ? 'Загрузи JSON или PDF-файл' : 'Загрузи JSON с карточками или паронимами';
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
  // Show PDF button only for guides
  const pdfBtn = document.getElementById('btn-upload-pdf');
  if (pdfBtn) pdfBtn.style.display = type === 'guide' ? 'flex' : 'none';
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

function triggerPdfAdd() {
  closeAddModal();
  const pdfInput = document.getElementById('pdf-input');
  if (pdfInput) pdfInput.click();
}
window.triggerPdfAdd = triggerPdfAdd;

async function handlePdfAdd(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  try {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      const name = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      const guide = {
        id: Date.now(),
        name,
        category: 'bio',
        type: 'guide',
        icon: '📄',
        desc: 'PDF-документ',
        tags: [],
        pdf: dataUrl,
        sourceFile: null
      };
      const guides = window.getGuides ? window.getGuides() : [];
      guides.push(guide);
      window.saveGuides(guides);
      renderLibrary();
      window.showToast(`✓ ${name} добавлено`);
    };
    reader.readAsDataURL(file);
  } catch (e) {
    window.showToast('⚠️ Ошибка при загрузке PDF');
  }
}
window.handlePdfAdd = handlePdfAdd;

async function handleFileAdd(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (currentAddType === 'guide') {
      if (!data.name || !data.category) throw new Error('bad format');
      const filename = data.name.toLowerCase().replace(/[^а-яёa-z0-9]+/gi, '_') + '.json';
      const sourceFile = 'guides/' + filename;
      const guides = window.getGuides ? window.getGuides() : [];
      const existing = guides.findIndex(g => g.name === data.name);
      if (existing >= 0) guides[existing] = { ...data, sourceFile };
      else guides.push({ ...data, id: Date.now(), sourceFile });
      window.saveGuides(guides);
      renderLibrary();
      const pushed = await pushGuideToGithub(filename, data);
      closeAddModal();
      window.showToast(pushed ? `✓ ${data.name} добавлено и сохранено в GitHub` : `✓ ${data.name} добавлено`);
      return;
    } else {
      if (!data.name || !Array.isArray(data.cards)) throw new Error('bad format');
      const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
      const filename = data.name.toLowerCase().replace(/[^а-яёa-z0-9]+/gi, '_') + '.json';
      const deck = {
        name: data.name, icon: data.icon || '📚', type: data.type || 'flashcard',
        color: data.color || colors[Math.floor(Math.random() * colors.length)],
        cards: data.cards, sourceFile: 'decks/' + filename, createdAt: Date.now()
      };
      if (window.invalidateDecksCache) window.invalidateDecksCache();
      await window.dbPut('decks', deck);
      if (window.renderDecks) window.renderDecks();
      const pushed = await pushDeckToGithub(filename, data);
      closeAddModal();
      window.showToast(pushed ? `✓ ${data.name} добавлено и сохранено в GitHub` : `✓ ${data.name} добавлено`);
      return;
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
    const folderPath = currentAddType === 'deck' ? 'decks/' : 'guides/';
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${folderPath}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) throw new Error(res.status);
    const files = await res.json();
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.name !== 'manifest.json' && f.type === 'file');
    if (loading) loading.style.display = 'none';
    const filtered = [];
    for (const f of jsonFiles) {
      try {
        const subPath = currentAddType === 'deck' ? 'decks/' : 'guides/';
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${subPath}${f.name}`;
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
          ? (window.getGuides ? window.getGuides().find(g => g.sourceFile === 'guides/' + f.name || g.sourceFile === f.name) : null)
          : (await window.dbGetAll('decks')).find(d => d.sourceFile === 'decks/' + f.name || d.sourceFile === f.name);
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
    const sourceFile = 'guides/' + filename;
    const guides = window.getGuides ? window.getGuides() : [];
    const existing = guides.findIndex(g => g.name === data.name);
    if (existing >= 0) guides[existing] = { ...data, sourceFile };
    else guides.push({ ...data, id: Date.now(), sourceFile });
    window.saveGuides(guides);
    renderLibrary();
  } else {
    const sourceFile = 'decks/' + filename;
    const deck = { ...data, sourceFile, createdAt: Date.now() };
    if (window.invalidateDecksCache) window.invalidateDecksCache();
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

// ==================== АВТОЗАГРУЗКА ПОСОБИЙ ИЗ GITHUB ====================
async function autoLoadGithubGuides() {
  const user = localStorage.getItem('gh_user') || 'fritiser-cloud';
  const repo = localStorage.getItem('gh_repo') || 'flashcards';
  if (!user || !repo) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/guides/`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return;
    const files = await res.json();
    if (!Array.isArray(files)) return;
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.type === 'file');
    const existingGuides = window.getGuides ? window.getGuides() : [];
    let added = 0;
    for (const f of jsonFiles) {
      const sourceFile = 'guides/' + f.name;
      if (existingGuides.find(g => g.sourceFile === sourceFile || g.sourceFile === f.name)) continue;
      try {
        const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/main/guides/${f.name}`;
        const resp = await fetch(rawUrl);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!data.name || !data.category) continue;
        const guides = window.getGuides ? window.getGuides() : [];
        guides.push({ ...data, id: Date.now() + added, sourceFile });
        window.saveGuides(guides);
        added++;
      } catch (e) { /* skip bad files */ }
    }
    if (added > 0) {
      if (window.renderLibrary) window.renderLibrary();
      window.showToast(`📥 Загружено ${added} ${added === 1 ? 'пособие' : 'пособий'} из GitHub`);
    }
  } catch (e) { /* network unavailable, skip silently */ }
}
window.autoLoadGithubGuides = autoLoadGithubGuides;

async function pushGuideToGithub(filename, data) {
  const user = localStorage.getItem('gh_user') || 'fritiser-cloud';
  const repo = localStorage.getItem('gh_repo') || 'flashcards';
  const token = localStorage.getItem('gh_token');
  if (!token) return false;
  const path = `guides/${filename}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  let sha;
  try {
    const check = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (check.ok) { const existing = await check.json(); sha = existing.sha; }
  } catch (e) {}
  const body = { message: `Add guide: ${data.name}`, content };
  if (sha) body.sha = sha;
  try {
    const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (e) { return false; }
}
window.pushGuideToGithub = pushGuideToGithub;

// ==================== АВТОЗАГРУЗКА КОЛОД ИЗ GITHUB ====================
async function autoLoadGithubDecks() {
  const user = localStorage.getItem('gh_user') || 'fritiser-cloud';
  const repo = localStorage.getItem('gh_repo') || 'flashcards';
  if (!user || !repo) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/decks/`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return;
    const files = await res.json();
    if (!Array.isArray(files)) return;
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.type === 'file');
    const existingDecks = await window.dbGetAll('decks');
    let added = 0;
    for (const f of jsonFiles) {
      const sourceFile = 'decks/' + f.name;
      if (existingDecks.find(d => d.sourceFile === sourceFile || d.sourceFile === f.name)) continue;
      try {
        const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/main/decks/${f.name}`;
        const resp = await fetch(rawUrl);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!data.name || !Array.isArray(data.cards)) continue;
        const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
        const deck = {
          name: data.name, icon: data.icon || '📚',
          type: data.type || 'flashcard',
          color: data.color || colors[Math.floor(Math.random() * colors.length)],
          cards: data.cards, sourceFile, createdAt: Date.now()
        };
        if (window.invalidateDecksCache) window.invalidateDecksCache();
        await window.dbPut('decks', deck);
        added++;
      } catch (e) { /* skip bad files */ }
    }
    if (added > 0) {
      if (window.renderDecks) await window.renderDecks();
      window.showToast(`📥 Загружено ${added} ${added === 1 ? 'колода' : 'колод'} из GitHub`);
    }
  } catch (e) { /* network unavailable, skip silently */ }
}
window.autoLoadGithubDecks = autoLoadGithubDecks;

// ==================== ЗАГРУЗКА ФАЙЛА В GITHUB ====================
async function pushDeckToGithub(filename, data) {
  const user = localStorage.getItem('gh_user') || 'fritiser-cloud';
  const repo = localStorage.getItem('gh_repo') || 'flashcards';
  const token = localStorage.getItem('gh_token');
  if (!token) return false;
  const path = `decks/${filename}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  let sha;
  try {
    const check = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (check.ok) { const existing = await check.json(); sha = existing.sha; }
  } catch (e) {}
  const body = { message: `Add deck: ${data.name}`, content };
  if (sha) body.sha = sha;
  try {
    const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (e) { return false; }
}
window.pushDeckToGithub = pushDeckToGithub;
