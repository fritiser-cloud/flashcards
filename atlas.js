// ==================== АТЛАС ====================

let currentAtlasId = null;
let currentAtlasCategory = 'all';
let atlasImageBase64 = null;

const CATEGORY_LABELS = {
  'anatomy': '🫀 Анатомия',
  'histology': '🔬 Гистология',
  'physiology': '⚡ Физиология',
  'other': '🧩 Другое'
};

function filterAtlas(category) {
  currentAtlasCategory = category;
  const pills = document.querySelectorAll('#atlas-cats .cat-pill');
  pills.forEach(p => p.classList.remove('active'));
  event.target?.classList.add('active');
  renderAtlas();
}

function renderAtlas() {
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const list = window.getElement('atlas-list');
  if (!list) return;
  
  const filtered = currentAtlasCategory === 'all' 
    ? items 
    : items.filter(i => i.category === currentAtlasCategory);
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🧠</div>
      <div class="empty-state-text">${items.length === 0 ? 'Атлас пуст' : 'Нет элементов в этой категории'}</div>
      <div class="empty-state-sub">Добавьте элементы атласа с изображениями и описаниями</div>
    </div>`;
    return;
  }
  
  list.innerHTML = '';
  
  // Создаем сетку карточек
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;';
  
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'atlas-card';
    card.style.cssText = 'background: var(--surface); border-radius: var(--radius); overflow: hidden; border: 1.5px solid var(--border); box-shadow: var(--shadow); cursor: pointer; transition: all 0.2s;';
    
    card.innerHTML = `
      <div style="aspect-ratio: 4/3; background: var(--surface2); display: flex; align-items: center; justify-content: center; overflow: hidden;">
        ${item.image ? `<img src="${item.image}" alt="${window.escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="font-size: 64px;">🖼️</div>'}
      </div>
      <div style="padding: 16px 20px;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; line-height: 1.3;">
          ${window.escapeHtml(item.title)}
        </div>
        <div style="font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; background: var(--lavender); color: var(--lavender-text); display: inline-block;">
          ${CATEGORY_LABELS[item.category] || '🧩 Другое'}
        </div>
      </div>
    `;
    
    card.onclick = () => openAtlasItem(item.id);
    grid.appendChild(card);
  });
  
  list.appendChild(grid);
}

function openAtlasItem(id) {
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const item = items.find(i => i.id === id);
  if (!item) return;
  
  currentAtlasId = id;
  
  const contentDiv = window.getElement('atlas-view-content');
  if (!contentDiv) return;
  
  contentDiv.innerHTML = '';
  
  // Изображение
  if (item.image) {
    const imgDiv = document.createElement('div');
    imgDiv.style.cssText = 'margin-bottom: 24px; border-radius: var(--radius); overflow: hidden; border: 1.5px solid var(--border);';
    imgDiv.innerHTML = `<img src="${item.image}" alt="${window.escapeHtml(item.title)}" style="width: 100%; display: block;">`;
    contentDiv.appendChild(imgDiv);
  }
  
  // Категория
  const catDiv = document.createElement('div');
  catDiv.style.cssText = 'font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; background: var(--lavender); color: var(--lavender-text); display: inline-block; margin-bottom: 16px;';
  catDiv.textContent = CATEGORY_LABELS[item.category] || '🧩 Другое';
  contentDiv.appendChild(catDiv);
  
  // Заголовок
  const title = document.createElement('h1');
  title.style.cssText = 'font-family: var(--font-display); font-size: 32px; font-weight: 600; margin-bottom: 20px; line-height: 1.2;';
  title.textContent = item.title;
  contentDiv.appendChild(title);
  
  // Описание
  if (item.description) {
    const descDiv = document.createElement('div');
    descDiv.style.cssText = 'font-size: 16px; line-height: 1.8; color: var(--text2);';
    
    try {
      if (typeof marked !== 'undefined') {
        descDiv.innerHTML = marked.parse(item.description);
      } else {
        descDiv.innerHTML = '<pre>' + window.escapeHtml(item.description) + '</pre>';
      }
    } catch (e) {
      descDiv.innerHTML = '<pre>' + window.escapeHtml(item.description) + '</pre>';
    }
    
    contentDiv.appendChild(descDiv);
  }
  
  window.showScreen('atlas-view-screen');
}

function newAtlasItem() {
  currentAtlasId = null;
  atlasImageBase64 = null;
  
  const titleInput = window.getElement('atlas-title');
  if (titleInput) titleInput.value = '';
  
  const categorySelect = window.getElement('atlas-category');
  if (categorySelect) categorySelect.value = 'anatomy';
  
  const descInput = window.getElement('atlas-description');
  if (descInput) descInput.value = '';
  
  const preview = window.getElement('atlas-image-preview');
  if (preview) preview.style.display = 'none';
  
  window.showScreen('atlas-editor-screen');
}

function handleAtlasImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    atlasImageBase64 = e.target.result;
    const previewImg = window.getElement('atlas-preview-img');
    if (previewImg) previewImg.src = atlasImageBase64;
    const previewDiv = window.getElement('atlas-image-preview');
    if (previewDiv) previewDiv.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function saveAtlasItem() {
  const title = window.getElement('atlas-title')?.value.trim() || '';
  const category = window.getElement('atlas-category')?.value || 'anatomy';
  const description = window.getElement('atlas-description')?.value || '';
  
  if (!title) {
    if (window.showToast) window.showToast('⚠️ Введите название');
    return;
  }
  
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  
  if (currentAtlasId) {
    // Редактирование существующего
    const index = items.findIndex(i => i.id === currentAtlasId);
    if (index !== -1) {
      items[index].title = title;
      items[index].category = category;
      items[index].description = description;
      if (atlasImageBase64) items[index].image = atlasImageBase64;
      items[index].updatedAt = Date.now();
    }
  } else {
    // Создание нового
    const newItem = {
      id: Date.now().toString(),
      title,
      category,
      description,
      image: atlasImageBase64,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.push(newItem);
  }
  
  if (window.saveAtlasItems) window.saveAtlasItems(items);
  if (window.showToast) window.showToast('✓ Элемент сохранён');
  
  window.showScreen('atlas-screen');
  renderAtlas();
}

function editAtlasItem() {
  if (!currentAtlasId) return;
  
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const item = items.find(i => i.id === currentAtlasId);
  if (!item) return;
  
  const titleInput = window.getElement('atlas-title');
  if (titleInput) titleInput.value = item.title || '';
  
  const categorySelect = window.getElement('atlas-category');
  if (categorySelect) categorySelect.value = item.category || 'anatomy';
  
  const descInput = window.getElement('atlas-description');
  if (descInput) descInput.value = item.description || '';
  
  if (item.image) {
    atlasImageBase64 = item.image;
    const previewImg = window.getElement('atlas-preview-img');
    if (previewImg) previewImg.src = item.image;
    const previewDiv = window.getElement('atlas-image-preview');
    if (previewDiv) previewDiv.style.display = 'block';
  } else {
    atlasImageBase64 = null;
    const previewDiv = window.getElement('atlas-image-preview');
    if (previewDiv) previewDiv.style.display = 'none';
  }
  
  window.showScreen('atlas-editor-screen');
}

function deleteAtlasItem() {
  if (!currentAtlasId) return;
  if (!confirm('Удалить этот элемент из атласа?')) return;
  
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const filtered = items.filter(i => i.id !== currentAtlasId);
  
  if (window.saveAtlasItems) window.saveAtlasItems(filtered);
  if (window.showToast) window.showToast('✓ Элемент удалён');
  
  window.showScreen('atlas-screen');
  renderAtlas();
}

function closeAtlasEditor() {
  window.showScreen('atlas-screen');
  renderAtlas();
}

// Экспорт
window.filterAtlas = filterAtlas;
window.renderAtlas = renderAtlas;
window.newAtlasItem = newAtlasItem;
window.saveAtlasItem = saveAtlasItem;
window.handleAtlasImage = handleAtlasImage;
window.editAtlasItem = editAtlasItem;
window.deleteAtlasItem = deleteAtlasItem;
window.closeAtlasEditor = closeAtlasEditor;
