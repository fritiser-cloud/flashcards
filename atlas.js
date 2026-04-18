// ==================== АТЛАС ====================

let currentAtlasId = null;
let currentAtlasCategory = 'all';
let atlasImageBase64 = null;

const CATEGORY_LABELS = {
  'anatomy': '🫀 Анатомия',
  'botany': '🌿 Ботаника',
  'zoology': '🦋 Зоология',
  'cells': '🔬 Клетки',
  'ecology': '🌍 Экология'
};

function filterAtlas(category, btn) {
  currentAtlasCategory = category;
  const pills = document.querySelectorAll('#atlas-cats .atlas-cat-pill');
  pills.forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAtlas();
}

function renderAtlas() {
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const list = window.getElement('atlas-grid');
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
  const grid = document.createElement('div');
  grid.className = 'atlas-grid';
  
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'atlas-card';
    
    card.innerHTML = `
      <div class="atlas-card-img">
        ${item.image ? `<img src="${item.image}" alt="${window.escapeHtml(item.title)}">` : '🖼️'}
      </div>
      <div class="atlas-card-content">
        <div class="atlas-card-title">${window.escapeHtml(item.title)}</div>
        <div class="atlas-card-category">${CATEGORY_LABELS[item.category] || 'Другое'}</div>
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
  
  const img = window.getElement('atlas-detail-image');
  const categorySpan = window.getElement('atlas-detail-category');
  const titleEl = window.getElement('atlas-detail-title');
  const descDiv = window.getElement('atlas-detail-desc');
  
  if (img) {
    if (item.image) img.src = item.image;
    else img.style.display = 'none';
  }
  if (categorySpan) categorySpan.textContent = CATEGORY_LABELS[item.category] || 'Другое';
  if (titleEl) titleEl.textContent = item.title;
  if (descDiv) {
    try {
      if (typeof marked !== 'undefined') {
        descDiv.innerHTML = marked.parse(item.description || '');
      } else {
        descDiv.innerHTML = `<pre>${window.escapeHtml(item.description || '')}</pre>`;
      }
    } catch (e) {
      descDiv.innerHTML = `<pre>${window.escapeHtml(item.description || '')}</pre>`;
    }
  }
  
  window.showScreen('atlas-detail-screen');
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

function createAtlasItem() {
  newAtlasItem();
}

function triggerAtlasImageUpload() {
  document.getElementById('atlas-image-input')?.click();
}

function handleAtlasImageUpload(event) {
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
    const index = items.findIndex(i => i.id === currentAtlasId);
    if (index !== -1) {
      items[index].title = title;
      items[index].category = category;
      items[index].description = description;
      if (atlasImageBase64) items[index].image = atlasImageBase64;
      items[index].updatedAt = Date.now();
    }
  } else {
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
window.createAtlasItem = createAtlasItem;
window.triggerAtlasImageUpload = triggerAtlasImageUpload;
window.handleAtlasImageUpload = handleAtlasImageUpload;
window.saveAtlasItem = saveAtlasItem;
window.editAtlasItem = editAtlasItem;
window.deleteAtlasItem = deleteAtlasItem;
window.closeAtlasEditor = closeAtlasEditor;
