// ==================== УТИЛИТЫ ====================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

function getElement(id) {
  const el = document.getElementById(id);
  if (!el && !id.startsWith('note-') && !id.startsWith('atlas-') && !id.startsWith('match-')) {
    console.warn(`Element #${id} not found`);
  }
  return el;
}
window.getElement = getElement;

let toastTimer;
function showToast(msg) {
  const t = getElement('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
window.showToast = showToast;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = getElement(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  
  const bottomNav = document.querySelector('.bottom-nav');
  if (!bottomNav) return;
  const hideNavScreens = ['guide-detail-screen', 'study-screen', 'match-screen', 'results-screen', 'errors-screen', 'note-editor-screen', 'atlas-detail-screen', 'atlas-editor-screen', 'pdf-viewer-screen'];
  if (hideNavScreens.includes(id)) bottomNav.classList.add('hidden');
  else bottomNav.classList.remove('hidden');
}
window.showScreen = showScreen;

function navTo(tab) {
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = getElement('nav-' + tab);
  if (btn) btn.classList.add('active');
  
  if (tab === 'library') { showScreen('library-screen'); if (window.renderLibrary) window.renderLibrary(); }
  else if (tab === 'decks') { showScreen('decks-screen'); if (window.renderDecks) window.renderDecks(); }
  else if (tab === 'atlas') { showScreen('atlas-screen'); if (window.renderAtlas) window.renderAtlas(); }
  else if (tab === 'notes') { showScreen('notes-screen'); if (window.renderNotes) window.renderNotes(); }
  else if (tab === 'settings') { showScreen('settings-screen'); if (window.renderSettings) window.renderSettings(); }
}
window.navTo = navTo;

function safeMarkdown(text) {
  if (!text) return '';
  if (typeof marked === 'undefined' || !marked.parse) {
    // marked library not loaded — return escaped plain text
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  const html = marked.parse(text);
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    });
  });
  return div.innerHTML;
}
window.safeMarkdown = safeMarkdown;

function plural(n, one, few, many) {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return few;
  return many;
}
window.plural = plural;
