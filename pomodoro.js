// ==================== ТАЙМЕР ПОМОДОРО ====================

const POMODORO_WORK = 25 * 60;   // 25 минут
const POMODORO_BREAK = 5 * 60;   // 5 минут

let _pomState = {
  running: false,
  isBreak: false,
  remaining: POMODORO_WORK,
  sessions: 0,
  intervalId: null,
};

function _pomFormatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function _pomRenderWidget() {
  const el = document.getElementById('pomodoro-widget');
  if (!el) return;

  const total = _pomState.isBreak ? POMODORO_BREAK : POMODORO_WORK;
  const elapsed = total - _pomState.remaining;
  const pct = elapsed / total;

  // SVG circle progress
  const R = 28, C = 2 * Math.PI * R;
  const dash = (pct * C).toFixed(2);
  const gap = (C - pct * C).toFixed(2);
  const circleColor = _pomState.isBreak ? 'var(--green)' : 'var(--lavender-deep)';

  el.innerHTML = `
    <div class="pom-widget">
      <div class="pom-top">
        <div class="pom-title-row">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${circleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span class="pom-label">${_pomState.isBreak ? 'Перерыв' : 'Фокус'}</span>
          ${_pomState.sessions > 0 ? `<span class="pom-sessions">${_pomState.sessions} ${_pomState.sessions === 1 ? 'сессия' : _pomState.sessions < 5 ? 'сессии' : 'сессий'}</span>` : ''}
        </div>
        <button class="pom-reset-btn" onclick="window.pomReset()" title="Сбросить">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
        </button>
      </div>
      <div class="pom-body">
        <div class="pom-circle-wrap">
          <svg class="pom-circle-svg" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
            <circle cx="36" cy="36" r="${R}" fill="none" stroke="var(--border)" stroke-width="5"/>
            <circle cx="36" cy="36" r="${R}" fill="none" stroke="${circleColor}" stroke-width="5"
              stroke-dasharray="${dash} ${gap}"
              stroke-dashoffset="${(C * 0.25).toFixed(2)}"
              stroke-linecap="round"
              style="transition: stroke-dasharray 0.5s ease;"/>
          </svg>
          <div class="pom-time">${_pomFormatTime(_pomState.remaining)}</div>
        </div>
        <div class="pom-controls">
          <button class="pom-btn ${_pomState.running ? 'pom-btn-pause' : 'pom-btn-play'}" onclick="window.pomToggle()">
            ${_pomState.running
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
            }
            ${_pomState.running ? 'Пауза' : (_pomState.remaining < total ? 'Продолжить' : 'Старт')}
          </button>
          ${!_pomState.isBreak && _pomState.running
            ? `<button class="pom-btn pom-btn-skip" onclick="window.pomSkip()" title="Пропустить к перерыву">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
              </button>`
            : ''}
        </div>
      </div>
    </div>
  `;
}

window.pomToggle = function() {
  if (_pomState.running) {
    clearInterval(_pomState.intervalId);
    _pomState.running = false;
  } else {
    _pomState.running = true;
    _pomState.intervalId = setInterval(() => {
      _pomState.remaining--;
      if (_pomState.remaining <= 0) {
        clearInterval(_pomState.intervalId);
        _pomState.running = false;
        if (!_pomState.isBreak) {
          _pomState.sessions++;
          _pomState.isBreak = true;
          _pomState.remaining = POMODORO_BREAK;
          window.showToast('Сессия завершена! Время для перерыва');
        } else {
          _pomState.isBreak = false;
          _pomState.remaining = POMODORO_WORK;
          window.showToast('Перерыв окончен! Начинаем новую сессию');
        }
      }
      _pomRenderWidget();
    }, 1000);
  }
  _pomRenderWidget();
};

window.pomReset = function() {
  clearInterval(_pomState.intervalId);
  _pomState.running = false;
  _pomState.isBreak = false;
  _pomState.remaining = POMODORO_WORK;
  _pomRenderWidget();
};

window.pomSkip = function() {
  clearInterval(_pomState.intervalId);
  _pomState.running = false;
  _pomState.sessions++;
  _pomState.isBreak = true;
  _pomState.remaining = POMODORO_BREAK;
  _pomRenderWidget();
  window.showToast('Переходим к перерыву');
};

window.renderPomodoroWidget = function() {
  _pomRenderWidget();
};
