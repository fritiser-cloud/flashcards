// ==================== ДАШБОРД ====================
const EXAMS = [
  { name: 'Химия',    date: new Date(2026, 5, 1),  subject: 'Химия' },
  { name: 'Русский',  date: new Date(2026, 5, 4),  subject: 'Русский' },
  { name: 'Биология', date: new Date(2026, 5, 15), subject: 'Биология' },
];

function daysUntil(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = date - today;
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getStreak() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = localStorage.getItem('streak_last_date');
  let streak = parseInt(localStorage.getItem('streak_count') || '0');
  if (!lastDate) return streak;
  const last = new Date(lastDate);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - last) / 86400000);
  if (diffDays <= 1) return streak;
  return 0;
}

function updateStreak() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const lastDate = localStorage.getItem('streak_last_date');
  let streak = parseInt(localStorage.getItem('streak_count') || '0');
  if (lastDate === todayStr) return streak;
  const last = lastDate ? new Date(lastDate) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - last) / 86400000);
    streak = diffDays === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }
  localStorage.setItem('streak_last_date', todayStr);
  localStorage.setItem('streak_count', String(streak));
  return streak;
}
window.updateStreak = updateStreak;

async function renderDashboard() {
  const container = document.getElementById('dashboard-section');
  if (!container) return;

  let todayCount = 0;
  try {
    const allStats = await window.dbGetAll('stats');
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    todayCount = allStats.filter(s => s.updatedAt >= todayMidnight.getTime()).length;
    if (todayCount > 0) updateStreak();
  } catch(e) { /* ignore */ }

  const streak = getStreak();

  let notesCount = 0;
  try {
    const notes = window.getNotes ? window.getNotes() : [];
    notesCount = notes.filter(n => !n.deleted).length;
  } catch(e) { /* ignore */ }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const examCards = EXAMS.map(ex => {
    const days = daysUntil(ex.date);
    const cls = days <= 14 ? 'urgent' : days <= 30 ? 'soon' : '';
    return `<div class="dash-exam-card ${cls}">
      <div class="dash-exam-days">${days}</div>
      <div class="dash-exam-label">дн.</div>
      <div class="dash-exam-name">${ex.name}</div>
    </div>`;
  }).join('');

  const streakHtml = streak > 0
    ? `<div class="dash-stat-card">
        <div class="dash-stat-num">${streak}</div>
        <div class="dash-stat-label">дней подряд</div>
      </div>`
    : '';

  const todayPlanHtml = window.renderTodayPlanWidget ? window.renderTodayPlanWidget() : '';

  container.innerHTML = `
    <div class="dash-hero">
      <div class="dash-greeting">${greeting}</div>
      <div class="dash-title">Подготовка к ЕГЭ</div>
      <div class="dash-sub">До экзаменов осталось:</div>
      <div class="dash-exams">${examCards}</div>
    </div>
    <div class="dash-stats">
      ${streakHtml}
    </div>
    <div id="pomodoro-widget"></div>
    <div id="dash-today-plan-widget">${todayPlanHtml}</div>
    <div class="dash-quick-actions">
      <button class="dash-quick-btn" onclick="window.navTo('decks')">
        <i data-lucide="layers" style="width:20px;height:20px;stroke:var(--lavender-text)"></i>
        <span>Карточки</span>
      </button>
      <button class="dash-quick-btn" onclick="window.navTo('notes')">
        <i data-lucide="notebook-pen" style="width:20px;height:20px;stroke:var(--lavender-text)"></i>
        <span>Заметки</span>
      </button>
      <button class="dash-quick-btn" onclick="window.navTo('atlas')">
        <i data-lucide="map" style="width:20px;height:20px;stroke:var(--lavender-text)"></i>
        <span>Атлас</span>
      </button>
    </div>
    <div class="dash-section-title">Пособия</div>
  `;
  if (window.lucide) window.lucide.createIcons();
  if (window.renderPomodoroWidget) window.renderPomodoroWidget();
}
window.renderDashboard = renderDashboard;

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    const screen = document.getElementById('library-screen');
    if (screen && screen.classList.contains('active')) renderDashboard();
  });
  const libraryScreen = document.getElementById('library-screen');
  if (libraryScreen) observer.observe(libraryScreen, { attributes: true, attributeFilter: ['class'] });
  renderDashboard();
});
