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
    scale: [0,4,7,10,14,17,20,23,27,30,33,36,38,39,40,42,43,44,46,47,48,49,51,52,53,55,56,57,58,60,61,62,64,65,66,68,69,70,71,73,74,75,77,78,79,80,82,84,86,88,90,91,93,95,97,99,100]
  }
};

let currentScoreSubject = 'ru';

// ==================== ДАННЫЕ ====================
function getScoreCurrent(subject) {
  try { return JSON.parse(localStorage.getItem('ege_current_' + subject) || '{}'); } catch { return {}; }
}
function saveScoreCurrent(subject, data) {
  localStorage.setItem('ege_current_' + subject, JSON.stringify(data));
}
function getScoreHistory(subject) {
  try { return JSON.parse(localStorage.getItem('ege_history_' + subject) || '[]'); } catch { return []; }
}
function saveScoreHistory(subject, history) {
  localStorage.setItem('ege_history_' + subject, JSON.stringify(history));
}

function calcPrimary(subject, scores) {
  return EGE_SUBJECTS[subject].tasks.reduce((s, t) => s + (scores[t.id] || 0), 0);
}
function calcSecondary(subject, primary) {
  const scale = EGE_SUBJECTS[subject].scale;
  return scale[Math.min(Math.max(primary, 0), scale.length - 1)];
}

// ==================== РЕНДЕР ====================
function renderScores() {
  renderScoresContent();
}
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
  const pct = Math.round(primary / subj.maxPrimary * 100);
  const secColor = secondary >= 61 ? 'var(--green)' : secondary >= 36 ? 'var(--yellow)' : 'var(--red)';
  const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  container.innerHTML = `
    <div class="score-summary-card">
      <div class="score-summary-row">
        <div class="score-block">
          <div class="score-big" id="score-primary-num">${primary}</div>
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
        <div class="score-bar"><div class="score-bar-fill" id="score-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
        <span class="score-bar-pct" id="score-bar-pct">${pct}%</span>
      </div>
    </div>

    <div class="score-section-header">
      <span class="score-section-title">Задания</span>
      <button class="score-link-btn" onclick="resetCurrentScores()">↺ Сбросить</button>
    </div>
    <div class="score-tasks-list" id="score-tasks-list">
      ${subj.tasks.map(t => buildTaskRowHTML(t, scores[t.id] || 0)).join('')}
    </div>

    <div style="padding:4px 0 20px">
      <button class="btn btn-primary" onclick="saveVariant()" style="width:100%">💾 Сохранить вариант</button>
    </div>

    ${buildAnalyticsHTML()}
    ${buildHistoryHTML()}
  `;
}

function buildTaskRowHTML(task, score) {
  const full = score === task.max;
  const partial = score > 0 && !full;
  const rowCls = full ? 'task-full' : partial ? 'task-partial' : '';

  if (task.isEssay) {
    return `<div class="score-task-row ${rowCls}" id="task-row-${task.id}">
      <div class="score-task-num">№${task.id}</div>
      <div class="score-task-name">${task.label}</div>
      <div class="essay-controls">
        <button class="essay-btn" onclick="adjustEssay(${task.id},-1,${task.max})">−</button>
        <span class="essay-val" id="essay-val-${task.id}">${score}</span>
        <span class="essay-sep">/${task.max}</span>
        <button class="essay-btn" onclick="adjustEssay(${task.id},1,${task.max})">+</button>
      </div>
    </div>`;
  }

  const options = task.options || Array.from({length: task.max + 1}, (_, i) => i);
  const btns = options.map(v => {
    const cls = v === 0 ? 'sbtn-zero' : v < task.max ? 'sbtn-mid' : 'sbtn-full';
    return `<button class="score-btn ${cls}${score===v?' s-active':''}" onclick="setTaskScore(${task.id},${v})">${v}</button>`;
  }).join('');

  return `<div class="score-task-row ${rowCls}" id="task-row-${task.id}">
    <div class="score-task-num">№${task.id}</div>
    <div class="score-task-maxlabel">${task.max > 1 ? 'max '+task.max : ''}</div>
    <div class="score-task-btns">${btns}</div>
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

  let html = `<div class="score-section-header">
    <span class="score-section-title">Аналитика</span>
    <span class="score-section-sub">${history.length} ${history.length===1?'вариант':history.length<5?'варианта':'вариантов'}</span>
  </div>
  <div class="analytics-summary-row">
    <div class="analytics-stat-card">
      <div class="analytics-stat-num">${calcSecondary(currentScoreSubject, avgPrimary)}</div>
      <div class="analytics-stat-label">Средний тестовый</div>
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
    html += `<div class="score-history-item">
      <div class="history-meta">
        <div class="history-name">${window.escapeHtml(v.label || 'Вариант')}</div>
        <div class="history-date">${date}</div>
      </div>
      <div class="history-scores">
        <span class="history-primary">${prim}/${subj.maxPrimary}</span>
        <span class="history-arrow">→</span>
        <span class="history-secondary" style="color:${secColor};font-weight:700">${sec}</span>
      </div>
      <button class="history-del-btn" onclick="deleteVariant(${idx})">✕</button>
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
  if (task && row) row.outerHTML = buildTaskRowHTML(task, score);

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
  const pct = Math.round(primary / subj.maxPrimary * 100);
  const secColor = secondary >= 61 ? 'var(--green)' : secondary >= 36 ? 'var(--yellow)' : 'var(--red)';
  const barColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  const pEl = document.getElementById('score-primary-num');
  if (pEl) pEl.textContent = primary;
  const sEl = document.getElementById('score-secondary-num');
  if (sEl) { sEl.textContent = secondary; sEl.style.color = secColor; }
  const fill = document.getElementById('score-bar-fill');
  if (fill) { fill.style.width = pct + '%'; fill.style.background = barColor; }
  const pctEl = document.getElementById('score-bar-pct');
  if (pctEl) pctEl.textContent = pct + '%';
}

function resetCurrentScores() {
  if (!confirm('Сбросить все баллы текущего варианта?')) return;
  saveScoreCurrent(currentScoreSubject, {});
  renderScoresContent();
}
window.resetCurrentScores = resetCurrentScores;

function saveVariant() {
  const scores = getScoreCurrent(currentScoreSubject);
  const primary = calcPrimary(currentScoreSubject, scores);
  if (primary === 0) { window.showToast('⚠️ Заполни хотя бы одно задание'); return; }
  const history = getScoreHistory(currentScoreSubject);
  const defaultLabel = 'Вариант ' + (history.length + 1);
  const label = prompt('Название варианта:', defaultLabel);
  if (label === null) return;
  history.push({ date: Date.now(), label: label.trim() || defaultLabel, tasks: { ...scores } });
  if (history.length > 30) history.shift();
  saveScoreHistory(currentScoreSubject, history);
  window.showToast('✓ Вариант сохранён');
  renderScoresContent();
}
window.saveVariant = saveVariant;

function deleteVariant(idx) {
  if (!confirm('Удалить этот вариант?')) return;
  const history = getScoreHistory(currentScoreSubject);
  history.splice(idx, 1);
  saveScoreHistory(currentScoreSubject, history);
  renderScoresContent();
}
window.deleteVariant = deleteVariant;
