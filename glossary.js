// ==================== СЛОВАРЬ ТЕРМИНОВ ====================

const GLOSSARY_KEY = 'glossary_terms';

const GLOSSARY_SUBJECTS = {
  bio:   { label: 'Биология',    color: '#34a853' },
  chem:  { label: 'Химия',       color: '#ea4335' },
  ru:    { label: 'Русский',     color: '#4285f4' },
  other: { label: 'Другое',      color: '#9575cd' },
};

let glossarySearchQuery = '';
let glossaryFilterSubject = 'all';
let glossaryEditingId = null;

function getGlossary() {
  try { return JSON.parse(localStorage.getItem(GLOSSARY_KEY) || '[]'); } catch { return []; }
}

function saveGlossary(data) {
  localStorage.setItem(GLOSSARY_KEY, JSON.stringify(data));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}

function renderGlossary() {
  const screen = document.getElementById('glossary-screen');
  if (!screen) return;

  let terms = getGlossary().filter(t => !t.deleted);

  // Filter
  if (glossaryFilterSubject !== 'all') {
    terms = terms.filter(t => t.subject === glossaryFilterSubject);
  }
  if (glossarySearchQuery) {
    const q = glossarySearchQuery.toLowerCase();
    terms = terms.filter(t =>
      t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    );
  }

  // Sort alphabetically
  terms.sort((a, b) => a.term.localeCompare(b.term, 'ru'));

  // Group by first letter
  const groups = {};
  terms.forEach(t => {
    const letter = t.term[0]?.toUpperCase() || '#';
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(t);
  });

  const filterPills = ['all', 'bio', 'chem', 'ru', 'other'].map(s => {
    const active = glossaryFilterSubject === s;
    const label = s === 'all' ? 'Все' : GLOSSARY_SUBJECTS[s].label;
    const color = s !== 'all' && active ? GLOSSARY_SUBJECTS[s].color : '';
    return `<button class="gloss-filter-pill ${active ? 'active' : ''}"
      style="${color ? `background:${color};border-color:${color};color:#fff` : ''}"
      onclick="window.glossarySetFilter('${s}')">${label}</button>`;
  }).join('');

  const allTerms = getGlossary().filter(t => !t.deleted);
  const count = allTerms.length;

  let listHtml = '';
  if (terms.length === 0) {
    listHtml = `<div class="gloss-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <div class="gloss-empty-text">${count === 0 ? 'Словарь пуст' : 'Ничего не найдено'}</div>
      <div class="gloss-empty-sub">${count === 0 ? 'Нажми + чтобы добавить первый термин' : 'Попробуй другой запрос'}</div>
    </div>`;
  } else {
    Object.keys(groups).sort().forEach(letter => {
      listHtml += `<div class="gloss-letter-group">
        <div class="gloss-letter">${letter}</div>`;
      groups[letter].forEach(t => {
        const subj = GLOSSARY_SUBJECTS[t.subject] || GLOSSARY_SUBJECTS.other;
        listHtml += `<div class="gloss-term-card" onclick="window.glossaryOpenTerm(${t.id})">
          <div class="gloss-term-left">
            <div class="gloss-term-name">${window.escapeHtml(t.term)}</div>
            <div class="gloss-term-preview">${window.escapeHtml(t.definition.slice(0, 80))}${t.definition.length > 80 ? '…' : ''}</div>
          </div>
          <span class="gloss-subject-dot" style="background:${subj.color}" title="${subj.label}"></span>
        </div>`;
      });
      listHtml += `</div>`;
    });
  }

  screen.innerHTML = `
    <div class="home-header">
      <div class="home-greeting">Термины и понятия</div>
      <div class="home-title">Словарь<br>терминов</div>
      <div class="home-sub">Определения для ЕГЭ по биологии, химии и русскому</div>
    </div>
    <div class="notes-header-row">
      <div class="search-box">
        <input type="text" class="search-input" id="gloss-search" placeholder="Поиск термина..." value="${window.escapeHtml(glossarySearchQuery)}"
          oninput="window.glossarySearch(this.value)">
      </div>
      <button class="fab-header" onclick="window.glossaryOpenAdd()"><i data-lucide="plus"></i></button>
    </div>
    <div class="gloss-filters">${filterPills}</div>
    <div class="gloss-count">${count > 0 ? `${count} ${count === 1 ? 'термин' : count < 5 ? 'термина' : 'терминов'}` : ''}</div>
    <div class="gloss-list scroll" id="gloss-list">${listHtml}</div>

    <!-- Модалка добавления/редактирования -->
    <div class="modal-overlay" id="gloss-modal" onclick="window.glossaryCloseModal(event)">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--lavender-deep),#9575cd);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <div class="modal-title" id="gloss-modal-title" style="margin-bottom:0;">Добавить термин</div>
        </div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:18px;">Заполни поля и выбери предмет</div>
        <div class="gloss-form">
          <label class="gloss-label">Термин</label>
          <input class="gloss-input" id="gloss-term-input" type="text" placeholder="Например: Митоз" maxlength="100">
          <label class="gloss-label">Определение</label>
          <textarea class="gloss-textarea" id="gloss-def-input" placeholder="Краткое и чёткое определение..." rows="4" maxlength="1000"></textarea>
          <label class="gloss-label">Предмет</label>
          <div class="gloss-subject-pills" id="gloss-subject-pills">
            ${Object.entries(GLOSSARY_SUBJECTS).map(([key, s]) =>
              `<button class="gloss-subject-pill" data-subject="${key}" onclick="window.glossarySelectSubject('${key}')"
                style="">${s.label}</button>`
            ).join('')}
          </div>
        </div>
        <div class="gloss-modal-actions">
          <button class="btn btn-ghost" onclick="window.glossaryCloseModal()">Отмена</button>
          <button class="btn btn-primary" onclick="window.glossarySave()">Сохранить</button>
        </div>
      </div>
    </div>

    <!-- Модалка просмотра термина -->
    <div class="modal-overlay" id="gloss-view-modal" onclick="window.glossaryCloseView(event)">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="gloss-view-subject" id="gloss-view-subject"></div>
        <div class="gloss-view-term" id="gloss-view-term"></div>
        <div class="gloss-view-def" id="gloss-view-def"></div>
        <div class="gloss-modal-actions">
          <button class="btn btn-ghost" onclick="window.glossaryDeleteCurrent()">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Удалить
          </button>
          <button class="btn btn-primary" onclick="window.glossaryEditCurrent()">Изменить</button>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}
window.renderGlossary = renderGlossary;

let _glossaryViewingId = null;
let _glossarySelectedSubject = 'bio';

window.glossarySearch = function(q) {
  glossarySearchQuery = q;
  renderGlossaryList();
};

window.glossarySetFilter = function(subject) {
  glossaryFilterSubject = subject;
  renderGlossary();
};

function renderGlossaryList() {
  const listEl = document.getElementById('gloss-list');
  if (!listEl) return;
  // Re-render just the list part
  let terms = getGlossary().filter(t => !t.deleted);
  if (glossaryFilterSubject !== 'all') terms = terms.filter(t => t.subject === glossaryFilterSubject);
  if (glossarySearchQuery) {
    const q = glossarySearchQuery.toLowerCase();
    terms = terms.filter(t => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  }
  terms.sort((a, b) => a.term.localeCompare(b.term, 'ru'));
  const groups = {};
  terms.forEach(t => {
    const letter = t.term[0]?.toUpperCase() || '#';
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(t);
  });
  if (terms.length === 0) {
    const count = getGlossary().filter(t => !t.deleted).length;
    listEl.innerHTML = `<div class="gloss-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <div class="gloss-empty-text">${count === 0 ? 'Словарь пуст' : 'Ничего не найдено'}</div>
      <div class="gloss-empty-sub">${count === 0 ? 'Нажми + чтобы добавить первый термин' : 'Попробуй другой запрос'}</div>
    </div>`;
    return;
  }
  let html = '';
  Object.keys(groups).sort().forEach(letter => {
    html += `<div class="gloss-letter-group"><div class="gloss-letter">${letter}</div>`;
    groups[letter].forEach(t => {
      const subj = GLOSSARY_SUBJECTS[t.subject] || GLOSSARY_SUBJECTS.other;
      html += `<div class="gloss-term-card" onclick="window.glossaryOpenTerm(${t.id})">
        <div class="gloss-term-left">
          <div class="gloss-term-name">${window.escapeHtml(t.term)}</div>
          <div class="gloss-term-preview">${window.escapeHtml(t.definition.slice(0, 80))}${t.definition.length > 80 ? '…' : ''}</div>
        </div>
        <span class="gloss-subject-dot" style="background:${subj.color}" title="${subj.label}"></span>
      </div>`;
    });
    html += `</div>`;
  });
  listEl.innerHTML = html;
}

window.glossaryOpenAdd = function() {
  glossaryEditingId = null;
  _glossarySelectedSubject = 'bio';
  document.getElementById('gloss-modal-title').textContent = 'Добавить термин';
  document.getElementById('gloss-term-input').value = '';
  document.getElementById('gloss-def-input').value = '';
  _updateSubjectPills('bio');
  document.getElementById('gloss-modal').classList.add('open');
  setTimeout(() => document.getElementById('gloss-term-input').focus(), 100);
};

window.glossaryOpenTerm = function(id) {
  const term = getGlossary().find(t => t.id === id);
  if (!term) return;
  _glossaryViewingId = id;
  const subj = GLOSSARY_SUBJECTS[term.subject] || GLOSSARY_SUBJECTS.other;
  document.getElementById('gloss-view-subject').textContent = subj.label;
  document.getElementById('gloss-view-subject').style.color = subj.color;
  document.getElementById('gloss-view-term').textContent = term.term;
  document.getElementById('gloss-view-def').textContent = term.definition;
  document.getElementById('gloss-view-modal').classList.add('open');
};

window.glossaryCloseView = function(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('gloss-view-modal').classList.remove('open');
};

window.glossaryDeleteCurrent = function() {
  if (!_glossaryViewingId) return;
  const all = getGlossary();
  const idx = all.findIndex(t => t.id === _glossaryViewingId);
  if (idx !== -1) { all[idx].deleted = true; all[idx].updatedAt = Date.now(); }
  saveGlossary(all);
  document.getElementById('gloss-view-modal').classList.remove('open');
  renderGlossary();
  window.showToast('Термин удалён');
};

window.glossaryEditCurrent = function() {
  if (!_glossaryViewingId) return;
  const term = getGlossary().find(t => t.id === _glossaryViewingId);
  if (!term) return;
  document.getElementById('gloss-view-modal').classList.remove('open');
  glossaryEditingId = term.id;
  _glossarySelectedSubject = term.subject;
  document.getElementById('gloss-modal-title').textContent = 'Изменить термин';
  document.getElementById('gloss-term-input').value = term.term;
  document.getElementById('gloss-def-input').value = term.definition;
  _updateSubjectPills(term.subject);
  document.getElementById('gloss-modal').classList.add('open');
};

window.glossarySelectSubject = function(s) {
  _glossarySelectedSubject = s;
  _updateSubjectPills(s);
};

function _updateSubjectPills(active) {
  document.querySelectorAll('.gloss-subject-pill').forEach(btn => {
    const s = btn.dataset.subject;
    const subj = GLOSSARY_SUBJECTS[s];
    if (s === active) {
      btn.style.background = subj.color;
      btn.style.borderColor = subj.color;
      btn.style.color = '#fff';
    } else {
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  });
}

window.glossaryCloseModal = function(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('gloss-modal').classList.remove('open');
};

window.glossarySave = function() {
  const term = document.getElementById('gloss-term-input').value.trim();
  const def = document.getElementById('gloss-def-input').value.trim();
  if (!term) { window.showToast('Введите термин'); return; }
  if (!def)  { window.showToast('Введите определение'); return; }

  const all = getGlossary();
  if (glossaryEditingId) {
    const idx = all.findIndex(t => t.id === glossaryEditingId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], term, definition: def, subject: _glossarySelectedSubject, updatedAt: Date.now() };
    }
  } else {
    all.push({ id: Date.now(), term, definition: def, subject: _glossarySelectedSubject, createdAt: Date.now(), updatedAt: Date.now(), deleted: false });
  }
  saveGlossary(all);
  document.getElementById('gloss-modal').classList.remove('open');
  renderGlossary();
  window.showToast(glossaryEditingId ? 'Термин обновлён' : `Термин «${term}» добавлен`);
  glossaryEditingId = null;
};
