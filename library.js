// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================

// ---- Emoji picker init ----
(function initEmojiPicker() {
  const EMOJIS = [
    '📚','📖','📝','✏️','📓','📒','📔','📕','📗','📘','📙','🗒️','📄','📃','📑','🗺️',
    '🧬','🔬','🧪','⚗️','🧫','🔭','🌡️','💊','🫀','🫁','🧠','🦠','🧲','⚡','☢️','☣️',
    '🌱','🌿','🍀','🌲','🌳','🌴','🌾','🍃','🌸','🌺','🌻','🍄','🌰','🌊','🔥','❄️','🌪️',
    '🐝','🦋','🐛','🐞','🐜','🦗','🦎','🐍','🦕','🐠','🐟','🐬','🦈','🐋','🦁','🐘','🦒','🦓',
    '🏆','🎯','💡','✨','🌟','💫','⭐','🎓','📊','📈','🔑','💎','🔮','🪄','🎨','🎵',
    '💧','🧊','🌋','⛰️','🏔️','🌍','🌐','🗃️','🔎','📡','🛰️','🚀','⚙️','🔧','🔩',
    '📐','📏','🔢','🧮','♾️','➕','➖','✖️','➗','🔷','🔶','🔴','🟢','🟡','🟣','⚫','⚪',
  ];
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('emoji-picker-grid');
    if (!grid) return;
    grid.innerHTML = EMOJIS.map(e =>
      `<button type="button" style="font-size:22px;background:none;border:none;cursor:pointer;padding:3px 4px;border-radius:8px;line-height:1.2" onmousedown="event.preventDefault();document.getElementById('meta-icon-input').value='${e}';document.getElementById('meta-icon-btn').textContent='${e}'">${e}</button>`
    ).join('');
  });
})();

let currentCat = 'all';
let currentGuideId = null;
let currentAddType = 'guide';
let librarySearchQuery = '';
window._getCurrentCat = () => currentCat;
window._getLibrarySearchQuery = () => librarySearchQuery;

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
    btn.textContent = cat.name;
    btn.onclick = () => filterCat(cat.id, btn);
    row.appendChild(btn);
  });

  // ⚙️ кнопка управления категориями
  const mgBtn = document.createElement('button');
  mgBtn.className = 'cat-pill';
  mgBtn.textContent = '···';
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
  
  let filtered = guides.filter(g => !g.deleted);
  if (currentCat !== 'all') filtered = filtered.filter(g => g.category === currentCat);
  if (librarySearchQuery) {
    filtered = filtered.filter(g => 
      (g.name && g.name.toLowerCase().includes(librarySearchQuery)) || 
      (g.desc && g.desc.toLowerCase().includes(librarySearchQuery)) ||
      (g.tags && g.tags.some(tag => tag.toLowerCase().includes(librarySearchQuery)))
    );
  }
  
  list.querySelectorAll('.guide-card').forEach(c => c.remove());

  const emptyState = document.getElementById('library-empty-state');
  if (emptyState) {
    emptyState.style.display = filtered.length === 0 ? '' : 'none';
    if (filtered.length === 0) {
      emptyState.innerHTML = `<div class="empty-icon"><i data-lucide="library-big" style="width:40px;height:40px;stroke:var(--lavender-deep);stroke-width:1.5;fill:none"></i></div><div class="empty-text">${guides.length === 0 ? 'Библиотека пуста.<br>Нажми + чтобы добавить' : 'Нет материалов в этой категории'}</div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  if (filtered.length === 0) return;

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
  window._currentGuideId = id;
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

  // Hide chapters/stats UI
  const statsEl = document.getElementById('guide-stats');
  if (statsEl) statsEl.style.display = 'none';
  const chapEl = document.getElementById('guide-chapters-list');
  if (chapEl) chapEl.innerHTML = '';

  // Markdown content: merge guide.content + all chapters content
  const chapters = guide.chapters || [];
  const mdContainer = document.getElementById('guide-markdown-content');
  if (mdContainer) {
    let fullText = guide.content || '';
    if (chapters.length) {
      const chaptersText = chapters.map(ch => {
        const heading = ch.name || ch.title || '';
        const body = ch.content || '';
        return heading ? `# ${heading}\n\n${body}` : body;
      }).join('\n\n---\n\n');
      fullText = fullText ? fullText + '\n\n---\n\n' + chaptersText : chaptersText;
    }
    if (fullText) {
      // Resolve image:N references from _writerImages
      const writerImages = guide._writerImages || [];
      fullText = fullText.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (match, alt, idx) => {
        const img = writerImages[parseInt(idx)];
        return img ? `![${alt}](${img.url || img})` : match;
      });
      mdContainer.innerHTML = window.safeMarkdown(fullText);
      mdContainer.style.display = '';
      // Load images — loadYadiskImage handles both regular and YaDisk URLs
      mdContainer.querySelectorAll('img').forEach(imgEl => {
        const src = imgEl.getAttribute('src') || '';
        if (!src) return;
        if (window.loadYadiskImage) {
          window.loadYadiskImage(src, imgEl);
        } else {
          imgEl.src = src;
        }
      });
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
  const idx = guides.findIndex(g => g.id === id);
  if (idx !== -1) { guides[idx].deleted = true; guides[idx].updatedAt = Date.now(); }
  window.saveGuides(guides);
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  window.showScreen('library-screen');
  renderLibrary();
  window.showToast('✓ Пособие удалено');
}

// ==================== РЕДАКТИРОВАНИЕ МЕТАДАННЫХ ====================
let _metaEditTarget = null; // { type: 'guide'|'deck', id }
let _metaSelectedCat = '';

function openMetaEditModal(type, pdfId) {
  _metaEditTarget = { type };
  let name, icon, category, tags, desc;

  if (type === 'pdf') {
    const lib = window.getPdfLibrary ? window.getPdfLibrary() : [];
    const p = lib.find(p => p.id === pdfId);
    if (!p) return;
    _metaEditTarget.id = pdfId;
    name = p.name; icon = p.icon || '📄'; category = p.category || 'bio';
    tags = (p.tags || []).join(', '); desc = p.desc || '';
    document.getElementById('meta-edit-title').textContent = 'Редактировать PDF';
    document.getElementById('meta-desc-row').style.display = '';
  } else if (type === 'guide') {
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
    btn.textContent = cat.name;
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

  if (_metaEditTarget.type === 'pdf') {
    const lib = window.getPdfLibrary ? window.getPdfLibrary() : [];
    const idx = lib.findIndex(p => p.id === _metaEditTarget.id);
    if (idx >= 0) {
      lib[idx] = { ...lib[idx], name, icon, category: _metaSelectedCat || lib[idx].category, tags, desc, updatedAt: Date.now() };
      if (window.savePdfLibrary) window.savePdfLibrary(lib);
      if (window.renderPdfSection) window.renderPdfSection();
      // update viewer title if open
      const titleEl = document.getElementById('pdf-viewer-title');
      if (titleEl && titleEl.dataset.pdfId === _metaEditTarget.id) titleEl.textContent = name;
    }
  } else if (_metaEditTarget.type === 'guide') {
    const guides = window.getGuides();
    const idx = guides.findIndex(g => g.id === _metaEditTarget.id);
    if (idx >= 0) {
      guides[idx] = { ...guides[idx], name, icon, category: _metaSelectedCat || guides[idx].category, tags, desc };
      window.saveGuides(guides);
      renderLibrary();
      openGuide(_metaEditTarget.id);
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

// ==================== ПОЛНОЭКРАННЫЙ РЕДАКТОР ПОСОБИЙ ====================
let _gwImages = []; // {url, name}
let _gwEditId = null; // id редактируемого пособия (null = новое)
let _gwPreviewOn = false;
let _gwSplitMode = false;

function openGuideWriter(editId) {
  _gwEditId = editId || null;
  _gwImages = [];
  _gwPreviewOn = false;

  const titleEl = document.getElementById('gw-title');
  const contentEl = document.getElementById('gw-content');
  const iconBtn = document.getElementById('gw-icon-btn');
  const iconInput = document.getElementById('gw-icon-input');
  const catEl = document.getElementById('gw-cat');
  const previewEl = document.getElementById('gw-preview');
  const imagesBar = document.getElementById('gw-images-bar');

  if (previewEl) { previewEl.innerHTML = ''; previewEl.classList.remove('visible'); }
  if (imagesBar) imagesBar.classList.remove('visible');

  if (editId) {
    const guide = (window.getGuides ? window.getGuides() : []).find(g => g.id === editId);
    if (guide) {
      if (titleEl) titleEl.value = guide.name || '';
      if (contentEl) contentEl.value = guide.content || '';
      if (iconBtn) iconBtn.textContent = guide.icon || '📖';
      if (iconInput) iconInput.value = guide.icon || '';
      if (catEl) catEl.value = guide.category || 'bio';
      // Восстанавливаем изображения если есть
      _gwImages = guide._writerImages || [];
    }
  } else {
    if (titleEl) titleEl.value = '';
    if (contentEl) contentEl.value = '';
    if (iconBtn) iconBtn.textContent = '📖';
    if (iconInput) iconInput.value = '';
    if (catEl) catEl.value = 'bio';
  }

  gwRenderImages();
  window.showScreen('guide-writer-screen');
  if (lucide) lucide.createIcons();
  setTimeout(() => contentEl?.focus(), 100);

  // Ctrl+V для картинок
  document.getElementById('gw-content')?.addEventListener('paste', gwHandlePaste, { once: false });
}
window.openGuideWriter = openGuideWriter;

function closeGuideWriter() {
  window.showScreen('library-screen');
}
window.closeGuideWriter = closeGuideWriter;

function saveGuideWriter(silent) {
  const name = (document.getElementById('gw-title')?.value || '').trim();
  if (!name) { if (!silent) window.showToast('Введи название'); return; }
  const content = document.getElementById('gw-content')?.value || '';
  const icon = document.getElementById('gw-icon-input')?.value.trim() || document.getElementById('gw-icon-btn')?.textContent || '📖';
  const category = document.getElementById('gw-cat')?.value || 'bio';

  const guides = window.getGuides ? window.getGuides() : [];
  if (_gwEditId) {
    const g = guides.find(g => g.id === _gwEditId);
    if (g) { g.name = name; g.content = content; g.icon = icon; g.category = category; g._writerImages = _gwImages; g.updatedAt = Date.now(); }
  } else {
    const newId = Date.now();
    _gwEditId = newId;
    guides.push({ id: newId, name, icon, type: 'guide', category, content, _writerImages: _gwImages, sourceFile: 'local', createdAt: Date.now() });
  }
  window.saveGuides(guides);
  if (window.autoSaveToCloud && !silent) window.autoSaveToCloud();
  renderLibrary();
  if (!silent) {
    closeGuideWriter();
    window.showToast(`✓ «${name}» сохранён`);
  }
}
window.saveGuideWriter = saveGuideWriter;

let _gwAutoSaveTimer = null;

function gwOnInput() {
  // Счётчик слов
  const val = document.getElementById('gw-content')?.value || '';
  const words = val.trim() ? val.trim().split(/\s+/).length : 0;
  const wc = document.getElementById('gw-wordcount');
  if (wc) wc.textContent = `${words} ${words === 1 ? 'слово' : words < 5 ? 'слова' : 'слов'}`;

  // Статус
  const status = document.getElementById('gw-autosave-status');
  const gwStatus = document.getElementById('gw-status');
  if (status) { status.textContent = 'Изменено'; status.className = 'gw-autosave-status'; }
  if (gwStatus) gwStatus.textContent = 'Черновик';

  // Автосохранение через 2.5с
  clearTimeout(_gwAutoSaveTimer);
  _gwAutoSaveTimer = setTimeout(() => {
    if (status) { status.textContent = 'Сохраняю...'; status.className = 'gw-autosave-status saving'; }
    saveGuideWriter(true);
    if (status) { status.textContent = '✓ Сохранено'; status.className = 'gw-autosave-status saved'; }
    if (gwStatus) gwStatus.textContent = 'Сохранено';
    setTimeout(() => { if (status) status.textContent = ''; }, 3000);
  }, 2500);
}
window.gwOnInput = gwOnInput;

function gwTogglePreview() {
  _gwPreviewOn = !_gwPreviewOn;
  const content = document.getElementById('gw-content');
  const preview = document.getElementById('gw-preview');
  const btn = document.getElementById('gw-preview-btn');
  if (!preview) return;

  if (_gwPreviewOn) {
    let md = content?.value || '';
    md = md.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (_, alt, i) => {
      const img = _gwImages[parseInt(i)];
      return img ? `![${alt}](${img.url})` : `![${alt}](image:${i})`;
    });
    preview.innerHTML = window.safeMarkdown ? window.safeMarkdown(md) : md;
    preview.classList.add('visible');
    if (content) content.style.display = 'none';
    if (btn) btn.classList.add('active');
  } else {
    preview.classList.remove('visible');
    if (content) content.style.display = '';
    if (btn) btn.classList.remove('active');
  }
}
window.gwTogglePreview = gwTogglePreview;

function gwFmt(before, after, linePrefix) {
  const ta = document.getElementById('gw-content');
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel = ta.value.substring(start, end);
  let insert;
  if (linePrefix) {
    // Добавить в начало строки
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const lineText = ta.value.substring(lineStart, end || ta.value.length);
    const already = lineText.startsWith(before);
    const newText = already ? lineText.slice(before.length) : before + lineText;
    ta.value = ta.value.substring(0, lineStart) + newText + ta.value.substring(end || ta.value.length);
    ta.selectionStart = ta.selectionEnd = lineStart + newText.length;
  } else {
    insert = before + (sel || 'текст') + after;
    ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
    ta.selectionStart = start + before.length;
    ta.selectionEnd = start + before.length + (sel || 'текст').length;
  }
  ta.focus();
}
window.gwFmt = gwFmt;

function gwInsertTable() {
  const ta = document.getElementById('gw-content');
  if (!ta) return;
  const table = '\n| Столбец 1 | Столбец 2 | Столбец 3 |\n|-----------|-----------|------------|\n| Ячейка    | Ячейка    | Ячейка     |\n';
  const pos = ta.selectionStart;
  ta.value = ta.value.substring(0, pos) + table + ta.value.substring(pos);
  ta.selectionStart = ta.selectionEnd = pos + table.length;
  ta.focus();
}
window.gwInsertTable = gwInsertTable;

function gwInsertDivider() {
  const ta = document.getElementById('gw-content');
  if (!ta) return;
  const pos = ta.selectionStart;
  const div = '\n\n---\n\n';
  ta.value = ta.value.substring(0, pos) + div + ta.value.substring(pos);
  ta.selectionStart = ta.selectionEnd = pos + div.length;
  ta.focus();
}
window.gwInsertDivider = gwInsertDivider;

function gwUploadImage() { document.getElementById('gw-image-input')?.click(); }
window.gwUploadImage = gwUploadImage;

function gwHandleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    window.showToast('⏳ Загрузка...');
    const url = await (window.uploadImage ? window.uploadImage(e.target.result, 'guides') : e.target.result);
    gwAddImage(url, file.name);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
window.gwHandleImageUpload = gwHandleImageUpload;

function gwHandlePaste(e) {
  const screen = document.getElementById('guide-writer-screen');
  if (!screen || !screen.classList.contains('active')) return;
  const hasImage = Array.from(e.clipboardData?.items || []).some(i => i.type.startsWith('image/'));
  if (!hasImage) return;
  e.preventDefault();
  const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
  if (!item) return;
  const blob = item.getAsFile();
  const reader = new FileReader();
  reader.onload = async (ev) => {
    window.showToast('⏳ Загрузка изображения...');
    const url = await (window.uploadImage ? window.uploadImage(ev.target.result, 'guides') : ev.target.result);
    gwAddImage(url, 'Изображение');
  };
  reader.readAsDataURL(blob);
}
window.gwHandlePaste = gwHandlePaste;

function gwAddImage(url, name) {
  _gwImages.push({ url, name: name || `Изображение ${_gwImages.length + 1}` });
  const idx = _gwImages.length - 1;
  gwRenderImages();
  // Вставить в текст
  gwInsertImageMd(idx);
  document.getElementById('gw-images-bar')?.classList.add('visible');
  window.showToast('✓ Изображение добавлено');
}

function gwInsertImageMd(idx) {
  const ta = document.getElementById('gw-content');
  if (!ta) return;
  const pos = ta.selectionStart;
  const before = ta.value.substring(0, pos);
  const needNl = before.length > 0 && !before.endsWith('\n');
  const md = (needNl ? '\n' : '') + `![Изображение](image:${idx})\n`;
  ta.value = before + md + ta.value.substring(pos);
  ta.selectionStart = ta.selectionEnd = pos + md.length;
  ta.focus();
}
window.gwInsertImageMd = gwInsertImageMd;

function gwRenderImages() {
  const list = document.getElementById('gw-images-list');
  if (!list) return;
  if (_gwImages.length === 0) { list.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:4px 0">Нет изображений. Вставь Ctrl+V или нажми иконку.</div>'; return; }
  list.innerHTML = _gwImages.map((img, i) => `
    <div class="gw-img-item">
      <img class="gw-img-thumb" src="${img.url}" alt="">
      <span class="gw-img-label">${window.escapeHtml(img.name || 'Изображение ' + (i+1))}</span>
      <button class="gw-img-insert" onclick="gwInsertImageMd(${i})">Вставить</button>
      <button class="gw-img-del" onclick="gwDeleteImage(${i})">✕</button>
    </div>`).join('');
}
window.gwRenderImages = gwRenderImages;

function gwDeleteImage(idx) {
  _gwImages.splice(idx, 1);
  gwRenderImages();
}
window.gwDeleteImage = gwDeleteImage;

function gwToggleImagesBar() {
  const bar = document.getElementById('gw-images-bar');
  if (!bar) return;
  bar.classList.toggle('visible');
  gwRenderImages();
}
window.gwToggleImagesBar = gwToggleImagesBar;

// Добавить пасте-листенер при открытии экрана
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('paste', (e) => {
    const screen = document.getElementById('guide-writer-screen');
    if (!screen || !screen.classList.contains('active')) return;
    gwHandlePaste(e);
  });
});

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
  document.getElementById('create-guide-btn').style.display        = isGuide ? '' : 'none';
  document.getElementById('create-deck-manual-btn').style.display  = isGuide ? 'none' : '';
  document.getElementById('paste-json-section').style.display      = isGuide ? 'none' : '';

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

const GUIDE_AI_PROMPT = `Ты — опытный репетитор по ЕГЭ. Создай подробный конспект на тему: "[ТЕМА]"

Заполни все поля ниже самостоятельно: выбери подходящий предмет (category), иконку, теги и разбей материал на логичные разделы.

Верни результат строго в формате JSON (без лишнего текста до и после):

{
  "name": "Краткое название конспекта",
  "type": "guide",
  "category": "bio",
  "icon": "🧬",
  "desc": "1–2 предложения: что охватывает конспект и для каких заданий ЕГЭ он полезен",
  "tags": ["ЕГЭ 2026", "Задание X", "ключевое слово темы"],
  "chapters": [
    { "name": "Название раздела 1", "tasks": 5 },
    { "name": "Название раздела 2", "tasks": 4 }
  ],
  "content": "# [ТЕМА]\\n\\n## Раздел 1\\n\\nСодержимое...\\n\\n## Раздел 2\\n\\nСодержимое..."
}

Правила для поля category — выбери одно:
- "bio" — биология
- "chem" — химия
- "ru" — русский язык
- "phys" — физика
- "math" — математика
- "hist" — история/обществознание

Правила для поля icon — подбери подходящий эмодзи по теме.

Требования к полю content:
- Только Markdown: ## разделы, ### подразделы, **жирный** для терминов, - для списков, | таблицы |
- Структура: определения → классификации/схемы → механизмы/процессы → исключения и ловушки → типичные задания ЕГЭ с разбором
- Обязательно включи раздел "## Типичные ошибки и ловушки ЕГЭ" и "## Как решать задание X"
- Объём: не менее 2000 слов, не менее 5 разделов ##
- Все переносы строк внутри JSON-строки — экранируй как \\n
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
