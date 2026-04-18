// ==================== ЗАМЕТКИ ====================
let currentNoteId = null;
let currentNoteFolder = 'all';
let isPreviewMode = false;

function renderNotes() {
  const notes = getNotes();
  const list = getElement('notes-list');
  if (!list) return;
  const searchQuery = getElement('notes-search')?.value.toLowerCase() || '';
  let filtered = currentNoteFolder === 'all' ? notes : notes.filter(n => n.folder === currentNoteFolder);
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
  openNoteEditor(newNote.id);
}
window.createNote = createNote;

function openNoteEditor(noteId) {
  currentNoteId = noteId;
  const notes = getNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  if (!note.images) note.images = [];
  getElement('note-title').value = note.title;
  getElement('note-content').value = note.content;
  getElement('note-folder').value = note.folder;
  renderNoteImages(note.images);
  isPreviewMode = false;
  getElement('note-preview').style.display = 'none';
  getElement('note-content').style.display = 'block';
  getElement('preview-toggle-text').textContent = '👁 Превью';
  showScreen('note-editor-screen');
}
window.openNoteEditor = openNoteEditor;

function closeNoteEditor() {
  saveNote();
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
  const filtered = notes.filter(n => n.id !== currentNoteId);
  saveNotes(filtered);
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
    item.innerHTML = `<img src="${img}" alt="Image ${index}"><div class="note-image-number">${index}</div><button class="note-image-delete" onclick="deleteNoteImage(${index})">✕</button>`;
    container.appendChild(item);
  });
}
window.renderNoteImages = renderNoteImages;

function triggerNoteImageUpload() { getElement('note-image-input')?.click(); }
window.triggerNoteImageUpload = triggerNoteImageUpload;

function handleNoteImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const notes = getNotes();
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    if (!note.images) note.images = [];
    note.images.push(e.target.result);
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

function togglePreview() {
  isPreviewMode = !isPreviewMode;
  const content = getElement('note-content');
  const preview = getElement('note-preview');
  const toggleText = getElement('preview-toggle-text');
  if (isPreviewMode) {
    const notes = getNotes();
    const note = notes.find(n => n.id === currentNoteId);
    let markdown = content?.value || '';
    if (note && note.images) {
      markdown = markdown.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (match, alt, index) => {
        const img = note.images[parseInt(index)];
        return img ? `![${alt}](${img})` : match;
      });
    }
    if (preview) preview.innerHTML = marked.parse(markdown);
    if (content) content.style.display = 'none';
    if (preview) preview.style.display = 'block';
    if (toggleText) toggleText.textContent = '✏️ Редактор';
  } else {
    if (content) content.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (toggleText) toggleText.textContent = '👁 Превью';
  }
}
window.togglePreview = togglePreview;

// Вставка изображения из буфера обмена
document.addEventListener('DOMContentLoaded', () => {
  const noteContent = getElement('note-content');
  if (noteContent) noteContent.addEventListener('paste', handleNotePaste);
});

function handleNotePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = function(event) {
        const notes = getNotes();
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return;
        if (!note.images) note.images = [];
        note.images.push(event.target.result);
        saveNotes(notes);
        renderNoteImages(note.images);
        const imageIndex = note.images.length - 1;
        showToast(`✓ Изображение вставлено (номер ${imageIndex})`);
        const textarea = getElement('note-content');
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursorPos);
          const textAfter = textarea.value.substring(cursorPos);
          const imageMarkdown = `![Изображение](image:${imageIndex})`;
          textarea.value = textBefore + imageMarkdown + textAfter;
          textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkdown.length;
          textarea.focus();
        }
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
}
window.handleNotePaste = handleNotePaste;
