// ==================== КОЛОДЫ КАРТОЧЕК И ПАРОНИМЫ ====================
let currentDeckId = null;
let studyQueue = [], studyIdx = 0, sessionKnown = 0, sessionErrors = 0, isFlipped = false, isErrorsMode = false, isFavMode = false;
let sessionErrorCards = [];
let matchSets = [], matchSetIdx = 0, matchSessionCorrect = 0, matchSessionWrong = 0;
let matchSelected = { left: null, right: null }, matchConnections = [], matchChecked = false;

async function renderDecks() {
  try {
    const decks = await dbGetAll('decks');
    const allStats = await dbGetAll('stats');
    const list = getElement('decks-list');
    if (!list) return;
    if (!decks.length) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">Нет колод.<br>Нажми + чтобы добавить</div></div>`;
      return;
    }
    list.innerHTML = '';
    for (const deck of decks) {
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
          <div class="deck-name">${escapeHtml(deck.name)}</div>
          <div class="deck-meta">${total} ${isMatch ? 'блоков' : 'карточек'}${!isMatch ? ' · ' + pct + '% освоено' : ''}</div>
          ${!isMatch ? `<div class="deck-progress"><div class="deck-progress-fill" style="width:${pct}%"></div></div>` : ''}
        </div>
        <span class="deck-type-badge ${isMatch ? 'match' : ''}">${isMatch ? '🔗 Паронимы' : '📋 Карточки'}</span>
        <div class="deck-arrow">›</div>`;
      el.onclick = () => openDeck(deck.id);
      list.appendChild(el);
    }
  } catch (error) {
    console.error(error);
    const list = getElement('decks-list');
    if (list) list.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Ошибка загрузки данных</div></div>';
  }
}
window.renderDecks = renderDecks;

async function openDeck(deckId) {
  try {
    currentDeckId = deckId;
    const deck = await dbGet('decks', deckId);
    if (!deck) return;
    const isMatch = deck.type === 'match';
    getElement('deck-detail-icon').textContent = deck.icon || '📚';
    getElement('deck-detail-name').textContent = deck.name;
    getElement('deck-detail-nav-title').textContent = deck.name;
    getElement('deck-detail-sub').textContent = `${deck.cards.length} ${isMatch ? 'блоков паронимов' : 'карточек'}`;
    getElement('deck-delete-btn').onclick = () => deleteDeck(deckId);
    
    const actionsEl = getElement('deck-actions');
    const statsRow = getElement('deck-stats-row');
    const hardSection = getElement('hard-section');
    
    if (isMatch) {
      if (statsRow) statsRow.style.display = 'none';
      if (hardSection) hardSection.style.display = 'none';
      actionsEl.innerHTML = `<button class="btn btn-primary" onclick="startMatch(${deckId})">▶ Начать тренировку</button><button class="btn btn-secondary" onclick="deleteDeck(${deckId})">🗑 Удалить колоду</button>`;
    } else {
      if (statsRow) statsRow.style.display = 'grid';
      if (hardSection) hardSection.style.display = 'block';
      const allStats = await dbGetRange('stats', String(deckId));
      const known = allStats.reduce((a, s) => a + (s.known || 0), 0);
      const errors = allStats.reduce((a, s) => a + (s.errors || 0), 0);
      const errorCards = allStats.filter(s => (s.errors || 0) > 0);
      const favs = await dbGetRange('favorites', String(deckId));
      const favCount = favs.length;
      getElement('deck-known').textContent = known;
      getElement('deck-errors').textContent = errors;
      actionsEl.innerHTML = `
        <button class="btn btn-primary" id="btn-study-all">▶ Учить все</button>
        <button class="btn btn-fav" id="btn-study-fav">⭐ Избранное <span id="fav-count">${favCount ? '('+favCount+')' : ''}</span></button>
        <button class="btn btn-danger" id="btn-study-errors" ${errorCards.length ? '' : 'disabled'}>⚡ Отработать ошибки</button>
        <button class="btn btn-notes" id="btn-notes-deck">📋 Конспект ошибок</button>
        <button class="btn btn-secondary" id="btn-reset">↺ Сбросить прогресс</button>`;
      getElement('btn-study-all').onclick = () => startStudy(deckId, false, false);
      getElement('btn-study-fav').onclick = () => startStudy(deckId, false, true);
      getElement('btn-study-errors').onclick = () => startStudy(deckId, true, false);
      getElement('btn-reset').onclick = () => resetDeck(deckId);
      getElement('btn-notes-deck').onclick = () => openNotesDeck(deckId);
      
      const hardList = getElement('hard-list');
      const sorted = allStats.filter(s => (s.errors || 0) > 0).sort((a, b) => (b.errors || 0) - (a.errors || 0)).slice(0, 5);
      if (sorted.length === 0) hardList.innerHTML = `<div class="empty" style="padding:20px"><div class="empty-text">Ошибок пока нет 🎉</div></div>`;
      else {
        hardList.innerHTML = '';
        sorted.forEach((s, i) => {
          const idx = parseInt(s.id.split('_')[1]);
          const card = deck.cards[idx];
          if (!card) return;
          const el = document.createElement('div');
          el.className = 'hard-item';
          el.innerHTML = `<div class="hard-rank">${i+1}</div><div class="hard-info"><div class="hard-q">${escapeHtml(card.q)}</div><div class="hard-stat">${s.known||0} верно · ${s.errors||0} ошибок</div></div><div class="hard-badge">${s.errors} ✕</div>`;
          hardList.appendChild(el);
        });
      }
    }
    showScreen('deck-detail-screen');
  } catch (error) {
    console.error(error);
    showToast('⚠️ Ошибка загрузки колоды');
  }
}
window.openDeck = openDeck;

async function deleteDeck(deckId) {
  if (!confirm('Удалить колоду?')) return;
  await dbDelete('decks', deckId);
  await dbDeleteRange('stats', String(deckId));
  await dbDeleteRange('favorites', String(deckId));
  showScreen('decks-screen');
  renderDecks();
  showToast('Колода удалена');
}
window.deleteDeck = deleteDeck;

async function resetDeck(deckId) {
  if (!confirm('Сбросить прогресс этой колоды?')) return;
  await dbDeleteRange('stats', String(deckId));
  await openDeck(deckId);
  showToast('Прогресс сброшен');
}
window.resetDeck = resetDeck;

async function startStudy(deckId, errorsOnly, favOnly) {
  currentDeckId = deckId;
  isErrorsMode = errorsOnly;
  isFavMode = favOnly;
  const deck = await dbGet('decks', deckId);
  const allStats = await dbGetRange('stats', String(deckId));
  let indices;
  if (favOnly) {
    const favs = await dbGetRange('favorites', String(deckId));
    indices = favs.map(f => parseInt(f.id.split('_')[1]));
  } else if (errorsOnly) {
    indices = allStats.filter(s => (s.errors || 0) > 0).map(s => parseInt(s.id.split('_')[1]));
  } else {
    indices = deck.cards.map((_, i) => i);
  }
  indices = indices.sort(() => Math.random() - 0.5);
  studyQueue = indices.map(i => ({ ...deck.cards[i], idx: i }));
  studyIdx = 0; sessionKnown = 0; sessionErrors = 0; sessionErrorCards = [];
  getElement('study-deck-name').textContent = (favOnly ? '⭐ ' : '') + deck.name;
  showScreen('study-screen');
  showCard();
}
window.startStudy = startStudy;

function showCard() {
  if (studyIdx >= studyQueue.length) { showResults(); return; }
  const card = studyQueue[studyIdx];
  getElement('study-prog').style.width = (studyIdx / studyQueue.length * 100) + '%';
  getElement('study-counter').textContent = `${studyIdx + 1} / ${studyQueue.length}`;
  getElement('fc-question').textContent = card.q;
  getElement('fc-answer').textContent = card.a;
  isFlipped = false;
  getElement('flashcard').classList.remove('flipped');
  getElement('study-actions').style.visibility = 'hidden';
  updateFavBtn();
}
window.showCard = showCard;

function flipCard() {
  if (isFlipped) return;
  isFlipped = true;
  getElement('flashcard').classList.add('flipped');
  setTimeout(() => { getElement('study-actions').style.visibility = 'visible'; }, 300);
}
window.flipCard = flipCard;

async function markCard(known) {
  const card = studyQueue[studyIdx];
  const statId = `${currentDeckId}_${card.idx}`;
  let stat = await dbGet('stats', statId) || { id: statId, known: 0, errors: 0 };
  if (known) { stat.known = (stat.known || 0) + 1; sessionKnown++; }
  else { stat.errors = (stat.errors || 0) + 1; sessionErrors++; sessionErrorCards.push({ q: card.q, a: card.a }); }
  await dbPut('stats', stat);
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
  const existing = await dbGet('favorites', favId);
  const btn = getElement('fav-btn');
  if (btn) {
    btn.textContent = existing ? '★' : '☆';
    btn.classList.toggle('active', !!existing);
  }
}

async function toggleFavorite() {
  if (studyIdx >= studyQueue.length) return;
  const card = studyQueue[studyIdx];
  const favId = `${currentDeckId}_${card.idx}`;
  const existing = await dbGet('favorites', favId);
  const btn = getElement('fav-btn');
  if (existing) {
    await dbDelete('favorites', favId);
    if (btn) { btn.textContent = '☆'; btn.classList.remove('active'); }
    showToast('Убрано из избранного');
    if (isFavMode) { studyIdx++; showCard(); }
  } else {
    await dbPut('favorites', { id: favId });
    if (btn) {
      btn.textContent = '★'; btn.classList.add('active');
      btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 200);
    }
    showToast('Добавлено в избранное ⭐');
  }
}
window.toggleFavorite = toggleFavorite;

// ========== MATCH (паронимы) ==========
async function startMatch(deckId) {
  currentDeckId = deckId;
  const deck = await dbGet('decks', deckId);
  matchSets = [...deck.cards].sort(() => Math.random() - 0.5);
  matchSetIdx = 0; matchSessionCorrect = 0; matchSessionWrong = 0;
  getElement('match-deck-name').textContent = deck.name;
  showScreen('match-screen');
  renderMatchSet();
}
window.startMatch = startMatch;

function renderMatchSet() {
  if (matchSetIdx >= matchSets.length) { showMatchResults(); return; }
  const set = matchSets[matchSetIdx];
  const pairs = set.pairs;
  const total = matchSets.length;
  getElement('match-prog').style.width = (matchSetIdx / total * 100) + '%';
  getElement('match-counter').textContent = `${matchSetIdx + 1} / ${total}`;
  getElement('match-set-title').textContent = 'Соедини слова с примерами';
  getElement('match-result-bar').className = 'match-result-bar';
  getElement('match-hints').innerHTML = '';
  const checkBtn = getElement('btn-check');
  if (checkBtn) {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Проверить';
    checkBtn.onclick = checkMatch;
  }
  getElement('match-svg').innerHTML = '';
  matchSelected = { left: null, right: null };
  matchConnections = [];
  matchChecked = false;
  const leftItems = pairs.map((p, i) => ({ ...p, idx: i }));
  const rightItems = [...pairs].map((p, i) => ({ ...p, idx: i })).sort(() => Math.random() - 0.5);
  const leftCol = getElement('match-col-left');
  const rightCol = getElement('match-col-right');
  if (leftCol) leftCol.innerHTML = '';
  if (rightCol) rightCol.innerHTML = '';
  leftItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'match-chip';
    el.textContent = item.word;
    el.dataset.idx = i;
    el.dataset.side = 'left';
    el.onclick = () => onChipClick('left', i, el);
    leftCol.appendChild(el);
  });
  rightItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'match-chip';
    el.textContent = item.example;
    el.dataset.originalIdx = item.idx;
    el.dataset.displayIdx = i;
    el.dataset.side = 'right';
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
  const checkBtn = getElement('btn-check');
  if (checkBtn) checkBtn.disabled = connectedLefts.size < matchSets[matchSetIdx].pairs.length;
}
window.connectPair = connectPair;

function drawLines() {
  const svg = getElement('match-svg');
  const area = getElement('match-area');
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
  const resultBar = getElement('match-result-bar');
  if (allCorrect) {
    matchSessionCorrect++;
    resultBar.textContent = '✓ Все верно!';
    resultBar.className = 'match-result-bar correct';
  } else {
    matchSessionWrong++;
    resultBar.textContent = '✗ Есть ошибки — посмотри пояснения ниже';
    resultBar.className = 'match-result-bar wrong';
  }
  const hintsEl = getElement('match-hints');
  hintsEl.innerHTML = '';
  pairs.forEach((pair, i) => {
    const conn = matchConnections.find(c => c.leftIdx === i);
    const isCorrect = conn && conn.rightOriginal === i;
    const el = document.createElement('div');
    el.className = 'hint-item ' + (conn ? (isCorrect ? 'show-correct' : 'show-wrong') : '');
    el.innerHTML = `<div class="hint-word">${escapeHtml(pair.word)}</div><div class="hint-text">${escapeHtml(pair.hint)}</div><div class="hint-example">Пример: ${escapeHtml(pair.example)}</div>`;
    hintsEl.appendChild(el);
  });
  const checkBtn = getElement('btn-check');
  checkBtn.textContent = 'Далее →';
  checkBtn.disabled = false;
  checkBtn.onclick = nextMatchSet;
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
  getElement('res-emoji').textContent = emoji;
  getElement('res-title').textContent = title;
  getElement('res-sub').textContent = `Ты верно соединил ${pct}% блоков`;
  getElement('res-known').textContent = matchSessionCorrect;
  getElement('res-errors').textContent = matchSessionWrong;
  showScreen('results-screen');
}
window.showMatchResults = showMatchResults;

function showResults() {
  const total = sessionKnown + sessionErrors;
  const pct = total ? Math.round(sessionKnown / total * 100) : 0;
  let emoji = '😅', title = 'Продолжай!';
  if (pct >= 90) { emoji = '🏆'; title = 'Великолепно!'; }
  else if (pct >= 70) { emoji = '🎉'; title = 'Отличная работа!'; }
  else if (pct >= 50) { emoji = '💪'; title = 'Хороший прогресс!'; }
  getElement('res-emoji').textContent = emoji;
  getElement('res-title').textContent = title;
  getElement('res-sub').textContent = `Ты ответил верно на ${pct}% карточек`;
  getElement('res-known').textContent = sessionKnown;
  getElement('res-errors').textContent = sessionErrors;
  showScreen('results-screen');
}
window.showResults = showResults;

function goToDeckDetail() { openDeck(currentDeckId); }
window.goToDeckDetail = goToDeckDetail;

// ========== ОШИБКИ И КОНСПЕКТ ==========
let currentNotesTab = 'session';
let notesDeckFilter = null;

function openNotes() {
  currentNotesTab = 'session';
  notesDeckFilter = null;
  showScreen('errors-screen');
  document.querySelectorAll('.notes-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
  getElement('notes-tab-session').style.display = '';
  getElement('notes-tab-all').style.display = '';
  renderErrorNotes('session');
}
window.openNotes = openNotes;

function openNotesDeck(deckId) {
  notesDeckFilter = deckId;
  currentNotesTab = 'all';
  showScreen('errors-screen');
  document.querySelectorAll('.notes-tab').forEach((b, i) => b.classList.toggle('active', i === 1));
  getElement('notes-tab-session').style.display = 'none';
  getElement('notes-tab-all').style.display = '';
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
  else showScreen('results-screen');
}
window.closeNotes = closeNotes;

async function renderErrorNotes(tab) {
  const scroll = getElement('notes-scroll');
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
      item.innerHTML = `<div class="notes-item-q">${escapeHtml(card.q)}</div><div class="notes-item-a">${escapeHtml(card.a)}</div>`;
      scroll.appendChild(item);
    });
  } else {
    const decks = await dbGetAll('decks');
    const allStats = await dbGetAll('stats');
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
      deckErrors.sort((a, b) => b.errors - a.errors);
      if (notesDeckFilter === null) {
        const titleEl = document.createElement('div');
        titleEl.className = 'notes-deck-title';
        titleEl.textContent = `${deck.icon || '📚'} ${escapeHtml(deck.name)}`;
        scroll.appendChild(titleEl);
      }
      deckErrors.forEach(({ cardIdx, errors, known }) => {
        const card = deck.cards[cardIdx];
        if (!card) return;
        const item = document.createElement('div');
        item.className = 'notes-item';
        item.innerHTML = `<div class="notes-item-errors">✕ ${errors} ${errors===1?'ошибка':errors<5?'ошибки':'ошибок'}${known>0?' · ✓ '+known+' верно':''}</div><div class="notes-item-q">${escapeHtml(card.q)}</div><div class="notes-item-a">${escapeHtml(card.a)}</div>`;
        scroll.appendChild(item);
      });
    }
  }
}
window.renderErrorNotes = renderErrorNotes;
