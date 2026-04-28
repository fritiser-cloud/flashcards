// ==================== РАСПИСАНИЕ ====================

const SCHEDULE_KEY = 'study_schedule';
const SCHEDULE_END = new Date(2026, 5, 15); // 15 июня 2026
const SCHEDULE_HISTORY_START = new Date(2025, 8, 1); // 1 сентября 2025

let _schedShowPast = true;

const EXAM_DATES = {
  '2026-06-01': 'Химия',
  '2026-06-04': 'Русский язык',
  '2026-06-15': 'Биология',
};

const DAY_NAMES = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function dateToKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return dateToKey(new Date());
}

function getSchedule() {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveSchedule(data) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}

function getTodayTasks() {
  const schedule = getSchedule();
  return schedule[todayKey()] || [];
}

function toggleTaskDone(dateKey, taskId) {
  const schedule = getSchedule();
  const tasks = schedule[dateKey] || [];
  const task = tasks.find(t => t.id === taskId);
  if (task) task.done = !task.done;
  schedule[dateKey] = tasks;
  saveSchedule(schedule);
}

function addTask(dateKey, text) {
  if (!text.trim()) return null;
  const schedule = getSchedule();
  if (!schedule[dateKey]) schedule[dateKey] = [];
  const task = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), text: text.trim(), done: false };
  schedule[dateKey].push(task);
  saveSchedule(schedule);
  return task;
}

function deleteTask(dateKey, taskId) {
  const schedule = getSchedule();
  if (!schedule[dateKey]) return;
  schedule[dateKey] = schedule[dateKey].filter(t => t.id !== taskId);
  if (schedule[dateKey].length === 0) delete schedule[dateKey];
  saveSchedule(schedule);
}

function updateTaskText(dateKey, taskId, newText) {
  if (!newText.trim()) return;
  const schedule = getSchedule();
  const tasks = schedule[dateKey] || [];
  const task = tasks.find(t => t.id === taskId);
  if (task) task.text = newText.trim();
  schedule[dateKey] = tasks;
  saveSchedule(schedule);
}

// --- Render helpers ---

function renderTodayPlanWidget() {
  const tasks = getTodayTasks();
  const dateKey = todayKey();
  const examName = EXAM_DATES[dateKey];

  const examBadge = examName
    ? `<div class="sched-exam-badge"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Сегодня ${examName}</div>`
    : '';

  if (tasks.length === 0) {
    return `<div class="dash-today-plan">
      <div class="dash-plan-header">
        <span class="dash-plan-title">План на сегодня</span>
        <button class="dash-plan-edit-btn" onclick="window.navTo('schedule')" aria-label="Открыть расписание">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
      ${examBadge}
      <div class="dash-plan-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.35"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Задач нет — <a href="#" onclick="event.preventDefault();window.navTo('schedule')" class="dash-plan-link">добавить</a></span>
      </div>
    </div>`;
  }

  const done = tasks.filter(t => t.done).length;
  const progressPct = Math.round((done / tasks.length) * 100);

  const items = tasks.map(t => `
    <div class="dash-plan-item ${t.done ? 'done' : ''}" data-id="${t.id}" data-date="${dateKey}">
      <button class="dash-plan-check" onclick="window.scheduleToggle('${dateKey}','${t.id}')" aria-label="Отметить">
        ${t.done
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
          : ''}
      </button>
      <span class="dash-plan-text">${escapeHtml(t.text)}</span>
    </div>`).join('');

  return `<div class="dash-today-plan">
    <div class="dash-plan-header">
      <span class="dash-plan-title">План на сегодня</span>
      <button class="dash-plan-edit-btn" onclick="window.navTo('schedule')" aria-label="Открыть расписание">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
    ${examBadge}
    <div class="dash-plan-progress-bar"><div class="dash-plan-progress-fill" style="width:${progressPct}%"></div></div>
    <div class="dash-plan-count">${done} из ${tasks.length} выполнено</div>
    <div class="dash-plan-items">${items}</div>
  </div>`;
}

window.scheduleToggle = function(dateKey, taskId) {
  toggleTaskDone(dateKey, taskId);
  const widget = document.getElementById('dash-today-plan-widget');
  if (widget) widget.innerHTML = renderTodayPlanWidget();
};

// --- Full schedule screen ---

function renderScheduleScreen() {
  const screen = document.getElementById('schedule-screen');
  if (!screen) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(SCHEDULE_END);
  end.setHours(0, 0, 0, 0);

  const schedule = getSchedule();

  // Build list of days
  const days = [];

  if (_schedShowPast) {
    // Find earliest key in schedule that's before today
    const histStart = new Date(SCHEDULE_HISTORY_START);
    histStart.setHours(0, 0, 0, 0);
    let pastCur = new Date(histStart);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    while (pastCur <= yesterday) {
      days.push(new Date(pastCur));
      pastCur.setDate(pastCur.getDate() + 1);
    }
  }

  let cur = new Date(today);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  // Group by ISO week (Mon-Sun)
  function getWeekStart(d) {
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return dateToKey(mon);
  }

  const weeks = [];
  let currentWeekKey = null;
  let currentWeek = null;
  for (const d of days) {
    const wk = getWeekStart(d);
    if (wk !== currentWeekKey) {
      currentWeekKey = wk;
      currentWeek = { key: wk, days: [] };
      weeks.push(currentWeek);
    }
    currentWeek.days.push(d);
  }

  function formatWeekLabel(week) {
    const first = week.days[0];
    const last = week.days[week.days.length - 1];
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} — ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;
  }

  function renderDay(d) {
    const key = dateToKey(d);
    const isToday = key === todayKey();
    const isPast = d < today;
    const examName = EXAM_DATES[key];
    const tasks = schedule[key] || [];
    const done = tasks.filter(t => t.done).length;

    const taskItems = tasks.map(t => `
      <div class="sched-task-item ${t.done ? 'done' : ''}">
        <button class="sched-task-check" onclick="window.schedTaskToggle('${key}','${t.id}')" aria-label="Отметить">
          ${t.done
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : ''}
        </button>
        <span class="sched-task-text" contenteditable="false" data-key="${key}" data-id="${t.id}">${escapeHtml(t.text)}</span>
        <button class="sched-task-del" onclick="window.schedTaskDelete('${key}','${t.id}')" aria-label="Удалить">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('');

    const progressBar = tasks.length > 0
      ? `<div class="sched-day-progress"><div class="sched-day-progress-fill" style="width:${Math.round(done/tasks.length*100)}%"></div></div>`
      : '';

    return `<div class="sched-day-row ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" id="sched-day-${key}">
      <div class="sched-day-header">
        <div class="sched-day-date">
          <span class="sched-day-num">${d.getDate()}</span>
          <span class="sched-day-name">${DAY_NAMES[d.getDay()]}</span>
          ${isToday ? '<span class="sched-today-badge">сегодня</span>' : ''}
        </div>
        ${examName ? `<span class="sched-exam-pill">${examName}</span>` : ''}
        ${progressBar}
        <button class="sched-add-btn" onclick="window.schedAddTaskPrompt('${key}')" aria-label="Добавить задачу">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div class="sched-task-list" id="sched-tasks-${key}">${taskItems}</div>
      <div class="sched-inline-add" id="sched-add-${key}" style="display:none">
        <input class="sched-inline-input" id="sched-input-${key}" type="text" placeholder="Что нужно сделать..." maxlength="200"
          onkeydown="if(event.key==='Enter')window.schedConfirmAdd('${key}');if(event.key==='Escape')window.schedCancelAdd('${key}')">
        <button class="sched-inline-ok" onclick="window.schedConfirmAdd('${key}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="sched-inline-cancel" onclick="window.schedCancelAdd('${key}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`;
  }

  const weeksHtml = weeks.map(week => {
    const hasTasks = week.days.some(d => (schedule[dateToKey(d)] || []).length > 0);
    const isCurrentWeek = week.days.some(d => dateToKey(d) === todayKey());
    return `<div class="sched-week-group ${isCurrentWeek ? 'current-week' : ''}">
      <div class="sched-week-label">${formatWeekLabel(week)}</div>
      ${week.days.map(renderDay).join('')}
    </div>`;
  }).join('');

  const totalDays = days.length;
  const daysWithTasks = Object.keys(schedule).filter(k => {
    const d = new Date(k + 'T00:00:00');
    return d >= today && d <= end && schedule[k].length > 0;
  }).length;

  // Week progress: Mon–Sun of current week
  function getCurrentWeekProgress() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dow = now.getDay(); // 0=Sun
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    let weekTotal = 0, weekDone = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const k = dateToKey(d);
      const tasks = schedule[k] || [];
      weekTotal += tasks.length;
      weekDone += tasks.filter(t => t.done).length;
    }
    return { weekTotal, weekDone };
  }
  const { weekTotal, weekDone } = getCurrentWeekProgress();
  const weekPct = weekTotal > 0 ? Math.round(weekDone / weekTotal * 100) : 0;
  const weekProgressHtml = weekTotal > 0 ? `
    <div class="sched-week-progress-bar-wrap">
      <div class="sched-week-progress-top">
        <span class="sched-week-progress-label">Прогресс этой недели</span>
        <span class="sched-week-progress-count">${weekDone} из ${weekTotal} задач</span>
      </div>
      <div class="sched-week-progress-track">
        <div class="sched-week-progress-fill" style="width:${weekPct}%"></div>
      </div>
    </div>` : '';

  screen.innerHTML = `
    <div class="nav">
      <button class="nav-btn" onclick="window.navTo('library')" aria-label="Назад">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="nav-title">Расписание</div>
      <div style="width:44px"></div>
    </div>
    <div class="scroll" id="schedule-scroll">
      <div class="sched-summary">
        <div class="sched-summary-item">
          <div class="sched-summary-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="sched-summary-text">
            <div class="sched-summary-num">${totalDays}</div>
            <div class="sched-summary-label">дней до ЕГЭ</div>
          </div>
        </div>
        <div class="sched-summary-item">
          <div class="sched-summary-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div class="sched-summary-text">
            <div class="sched-summary-num">${daysWithTasks}</div>
            <div class="sched-summary-label">дней с планом</div>
          </div>
        </div>
        <div class="sched-summary-item">
          <div class="sched-summary-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="sched-summary-text">
            <div class="sched-summary-num">3</div>
            <div class="sched-summary-label">экзамена</div>
          </div>
        </div>
      </div>
      ${weekProgressHtml}
      <div class="sched-weeks">${weeksHtml}</div>
    </div>
  `;

  // Scroll to today
  requestAnimationFrame(() => {
    const todayEl = document.getElementById(`sched-day-${todayKey()}`);
    if (todayEl) todayEl.scrollIntoView({ behavior: _schedShowPast ? 'instant' : 'smooth', block: 'start' });
  });
}

// --- Schedule screen actions ---

window.schedTaskToggle = function(dateKey, taskId) {
  toggleTaskDone(dateKey, taskId);
  rerenderSchedDay(dateKey);
  // Also refresh dashboard widget if visible
  const widget = document.getElementById('dash-today-plan-widget');
  if (widget && dateKey === todayKey()) widget.innerHTML = renderTodayPlanWidget();
};

window.schedTaskDelete = function(dateKey, taskId) {
  deleteTask(dateKey, taskId);
  rerenderSchedDay(dateKey);
  const widget = document.getElementById('dash-today-plan-widget');
  if (widget && dateKey === todayKey()) widget.innerHTML = renderTodayPlanWidget();
};

window.schedAddTaskPrompt = function(dateKey) {
  const addRow = document.getElementById(`sched-add-${dateKey}`);
  const input = document.getElementById(`sched-input-${dateKey}`);
  if (!addRow) return;
  addRow.style.display = 'flex';
  if (input) { input.value = ''; input.focus(); }
};

window.schedConfirmAdd = function(dateKey) {
  const input = document.getElementById(`sched-input-${dateKey}`);
  if (!input || !input.value.trim()) { window.schedCancelAdd(dateKey); return; }
  addTask(dateKey, input.value);
  window.schedCancelAdd(dateKey);
  rerenderSchedDay(dateKey);
  const widget = document.getElementById('dash-today-plan-widget');
  if (widget && dateKey === todayKey()) widget.innerHTML = renderTodayPlanWidget();
};

window.schedCancelAdd = function(dateKey) {
  const addRow = document.getElementById(`sched-add-${dateKey}`);
  if (addRow) addRow.style.display = 'none';
};

function rerenderSchedDay(dateKey) {
  const d = new Date(dateKey + 'T00:00:00'); // local midnight, not UTC
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = dateKey === todayKey();
  const isPast = d < today;
  const examName = EXAM_DATES[dateKey];
  const schedule = getSchedule();
  const tasks = schedule[dateKey] || [];
  const done = tasks.filter(t => t.done).length;

  const taskItems = tasks.map(t => `
    <div class="sched-task-item ${t.done ? 'done' : ''}">
      <button class="sched-task-check" onclick="window.schedTaskToggle('${dateKey}','${t.id}')" aria-label="Отметить">
        ${t.done
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
          : ''}
      </button>
      <span class="sched-task-text" data-key="${dateKey}" data-id="${t.id}">${escapeHtml(t.text)}</span>
      <button class="sched-task-del" onclick="window.schedTaskDelete('${dateKey}','${t.id}')" aria-label="Удалить">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');

  const progressBar = tasks.length > 0
    ? `<div class="sched-day-progress"><div class="sched-day-progress-fill" style="width:${Math.round(done/tasks.length*100)}%"></div></div>`
    : '';

  const container = document.getElementById(`sched-day-${dateKey}`);
  if (!container) return;
  container.innerHTML = `
    <div class="sched-day-header">
      <div class="sched-day-date">
        <span class="sched-day-num">${d.getDate()}</span>
        <span class="sched-day-name">${DAY_NAMES[d.getDay()]}</span>
        ${isToday ? '<span class="sched-today-badge">сегодня</span>' : ''}
      </div>
      ${examName ? `<span class="sched-exam-pill">${examName}</span>` : ''}
      ${progressBar}
      <button class="sched-add-btn" onclick="window.schedAddTaskPrompt('${dateKey}')" aria-label="Добавить задачу">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
    <div class="sched-task-list" id="sched-tasks-${dateKey}">${taskItems}</div>
    <div class="sched-inline-add" id="sched-add-${dateKey}" style="display:none">
      <input class="sched-inline-input" id="sched-input-${dateKey}" type="text" placeholder="Что нужно сделать..." maxlength="200"
        onkeydown="if(event.key==='Enter')window.schedConfirmAdd('${dateKey}');if(event.key==='Escape')window.schedCancelAdd('${dateKey}')">
      <button class="sched-inline-ok" onclick="window.schedConfirmAdd('${dateKey}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="sched-inline-cancel" onclick="window.schedCancelAdd('${dateKey}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
}

window.renderScheduleScreen = renderScheduleScreen;

window.schedTogglePast = function() {
  _schedShowPast = !_schedShowPast;
  renderScheduleScreen();
};
window.renderTodayPlanWidget = renderTodayPlanWidget;
