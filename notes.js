// ==================== ЗАМЕТКИ ====================
let currentNoteId = null;
let currentNoteFolder = 'all';
let isPreviewMode = false;
let noteIsEditMode = false;

function renderNotes() {
  const notes = getNotes();
  const list = getElement('notes-list');
  if (!list) return;
  const searchQuery = getElement('notes-search')?.value.toLowerCase() || '';
  let filtered = (currentNoteFolder === 'all' ? notes : notes.filter(n => n.folder === currentNoteFolder)).filter(n => !n.deleted);
  if (searchQuery) filtered = filtered.filter(n => n.title.toLowerCase().includes(searchQuery) || n.content.toLowerCase().includes(searchQuery));
  filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">Нет заметок</div><div class="empty-state-sub">Нажми + чтобы создать первую заметку</div></div>`;
    return;
  }
  list.innerHTML = '';
  const folderLabels = { work: '💼 Работа', study: '📚 Учёба', personal: '✨ Личное', ideas: '💡 Идеи' };
  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = `note-card ${note.folder}`;
    const preview = (note.content || '').replace(/[#*`>\-\[\]]/g, '').trim().substring(0, 150);
    const date = new Date(note.updatedAt);
    const timeAgo = formatTimeAgo(date);
    card.innerHTML = `
      <div class="note-header">
        <div class="note-title">${escapeHtml(note.title) || 'Без названия'}</div>
        <div class="note-date">${timeAgo}</div>
      </div>
      <div class="note-preview">${escapeHtml(preview) || 'Пустая заметка'}</div>
      <div class="note-folder ${note.folder}">${folderLabels[note.folder]}</div>`;
    card.onclick = () => openNoteEditor(note.id);
    list.appendChild(card);
  });
}
window.renderNotes = renderNotes;

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
window.formatTimeAgo = formatTimeAgo;

function filterNotesByFolder(folder, btn) {
  currentNoteFolder = folder;
  document.querySelectorAll('.folder-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotes();
}
window.filterNotesByFolder = filterNotesByFolder;

function searchNotes() { renderNotes(); }
window.searchNotes = searchNotes;

function createNote() {
  const notes = getNotes();
  const newNote = {
    id: Date.now().toString(),
    title: '',
    content: '',
    folder: 'personal',
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  notes.push(newNote);
  saveNotes(notes);
  currentNoteId = newNote.id;
  getElement('note-title').value = '';
  getElement('note-content').value = '';
  getElement('note-folder').value = 'personal';
  setNoteMode(true); // new notes open in edit mode
  showScreen('note-editor-screen');
}
window.createNote = createNote;

function openNoteEditor(noteId) {
  currentNoteId = noteId;
  const notes = getNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  if (!note.images) note.images = [];
  getElement('note-title').value = note.title || '';
  getElement('note-content').value = note.content || '';
  getElement('note-folder').value = note.folder || 'personal';
  // Open in VIEW mode by default
  setNoteMode(false);
  showScreen('note-editor-screen');
}
window.openNoteEditor = openNoteEditor;

function setNoteMode(editMode) {
  noteIsEditMode = editMode;
  const titleInput = getElement('note-title');
  const titleView = getElement('note-title-view');
  const content = getElement('note-content');
  const preview = getElement('note-preview');
  const toolbar = getElement('note-editor-toolbar');
  const modeBtn = getElement('note-mode-btn');
  const saveBtn = getElement('note-save-btn');
  const printBtn = getElement('note-print-btn');
  const gallery = getElement('note-images-gallery');

  if (editMode) {
    // EDIT mode
    if (titleView) titleView.style.display = 'none';
    if (titleInput) titleInput.style.display = '';
    if (toolbar) toolbar.style.display = '';
    if (content) content.style.display = '';
    if (preview) preview.style.display = 'none';
    if (saveBtn) saveBtn.style.display = '';
    if (printBtn) printBtn.style.display = 'none';
    if (modeBtn) modeBtn.innerHTML = '<i data-lucide="eye"></i>';
    const notes = getNotes();
    const note = notes.find(n => n.id === currentNoteId);
    renderNoteImages(note?.images || []);
  } else {
    // VIEW mode
    const title = getElement('note-title')?.value || 'Без названия';
    if (titleView) { titleView.textContent = title; titleView.style.display = ''; }
    if (titleInput) titleInput.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    if (gallery) gallery.style.display = 'none';
    if (content) content.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    if (printBtn) printBtn.style.display = '';
    if (modeBtn) modeBtn.innerHTML = '<i data-lucide="pencil"></i>';
    // Render markdown with image substitution
    const notes = getNotes();
    const note = notes.find(n => n.id === currentNoteId);
    let markdown = getElement('note-content')?.value || '';
    if (note?.images) {
      markdown = markdown.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (match, alt, idx) => {
        const img = note.images[parseInt(idx)];
        return img ? `![${alt}](${img})` : match;
      });
    }
    if (preview) {
      preview.innerHTML = window.safeMarkdown ? window.safeMarkdown(markdown) : markdown;
      preview.style.display = '';
    }
  }
  if (window.lucide) window.lucide.createIcons();
}
window.setNoteMode = setNoteMode;

function toggleNoteMode() {
  if (noteIsEditMode) {
    saveNote();
    setNoteMode(false);
  } else {
    setNoteMode(true);
    setTimeout(() => getElement('note-content')?.focus(), 50);
  }
}
window.toggleNoteMode = toggleNoteMode;

function closeNoteEditor() {
  if (noteIsEditMode) saveNote();
  showScreen('notes-screen');
  renderNotes();
}
window.closeNoteEditor = closeNoteEditor;

function saveNote() {
  if (!currentNoteId) return;
  const notes = getNotes();
  const noteIndex = notes.findIndex(n => n.id === currentNoteId);
  if (noteIndex === -1) return;
  const title = getElement('note-title')?.value.trim() || '';
  const content = getElement('note-content')?.value || '';
  const folder = getElement('note-folder')?.value || 'personal';
  notes[noteIndex].title = title || 'Без названия';
  notes[noteIndex].content = content;
  notes[noteIndex].folder = folder;
  notes[noteIndex].updatedAt = Date.now();
  saveNotes(notes);
  showToast('✓ Заметка сохранена');
}
window.saveNote = saveNote;

function deleteNote() {
  if (!currentNoteId) return;
  if (!confirm('Удалить эту заметку?')) return;
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === currentNoteId);
  if (idx !== -1) { notes[idx].deleted = true; notes[idx].updatedAt = Date.now(); }
  saveNotes(notes);
  if (window.autoSaveToCloud) window.autoSaveToCloud();
  showToast('✓ Заметка удалена');
  showScreen('notes-screen');
  renderNotes();
}
window.deleteNote = deleteNote;

function renderNoteImages(images) {
  const gallery = getElement('note-images-gallery');
  const container = getElement('note-images-container');
  if (!gallery || !container) return;
  if (!images || images.length === 0) { gallery.style.display = 'none'; return; }
  gallery.style.display = 'block';
  container.innerHTML = '';
  images.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'note-image-item';
    item.innerHTML = `<img id="note-img-${index}" alt="Изображение ${index + 1}">
      <div class="note-image-toolbar">
        <span class="note-image-label">Изображение ${index + 1}</span>
        <button class="note-image-insert" onclick="insertImageAtCursor(${index})">Вставить</button>
        <button class="note-image-delete" onclick="deleteNoteImage(${index})">Удалить</button>
      </div>`;
    container.appendChild(item);
    const imgEl = item.querySelector(`#note-img-${index}`);
    if (imgEl) window.loadYadiskImage ? window.loadYadiskImage(img, imgEl) : (imgEl.src = img);
  });
}
window.renderNoteImages = renderNoteImages;

function insertImageAtCursor(index) {
  const textarea = getElement('note-content');
  if (!textarea) return;
  const md = `![Изображение](image:${index})`;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const needNewline = before.length > 0 && !before.endsWith('\n');
  const insert = (needNewline ? '\n' : '') + md + '\n';
  textarea.value = before + insert + after;
  textarea.selectionStart = textarea.selectionEnd = start + insert.length;
  textarea.focus();
}
window.insertImageAtCursor = insertImageAtCursor;

function triggerNoteImageUpload() { getElement('note-image-input')?.click(); }
window.triggerNoteImageUpload = triggerNoteImageUpload;

function handleNoteImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const notes = getNotes();
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    if (!note.images) note.images = [];
    showToast('⏳ Загрузка изображения...');
    const url = await (window.uploadImage ? window.uploadImage(e.target.result, 'notes') : e.target.result);
    note.images.push(url);
    saveNotes(notes);
    renderNoteImages(note.images);
    showToast(`✓ Изображение добавлено (номер ${note.images.length - 1})`);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
window.handleNoteImageUpload = handleNoteImageUpload;

function deleteNoteImage(index) {
  if (!confirm('Удалить это изображение?')) return;
  const notes = getNotes();
  const note = notes.find(n => n.id === currentNoteId);
  if (!note || !note.images) return;
  note.images.splice(index, 1);
  saveNotes(notes);
  renderNoteImages(note.images);
  showToast('✓ Изображение удалено');
}
window.deleteNoteImage = deleteNoteImage;

// togglePreview kept as alias for backward compat
function togglePreview() { toggleNoteMode(); }
window.togglePreview = togglePreview;

// Вставка изображения через Ctrl+V когда открыт редактор заметок
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('paste', (e) => {
    const screen = document.getElementById('note-editor-screen');
    if (!screen) return;
    // Проверяем что экран активен (любой из признаков)
    const isActive = screen.classList.contains('active') ||
                     screen.style.display !== 'none' ||
                     screen.style.transform === 'translateX(0%)';
    if (!isActive) return;
    // Есть ли изображение в буфере?
    const hasImage = Array.from(e.clipboardData?.items || []).some(i => i.type.startsWith('image/'));
    if (hasImage) handleNotePaste(e);
  });
});

function handleNotePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = async function(event) {
        const notes = getNotes();
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return;
        if (!note.images) note.images = [];
        showToast('⏳ Загрузка изображения...');
        const url = await (window.uploadImage ? window.uploadImage(event.target.result, 'notes') : event.target.result);
        note.images.push(url);
        saveNotes(notes);
        renderNoteImages(note.images);
        const imageIndex = note.images.length - 1;
        // Автоматически вставляем markdown в позицию курсора
        const textarea = getElement('note-content');
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursorPos);
          const textAfter = textarea.value.substring(cursorPos);
          const needNewline = textBefore.length > 0 && !textBefore.endsWith('\n');
          const imageMarkdown = (needNewline ? '\n' : '') + `![Изображение](image:${imageIndex})` + '\n';
          textarea.value = textBefore + imageMarkdown + textAfter;
          textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkdown.length;
          textarea.focus();
        }
        showToast('✓ Изображение добавлено — нажми «Превью» чтобы увидеть');
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
}
window.handleNotePaste = handleNotePaste;
