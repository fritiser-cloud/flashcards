// calendar.js
let currentReviewItem = null;
let reviewSessionQueue = [];
let reviewSessionIdx = 0;
let calendarSearchQuery = '';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ========== АЛГОРИТМ SM-2 ==========
function calculateNextReview(reviewItem, quality) {
  if (quality < 2) {
    return {
      repetitions: 0,
      easiness: 2.5,
      interval: 1,
      next_review_date: addDays(new Date(), 1)
    };
  }
  let repetitions = reviewItem.repetitions || 0;
  let easiness = reviewItem.easiness || 2.5;
  let interval = reviewItem.interval || 1;
  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easiness < 1.3) easiness = 1.3;
  if (repetitions === 0) interval = 1;
  else if (repetitions === 1) interval = 6;
  else interval = Math.round(interval * easiness);
  repetitions++;
  return {
    repetitions: repetitions,
    easiness: easiness,
    interval: interval,
    next_review_date: addDays(new Date(), interval)
  };
}

// ========== ОТРИСОВКА КАЛЕНДАРЯ ==========
async function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  let startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  let endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  
  let html = `<div class="calendar-header">
                <button class="calendar-nav" onclick="changeMonth(-1)">←</button>
                <h2>${today.toLocaleString('ru', { month: 'long', year: 'numeric' })}</h2>
                <button class="calendar-nav" onclick="changeMonth(1)">→</button>
              </div>
              <div class="calendar-weekdays">
                <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
              </div>
              <div class="calendar-days">`;
  
  const reviews = await window.getUpcomingReviews();
  const reviewMap = new Map();
  reviews.forEach(review => {
    const dateKey = formatDate(new Date(review.next_review_date));
    if (!reviewMap.has(dateKey)) reviewMap.set(dateKey, []);
    reviewMap.get(dateKey).push(review);
  });
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = formatDate(currentDate);
    const isToday = formatDate(today) === dateKey;
    const hasReviews = reviewMap.has(dateKey);
    const reviewCount = hasReviews ? reviewMap.get(dateKey).length : 0;
    html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasReviews ? 'has-reviews' : ''}" 
                  data-date="${dateKey}" onclick="window.selectDate('${dateKey}')">
              <span class="day-number">${currentDate.getDate()}</span>
              ${hasReviews ? `<span class="review-badge">${reviewCount}</span>` : ''}
            </div>`;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  html += `</div>`;
  container.innerHTML = html;
}
window.renderCalendar = renderCalendar;

// Переключение месяца (простая заглушка, можно расширить)
function changeMonth(delta) {
  const newDate = new Date();
  newDate.setMonth(newDate.getMonth() + delta);
  // Для полной реализации нужно хранить текущий месяц, но для демо перезагружаем календарь
  renderCalendar();
}
window.changeMonth = changeMonth;

// ========== ПОИСК ==========
function searchCalendar() {
  const input = document.getElementById('calendar-search');
  if (input) calendarSearchQuery = input.value.toLowerCase();
  renderUpcomingReviews();
}
window.searchCalendar = searchCalendar;

// ========== ДОБАВЛЕНИЕ ТЕМЫ ==========
function showAddTopicModal() {
  document.getElementById('topic-name').value = '';
  document.getElementById('topic-subject').value = 'bio';
  document.getElementById('topic-first-review').value = formatDate(new Date());
  document.getElementById('topic-modal').classList.add('open');
}
window.showAddTopicModal = showAddTopicModal;

function closeTopicModal() {
  document.getElementById('topic-modal').classList.remove('open');
}
window.closeTopicModal = closeTopicModal;

async function saveTopic() {
  const name = document.getElementById('topic-name').value.trim();
  const subject = document.getElementById('topic-subject').value;
  const firstReviewDate = document.getElementById('topic-first-review').value;
  if (!name) { window.showToast('⚠️ Введите название темы'); return; }
  const reviewItem = {
    name: name,
    subject: subject,
    created_at: new Date().toISOString(),
    next_review_date: new Date(firstReviewDate),
    repetitions: 0,
    easiness: 2.5,
    interval: 1,
    last_quality: null
  };
  await window.dbPut('reviews', reviewItem);
  window.showToast(`✓ Тема "${name}" добавлена`);
  closeTopicModal();
  renderCalendar();
  renderUpcomingReviews();
}
window.saveTopic = saveTopic;

// ========== ОТРИСОВКА БЛИЖАЙШИХ ПОВТОРЕНИЙ ==========
async function renderUpcomingReviews() {
  const container = document.getElementById('upcoming-reviews');
  if (!container) return;
  let reviews = await window.getUpcomingReviews();
  if (calendarSearchQuery) {
    reviews = reviews.filter(r => r.name.toLowerCase().includes(calendarSearchQuery));
  }
  const sorted = reviews.sort((a, b) => new Date(a.next_review_date) - new Date(b.next_review_date));
  const upcoming = sorted.slice(0, 10);
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Нет запланированных повторений</div></div>';
    return;
  }
  container.innerHTML = '';
  const subjectNames = { bio: '🧬 Биология', ru: '📖 Русский', phys: '⚛️ Физика', chem: '🧪 Химия' };
  upcoming.forEach(review => {
    const date = new Date(review.next_review_date);
    const isOverdue = date < new Date();
    const item = document.createElement('div');
    item.className = `review-item ${isOverdue ? 'overdue' : ''}`;
    item.innerHTML = `
      <div class="review-item-info">
        <div class="review-item-name">${window.escapeHtml(review.name)}</div>
        <div class="review-item-subject">${subjectNames[review.subject] || '📚 Другое'}</div>
      </div>
      <div class="review-item-date">${date.toLocaleDateString('ru')}</div>
      <button class="review-item-btn" onclick="window.startReview(${review.id})">Повторить</button>
    `;
    container.appendChild(item);
  });
}
window.renderUpcomingReviews = renderUpcomingReviews;

// ========== ЗАПУСК СЕССИИ ПОВТОРЕНИЯ ==========
async function selectDate(dateKey) {
  const reviews = await window.getReviewsForDate(new Date(dateKey));
  if (reviews.length === 0) { window.showToast('📭 На этот день нет запланированных повторений'); return; }
  reviewSessionQueue = reviews;
  reviewSessionIdx = 0;
  window.showScreen('review-screen');
  showReviewCard();
}
window.selectDate = selectDate;

async function startReview(id) {
  const allReviews = await window.dbGetAll('reviews');
  const review = allReviews.find(r => r.id === id);
  if (!review) return;
  reviewSessionQueue = [review];
  reviewSessionIdx = 0;
  window.showScreen('review-screen');
  showReviewCard();
}
window.startReview = startReview;

function showReviewCard() {
  if (reviewSessionIdx >= reviewSessionQueue.length) {
    showReviewCompletion();
    return;
  }
  currentReviewItem = reviewSessionQueue[reviewSessionIdx];
  const progress = document.getElementById('review-progress');
  if (progress) progress.textContent = `${reviewSessionIdx + 1} / ${reviewSessionQueue.length}`;
  const progFill = document.getElementById('review-progress-fill');
  if (progFill) progFill.style.width = `${(reviewSessionIdx / reviewSessionQueue.length) * 100}%`;
  const questionEl = document.getElementById('review-question');
  if (questionEl) questionEl.textContent = currentReviewItem.name;
  const answerArea = document.getElementById('review-answer-area');
  if (answerArea) {
    answerArea.innerHTML = `
      <div class="review-quality-buttons">
        <button class="quality-btn quality-bad" onclick="window.submitReviewQuality(0)">😖 Забыл</button>
        <button class="quality-btn quality-hard" onclick="window.submitReviewQuality(2)">😐 С трудом</button>
        <button class="quality-btn quality-good" onclick="window.submitReviewQuality(4)">😊 Нормально</button>
        <button class="quality-btn quality-easy" onclick="window.submitReviewQuality(5)">😎 Легко</button>
      </div>
    `;
  }
  // сбросить переворот карточки
  const flashcard = document.getElementById('review-flashcard');
  if (flashcard) flashcard.classList.remove('flipped');
}
window.showReviewCard = showReviewCard;

function toggleReviewAnswer() {
  const flashcard = document.getElementById('review-flashcard');
  if (flashcard) flashcard.classList.toggle('flipped');
}
window.toggleReviewAnswer = toggleReviewAnswer;

async function submitReviewQuality(quality) {
  const next = calculateNextReview(currentReviewItem, quality);
  await window.dbPut('reviews', {
    ...currentReviewItem,
    repetitions: next.repetitions,
    easiness: next.easiness,
    interval: next.interval,
    next_review_date: next.next_review_date,
    last_quality: quality
  });
  reviewSessionIdx++;
  showReviewCard();
}
window.submitReviewQuality = submitReviewQuality;

function showReviewCompletion() {
  window.showToast('🎉 Отлично! Все повторения завершены');
  window.showScreen('calendar-screen');
  renderCalendar();
  renderUpcomingReviews();
}
window.showReviewCompletion = showReviewCompletion;

function exitReview() {
  window.showScreen('calendar-screen');
  renderCalendar();
  renderUpcomingReviews();
}
window.exitReview = exitReview;