// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================
let currentCat = 'all';
let currentGuideId = null;
let currentAddType = 'guide';
let librarySearchQuery = '';

function searchLibrary() {
  const input = document.getElementById('library-search');
  if (input) librarySearchQuery = input.value.toLowerCase();
  renderLibrary();
}
window.searchLibrary = searchLibrary;

// ==================== ДИНАМИЧЕСКИЕ КАТЕГОРИИ ====================
function renderCategoryPills() {
  const row = document.getElementById('cats-row');
  if (!row) return;
  const cats = window.getCategories ? window.getCategories() : [];
  row.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'cat-pill' + (currentCat === 'all' ? ' active' : '');
  allBtn.textContent = 'Все';
  allBtn.onclick = () => filterCat('all', allBtn);
  row.appendChild(allBtn);

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (currentCat === cat.id ? ' active' : '');
    btn.textContent = (cat.icon ? cat.icon + ' ' : '') + cat.name;
    btn.onclick = () => filterCat(cat.id, btn);
    row.appendChild(btn);
  });

  // ⚙️ кнопка управления категориями
  const mgBtn = document.createElement('button');
  mgBtn.className = 'cat-pill';
  mgBtn.textContent = '⚙️';
  mgBtn.title = 'Управление категориями';
  mgBtn.onclick = openCatsModal;
  row.appendChild(mgBtn);
}
window.renderCategoryPills = renderCategoryPills;

function filterCat(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLibrary();
}
window.filterCat = filterCat;

// ==================== УПРАВЛЕНИЕ КАТЕГОРИЯМИ ====================
function openCatsModal() {
  renderCatsModalList();
  const modal = document.getElementById('cats-modal');
  if (modal) modal.classList.add('open');
}
window.openCatsModal = openCatsModal;

function closeCatsModal(e) {
  if (!e || e.target === document.getElementById('cats-modal')) {
    document.getElementById('cats-modal')?.classList.remove('open');
    document.getElementById('add-cat-form').style.display = 'none';
  }
}
window.closeCatsModal = closeCatsModal;

function renderCatsModalList() {
  const list = document.getElementById('cats-modal-list');
  if (!list) return;
  const cats = window.getCategories();
  if (cats.length === 0) { list.innerHTML = '<div style="color:var(--text3);font-size:14px;padding:8px 0">Нет категорий</div>'; return; }
  list.innerHTML = '';
  cats.forEach((cat, idx) => {
    const item = document.createElement('div');
    item.className = 'cat-manage-item';
    item.innerHTML = `
      <span class="cat-manage-icon">${cat.icon || '🏷️'}</span>
      <span class="cat-manage-name">${window.escapeHtml(cat.name)}</span>
      <button class="cat-manage-btn" onclick="editCatInline(${idx})" title="Переименовать">✏️</button>
      <button class="cat-manage-btn del" onclick="deleteCat('${cat.id}')" title="Удалить">🗑</button>`;
    list.appendChild(item);
  });
}

function openAddCatForm() {
  document.getElementById('add-cat-form').style.display = '';
  document.getElementById('new-cat-name').focus();
}
window.openAddCatForm = openAddCatForm;

function saveNewCat() {
  const icon = (document.getElementById('new-cat-icon').value || '🏷️').trim();
  const name = (document.getElementById('new-cat-name').value || '').trim();
  if (!name) { window.showToast('Введи название'); return; }
  const cats = window.getCategories();
  if (_editingCatIdx >= 0) {
    // Editing existing
    cats[_editingCatIdx] = { ...cats[_editingCatIdx], icon, name };
    _editingCatIdx = -1;
  } else {
    cats.push({ id: 'cat_' + Date.now(), name, icon });
  }
  window.saveCategories(cats);
  document.getElementById('new-cat-icon').value = '';
  document.getElementById('new-cat-name').value = '';
  const form = document.getElementById('add-cat-form');
  form.style.display = 'none';
  const saveBtn = form.querySelector('button');
  if (saveBtn) saveBtn.textContent = 'Добавить';
  renderCatsModalList();
  renderCategoryPills();
  window.showToast(`✓ Категория «${name}» сохранена`);
}
window.saveNewCat = saveNewCat;

function deleteCat(id) {
  const cats = window.getCategories().filter(c => c.id !== id);
  window.saveCategories(cats);
  if (currentCat === id) { currentCat = 'all'; }
  renderCatsModalList();
  renderCategoryPills();
}
window.deleteCat = deleteCat;

let _editingCatIdx = -1;

function editCatInline(idx) {
  const cats = window.getCategories();
  const cat = cats[idx];
  if (!cat) return;
  _editingCatIdx = idx;
  // Populate the add-cat-form with existing values for editing
  document.getElementById('new-cat-icon').value = cat.icon || '';
  document.getElementById('new-cat-name').value = cat.name;
  const form = document.getElementById('add-cat-form');
  form.style.display = '';
  // Change button text temporarily
  const saveBtn = form.querySelector('button');
  if (saveBtn) saveBtn.textContent = 'Сохранить изменения';
  document.getElementById('new-cat-name').focus();
}
window.editCatInline = editCatInline;

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

function getCatName(catId) {
  const cats = window.getCategories ? window.getCategories() : [];
  const cat = cats.find(c => c.id === catId);
  return cat ? (cat.icon ? cat.icon + ' ' + cat.name : cat.name) : (catId || '📖 Пособие');
}

function openGuide(id) {
  currentGuideId = id;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === id);
  if (!guide) return;

  // Breadcrumb
  const catName = getCatName(guide.category);
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
  window.showToast('✓ Пособие удалено');
}

// ==================== РЕДАКТИРОВАНИЕ МЕТАДАННЫХ ====================
let _metaEditTarget = null; // { type: 'guide'|'deck', id }
let _metaSelectedCat = '';

function openMetaEditModal(type) {
  _metaEditTarget = { type };
  let name, icon, category, tags, desc;

  if (type === 'guide') {
    const guides = window.getGuides ? window.getGuides() : [];
    const g = guides.find(g => g.id === currentGuideId);
    if (!g) return;
    _metaEditTarget.id = currentGuideId;
    name = g.name; icon = g.icon || '📖'; category = g.category || 'bio';
    tags = (g.tags || []).join(', '); desc = g.desc || '';
    document.getElementById('meta-edit-title').textContent = 'Редактировать пособие';
    document.getElementById('meta-desc-row').style.display = '';
  } else {
    // deck — id comes from currentDeckId (flashcards.js)
    _metaEditTarget.id = window.currentDeckId;
    const deck = window._getDeckForEdit ? window._getDeckForEdit() : null;
    if (!deck) return;
    name = deck.name; icon = deck.icon || '📚'; category = deck.category || '';
    tags = (deck.tags || []).join(', '); desc = '';
    document.getElementById('meta-edit-title').textContent = 'Редактировать колоду';
    document.getElementById('meta-desc-row').style.display = 'none';
  }

  document.getElementById('meta-name-input').value = name;
  document.getElementById('meta-icon-input').value = icon;
  document.getElementById('meta-icon-btn').textContent = icon;
  document.getElementById('meta-tags-input').value = tags;
  document.getElementById('meta-desc-input').value = desc;

  _metaSelectedCat = category;
  renderMetaCatPills('meta-cat-pills');
  document.getElementById('meta-edit-modal').classList.add('open');
}
window.openMetaEditModal = openMetaEditModal;

// containerId: DOM id; getSelected/setSelected: getter/setter functions
function renderMetaCatPills(containerId, getSelected, setSelected) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Default to _metaSelectedCat for backward compat
  if (!getSelected) { getSelected = () => _metaSelectedCat; setSelected = v => { _metaSelectedCat = v; }; }
  const cats = window.getCategories ? window.getCategories() : [];
  container.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'meta-cat-pill' + (cat.id === getSelected() ? ' selected' : '');
    btn.textContent = (cat.icon ? cat.icon + ' ' : '') + cat.name;
    btn.onclick = () => {
      setSelected(cat.id);
      container.querySelectorAll('.meta-cat-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    container.appendChild(btn);
  });
}

function focusIconInput() { document.getElementById('meta-icon-input').focus(); }
window.focusIconInput = focusIconInput;

function focusCgIconInput() { document.getElementById('cg-icon-input').focus(); }
window.focusCgIconInput = focusCgIconInput;

function closeMetaEditModal(e) {
  if (!e || e.target === document.getElementById('meta-edit-modal'))
    document.getElementById('meta-edit-modal')?.classList.remove('open');
}
window.closeMetaEditModal = closeMetaEditModal;

async function saveMetaEdit() {
  const name = document.getElementById('meta-name-input').value.trim();
  if (!name) { window.showToast('Введи название'); return; }
  const icon = document.getElementById('meta-icon-input').value.trim() || (
    _metaEditTarget.type === 'guide' ? '📖' : '📚');
  const tags = document.getElementById('meta-tags-input').value.split(',').map(t => t.trim()).filter(Boolean);
  const desc = document.getElementById('meta-desc-input').value.trim();

  if (_metaEditTarget.type === 'guide') {
    const guides = window.getGuides();
    const idx = guides.findIndex(g => g.id === _metaEditTarget.id);
    if (idx >= 0) {
      guides[idx] = { ...guides[idx], name, icon, category: _metaSelectedCat || guides[idx].category, tags, desc };
      window.saveGuides(guides);
      renderLibrary();
      openGuide(_metaEditTarget.id); // refresh guide detail
    }
  } else {
    // deck
    if (window.saveDeckMeta) await window.saveDeckMeta(_metaEditTarget.id, { name, icon, tags });
  }
  document.getElementById('meta-edit-modal')?.classList.remove('open');
  window.showToast('✓ Сохранено');
}
window.saveMetaEdit = saveMetaEdit;

// ==================== СОЗДАНИЕ ПОСОБИЯ В ПРИЛОЖЕНИИ ====================
let _cgSelectedCat = 'bio';

function openCreateGuideModal() {
  closeAddModal();
  _cgSelectedCat = 'bio';
  document.getElementById('cg-name-input').value = '';
  document.getElementById('cg-icon-input').value = '';
  document.getElementById('cg-icon-btn').textContent = '📖';
  document.getElementById('cg-tags-input').value = '';
  document.getElementById('cg-desc-input').value = '';
  document.getElementById('cg-content-input').value = '';
  renderMetaCatPills('cg-cat-pills', () => _cgSelectedCat, v => { _cgSelectedCat = v; });
  document.getElementById('create-guide-modal').classList.add('open');
}
window.openCreateGuideModal = openCreateGuideModal;


function closeCreateGuideModal(e) {
  if (!e || e.target === document.getElementById('create-guide-modal'))
    document.getElementById('create-guide-modal')?.classList.remove('open');
}
window.closeCreateGuideModal = closeCreateGuideModal;

function saveCreateGuide() {
  const name = document.getElementById('cg-name-input').value.trim();
  if (!name) { window.showToast('Введи название'); return; }
  const icon = document.getElementById('cg-icon-input').value.trim() || '📖';
  const tags = document.getElementById('cg-tags-input').value.split(',').map(t => t.trim()).filter(Boolean);
  const desc = document.getElementById('cg-desc-input').value.trim();
  const content = document.getElementById('cg-content-input').value;

  const guide = {
    id: Date.now(), name, icon, type: 'guide',
    category: _cgSelectedCat || 'bio', tags, desc, content,
    sourceFile: 'local', createdAt: Date.now()
  };
  const guides = window.getGuides();
  guides.push(guide);
  window.saveGuides(guides);
  renderLibrary();
  closeCreateGuideModal();
  window.showToast(`✓ «${name}» создан`);
}
window.saveCreateGuide = saveCreateGuide;

// ==================== МОДАЛЬНЫЕ ОКНА ИМПОРТА ====================
function openAddModal(type) {
  currentAddType = type;
  const isGuide = type === 'guide';

  document.getElementById('modal-title').textContent = isGuide ? 'Добавить пособие' : 'Добавить колоду';
  document.getElementById('modal-sub').textContent = isGuide
    ? 'Загрузи JSON или создай конспект'
    : 'Загрузи или вставь JSON с карточками';

  // Switch to file tab by default
  document.querySelectorAll('.modal-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.getElementById('add-tab-file').style.display = '';
  document.getElementById('add-tab-yadisk').style.display = 'none';
  // Reset paste area
  const pasteArea = document.getElementById('paste-json-area');
  if (pasteArea) pasteArea.style.display = 'none';
  const pasteInput = document.getElementById('paste-json-input');
  if (pasteInput) pasteInput.value = '';

  // Show/hide type-specific buttons
  document.getElementById('create-guide-btn').style.display  = isGuide ? '' : 'none';
  document.getElementById('paste-json-section').style.display = isGuide ? 'none' : '';

  // Update upload JSON label
  document.getElementById('btn-upload-json-label').textContent = isGuide ? 'Загрузить JSON' : 'Загрузить JSON';
  document.getElementById('btn-upload-json-sub').textContent = isGuide ? 'Файл с пособием' : 'Файл с карточками';

  document.getElementById('add-modal').classList.add('open');
}
window.openAddModal = openAddModal;

function closeAddModal(e) {
  if (!e || e.target === document.getElementById('add-modal')) {
    document.getElementById('add-modal')?.classList.remove('open');
  }
}
window.closeAddModal = closeAddModal;

function switchAddTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('add-tab-file').style.display   = tab === 'file'   ? '' : 'none';
  document.getElementById('add-tab-yadisk').style.display = tab === 'yadisk' ? '' : 'none';
  if (tab === 'yadisk') loadYadiskList();
}
window.switchAddTab = switchAddTab;

function togglePasteJson() {
  const area = document.getElementById('paste-json-area');
  if (!area) return;
  area.style.display = area.style.display === 'none' ? '' : 'none';
  if (area.style.display !== 'none') document.getElementById('paste-json-input').focus();
}
window.togglePasteJson = togglePasteJson;

async function importPastedJson() {
  const input = document.getElementById('paste-json-input');
  const text = input?.value.trim();
  if (!text) { window.showToast('Вставь JSON'); return; }
  try {
    const data = JSON.parse(text);
    if (!data.name || !Array.isArray(data.cards)) throw new Error('bad format');
    const colors = ['#E8F4EE', '#FDF0E8', '#FEF9E7', '#EEF0FD', '#FDE8F0'];
    const filename = data.name.toLowerCase().replace(/[^а-яёa-z0-9]+/gi, '_') + '.json';
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
    window.showToast(`✓ «${data.name}» импортировано (${data.cards.length} карточек)`);
  } catch {
    window.showToast('⚠️ Неверный формат JSON. Проверь структуру.');
  }
}
window.importPastedJson = importPastedJson;

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
  const items = await (window.listYadiskFolder ? window.listYadiskFolder(folder) : Promise.resolve([]));

  if (loading) loading.style.display = 'none';

  const jsonItems = items.filter(i => i.name.endsWith('.json') && i.type === 'file');

  if (jsonItems.length === 0) {
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
