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
    if (guide.url) btns.push(`<button class="btn btn-secondary" onclick="openGuideUrl()">🔗 Открыть оригинал</button>`);
    actionsDiv.innerHTML = btns.join('');
  }

  // Reset progress bar and scroll
  const fill = document.getElementById('reading-progress-fill');
  if (fill) fill.style.width = '0%';
  const content = document.getElementById('guide-reader-content');
  if (content) content.scrollTop = 0;

  // PDF vs Markdown view
  const readerContent = document.getElementById('guide-reader-content');
  const pdfContent = document.getElementById('guide-pdf-content');
  const tocBtn = document.getElementById('toc-toggle-btn');
  if (guide.type === 'pdf') {
    if (readerContent) readerContent.style.display = 'none';
    if (pdfContent) pdfContent.classList.add('visible');
    if (tocBtn) tocBtn.style.display = 'none';
    loadPdfInViewer(guide.pdfUrl);
  } else {
    if (readerContent) readerContent.style.display = '';
    if (pdfContent) pdfContent.classList.remove('visible');
    const iframe = document.getElementById('guide-pdf-iframe');
    if (iframe) iframe.src = '';
  }

  window.showScreen('guide-detail-screen');

  // Build TOC after render
  if (guide.type !== 'pdf') requestAnimationFrame(() => buildTOC());
}
window.openGuide = openGuide;

async function loadPdfInViewer(pdfUrl) {
  const iframe = document.getElementById('guide-pdf-iframe');
  if (!iframe) return;
  iframe.src = '';
  try {
    const dlUrl = await window.getYadiskDownloadUrl(pdfUrl);
    const res = await fetch(dlUrl);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    iframe.src = objectUrl;
  } catch {
    window.showToast('⚠️ Не удалось загрузить PDF');
  }
}
window.loadPdfInViewer = loadPdfInViewer;

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


function openGuideUrl() {
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === currentGuideId);
  if (guide?.url) window.open(guide.url, '_blank');
  else window.showToast('URL пособия не указан');
}
window.openGuideUrl = openGuideUrl;

function deleteGuide(id) {
  if (!confirm('Удалить пособие?')) return;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === id);
  if (guide) { guide.deleted = true; guide.updatedAt = Date.now(); }
  window.saveGuides(guides);
  window.showScreen('library-screen');
  renderLibrary();
  window.showToast('Пособие удалено');
}

// ==================== PDF ====================
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
  const token = window.getYadiskToken ? window.getYadiskToken() : '';
  if (!token) {
    window.showToast('⚠️ Нужен токен Яндекс Диска для загрузки PDF');
    return;
  }
  window.showToast('⏳ Загружаю PDF на Яндекс Диск…');
  try {
    const pdfUrl = await window.uploadFileToYadisk(file, file.name, 'pdfs');
    if (!pdfUrl) throw new Error('no url');
    const name = file.name.replace(/\.pdf$/i, '');
    const guides = window.getGuides ? window.getGuides() : [];
    const existing = guides.findIndex(g => g.name === name && g.type === 'pdf');
    const entry = { name, type: 'pdf', category: 'bio', icon: '📄', pdfUrl, sourceFile: pdfUrl, id: Date.now() };
    if (existing >= 0) guides[existing] = { ...guides[existing], ...entry };
    else guides.push(entry);
    window.saveGuides(guides);
    renderLibrary();
    window.showToast(`✓ ${name} добавлен`);
  } catch {
    window.showToast('⚠️ Ошибка загрузки PDF');
  }
}
window.handlePdfAdd = handlePdfAdd;

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
  document.getElementById('add-tab-file').style.display    = tab === 'file'    ? '' : 'none';
  document.getElementById('add-tab-github').style.display  = tab === 'github'  ? '' : 'none';
  document.getElementById('add-tab-yadisk').style.display  = tab === 'yadisk'  ? '' : 'none';
  if (tab === 'github' && !ghTabLoaded) { ghTabLoaded = true; loadGithubList(); }
  if (tab === 'yadisk') loadYadiskList();
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
      const filename = data.name.toLowerCase().replace(/[^а-яёa-z0-9]+/gi, '_') + '.json';
      const guides = window.getGuides ? window.getGuides() : [];
      const existing = guides.findIndex(g => g.name === data.name);
      let sourceFile = 'guides/' + filename;
      // Попробовать сохранить на Яндекс Диск
      const yadiskUrl = await pushJsonToYadisk(filename, data, 'guides');
      if (yadiskUrl) sourceFile = yadiskUrl;
      if (existing >= 0) guides[existing] = { ...data, id: guides[existing].id, sourceFile };
      else guides.push({ ...data, id: Date.now(), sourceFile });
      window.saveGuides(guides);
      renderLibrary();
      closeAddModal();
      window.showToast(yadiskUrl ? `✓ ${data.name} сохранено на Яндекс Диск` : `✓ ${data.name} добавлено`);
      return;
    } else {
      if (!data.name || !Array.isArray(data.cards)) throw new Error('bad format');
      const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
      const filename = data.name.toLowerCase().replace(/[^а-яёa-z0-9]+/gi, '_') + '.json';
      // Попробовать сохранить на Яндекс Диск
      const yadiskUrl = await pushJsonToYadisk(filename, data, 'decks');
      const sourceFile = yadiskUrl || ('decks/' + filename);
      const deck = {
        name: data.name, icon: data.icon || '📚', type: data.type || 'flashcard',
        color: data.color || colors[Math.floor(Math.random() * colors.length)],
        cards: data.cards, sourceFile, createdAt: Date.now()
      };
      if (window.invalidateDecksCache) window.invalidateDecksCache();
      await window.dbPut('decks', deck);
      if (window.autoSaveToCloud) window.autoSaveToCloud();
      if (window.renderDecks) window.renderDecks();
      closeAddModal();
      window.showToast(yadiskUrl ? `✓ ${data.name} сохранено на Яндекс Диск` : `✓ ${data.name} добавлено`);
      return;
    }
    closeAddModal();
    window.showToast(`✓ ${data.name} добавлено`);
  } catch (e) {
    window.showToast('⚠️ Ошибка: неверный формат файла');
  }
}
window.handleFileAdd = handleFileAdd;

// Загрузить JSON на Яндекс Диск, вернуть public_url или null
async function pushJsonToYadisk(filename, data, folder) {
  if (!window.uploadFileToYadisk || !window.getYadiskToken()) return null;
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    return await window.uploadFileToYadisk(blob, filename, folder);
  } catch {
    return null;
  }
}

// Загрузить список файлов с Яндекс Диска для выбранного типа
async function loadYadiskList() {
  const list = document.getElementById('yadisk-list');
  const loading = document.getElementById('yadisk-loading');
  const errEl = document.getElementById('yadisk-error');
  if (!list) return;
  if (loading) loading.style.display = '';
  if (errEl) errEl.style.display = 'none';
  list.innerHTML = '';

  const folder = currentAddType === 'deck' ? 'decks' : 'guides';
  const [items, pdfItems] = await Promise.all([
    window.listYadiskFolder ? window.listYadiskFolder(folder) : [],
    currentAddType === 'guide' && window.listYadiskFolder ? window.listYadiskFolder('pdfs') : []
  ]);

  if (loading) loading.style.display = 'none';

  const jsonItems = items.filter(i => i.name.endsWith('.json') && i.type === 'file');
  const pdfFiles = pdfItems.filter(i => i.name.toLowerCase().endsWith('.pdf') && i.type === 'file');

  if (jsonItems.length === 0 && pdfFiles.length === 0) {
    list.innerHTML = '<div class="gh-loading">Нет файлов на Яндекс Диске</div>';
    return;
  }

  // JSON guides/decks
  for (const item of jsonItems) {
    try {
      const dlUrl = await window.getYadiskDownloadUrl(item.public_url || item.path);
      const resp = await fetch(dlUrl);
      const data = await resp.json();
      const existing = currentAddType === 'guide'
        ? (window.getGuides ? window.getGuides() : []).find(g => g.name === data.name)
        : (await window.dbGetAll('decks')).find(d => d.name === data.name);
      const el = document.createElement('div');
      el.className = 'gh-item' + (existing ? ' loaded' : '');
      el.innerHTML = `
        <div class="gh-item-icon">${existing ? '✓' : '📄'}</div>
        <div class="gh-item-info">
          <div class="gh-item-name">${window.escapeHtml(data.name || item.name)}</div>
          <div class="gh-item-sub">${(item.size / 1024).toFixed(1)} КБ</div>
        </div>
        <div class="gh-item-btn">${existing ? 'Добавлено' : 'Добавить'}</div>`;
      if (!existing) {
        el.onclick = () => importFromYadisk(data, item.public_url || item.path);
      }
      list.appendChild(el);
    } catch { /* пропустить плохой файл */ }
  }

  // PDF files (only for guides tab)
  for (const item of pdfFiles) {
    const name = item.name.replace(/\.pdf$/i, '');
    const publicUrl = item.public_url || item.path;
    const existing = (window.getGuides ? window.getGuides() : []).find(g => g.name === name && g.type === 'pdf');
    const el = document.createElement('div');
    el.className = 'gh-item' + (existing ? ' loaded' : '');
    el.innerHTML = `
      <div class="gh-item-icon">${existing ? '✓' : '📄'}</div>
      <div class="gh-item-info">
        <div class="gh-item-name">${window.escapeHtml(name)}</div>
        <div class="gh-item-sub">PDF · ${(item.size / 1024).toFixed(0)} КБ</div>
      </div>
      <div class="gh-item-btn">${existing ? 'Добавлено' : 'Добавить'}</div>`;
    if (!existing) {
      el.onclick = async () => {
        const dlUrl = await window.getYadiskDownloadUrl(publicUrl);
        const guides = window.getGuides ? window.getGuides() : [];
        guides.push({ id: Date.now(), name, type: 'pdf', category: 'bio', icon: '📄', pdfUrl: publicUrl, sourceFile: publicUrl });
        window.saveGuides(guides);
        renderLibrary();
        closeAddModal();
        window.showToast(`✓ ${name} добавлен`);
      };
    }
    list.appendChild(el);
  }
}
window.loadYadiskList = loadYadiskList;

async function importFromYadisk(data, publicUrl) {
  if (currentAddType === 'guide') {
    const guides = window.getGuides ? window.getGuides() : [];
    const existing = guides.findIndex(g => g.name === data.name);
    if (existing >= 0) guides[existing] = { ...data, sourceFile: publicUrl };
    else guides.push({ ...data, id: Date.now(), sourceFile: publicUrl });
    window.saveGuides(guides);
    renderLibrary();
  } else {
    const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
    const deck = {
      name: data.name, icon: data.icon || '📚', type: data.type || 'flashcard',
      color: data.color || colors[Math.floor(Math.random() * colors.length)],
      cards: data.cards, sourceFile: publicUrl, createdAt: Date.now()
    };
    if (window.invalidateDecksCache) window.invalidateDecksCache();
    await window.dbPut('decks', deck);
    if (window.autoSaveToCloud) window.autoSaveToCloud();
    if (window.renderDecks) window.renderDecks();
  }
  closeAddModal();
  window.showToast(`✓ ${data.name} добавлено`);
}
window.importFromYadisk = importFromYadisk;

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
    if (window.autoSaveToCloud) window.autoSaveToCloud();
    if (window.renderDecks) window.renderDecks();
  }
  closeAddModal();
  window.showToast(`✓ ${data.name || filename} добавлено`);
}
window.importFromGithub = importFromGithub;

const DECK_AI_PROMPT = `Создай набор флеш-карточек для подготовки к ЕГЭ по биологии на тему: "[ТЕМА]"

Верни результат строго в формате JSON (без лишнего текста до и после):

{
  "name": "Название колоды",
  "type": "flashcard",
  "icon": "🧬",
  "cards": [
    { "q": "Вопрос или термин", "a": "Чёткий, лаконичный ответ" },
    { "q": "Вопрос 2", "a": "Ответ 2" }
  ]
}

Требования:
- Минимум 30 карточек, лучше 50+
- Вопросы: термины, определения, процессы, отличия, примеры организмов
- Ответы: краткие (1–3 предложения), без воды
- Охвати все ключевые понятия темы, типичные для заданий ЕГЭ
- Не добавляй никакого текста вне JSON`;

const GUIDE_AI_PROMPT = `Создай подробный конспект для подготовки к ЕГЭ по биологии на тему: "[ТЕМА]"

Верни результат строго в формате JSON (без лишнего текста до и после):

{
  "name": "Название конспекта",
  "type": "guide",
  "category": "bio",
  "icon": "🧬",
  "color": "lavender",
  "desc": "Краткое описание (1–2 предложения)",
  "tags": ["ЕГЭ 2026", "Задание X", "ключевое слово"],
  "chapters": [
    { "title": "Название раздела", "tasks": 5 }
  ],
  "content": "# Заголовок\\n\\nТекст конспекта в формате Markdown.\\n\\n## Раздел 1\\n\\nСодержимое...\\n\\n## Раздел 2\\n\\nСодержимое..."
}

Требования к полю content:
- Используй Markdown: ## для разделов, ### для подразделов, **жирный** для терминов, - для списков
- Включи: определения, классификации, схемы в виде списков, типичные задания ЕГЭ и разбор ошибок
- Объём: не менее 1500 слов
- Все \\n внутри строки JSON должны быть экранированы как \\\\n
- Не добавляй никакого текста вне JSON`;

function openSampleModal() {
  closeAddModal();
  const title = document.getElementById('sample-title');
  const sub = document.getElementById('sample-sub');
  const pre = document.getElementById('sample-pre');
  const aiBlock = document.getElementById('sample-ai-block');
  const promptEl = document.getElementById('sample-prompt');

  if (currentAddType === 'guide') {
    if (title) title.textContent = 'Создать пособие через ИИ';
    if (sub) sub.textContent = 'Скопируй промт, замени [ТЕМА] и отправь в ChatGPT или Claude — получишь готовый JSON';
    if (aiBlock) aiBlock.style.display = 'block';
    if (promptEl) promptEl.textContent = GUIDE_AI_PROMPT;
    if (pre) pre.textContent = `{\n  "name": "Фотосинтез",\n  "type": "guide",\n  "category": "bio",\n  "icon": "🌿",\n  "color": "lavender",\n  "desc": "Световая и тёмновая фазы, задания ЕГЭ",\n  "tags": ["ЕГЭ 2026", "Задание 23"],\n  "chapters": [\n    { "title": "Световая фаза", "tasks": 8 },\n    { "title": "Тёмновая фаза", "tasks": 6 }\n  ],\n  "content": "## Введение\\n\\nФотосинтез — это..."\n}`;
  } else {
    if (title) title.textContent = 'Создать колоду через ИИ';
    if (sub) sub.textContent = 'Скопируй промт, замени [ТЕМА] и отправь в ChatGPT или Claude — получишь готовый JSON';
    if (aiBlock) aiBlock.style.display = 'block';
    if (promptEl) promptEl.textContent = DECK_AI_PROMPT;
    if (pre) pre.textContent = `// Флеш-карточки\n{\n  "name": "Митоз и мейоз",\n  "type": "flashcard",\n  "icon": "🔬",\n  "cards": [\n    {"q": "Что такое митоз?", "a": "Деление клетки, при котором образуются две дочерние клетки с тем же набором хромосом"},\n    {"q": "Сколько фаз у митоза?", "a": "4 фазы: профаза, метафаза, анафаза, телофаза"}\n  ]\n}`;
  }
  const sampleModal = document.getElementById('sample-modal');
  if (sampleModal) sampleModal.classList.add('open');
}
window.openSampleModal = openSampleModal;

function copySamplePrompt() {
  const promptEl = document.getElementById('sample-prompt');
  if (!promptEl) return;
  navigator.clipboard.writeText(promptEl.textContent).then(() => {
    const btn = document.getElementById('copy-prompt-btn');
    if (btn) { btn.textContent = '✓ Скопировано'; setTimeout(() => { btn.textContent = 'Скопировать'; }, 2000); }
  }).catch(() => window.showToast('⚠️ Не удалось скопировать'));
}
window.copySamplePrompt = copySamplePrompt;

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
      if (window.autoSaveToCloud) window.autoSaveToCloud();
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
