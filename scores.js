// ==================== УЧЁТ БАЛЛОВ ЕГЭ ====================

const EGE_SUBJECTS = {
  ru: {
    name: 'Русский язык', icon: '📝',
    maxPrimary: 50,
    tasks: [
      {id:1,max:1},{id:2,max:1},{id:3,max:1},{id:4,max:1},{id:5,max:1},{id:6,max:1},{id:7,max:1},
      {id:8,max:2},
      {id:9,max:1},{id:10,max:1},{id:11,max:1},{id:12,max:1},{id:13,max:1},{id:14,max:1},
      {id:15,max:1},{id:16,max:1},{id:17,max:1},{id:18,max:1},{id:19,max:1},{id:20,max:1},{id:21,max:1},
      {id:22,max:2},
      {id:23,max:1},{id:24,max:1},{id:25,max:1},{id:26,max:1},
      {id:27,max:22,isEssay:true,label:'Сочинение'}
    ],
    groups: [
      {label:'Задания 1–7',  ids:[1,2,3,4,5,6,7]},
      {label:'Задание 8',    ids:[8]},
      {label:'Задания 9–21', ids:[9,10,11,12,13,14,15,16,17,18,19,20,21]},
      {label:'Задание 22',   ids:[22]},
      {label:'Задания 23–26',ids:[23,24,25,26]},
      {label:'Сочинение',    ids:[27]}
    ],
    scale: [0,3,5,8,10,12,15,17,20,22,24,27,29,32,34,36,37,39,40,42,43,45,46,48,49,51,52,54,55,57,58,60,61,63,64,66,67,69,70,72,73,75,78,81,83,86,89,91,94,97,100]
  },
  bio: {
    name: 'Биология', icon: '🧬',
    maxPrimary: 57,
    tasks: [
      {id:1,max:1},
      {id:2,max:2,options:[0,2]},
      {id:3,max:1},{id:4,max:1},{id:5,max:1},
      {id:6,max:2,options:[0,2]},
      {id:7,max:2},{id:8,max:2},
      {id:9,max:1},
      {id:10,max:2,options:[0,2]},
      {id:11,max:2},{id:12,max:2},
      {id:13,max:1},
      {id:14,max:2,options:[0,2]},
      {id:15,max:2},{id:16,max:2},{id:17,max:2},{id:18,max:2},
      {id:19,max:2,options:[0,2]},
      {id:20,max:2,options:[0,2]},
      {id:21,max:2},
      {id:22,max:3},{id:23,max:3},{id:24,max:3},{id:25,max:3},
      {id:26,max:3},{id:27,max:3},{id:28,max:3}
    ],
    groups: [
      {label:'Часть 1 — задания 1–21', ids:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]},
      {label:'Часть 2 — задания 22–28', ids:[22,23,24,25,26,27,28]}
    ],
    scale: [0,3,5,7,10,12,14,17,19,21,24,26,28,31,33,36,38,40,41,43,45,46,48,50,51,53,55,56,58,60,61,63,65,66,68,70,71,72,73,74,75,76,77,78,79,80,81,83,85,86,88,90,91,93,95,96,98,100]
  },
  chem: {
    name: 'Химия', icon: '⚗️',
    maxPrimary: 56,
    tasks: [
      {id:1,max:1},{id:2,max:1},{id:3,max:1},{id:4,max:1},{id:5,max:1},
      {id:6,max:2},{id:7,max:2},{id:8,max:2},
      {id:9,max:1},{id:10,max:1},{id:11,max:1},{id:12,max:1},{id:13,max:1},
      {id:14,max:2},{id:15,max:2},
      {id:16,max:1},{id:17,max:1},{id:18,max:1},{id:19,max:1},{id:20,max:1},{id:21,max:1},
      {id:22,max:2},{id:23,max:2},{id:24,max:2},
      {id:25,max:1},{id:26,max:1},{id:27,max:1},{id:28,max:1},
      {id:29,max:2},{id:30,max:2},
      {id:31,max:4},{id:32,max:5},{id:33,max:3},{id:34,max:4}
    ],
    groups: [
      {label:'Задания 1–15',           ids:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]},
      {label:'Задания 16–30',          ids:[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]},
      {label:'Развёрнутые ответы 31–34',ids:[31,32,33,34]}
    ],
    scale: [0,4,7,10,14,17,20,23,27,30,33,36,38,39,40,42,43,44,46,47,48,49,51,52,53,55,56,57,58,60,61,62,64,65,66,68,69,70,71,73,74,75,77,78,79,80,82,84,86,88,90,91,93,95,97,99,100]
  }
};

let currentScoreSubject = 'ru';

// ==================== ДАННЫЕ ====================
// scores хранит явно выставленные значения. Отсутствующий ключ = «не заполнено».
function getScoreCurrent(subject) {
  try { return JSON.parse(localStorage.getItem('ege_current_' + subject) || '{}'); } catch { return {}; }
}
function saveScoreCurrent(subject, data) {
  const withTs = { ...data, _savedAt: Date.now() };
  localStorage.setItem('ege_current_' + subject, JSON.stringify(withTs));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}
function getScoreHistory(subject) {
  try { return JSON.parse(localStorage.getItem('ege_history_' + subject) || '[]'); } catch { return []; }
}
function saveScoreHistory(subject, history) {
  localStorage.setItem('ege_history_' + subject, JSON.stringify(history));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}

function calcPrimary(subject, scores) {
  return EGE_SUBJECTS[subject].tasks.reduce((s, t) => s + (scores[t.id] || 0), 0);
}
function calcSecondary(subject, primary) {
  const scale = EGE_SUBJECTS[subject].scale;
  return scale[Math.min(Math.max(primary, 0), scale.length - 1)];
}

// Сколько заданий уже заполнено
function countFilled(subject, scores) {
  return EGE_SUBJECTS[subject].tasks.filter(t => t.id in scores).length;
}

// ==================== РЕНДЕР ====================
function renderScores() { renderScoresContent(); }
window.renderScores = renderScores;

function switchScoreSubject(subject, btn) {
  currentScoreSubject = subject;
  document.querySelectorAll('.scores-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderScoresContent();
}
window.switchScoreSubject = switchScoreSubject;

function renderScoresContent() {
  const container = document.getElementById('scores-content');
  if (!container) return;
  const subj = EGE_SUBJECTS[currentScoreSubject];
  const scores = getScoreCurrent(currentScoreSubject);
  const primary = calcPrimary(currentScoreSubject, scores);
  const secondary = calcSecondary(currentScoreSubject, primary);
  const filled = countFilled(currentScoreSubject, scores);
  const total = subj.tasks.length;
  const pct = Math.round(primary / subj.maxPrimary * 100);

  // Цвета только если что-то заполнено
  const isEmpty = filled === 0;
  const secColor = isEmpty ? 'var(--text3)' : secondary >= 61 ? 'var(--green)' : secondary >= 36 ? 'var(--yellow)' : 'var(--red)';
  const barColor = isEmpty ? 'var(--lavender-mid)' : pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  // Строим список заданий с группами
  const taskMap = Object.fromEntries(subj.tasks.map(t => [t.id, t]));
  let tasksHTML = '';
  for (const group of subj.groups) {
    tasksHTML += `<div class="score-group-label">${group.label}</div>`;
    for (const id of group.ids) {
      const task = taskMap[id];
      const isSet = id in scores;
      const score = isSet ? scores[id] : null;
      tasksHTML += buildTaskRowHTML(task, score, isSet);
    }
  }

  container.innerHTML = `
    <div class="score-summary-card">
      <div class="score-filled-badge">${filled} из ${total} заданий заполнено</div>
      <div class="score-summary-row">
        <div class="score-block">
          <div class="score-big${isEmpty ? ' score-dim' : ''}" id="score-primary-num">${primary}</div>
          <div class="score-big-of">из ${subj.maxPrimary}</div>
          <div class="score-label">первичных</div>
        </div>
        <div class="score-arrow-sep">→</div>
        <div class="score-block">
          <div class="score-big" id="score-secondary-num" style="color:${secColor}">${secondary}</div>
          <div class="score-big-of">из 100</div>
          <div class="score-label">тестовых</div>
        </div>
      </div>
      <div class="score-bar-row">
        <div class="score-bar">
          <div class="score-bar-fill" id="score-bar-fill" style="width:${isEmpty?'0':pct}%;background:${barColor}"></div>
        </div>
        <span class="score-bar-pct" id="score-bar-pct">${isEmpty ? '—' : pct+'%'}</span>
      </div>
    </div>

    <div class="score-section-header">
      <span class="score-section-title">Задания</span>
      <button class="score-link-btn" onclick="resetCurrentScores()">↺ Сбросить</button>
    </div>
    <div class="score-tasks-list" id="score-tasks-list">${tasksHTML}</div>

    <div style="padding:4px 0 20px">
      <button class="btn btn-primary" onclick="saveVariant()" style="width:100%">💾 Сохранить вариант</button>
    </div>

    ${buildAnalyticsHTML()}
    ${buildHistoryHTML()}
  `;
}

function buildTaskRowHTML(task, score, isSet) {
  const full   = isSet && score === task.max;
  const zero   = isSet && score === 0;
  const partial = isSet && score > 0 && !full;
  const rowCls = full ? 'task-full' : partial ? 'task-partial' : zero ? 'task-zero' : '';

  if (task.isEssay) {
    const val = isSet ? score : 0;
    return `<div class="score-task-row ${rowCls}" id="task-row-${task.id}">
      <div class="score-task-num">№${task.id}</div>
      <div class="score-task-name">${task.label}</div>
      <div class="essay-controls">
        <button class="essay-btn" onclick="adjustEssay(${task.id},-1,${task.max})">−</button>
        <span class="essay-val" id="essay-val-${task.id}">${val}</span>
        <span class="essay-sep">/${task.max}</span>
        <button class="essay-btn" onclick="adjustEssay(${task.id},1,${task.max})">+</button>
      </div>
    </div>`;
  }

  const options = task.options || Array.from({length: task.max + 1}, (_, i) => i);
  const btns = options.map(v => {
    const isActive = isSet && score === v;
    let cls = 'sbtn-neutral';
    if (isActive) cls = v === 0 ? 'sbtn-zero' : v < task.max ? 'sbtn-mid' : 'sbtn-full';
    return `<button class="score-btn ${cls}${isActive?' s-active':''}" onclick="setTaskScore(${task.id},${v})">${v}</button>`;
  }).join('');

  return `<div class="score-task-row ${rowCls}" id="task-row-${task.id}">
    <div class="score-task-num">№${task.id}</div>
    <div class="score-task-maxlabel">${task.max > 1 ? 'max '+task.max : ''}</div>
    <div class="score-task-btns">${btns}</div>
  </div>`;
}

function buildLineChartHTML(values) {
  if (values.length < 2) return '';
  const W = 600, H = 80, PAD_X = 12, PAD_Y = 10;
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 100);
  const range = maxV - minV || 1;
  const pts = values.map((v, i) => {
    const x = PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const y = PAD_Y + (1 - (v - minV) / range) * (H - PAD_Y * 2);
    return { x, y, v };
  });
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Filled area path
  const areaPath = `M${pts[0].x.toFixed(1)},${H} ` +
    pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${pts[pts.length-1].x.toFixed(1)},${H} Z`;
  // Dots and labels
  const dots = pts.map((p, i) => {
    const isLast = i === pts.length - 1;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isLast ? 5 : 3.5}" fill="${isLast ? 'var(--lavender-deep)' : 'var(--lavender-mid)'}" stroke="white" stroke-width="1.5"/>
    <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text3)" font-family="var(--font-sans)">${p.v}</text>`;
  }).join('');

  return `<div class="score-line-chart-wrap">
    <div class="score-line-chart-title">Динамика тестовых баллов</div>
    <svg class="score-line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lgc-${currentScoreSubject}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--lavender-mid)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--lavender-mid)" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#lgc-${currentScoreSubject})"/>
      <polyline points="${polyline}" fill="none" stroke="var(--lavender-deep)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>
    <div class="score-line-chart-labels">
      ${values.map((_, i) => `<span>Вар. ${i + 1}</span>`).join('')}
    </div>
  </div>`;
}

function buildAnalyticsHTML() {
  const history = getScoreHistory(currentScoreSubject);
  if (history.length === 0) {
    return `<div class="score-section-header"><span class="score-section-title">Аналитика</span></div>
      <div class="score-empty-hint">Сохрани хотя бы один вариант,<br>чтобы увидеть аналитику по заданиям</div>`;
  }
  const subj = EGE_SUBJECTS[currentScoreSubject];
  const taskStats = {};
  subj.tasks.forEach(t => { taskStats[t.id] = { earned: 0, possible: 0 }; });
  history.forEach(v => {
    subj.tasks.forEach(t => {
      taskStats[t.id].earned += (v.tasks[t.id] || 0);
      taskStats[t.id].possible += t.max;
    });
  });

  const primaries = history.map(v => calcPrimary(currentScoreSubject, v.tasks));
  const avgPrimary = Math.round(primaries.reduce((a,b) => a+b, 0) / primaries.length);
  const bestPrimary = Math.max(...primaries);
  const cnt = history.length;

  // Line chart: secondary scores over time
  const secondaries = history.map(v => calcSecondary(currentScoreSubject, calcPrimary(currentScoreSubject, v.tasks)));
  const lineChartHtml = buildLineChartHTML(secondaries);

  let html = `<div class="score-section-header">
    <span class="score-section-title">Аналитика</span>
    <span class="score-section-sub">${cnt} ${cnt===1?'вариант':cnt<5?'варианта':'вариантов'}</span>
  </div>
  ${lineChartHtml}
  <div class="analytics-summary-row">
    <div class="analytics-stat-card">
      <div class="analytics-stat-num">${calcSecondary(currentScoreSubject, avgPrimary)}</div>
      <div class="analytics-stat-label">Средний балл</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-num">${calcSecondary(currentScoreSubject, bestPrimary)}</div>
      <div class="analytics-stat-label">Лучший результат</div>
    </div>
  </div>
  <div class="analytics-chart-label">Выполняемость по заданиям</div>
  <div class="analytics-chart">`;

  subj.tasks.forEach(t => {
    const st = taskStats[t.id];
    const pct = st.possible > 0 ? Math.round(st.earned / st.possible * 100) : 0;
    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
    html += `<div class="analytics-col" title="Задание ${t.id}: ${pct}%">
      <div class="analytics-bar-wrap"><div class="analytics-bar" style="height:${pct}%;background:${color}"></div></div>
      <div class="analytics-col-num">${t.id}</div>
    </div>`;
  });

  html += `</div>`;
  return html;
}

function buildHistoryHTML() {
  const history = getScoreHistory(currentScoreSubject);
  if (history.length === 0) return '';
  const subj = EGE_SUBJECTS[currentScoreSubject];

  let html = `<div class="score-section-header"><span class="score-section-title">История вариантов</span></div>`;
  [...history].reverse().forEach((v, revIdx) => {
    const idx = history.length - 1 - revIdx;
    const prim = calcPrimary(currentScoreSubject, v.tasks);
    const sec = calcSecondary(currentScoreSubject, prim);
    const date = new Date(v.date).toLocaleDateString('ru');
    const secColor = sec >= 61 ? 'var(--green)' : sec >= 36 ? 'var(--yellow)' : 'var(--red)';
    html += `<div class="score-history-item" onclick="openVariantDetail('${currentScoreSubject}', ${idx})">
      <div class="history-meta">
        <div class="history-name">${window.escapeHtml(v.label || 'Вариант')}</div>
        <div class="history-date">${date}</div>
      </div>
      <div class="history-scores">
        <span class="history-primary">${prim}/${subj.maxPrimary}</span>
        <span class="history-arrow">→</span>
        <span class="history-secondary" style="color:${secColor}">${sec}</span>
      </div>
      <button class="history-del-btn" onclick="event.stopPropagation();deleteVariant(${idx})">✕</button>
    </div>`;
  });
  return html + '<div style="height:8px"></div>';
}

// ==================== ДЕЙСТВИЯ ====================
function setTaskScore(taskId, score) {
  const scores = getScoreCurrent(currentScoreSubject);
  scores[taskId] = score;
  saveScoreCurrent(currentScoreSubject, scores);

  const task = EGE_SUBJECTS[currentScoreSubject].tasks.find(t => t.id === taskId);
  const row = document.getElementById('task-row-' + taskId);
  if (task && row) row.outerHTML = buildTaskRowHTML(task, score, true);

  updateSummaryDisplay();
}
window.setTaskScore = setTaskScore;

function adjustEssay(taskId, delta, max) {
  const scores = getScoreCurrent(currentScoreSubject);
  const newVal = Math.min(Math.max((scores[taskId] || 0) + delta, 0), max);
  setTaskScore(taskId, newVal);
}
window.adjustEssay = adjustEssay;

function updateSummaryDisplay() {
  const subj = EGE_SUBJECTS[currentScoreSubject];
  const scores = getScoreCurrent(currentScoreSubject);
  const primary = calcPrimary(currentScoreSubject, scores);
  const secondary = calcSecondary(currentScoreSubject, primary);
  const filled = countFilled(currentScoreSubject, scores);
  const pct = Math.round(primary / subj.maxPrimary * 100);
  const isEmpty = filled === 0;
  const secColor = isEmpty ? 'var(--text3)' : secondary >= 61 ? 'var(--green)' : secondary >= 36 ? 'var(--yellow)' : 'var(--red)';
  const barColor = isEmpty ? 'var(--lavender-mid)' : pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  const pEl = document.getElementById('score-primary-num');
  if (pEl) { pEl.textContent = primary; pEl.classList.toggle('score-dim', isEmpty); }
  const sEl = document.getElementById('score-secondary-num');
  if (sEl) { sEl.textContent = secondary; sEl.style.color = secColor; }
  const fill = document.getElementById('score-bar-fill');
  if (fill) { fill.style.width = (isEmpty ? 0 : pct) + '%'; fill.style.background = barColor; }
  const pctEl = document.getElementById('score-bar-pct');
  if (pctEl) pctEl.textContent = isEmpty ? '—' : pct + '%';
  const badgeEl = document.querySelector('.score-filled-badge');
  if (badgeEl) badgeEl.textContent = `${filled} из ${subj.tasks.length} заданий заполнено`;
}

function resetCurrentScores() {
  if (!confirm('Сбросить все баллы текущего варианта?')) return;
  saveScoreCurrent(currentScoreSubject, {});
  renderScoresContent();
}
window.resetCurrentScores = resetCurrentScores;

function saveVariant() {
  const scores = getScoreCurrent(currentScoreSubject);
  if (countFilled(currentScoreSubject, scores) === 0) {
    window.showToast('⚠️ Заполни хотя бы одно задание'); return;
  }
  const history = getScoreHistory(currentScoreSubject);
  const input = document.getElementById('save-variant-label');
  if (input) input.value = 'Вариант ' + (history.length + 1);
  document.getElementById('save-variant-modal')?.classList.add('open');
}
window.saveVariant = saveVariant;

function closeSaveVariantModal(e) {
  if (!e || e.target === document.getElementById('save-variant-modal')) {
    document.getElementById('save-variant-modal')?.classList.remove('open');
  }
}
window.closeSaveVariantModal = closeSaveVariantModal;

function confirmSaveVariant() {
  const scores = getScoreCurrent(currentScoreSubject);
  const history = getScoreHistory(currentScoreSubject);
  const input = document.getElementById('save-variant-label');
  const defaultLabel = 'Вариант ' + (history.length + 1);
  const label = (input?.value.trim()) || defaultLabel;
  history.push({ date: Date.now(), label, tasks: { ...scores } });
  if (history.length > 30) history.shift();
  saveScoreHistory(currentScoreSubject, history);
  closeSaveVariantModal();
  window.showToast('✓ Вариант сохранён');
  renderScoresContent();
}
window.confirmSaveVariant = confirmSaveVariant;

function deleteVariant(idx) {
  if (!confirm('Удалить этот вариант?')) return;
  const history = getScoreHistory(currentScoreSubject);
  history.splice(idx, 1);
  saveScoreHistory(currentScoreSubject, history);
  renderScoresContent();
}
window.deleteVariant = deleteVariant;

// ==================== ДЕТАЛИЗАЦИЯ ВАРИАНТА ====================
function openVariantDetail(subject, idx) {
  const history = getScoreHistory(subject);
  const v = history[idx];
  if (!v) return;
  const subj = EGE_SUBJECTS[subject];
  const prim = calcPrimary(subject, v.tasks);
  const sec = calcSecondary(subject, prim);
  const secColor = sec >= 61 ? 'var(--green)' : sec >= 36 ? 'var(--yellow)' : 'var(--red)';
  const date = new Date(v.date).toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' });

  document.getElementById('variant-detail-title').textContent = v.label || 'Вариант';
  document.getElementById('variant-detail-date').textContent = date;

  // Считаем выполнено / не выполнено
  const filled = countFilled(subject, v.tasks);
  const fullCount = subj.tasks.filter(t => (v.tasks[t.id] || 0) === t.max).length;
  const zeroCount = subj.tasks.filter(t => t.id in v.tasks && v.tasks[t.id] === 0).length;

  let html = `<div class="vd-summary">
    <div class="vd-stat">
      <div class="vd-stat-num">${prim}<span style="font-size:14px;color:var(--text3)">/${subj.maxPrimary}</span></div>
      <div class="vd-stat-label">первичных</div>
    </div>
    <div class="vd-stat">
      <div class="vd-stat-num" style="color:${secColor}">${sec}</div>
      <div class="vd-stat-label">тестовых</div>
    </div>
    <div class="vd-stat">
      <div class="vd-stat-num" style="color:var(--green,#22c55e)">${fullCount}</div>
      <div class="vd-stat-label">полных</div>
    </div>
    <div class="vd-stat">
      <div class="vd-stat-num" style="color:var(--red,#ef4444)">${zeroCount}</div>
      <div class="vd-stat-label">нулевых</div>
    </div>
  </div>`;

  for (const group of subj.groups) {
    html += `<div class="vd-group-label">${group.label}</div>`;
    for (const id of group.ids) {
      const task = subj.tasks.find(t => t.id === id);
      if (!task) continue;
      const score = v.tasks[id] ?? null;
      const isSet = id in v.tasks;
      const full = isSet && score === task.max;
      const zero = isSet && score === 0;
      const partial = isSet && !full && !zero;
      const rowCls = full ? 'vd-full' : zero ? 'vd-zero' : partial ? 'vd-partial' : '';
      const scoreCls = full ? 'vd-full' : zero ? 'vd-zero' : partial ? 'vd-partial' : '';
      const scoreText = isSet ? `${score}/${task.max}` : `—/${task.max}`;
      const name = task.label || '';
      html += `<div class="vd-task-row ${rowCls}">
        <div class="vd-task-num">№${task.id}</div>
        <div class="vd-task-name">${name || (task.max > 1 ? `max ${task.max}` : '')}</div>
        <div class="vd-task-score">${scoreText}</div>
      </div>`;
    }
  }

  const body = document.getElementById('variant-detail-body');
  body.innerHTML = html;
  body.scrollTop = 0;
  document.getElementById('variant-detail-modal')?.classList.add('open');
}
window.openVariantDetail = openVariantDetail;

function closeVariantDetail(e) {
  if (!e || e.target === document.getElementById('variant-detail-modal')) {
    document.getElementById('variant-detail-modal')?.classList.remove('open');
  }
}
window.closeVariantDetail = closeVariantDetail;
