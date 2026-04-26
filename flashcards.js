// ==================== КОЛОДЫ КАРТОЧЕК И ПАРОНИМЫ ====================
let currentDeckId = null;
let studyQueue = [], studyIdx = 0, sessionKnown = 0, sessionErrors = 0, isFlipped = false, isErrorsMode = false, isFavMode = false;
let sessionErrorCards = [];
let matchSets = [], matchSetIdx = 0, matchSessionCorrect = 0, matchSessionWrong = 0;
let matchSelected = { left: null, right: null }, matchConnections = [], matchChecked = false;
let decksSearchQuery = '';

// ==================== КЭШ КОЛОД ====================
let _decksCache = null;

async function _loadDecks() {
  if (!_decksCache) _decksCache = await window.dbGetAll('decks');
  return _decksCache;
}

function _getDeck(deckId) {
  return _decksCache ? (_decksCache.find(d => d.id === deckId) || null) : null;
}

function invalidateDecksCache() {
  _decksCache = null;
}
window.invalidateDecksCache = invalidateDecksCache;

function searchDecks() {
  const input = document.getElementById('decks-search');
  if (input) decksSearchQuery = input.value.toLowerCase();
  renderDecks();
}
window.searchDecks = searchDecks;

async function renderDecks() {
  try {
    const decks = await _loadDecks();
    const allStats = await window.dbGetAll('stats');
    const list = document.getElementById('decks-list');
    if (!list) return;
    
    let filteredDecks = decks.filter(deck => !deck.deleted);
    if (decksSearchQuery) {
      filteredDecks = filteredDecks.filter(deck => deck.name.toLowerCase().includes(decksSearchQuery));
    }
    
    if (filteredDecks.length === 0) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">${decks.length === 0 ? 'Нет колод' : 'Нет колод по запросу'}<br>Нажми + чтобы добавить</div></div>`;
      return;
    }
    
    list.innerHTML = '';
    for (const deck of filteredDecks) {
      const isMatch = deck.type === 'match';
      const total = deck.cards.length;
      let pct = 0;
      if (!isMatch) {
        const deckStats = allStats.filter(s => s.id.startsWith(deck.id + '_'));
        const mastered = deckStats.filter(s => (s.known || 0) > 0 && (s.errors || 0) === 0).length;
        pct = total ? Math.round(mastered / total * 100) : 0;
      }
      const el = document.createElement('div');
      el.className = 'deck-item';
      el.innerHTML = `
        <div class="deck-icon" style="background:${deck.color || '#E8F4EE'}">${deck.icon || '📚'}</div>
        <div class="deck-info">
          <div class="deck-name">${window.escapeHtml(deck.name)}</div>
          <div class="deck-meta">${total} ${isMatch ? 'блоков' : 'карточек'}${!isMatch ? ' · ' + pct + '% освоено' : ''}</div>
          ${!isMatch ? `<div class="deck-progress"><div class="deck-progress-fill" style="width:${pct}%"></div></div>` : ''}
        </div>
        ${isMatch ? '<span class="deck-type-badge match">Паронимы</span>' : ''}
        <div class="deck-arrow">›</div>`;
      el.onclick = () => openDeck(deck.id);
      list.appendChild(el);
    }
  } catch (error) {
    console.error(error);
    const list = document.getElementById('decks-list');
    if (list) list.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Ошибка загрузки данных</div></div>';
  }
}
window.renderDecks = renderDecks;

async function openDeck(deckId) {
  try {
    currentDeckId = deckId;
    window.currentDeckId = deckId;
    const deck = _getDeck(deckId) || await window.dbGet('decks', deckId);
    if (!deck) return;
    const isMatch = deck.type === 'match';
    const iconEl = document.getElementById('deck-detail-icon');
    if (iconEl) iconEl.textContent = deck.icon || '📚';
    const iconValEl = document.getElementById('deck-detail-icon-value');
    if (iconValEl) iconValEl.value = deck.icon || '📚';
    const nameEl = document.getElementById('deck-detail-name');
    if (nameEl) nameEl.textContent = deck.name;
    const navTitle = document.getElementById('deck-detail-nav-title');
    if (navTitle) navTitle.textContent = deck.name;
    const subEl = document.getElementById('deck-detail-sub');
    if (subEl) subEl.textContent = `${deck.cards.length} ${isMatch ? 'блоков паронимов' : 'карточек'}`;
    const deleteBtn = document.getElementById('deck-delete-btn');
    if (deleteBtn) deleteBtn.onclick = () => deleteDeck(deckId);
    const actionsEl = document.getElementById('deck-actions');
    const statsRow = document.getElementById('deck-stats-row');
    const hardSection = document.getElementById('hard-section');
    if (isMatch) {
      if (statsRow) statsRow.style.display = 'none';
      if (hardSection) hardSection.style.display = 'none';
      if (actionsEl) actionsEl.innerHTML = `<div class="deck-action-group"><button class="btn-deck-primary" onclick="window.startMatch(${deckId})"><i data-lucide="play"></i> Начать тренировку</button></div><div class="deck-action-group"><button class="btn-deck-secondary" onclick="deleteDeck(${deckId})"><i data-lucide="trash-2"></i> Удалить колоду</button></div>`;
    } else {
      if (statsRow) statsRow.style.display = 'grid';
      if (hardSection) hardSection.style.display = 'block';
      const allStats = await window.dbGetRange('stats', String(deckId));
      const known = allStats.reduce((a,s) => a + (s.known || 0), 0);
      const errors = allStats.reduce((a,s) => a + (s.errors || 0), 0);
      const errorCards = allStats.filter(s => (s.errors || 0) > 0);
      const favs = await window.dbGetRange('favorites', String(deckId));
      const favCount = favs.length;
      const knownEl = document.getElementById('deck-known');
      if (knownEl) knownEl.textContent = known;
      const errorsEl = document.getElementById('deck-errors');
      if (errorsEl) errorsEl.textContent = errors;
      if (actionsEl) actionsEl.innerHTML = `
        <div class="deck-action-group">
          <button class="btn-deck-primary" id="btn-study-all"><i data-lucide="play"></i> Учить все</button>
          <button class="btn-deck-fav" id="btn-study-fav"><i data-lucide="star"></i> Избранное${favCount ? ' <span style="opacity:0.7;font-size:13px">('+favCount+')</span>' : ''}</button>
          <button class="btn-deck-errors" id="btn-study-errors" ${errorCards.length ? '' : 'disabled'}><i data-lucide="zap"></i> Отработать ошибки</button>
          <button class="btn-deck-secondary" id="btn-match" ${deck.cards.length < 2 ? 'disabled' : ''}><i data-lucide="shuffle"></i> Режим Матч</button>
        </div>
        <div class="deck-divider"></div>
        <div class="deck-action-group">
          <button class="btn-deck-secondary" id="btn-add-card"><i data-lucide="plus"></i> Добавить карточку</button>
          <button class="btn-deck-secondary" id="btn-notes-deck"><i data-lucide="clipboard-list"></i> Конспект ошибок</button>
          <button class="btn-deck-secondary" id="btn-edit-cards"><i data-lucide="pencil"></i> Редактировать карточки</button>
          <button class="btn-deck-secondary" id="btn-reset"><i data-lucide="rotate-ccw"></i> Сбросить прогресс</button>
        </div>`;
      const studyAll = document.getElementById('btn-study-all');
      if (studyAll) studyAll.onclick = () => startStudy(deckId, false, false);
      const studyFav = document.getElementById('btn-study-fav');
      if (studyFav) studyFav.onclick = () => startStudy(deckId, false, true);
      const studyErrors = document.getElementById('btn-study-errors');
      if (studyErrors) studyErrors.onclick = () => startStudy(deckId, true, false);
      const matchBtn = document.getElementById('btn-match');
      if (matchBtn) matchBtn.onclick = () => startMatch(deckId);
      const resetBtn = document.getElementById('btn-reset');
      if (resetBtn) resetBtn.onclick = () => resetDeck(deckId);
      const notesBtn = document.getElementById('btn-notes-deck');
      if (notesBtn) notesBtn.onclick = () => window.openNotesDeck(deckId);
      const editCardsBtn = document.getElementById('btn-edit-cards');
      if (editCardsBtn) editCardsBtn.onclick = () => openCardsEditor(deckId);
      const addCardBtn = document.getElementById('btn-add-card');
      if (addCardBtn) addCardBtn.onclick = () => openCardsEditorAndAdd(deckId);
      if (window.lucide) window.lucide.createIcons();
      const hardList = document.getElementById('hard-list');
      const sorted = allStats.filter(s => (s.errors || 0) > 0).sort((a,b) => (b.errors||0) - (a.errors||0)).slice(0,5);
      if (hardList) {
        if (sorted.length === 0) hardList.innerHTML = `<div class="empty" style="padding:20px"><div class="empty-text">Ошибок пока нет 🎉</div></div>`;
        else {
          hardList.innerHTML = '';
          sorted.forEach((s,i) => {
            const idx = parseInt(s.id.split('_')[1]);
            const card = deck.cards[idx];
            if (!card) return;
            const el = document.createElement('div');
            el.className = 'hard-item';
            el.innerHTML = `<div class="hard-rank">${i+1}</div><div class="hard-info"><div class="hard-q">${window.escapeHtml(card.q)}</div><div class="hard-stat">${s.known||0} верно · ${s.errors||0} ошибок</div></div><div class="hard-badge">${s.errors} ✕</div>`;
            hardList.appendChild(el);
          });
        }
      }
    }
    window.showScreen('deck-detail-screen');
  } catch (error) {
    console.error(error);
    window.showToast('⚠️ Ошибка загрузки колоды');
  }
}
window.openDeck = openDeck;

function createEmptyDeck() {
  const modal = document.getElementById('new-deck-modal');
  const input = document.getElementById('new-deck-name-input');
  const iconBtn = document.getElementById('new-deck-icon-btn');
  const iconVal = document.getElementById('new-deck-icon-value');
  if (input) input.value = '';
  if (iconBtn) iconBtn.textContent = '📚';
  if (iconVal) iconVal.value = '📚';
  if (modal) modal.classList.add('open');
  setTimeout(() => input && input.focus(), 100);
}
window.createEmptyDeck = createEmptyDeck;

function closeNewDeckModal() {
  document.getElementById('new-deck-modal')?.classList.remove('open');
}
window.closeNewDeckModal = closeNewDeckModal;

async function confirmNewDeck() {
  const input = document.getElementById('new-deck-name-input');
  const name = input?.value.trim();
  if (!name) { window.showToast('Введите название'); return; }
  closeNewDeckModal();
  invalidateDecksCache();
  const icon = document.getElementById('new-deck-icon-value')?.value || '📚';
  const newDeck = { name, icon, type: 'flashcard', cards: [], createdAt: Date.now(), updatedAt: Date.now() };
  await window.dbPut('decks', newDeck);
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  await renderDecks();
  const all = await window.dbGetAll('decks');
  const created = all.filter(d => !d.deleted).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (created) {
    await openCardsEditor(created.id);
    setTimeout(() => addNewCard(), 100);
  }
}
window.confirmNewDeck = confirmNewDeck;

async function saveDeckIcon(emoji) {
  if (!currentDeckId) return;
  const deck = await window.dbGet('decks', currentDeckId);
  if (!deck) return;
  deck.icon = emoji;
  deck.updatedAt = Date.now();
  invalidateDecksCache();
  await window.dbPut('decks', deck);
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  window.showToast('Иконка обновлена');
}
window.saveDeckIcon = saveDeckIcon;

async function deleteDeck(deckId) {
  if (!confirm('Удалить колоду?')) return;
  invalidateDecksCache();
  const deck = await window.dbGet('decks', deckId);
  if (deck) await window.dbPut('decks', { ...deck, deleted: true, updatedAt: Date.now() });
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  window.showScreen('decks-screen');
  renderDecks();
  window.showToast('Колода удалена');
}
window.deleteDeck = deleteDeck;

async function resetDeck(deckId) {
  if (!confirm('Сбросить прогресс этой колоды?')) return;
  const allStats = await window.dbGetRange('stats', String(deckId));
  const now = Date.now();
  await Promise.all(allStats.map(s => window.dbPut('stats', { ...s, known: 0, errors: 0, updatedAt: now })));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  await openDeck(deckId);
  window.showToast('Прогресс сброшен');
}
window.resetDeck = resetDeck;

async function startStudy(deckId, errorsOnly, favOnly) {
  currentDeckId = deckId;
  isErrorsMode = errorsOnly;
  isFavMode = favOnly;
  const deck = _getDeck(deckId) || await window.dbGet('decks', deckId);
  if (!deck) { window.showToast('⚠️ Колода не найдена'); return; }
  const allStats = await window.dbGetRange('stats', String(deckId));
  let indices;
  if (favOnly) {
    const favs = await window.dbGetRange('favorites', String(deckId));
    indices = favs.map(f => parseInt(f.id.split('_')[1]));
  } else if (errorsOnly) {
    indices = allStats.filter(s => (s.errors || 0) > 0).map(s => parseInt(s.id.split('_')[1]));
  } else {
    indices = deck.cards.map((_, i) => i);
  }
  indices = indices.sort(() => Math.random() - 0.5);
  studyQueue = indices.map(i => ({ ...deck.cards[i], idx: i }));
  studyIdx = 0; sessionKnown = 0; sessionErrors = 0; sessionErrorCards = [];
  const nameEl = document.getElementById('study-deck-name');
  if (nameEl) nameEl.textContent = (favOnly ? '⭐ ' : '') + deck.name;
  window.showScreen('study-screen');
  showCard();
}
window.startStudy = startStudy;

function showCard() {
  if (studyIdx >= studyQueue.length) { showResults(); return; }
  const card = studyQueue[studyIdx];
  const progEl = document.getElementById('study-prog');
  if (progEl) progEl.style.width = (studyIdx / studyQueue.length * 100) + '%';
  const counterEl = document.getElementById('study-counter');
  if (counterEl) counterEl.textContent = `${studyIdx + 1} / ${studyQueue.length}`;
  const questionEl = document.getElementById('fc-question');
  if (questionEl) questionEl.textContent = card.q;
  const answerEl = document.getElementById('fc-answer');
  if (answerEl) answerEl.textContent = card.a;
  isFlipped = false;
  const flashcard = document.getElementById('flashcard');
  if (flashcard) flashcard.classList.remove('flipped');
  const actionsEl = document.getElementById('study-actions');
  if (actionsEl) actionsEl.style.visibility = 'hidden';
  updateFavBtn();
}
window.showCard = showCard;

function flipCard() {
  if (isFlipped) return;
  isFlipped = true;
  const flashcard = document.getElementById('flashcard');
  if (flashcard) flashcard.classList.add('flipped');
  setTimeout(() => {
    const actionsEl = document.getElementById('study-actions');
    if (actionsEl) actionsEl.style.visibility = 'visible';
  }, 300);
}
window.flipCard = flipCard;

async function markCard(known) {
  const card = studyQueue[studyIdx];
  const statId = `${currentDeckId}_${card.idx}`;
  let stat = await window.dbGet('stats', statId) || { id: statId, known: 0, errors: 0 };
  if (known) { stat.known = (stat.known || 0) + 1; sessionKnown++; }
  else { stat.errors = (stat.errors || 0) + 1; sessionErrors++; sessionErrorCards.push({ q: card.q, a: card.a }); }
  stat.updatedAt = Date.now();
  await window.dbPut('stats', stat);
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  studyIdx++;
  showCard();
}
window.markCard = markCard;

function exitStudy() { openDeck(currentDeckId); }
window.exitStudy = exitStudy;

async function updateFavBtn() {
  if (studyIdx >= studyQueue.length) return;
  const card = studyQueue[studyIdx];
  const favId = `${currentDeckId}_${card.idx}`;
  const existing = await window.dbGet('favorites', favId);
  const btn = document.getElementById('fav-btn');
  if (btn) {
    btn.textContent = existing ? '★' : '☆';
    btn.classList.toggle('active', !!existing);
  }
}
async function toggleFavorite() {
  if (studyIdx >= studyQueue.length) return;
  const card = studyQueue[studyIdx];
  const favId = `${currentDeckId}_${card.idx}`;
  const existing = await window.dbGet('favorites', favId);
  const btn = document.getElementById('fav-btn');
  if (existing) {
    await window.dbDelete('favorites', favId);
    if (window.autoSaveToCloud) window.autoSaveToCloud();
    if (btn) { btn.textContent = '☆'; btn.classList.remove('active'); }
    window.showToast('Убрано из избранного');
    if (isFavMode) { studyIdx++; showCard(); }
  } else {
    await window.dbPut('favorites', { id: favId, updatedAt: Date.now() });
    if (window.autoSaveToCloud) window.autoSaveToCloud();
    if (btn) { btn.textContent = '★'; btn.classList.add('active'); btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 200); }
    window.showToast('Добавлено в избранное ⭐');
  }
}
window.toggleFavorite = toggleFavorite;

async function startMatch(deckId) {
  currentDeckId = deckId;
  const deck = _getDeck(deckId) || await window.dbGet('decks', deckId);
  const isMatchDeck = deck.type === 'match';
  if (isMatchDeck) {
    // Paronim decks: cards are already sets with {pairs}
    matchSets = [...deck.cards].sort(() => Math.random() - 0.5);
  } else {
    // Regular decks: {q, a} cards → group into sets of 4 as match pairs
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    matchSets = [];
    for (let i = 0; i < shuffled.length; i += 4) {
      const chunk = shuffled.slice(i, i + 4);
      if (chunk.length < 2) break; // need at least 2 pairs
      matchSets.push({ pairs: chunk.map(c => ({ word: c.q, example: c.a })) });
    }
  }
  matchSetIdx = 0; matchSessionCorrect = 0; matchSessionWrong = 0;
  const nameEl = document.getElementById('match-deck-name');
  if (nameEl) nameEl.textContent = deck.name;
  window.showScreen('match-screen');
  renderMatchSet();
}
window.startMatch = startMatch;

function renderMatchSet() {
  if (matchSetIdx >= matchSets.length) { showMatchResults(); return; }
  const set = matchSets[matchSetIdx];
  const pairs = set.pairs;
  const total = matchSets.length;
  const progEl = document.getElementById('match-prog');
  if (progEl) progEl.style.width = (matchSetIdx / total * 100) + '%';
  const counterEl = document.getElementById('match-counter');
  if (counterEl) counterEl.textContent = `${matchSetIdx + 1} / ${total}`;
  const titleEl = document.getElementById('match-set-title');
  if (titleEl) titleEl.textContent = 'Соедини слова с примерами';
  const resultBar = document.getElementById('match-result-bar');
  if (resultBar) resultBar.className = 'match-result-bar';
  const hintsEl = document.getElementById('match-hints');
  if (hintsEl) hintsEl.innerHTML = '';
  const checkBtn = document.getElementById('btn-check');
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'Проверить'; checkBtn.onclick = checkMatch; }
  const svg = document.getElementById('match-svg');
  if (svg) svg.innerHTML = '';
  matchSelected = { left: null, right: null };
  matchConnections = [];
  matchChecked = false;
  const leftItems = pairs.map((p,i) => ({ ...p, idx: i }));
  const rightItems = [...pairs].map((p,i) => ({ ...p, idx: i })).sort(() => Math.random() - 0.5);
  const leftCol = document.getElementById('match-col-left');
  const rightCol = document.getElementById('match-col-right');
  if (leftCol) leftCol.innerHTML = '';
  if (rightCol) rightCol.innerHTML = '';
  leftItems.forEach((item,i) => {
    const el = document.createElement('div');
    el.className = 'match-chip';
    el.textContent = item.word;
    el.dataset.idx = i; el.dataset.side = 'left';
    el.onclick = () => onChipClick('left', i, el);
    leftCol.appendChild(el);
  });
  rightItems.forEach((item,i) => {
    const el = document.createElement('div');
    el.className = 'match-chip';
    el.textContent = item.example;
    el.dataset.originalIdx = item.idx;
    el.dataset.displayIdx = i; el.dataset.side = 'right';
    el.onclick = () => onChipClick('right', i, el, item.idx);
    rightCol.appendChild(el);
  });
}
window.renderMatchSet = renderMatchSet;

function onChipClick(side, displayIdx, el, originalIdx) {
  if (matchChecked) return;
  if (el.classList.contains('connected') || el.classList.contains('correct') || el.classList.contains('wrong')) return;
  if (side === 'left') {
    document.querySelectorAll('#match-col-left .match-chip.selected').forEach(c => c.classList.remove('selected'));
    if (matchSelected.left === displayIdx) { matchSelected.left = null; return; }
    matchSelected.left = displayIdx;
    el.classList.add('selected');
  } else {
    document.querySelectorAll('#match-col-right .match-chip.selected').forEach(c => c.classList.remove('selected'));
    if (matchSelected.right === displayIdx) { matchSelected.right = null; return; }
    matchSelected.right = displayIdx;
    matchSelected.rightOriginal = originalIdx;
    el.classList.add('selected');
  }
  if (matchSelected.left !== null && matchSelected.right !== null) {
    connectPair(matchSelected.left, matchSelected.right, matchSelected.rightOriginal);
  }
}
window.onChipClick = onChipClick;

function connectPair(leftIdx, rightDisplayIdx, rightOriginalIdx) {
  matchConnections = matchConnections.filter(c => c.leftIdx !== leftIdx && c.rightDisplay !== rightDisplayIdx);
  matchConnections.push({ leftIdx, rightDisplay: rightDisplayIdx, rightOriginal: rightOriginalIdx });
  document.querySelectorAll('.match-chip.selected').forEach(c => c.classList.remove('selected'));
  matchSelected = { left: null, right: null };
  drawLines();
  const connectedLefts = new Set(matchConnections.map(c => c.leftIdx));
  const checkBtn = document.getElementById('btn-check');
  if (checkBtn) checkBtn.disabled = connectedLefts.size < matchSets[matchSetIdx].pairs.length;
}
window.connectPair = connectPair;

function drawLines() {
  const svg = document.getElementById('match-svg');
  const area = document.getElementById('match-area');
  if (!svg || !area) return;
  svg.innerHTML = '';
  const areaRect = area.getBoundingClientRect();
  const leftChips = document.querySelectorAll('#match-col-left .match-chip');
  const rightChips = document.querySelectorAll('#match-col-right .match-chip');
  const fragment = document.createDocumentFragment();
  matchConnections.forEach(conn => {
    const leftEl = leftChips[conn.leftIdx];
    const rightEl = [...rightChips].find(c => parseInt(c.dataset.displayIdx) === conn.rightDisplay);
    if (!leftEl || !rightEl) return;
    const lr = leftEl.getBoundingClientRect();
    const rr = rightEl.getBoundingClientRect();
    const x1 = lr.right - areaRect.left;
    const y1 = lr.top + lr.height/2 - areaRect.top;
    const x2 = rr.left - areaRect.left;
    const y2 = rr.top + rr.height/2 - areaRect.top;
    const cx = (x1 + x2)/2;
    let stroke = '#4A4AB0', opacity = '0.5';
    if (matchChecked) {
      const isCorrect = conn.leftIdx === conn.rightOriginal;
      stroke = isCorrect ? 'var(--green)' : 'var(--red)';
      opacity = '0.8';
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`);
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-opacity', opacity);
    path.setAttribute('stroke-linecap', 'round');
    fragment.appendChild(path);
  });
  svg.appendChild(fragment);
}
window.drawLines = drawLines;

function checkMatch() {
  if (matchConnections.length === 0) return;
  matchChecked = true;
  const pairs = matchSets[matchSetIdx].pairs;
  let allCorrect = true;
  const leftChips = document.querySelectorAll('#match-col-left .match-chip');
  const rightChips = document.querySelectorAll('#match-col-right .match-chip');
  matchConnections.forEach(conn => {
    const isCorrect = conn.leftIdx === conn.rightOriginal;
    if (!isCorrect) allCorrect = false;
    const leftEl = leftChips[conn.leftIdx];
    const rightEl = [...rightChips].find(c => parseInt(c.dataset.displayIdx) === conn.rightDisplay);
    if (leftEl) leftEl.classList.add(isCorrect ? 'correct' : 'wrong');
    if (rightEl) rightEl.classList.add(isCorrect ? 'correct' : 'wrong');
  });
  drawLines();
  const resultBar = document.getElementById('match-result-bar');
  if (allCorrect) { matchSessionCorrect++; if (resultBar) { resultBar.textContent = '✓ Все верно!'; resultBar.className = 'match-result-bar correct'; } }
  else { matchSessionWrong++; if (resultBar) { resultBar.textContent = '✗ Есть ошибки — посмотри пояснения ниже'; resultBar.className = 'match-result-bar wrong'; } }
  const hintsEl = document.getElementById('match-hints');
  if (hintsEl) {
    hintsEl.innerHTML = '';
    pairs.forEach((pair,i) => {
      const conn = matchConnections.find(c => c.leftIdx === i);
      const isCorrect = conn && conn.rightOriginal === i;
      const el = document.createElement('div');
      el.className = 'hint-item ' + (conn ? (isCorrect ? 'show-correct' : 'show-wrong') : '');
      el.innerHTML = `<div class="hint-word">${window.escapeHtml(pair.word)}</div><div class="hint-text">${window.escapeHtml(pair.hint)}</div><div class="hint-example">Пример: ${window.escapeHtml(pair.example)}</div>`;
      hintsEl.appendChild(el);
    });
  }
  const checkBtn = document.getElementById('btn-check');
  if (checkBtn) { checkBtn.textContent = 'Далее →'; checkBtn.disabled = false; checkBtn.onclick = nextMatchSet; }
}
window.checkMatch = checkMatch;

function nextMatchSet() { matchSetIdx++; renderMatchSet(); }
window.nextMatchSet = nextMatchSet;

function skipMatchSet() { matchSessionWrong++; nextMatchSet(); }
window.skipMatchSet = skipMatchSet;

function exitMatch() { openDeck(currentDeckId); }
window.exitMatch = exitMatch;

function showMatchResults() {
  const total = matchSets.length;
  const pct = total ? Math.round(matchSessionCorrect / total * 100) : 0;
  let emoji = '😅', title = 'Продолжай!';
  if (pct >= 90) { emoji = '🏆'; title = 'Великолепно!'; }
  else if (pct >= 70) { emoji = '🎉'; title = 'Отличная работа!'; }
  else if (pct >= 50) { emoji = '💪'; title = 'Хороший прогресс!'; }
  const emojiEl = document.getElementById('res-emoji');
  if (emojiEl) emojiEl.textContent = emoji;
  const titleEl = document.getElementById('res-title');
  if (titleEl) titleEl.textContent = title;
  const subEl = document.getElementById('res-sub');
  if (subEl) subEl.textContent = `Ты верно соединил ${pct}% блоков`;
  const knownEl = document.getElementById('res-known');
  if (knownEl) knownEl.textContent = matchSessionCorrect;
  const errorsEl = document.getElementById('res-errors');
  if (errorsEl) errorsEl.textContent = matchSessionWrong;
  window.showScreen('results-screen');
}
window.showMatchResults = showMatchResults;

function showResults() {
  const total = sessionKnown + sessionErrors;
  const pct = total ? Math.round(sessionKnown / total * 100) : 0;
  let emoji = '😅', title = 'Продолжай!';
  if (pct >= 90) { emoji = '🏆'; title = 'Великолепно!'; }
  else if (pct >= 70) { emoji = '🎉'; title = 'Отличная работа!'; }
  else if (pct >= 50) { emoji = '💪'; title = 'Хороший прогресс!'; }
  const emojiEl = document.getElementById('res-emoji');
  if (emojiEl) emojiEl.textContent = emoji;
  const titleEl = document.getElementById('res-title');
  if (titleEl) titleEl.textContent = title;
  const subEl = document.getElementById('res-sub');
  if (subEl) subEl.textContent = `Ты ответил верно на ${pct}% карточек`;
  const knownEl = document.getElementById('res-known');
  if (knownEl) knownEl.textContent = sessionKnown;
  const errorsEl = document.getElementById('res-errors');
  if (errorsEl) errorsEl.textContent = sessionErrors;
  window.showScreen('results-screen');
}
window.showResults = showResults;

function goToDeckDetail() { openDeck(currentDeckId); }
window.goToDeckDetail = goToDeckDetail;

// Ошибки и конспект
let currentNotesTab = 'session';
let notesDeckFilter = null;

function openNotes() {
  currentNotesTab = 'session';
  notesDeckFilter = null;
  window.showScreen('errors-screen');
  document.querySelectorAll('.notes-tab').forEach((b,i) => b.classList.toggle('active', i===0));
  const sessionTab = document.getElementById('notes-tab-session');
  if (sessionTab) sessionTab.style.display = '';
  const allTab = document.getElementById('notes-tab-all');
  if (allTab) allTab.style.display = '';
  renderErrorNotes('session');
}
window.openNotes = openNotes;

function openNotesDeck(deckId) {
  notesDeckFilter = deckId;
  currentNotesTab = 'all';
  window.showScreen('errors-screen');
  document.querySelectorAll('.notes-tab').forEach((b,i) => b.classList.toggle('active', i===1));
  const sessionTab = document.getElementById('notes-tab-session');
  if (sessionTab) sessionTab.style.display = 'none';
  const allTab = document.getElementById('notes-tab-all');
  if (allTab) allTab.style.display = '';
  renderErrorNotes('all');
}
window.openNotesDeck = openNotesDeck;

function switchNotesTab(tab, btn) {
  currentNotesTab = tab;
  document.querySelectorAll('.notes-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderErrorNotes(tab);
}
window.switchNotesTab = switchNotesTab;

function closeNotes() {
  if (notesDeckFilter !== null) openDeck(notesDeckFilter);
  else window.showScreen('results-screen');
}
window.closeNotes = closeNotes;

async function renderErrorNotes(tab) {
  const scroll = document.getElementById('notes-scroll');
  if (!scroll) return;
  scroll.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text3);font-size:14px">Загружаю…</div>';
  if (tab === 'session') {
    if (sessionErrorCards.length === 0) {
      scroll.innerHTML = `<div class="notes-empty"><div class="notes-empty-icon">🎉</div><div class="notes-empty-text">В этой сессии ошибок не было!</div></div>`;
      return;
    }
    scroll.innerHTML = '';
    const banner = document.createElement('div');
    banner.style.cssText = 'background:var(--yellow-light);border:1px solid #F5C842;border-radius:var(--radius-sm);padding:12px 16px;font-size:13px;color:#9A6F00;font-weight:600;margin-bottom:4px';
    banner.textContent = `📋 Ошибки этой сессии — ${sessionErrorCards.length} карточек`;
    scroll.appendChild(banner);
    sessionErrorCards.forEach(card => {
      const item = document.createElement('div');
      item.className = 'notes-item';
      item.innerHTML = `<div class="notes-item-q">${window.escapeHtml(card.q)}</div><div class="notes-item-a">${window.escapeHtml(card.a)}</div>`;
      scroll.appendChild(item);
    });
  } else {
    const decks = await window.dbGetAll('decks');
    const allStats = await window.dbGetAll('stats');
    const filteredStats = notesDeckFilter !== null
      ? allStats.filter(s => s.id.startsWith(notesDeckFilter + '_') && (s.errors || 0) > 0)
      : allStats.filter(s => (s.errors || 0) > 0);
    if (filteredStats.length === 0) {
      scroll.innerHTML = `<div class="notes-empty"><div class="notes-empty-icon">🎉</div><div class="notes-empty-text">Ошибок пока нет!<br>Продолжай в том же духе.</div></div>`;
      return;
    }
    const byDeck = {};
    filteredStats.forEach(stat => {
      const [deckId, cardIdx] = stat.id.split('_');
      if (!byDeck[deckId]) byDeck[deckId] = [];
      byDeck[deckId].push({ cardIdx: parseInt(cardIdx), errors: stat.errors || 0, known: stat.known || 0 });
    });
    scroll.innerHTML = '';
    const banner = document.createElement('div');
    banner.style.cssText = 'background:var(--yellow-light);border:1px solid #F5C842;border-radius:var(--radius-sm);padding:12px 16px;font-size:13px;color:#9A6F00;font-weight:600;margin-bottom:4px';
    banner.textContent = notesDeckFilter !== null ? `📋 Ошибки этого набора — ${filteredStats.length} шт.` : `📋 Все карточки с ошибками — ${filteredStats.length} шт.`;
    scroll.appendChild(banner);
    for (const deck of decks) {
      const deckErrors = byDeck[deck.id];
      if (!deckErrors || deck.type === 'match') continue;
      deckErrors.sort((a,b) => b.errors - a.errors);
      if (notesDeckFilter === null) {
        const titleEl = document.createElement('div');
        titleEl.className = 'notes-deck-title';
        titleEl.textContent = `${deck.icon || '📚'} ${window.escapeHtml(deck.name)}`;
        scroll.appendChild(titleEl);
      }
      deckErrors.forEach(({ cardIdx, errors, known }) => {
        const card = deck.cards[cardIdx];
        if (!card) return;
        const item = document.createElement('div');
        item.className = 'notes-item';
        item.innerHTML = `<div class="notes-item-errors">✕ ${errors} ${errors===1?'ошибка':errors<5?'ошибки':'ошибок'}${known>0?' · ✓ '+known+' верно':''}</div><div class="notes-item-q">${window.escapeHtml(card.q)}</div><div class="notes-item-a">${window.escapeHtml(card.a)}</div>`;
        scroll.appendChild(item);
      });
    }
  }
}
window.renderErrorNotes = renderErrorNotes;

// ==================== РЕДАКТИРОВАНИЕ КОЛОДЫ ====================
// Expose current deck for meta edit modal
window._getDeckForEdit = function() {
  return _decksCache ? _decksCache.find(d => d.id === currentDeckId) || null : null;
};
window.currentDeckId = currentDeckId; // keep in sync via openDeck

async function saveDeckMeta(deckId, { name, icon, tags }) {
  const deck = await window.dbGet('decks', deckId);
  if (!deck) return;
  const updated = { ...deck, name, icon, tags: tags || [] };
  invalidateDecksCache();
  await window.dbPut('decks', updated);
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  await openDeck(deckId);
}
window.saveDeckMeta = saveDeckMeta;

// ==================== РЕДАКТОР КАРТОЧЕК ====================
let _editorDeckId = null;
let _editorCards = [];
let _editingCardIdx = null;

async function openCardsEditor(deckId) {
  _editorDeckId = deckId;
  const deck = await window.dbGet('decks', deckId);
  if (!deck) return;
  _editorCards = deck.cards.map(c => ({ ...c }));
  const title = document.getElementById('cards-editor-title');
  if (title) title.textContent = deck.name;
  renderCardsEditorList();
  window.showScreen('cards-editor-screen');
}
window.openCardsEditor = openCardsEditor;

async function openCardsEditorAndAdd(deckId) {
  await openCardsEditor(deckId);
  // Small delay so screen renders before opening modal
  setTimeout(() => addNewCard(), 100);
}
window.openCardsEditorAndAdd = openCardsEditorAndAdd;

function renderCardsEditorList() {
  const list = document.getElementById('cards-editor-list');
  if (!list) return;
  list.innerHTML = '';
  if (_editorCards.length === 0) {
    list.innerHTML = '<div style="color:var(--text3);text-align:center;padding:40px 0">Нет карточек. Нажми + чтобы добавить.</div>';
    return;
  }
  _editorCards.forEach((card, idx) => {
    const item = document.createElement('div');
    item.className = 'card-editor-item';
    item.innerHTML = `
      <div class="card-editor-header">
        <div class="card-editor-num">${idx + 1}</div>
        <div class="card-editor-q">${window.escapeHtml(card.q || '—')}</div>
        <div class="card-editor-btns">
          <button class="card-editor-btn" onclick="openCardEditModal(${idx})" title="Редактировать"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="card-editor-btn del" onclick="deleteCardFromEditor(${idx})" title="Удалить"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div>
      </div>
      <div style="padding:0 16px 12px;font-size:13px;color:var(--text2);line-height:1.5">${window.escapeHtml(card.a || '—')}</div>`;
    list.appendChild(item);
  });
}

function openCardEditModal(idx) {
  _editingCardIdx = idx;
  const card = idx === -1 ? { q: '', a: '' } : _editorCards[idx];
  document.getElementById('card-edit-title').textContent = idx === -1 ? 'Новая карточка' : `Карточка ${idx + 1}`;
  document.getElementById('card-edit-q').value = card.q || '';
  document.getElementById('card-edit-a').value = card.a || '';
  document.getElementById('card-edit-modal').classList.add('open');
}
window.openCardEditModal = openCardEditModal;

function closeCardEditModal(e) {
  if (!e || e.target === document.getElementById('card-edit-modal'))
    document.getElementById('card-edit-modal')?.classList.remove('open');
}
window.closeCardEditModal = closeCardEditModal;

function saveCardEdit() {
  const q = document.getElementById('card-edit-q').value.trim();
  const a = document.getElementById('card-edit-a').value.trim();
  if (!q) { window.showToast('Введи вопрос'); return; }
  if (_editingCardIdx === -1) {
    _editorCards.push({ q, a });
  } else {
    _editorCards[_editingCardIdx] = { ...(_editorCards[_editingCardIdx] || {}), q, a };
  }
  document.getElementById('card-edit-modal')?.classList.remove('open');
  renderCardsEditorList();
}
window.saveCardEdit = saveCardEdit;

function deleteCardFromEditor(idx) {
  if (!confirm('Удалить карточку?')) return;
  _editorCards.splice(idx, 1);
  renderCardsEditorList();
}
window.deleteCardFromEditor = deleteCardFromEditor;

function addNewCard() {
  openCardEditModal(-1);
}
window.addNewCard = addNewCard;

async function closeCardsEditor() {
  // Save all changes
  const deck = await window.dbGet('decks', _editorDeckId);
  if (deck) {
    const updated = { ...deck, cards: _editorCards };
    invalidateDecksCache();
    await window.dbPut('decks', updated);
    if (window.autoSaveToCloud) window.autoSaveToCloud();
    window.showToast('✓ Карточки сохранены');
    await openDeck(_editorDeckId);
  } else {
    window.showScreen('decks-screen');
  }
}
window.closeCardsEditor = closeCardsEditor;
