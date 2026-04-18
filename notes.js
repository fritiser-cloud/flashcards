// ==================== ЗАМЕТКИ ====================

let currentNoteId = null;
let isPreviewMode = false;

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

function renderNotes() {
  const notes = window.getNotes ? window.getNotes() : [];
  const list = window.getElement('notes-list');
  if (!list) return;
  
  // Сортировка по дате обновления
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  
  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">Нет заметок</div>
      <div class="empty-state-sub">Создайте первую заметку с помощью кнопки +</div>
    </div>`;
    return;
  }
  
  list.innerHTML = '';
  
  sorted.forEach(note => {
    const card = document.createElement('div');
    card.style.cssText = 'background: var(--surface); border-radius: var(--radius); padding: 20px 24px; border: 1.5px solid var(--border); box-shadow: var(--shadow); cursor: pointer; transition: all 0.2s; margin-bottom: 16px;';
    
    const preview = note.content.replace(/[#*`>\-\[\]]/g, '').trim().substring(0, 120);
    const date = new Date(note.updatedAt);
    const timeAgo = formatTimeAgo(date);
    
    // Определяем цвет тега
    const tagColors = {
      'bio': { bg: 'var(--sage)', color: 'var(--sage-text)' },
      'ru': { bg: 'var(--peach)', color: 'var(--peach-text)' },
      'phys': { bg: 'var(--sky)', color: 'var(--sky-text)' },
      'personal': { bg: 'var(--lavender)', color: 'var(--lavender-text)' }
    };
    
    const tagColor = tagColors[note.tag] || { bg: 'var(--surface2)', color: 'var(--text3)' };
    
    card.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
        <div style="font-weight: 700; font-size: 17px; flex: 1; line-height: 1.4;">
          ${window.escapeHtml(note.title) || 'Без названия'}
        </div>
        <div style="font-size: 13px; color: var(--text3); white-space: nowrap; margin-left: 12px;">
          ${timeAgo}
        </div>
      </div>
      <div style="font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 12px;">
        ${window.escapeHtml(preview) || 'Пустая заметка'}${preview.length >= 120 ? '...' : ''}
      </div>
      ${note.tag ? `
        <div style="display: inline-block; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; background: ${tagColor.bg}; color: ${tagColor.color};">
          ${{'bio': '🧬 Биология', 'ru': '📖 Русский', 'phys': '⚛️ Физика', 'personal': '💭 Личное'}[note.tag] || note.tag}
        </div>
      ` : ''}
    `;
    
    card.onclick = () => openNote(note.id);
    card.onmouseenter = () => card.style.transform = 'translateY(-2px)';
    card.onmouseleave = () => card.style.transform = 'translateY(0)';
    
    list.appendChild(card);
  });
}

function newNote() {
  const notes = window.getNotes ? window.getNotes() : [];
  const newNote = {
    id: Date.now().toString(),
    title: '',
    content: '',
    tag: '',
    images: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  notes.push(newNote);
  if (window.saveNotes) window.saveNotes(notes);
  
  currentNoteId = newNote.id;
  
  // Открываем редактор
  const titleInput = window.getElement('note-title');
  if (titleInput) titleInput.value = '';
  
  const contentInput = window.getElement('note-content');
  if (contentInput) contentInput.value = '';
  
  const tagSelect = window.getElement('note-tag');
  if (tagSelect) tagSelect.value = '';
  
  const imagesContainer = window.getElement('note-images-container');
  if (imagesContainer) imagesContainer.innerHTML = '';
  
  // Скрыть превью
  isPreviewMode = false;
  const previewDiv = window.getElement('note-preview-content');
  if (previewDiv) previewDiv.style.display = 'none';
  
  const contentDiv = window.getElement('note-content');
  if (contentDiv) contentDiv.style.display = 'block';
  
  window.showScreen('note-editor-screen');
}

function openNote(noteId) {
  const notes = window.getNotes ? window.getNotes() : [];
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  
  currentNoteId = noteId;
  
  const contentDiv = window.getElement('note-view-content');
  if (!contentDiv) return;
  
  contentDiv.innerHTML = '';
  
  // Заголовок
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 24px;';
  
  const title = document.createElement('h1');
  title.style.cssText = 'font-family: var(--font-display); font-size: 32px; font-weight: 600; margin-bottom: 12px; line-height: 1.2;';
  title.textContent = note.title || 'Без названия';
  header.appendChild(title);
  
  // Дата и тег
  const meta = document.createElement('div');
  meta.style.cssText = 'display: flex; align-items: center; gap: 12px; flex-wrap: wrap;';
  
  const date = new Date(note.updatedAt);
  const dateSpan = document.createElement('span');
  dateSpan.style.cssText = 'font-size: 14px; color: var(--text3);';
  dateSpan.textContent = `Обновлено ${formatTimeAgo(date)}`;
  meta.appendChild(dateSpan);
  
  if (note.tag) {
    const tagColors = {
      'bio': { bg: 'var(--sage)', color: 'var(--sage-text)' },
      'ru': { bg: 'var(--peach)', color: 'var(--peach-text)' },
      'phys': { bg: 'var(--sky)', color: 'var(--sky-text)' },
      'personal': { bg: 'var(--lavender)', color: 'var(--lavender-text)' }
    };
    const tagColor = tagColors[note.tag] || { bg: 'var(--surface2)', color: 'var(--text3)' };
    
    const tagDiv = document.createElement('div');
    tagDiv.style.cssText = `font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; background: ${tagColor.bg}; color: ${tagColor.color};`;
    tagDiv.textContent = {'bio': '🧬 Биология', 'ru': '📖 Русский', 'phys': '⚛️ Физика', 'personal': '💭 Личное'}[note.tag] || note.tag;
    meta.appendChild(tagDiv);
  }
  
  header.appendChild(meta);
  contentDiv.appendChild(header);
  
  // Контент
  if (note.content) {
    const contentParsed = document.createElement('div');
    contentParsed.style.cssText = 'font-size: 16px; line-height: 1.8; color: var(--text);';
    
    try {
      // Заменяем ссылки на изображения
      let markdown = note.content;
      if (note.images && note.images.length > 0) {
        markdown = markdown.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (match, alt, index) => {
          const img = note.images[parseInt(index)];
          return img ? `![${alt}](${img})` : match;
        });
      }
      
      if (typeof marked !== 'undefined') {
        contentParsed.innerHTML = marked.parse(markdown);
      } else {
        contentParsed.innerHTML = '<pre>' + window.escapeHtml(markdown) + '</pre>';
      }
    } catch (e) {
      contentParsed.innerHTML = '<pre>' + window.escapeHtml(note.content) + '</pre>';
    }
    
    contentDiv.appendChild(contentParsed);
  }
  
  window.showScreen('note-view-screen');
}

function editNote() {
  if (!currentNoteId) return;
  
  const notes = window.getNotes ? window.getNotes() : [];
  const note = notes.find(n => n.id === currentNoteId);
  if (!note) return;
  
  const titleInput = window.getElement('note-title');
  if (titleInput) titleInput.value = note.title || '';
  
  const contentInput = window.getElement('note-content');
  if (contentInput) contentInput.value = note.content || '';
  
  const tagSelect = window.getElement('note-tag');
  if (tagSelect) tagSelect.value = note.tag || '';
  
  renderNoteImages(note.images || []);
  
  // Скрыть превью
  isPreviewMode = false;
  const previewDiv = window.getElement('note-preview-content');
  if (previewDiv) previewDiv.style.display = 'none';
  
  const contentDiv = window.getElement('note-content');
  if (contentDiv) contentDiv.style.display = 'block';
  
  window.showScreen('note-editor-screen');
}

function saveNote() {
  if (!currentNoteId) return;
  
  const notes = window.getNotes ? window.getNotes() : [];
  const noteIndex = notes.findIndex(n => n.id === currentNoteId);
  if (noteIndex === -1) return;
  
  const title = window.getElement('note-title')?.value.trim() || '';
  const content = window.getElement('note-content')?.value || '';
  const tag = window.getElement('note-tag')?.value || '';
  
  notes[noteIndex].title = title || 'Без названия';
  notes[noteIndex].content = content;
  notes[noteIndex].tag = tag;
  notes[noteIndex].updatedAt = Date.now();
  
  if (window.saveNotes) window.saveNotes(notes);
  if (window.showToast) window.showToast('✓ Заметка сохранена');
}

function deleteNote() {
  if (!currentNoteId) return;
  if (!confirm('Удалить эту заметку?')) return;
  
  const notes = window.getNotes ? window.getNotes() : [];
  const filtered = notes.filter(n => n.id !== currentNoteId);
  
  if (window.saveNotes) window.saveNotes(filtered);
  if (window.showToast) window.showToast('✓ Заметка удалена');
  
  window.showScreen('notes-screen');
  renderNotes();
}

function closeNoteEditor() {
  saveNote();
  window.showScreen('notes-screen');
  renderNotes();
}

function toggleNotePreview() {
  isPreviewMode = !isPreviewMode;
  
  const contentInput = window.getElement('note-content');
  const previewDiv = window.getElement('note-preview-content');
  const previewBtn = window.getElement('note-preview-btn');
  
  if (isPreviewMode) {
    const notes = window.getNotes ? window.getNotes() : [];
    const note = notes.find(n => n.id === currentNoteId);
    let markdown = contentInput?.value || '';
    
    // Заменяем ссылки на изображения
    if (note && note.images) {
      markdown = markdown.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g, (match, alt, index) => {
        const img = note.images[parseInt(index)];
        return img ? `![${alt}](${img})` : match;
      });
    }
    
    if (previewDiv) {
      try {
        if (typeof marked !== 'undefined') {
          previewDiv.innerHTML = marked.parse(markdown);
        } else {
          previewDiv.innerHTML = '<pre>' + window.escapeHtml(markdown) + '</pre>';
        }
      } catch (e) {
        previewDiv.innerHTML = '<pre>' + window.escapeHtml(markdown) + '</pre>';
      }
      previewDiv.style.display = 'block';
    }
    
    if (contentInput) contentInput.style.display = 'none';
    if (previewBtn) previewBtn.textContent = '✏️';
  } else {
    if (contentInput) contentInput.style.display = 'block';
    if (previewDiv) previewDiv.style.display = 'none';
    if (previewBtn) previewBtn.textContent = '👁';
  }
}

function renderNoteImages(images) {
  const container = window.getElement('note-images-container');
  if (!container) return;
  
  if (!images || images.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = '';
  
  const gallery = document.createElement('div');
  gallery.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px;';
  
  images.forEach((img, index) => {
    const item = document.createElement('div');
    item.style.cssText = 'position: relative; width: 90px; height: 90px; border-radius: var(--radius-sm); overflow: hidden; border: 1.5px solid var(--border); background: var(--surface2);';
    
    item.innerHTML = `
      <img src="${img}" alt="Image ${index}" style="width: 100%; height: 100%; object-fit: cover;">
      <div style="position: absolute; top: 6px; left: 6px; background: var(--text); color: white; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px;">
        ${index}
      </div>
      <button onclick="deleteNoteImage(${index})" style="position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; border: none; background: var(--red); color: white; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700;">
        ✕
      </button>
    `;
    
    gallery.appendChild(item);
  });
  
  container.appendChild(gallery);
}

function deleteNoteImage(index) {
  if (!confirm('Удалить это изображение?')) return;
  
  const notes = window.getNotes ? window.getNotes() : [];
  const note = notes.find(n => n.id === currentNoteId);
  if (!note || !note.images) return;
  
  note.images.splice(index, 1);
  if (window.saveNotes) window.saveNotes(notes);
  
  renderNoteImages(note.images);
  if (window.showToast) window.showToast('✓ Изображение удалено');
}

// Экспорт
window.renderNotes = renderNotes;
window.newNote = newNote;
window.openNote = openNote;
window.editNote = editNote;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.closeNoteEditor = closeNoteEditor;
window.toggleNotePreview = toggleNotePreview;
window.renderNoteImages = renderNoteImages;
window.deleteNoteImage = deleteNoteImage;
