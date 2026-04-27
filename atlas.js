// ==================== АТЛАС ====================
let currentAtlasId = null;
let currentAtlasCategory = 'all';
let atlasImageBase64 = null;
let atlasSearchQuery = '';

function searchAtlas() {
  const input = document.getElementById('atlas-search');
  if (input) atlasSearchQuery = input.value.toLowerCase();
  renderAtlas();
}
window.searchAtlas = searchAtlas;

function filterAtlas(category, btn) {
  currentAtlasCategory = category;
  document.querySelectorAll('.atlas-cat-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAtlas();
}
window.filterAtlas = filterAtlas;

function renderAtlas() {
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const grid = document.getElementById('atlas-grid');
  if (!grid) return;
  
  let filtered = (currentAtlasCategory === 'all' ? items : items.filter(i => i.category === currentAtlasCategory)).filter(i => !i.deleted);
  if (atlasSearchQuery) {
    filtered = filtered.filter(item => 
      (item.title && item.title.toLowerCase().includes(atlasSearchQuery)) ||
      (item.description && item.description.toLowerCase().includes(atlasSearchQuery))
    );
  }
  
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg></div><div class="empty-state-text">Атлас пуст</div><div class="empty-state-sub">Нажми + чтобы добавить первый элемент</div></div>`;
    return;
  }
  
  grid.innerHTML = '';
  const categoryLabels = { anatomy: '🫀 Анатомия', botany: '🌿 Ботаника', zoology: '🦋 Зоология', cells: '🔬 Клетки', ecology: '🌍 Экология' };
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'atlas-card';
    const imgHtml = item.image ? `<img id="atlas-img-${item.id}" alt="${window.escapeHtml(item.title)}">` : '🖼️';
    // Пытаемся найти нумерованные подписи (1 – текст / 1. текст)
    const descLines = (item.description || '').split('\n').map(l => l.trim()).filter(Boolean);
    const numberedLines = descLines.filter(l => /^\d+[\s–\-\.]/.test(l)).slice(0, 8);
    // Если нет нумерованных — берём первые строки описания
    const labelSource = numberedLines.length ? numberedLines : descLines.slice(0, 4);
    const labelsHtml = labelSource.length ? `<div class="atlas-card-labels">${labelSource.map(l => {
      const m = l.match(/^(\d+)([\s–\-\.]+)(.+)/);
      return m ? `<div class="atlas-card-label-item"><span class="atlas-card-label-num">${m[1]}.</span>${window.escapeHtml(m[3])}</div>`
               : `<div class="atlas-card-label-item">${window.escapeHtml(l)}</div>`;
    }).join('')}</div>` : '';
    card.innerHTML = `<div class="atlas-card-img">${imgHtml}</div><div class="atlas-card-content"><div class="atlas-card-title">${window.escapeHtml(item.title)}</div><div class="atlas-card-category">${categoryLabels[item.category]}</div></div>${labelsHtml}`;
    if (item.image) {
      const imgEl = card.querySelector(`#atlas-img-${item.id}`);
      if (imgEl) window.loadYadiskImage ? window.loadYadiskImage(item.image, imgEl) : (imgEl.src = item.image);
    }
    card.onclick = () => openAtlasDetail(item.id);
    grid.appendChild(card);
  });
}
window.renderAtlas = renderAtlas;

function openAtlasDetail(id) {
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const item = items.find(i => i.id === id);
  if (!item) return;
  currentAtlasId = id;
  const categoryLabels = { anatomy: '🫀 Анатомия', botany: '🌿 Ботаника', zoology: '🦋 Зоология', cells: '🔬 Клетки', ecology: '🌍 Экология' };
  const imgEl = document.getElementById('atlas-detail-image');
  if (imgEl) {
    imgEl.style.display = item.image ? 'block' : 'none';
    if (item.image) {
      window.loadYadiskImage ? window.loadYadiskImage(item.image, imgEl) : (imgEl.src = item.image);
    }
  }
  const catEl = document.getElementById('atlas-detail-category');
  if (catEl) catEl.textContent = categoryLabels[item.category];
  const titleEl = document.getElementById('atlas-detail-title');
  if (titleEl) titleEl.textContent = item.title;
  const descEl = document.getElementById('atlas-detail-desc');
  if (descEl) descEl.innerHTML = window.safeMarkdown(item.description || '');
  window.showScreen('atlas-detail-screen');
}
window.openAtlasDetail = openAtlasDetail;

function createAtlasItem() {
  currentAtlasId = null;
  atlasImageBase64 = null;
  const titleInput = document.getElementById('atlas-title');
  if (titleInput) titleInput.value = '';
  const categorySelect = document.getElementById('atlas-category');
  if (categorySelect) categorySelect.value = 'anatomy';
  const descInput = document.getElementById('atlas-description');
  if (descInput) descInput.value = '';
  const preview = document.getElementById('atlas-image-preview');
  if (preview) preview.style.display = 'none';
  window.showScreen('atlas-editor-screen');
}
window.createAtlasItem = createAtlasItem;

function triggerAtlasImageUpload() {
  const input = document.getElementById('atlas-image-input');
  if (input) input.click();
}
window.triggerAtlasImageUpload = triggerAtlasImageUpload;

function handleAtlasImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const previewImg = document.getElementById('atlas-preview-img');
    const previewDiv = document.getElementById('atlas-image-preview');
    // Показываем превью сразу (base64), загружаем в Storage в фоне
    if (previewImg) previewImg.src = e.target.result;
    if (previewDiv) previewDiv.style.display = 'block';
    window.showToast('⏳ Загрузка изображения...');
    atlasImageBase64 = await (window.uploadImage ? window.uploadImage(e.target.result, 'atlas') : e.target.result);
    if (previewImg) previewImg.src = atlasImageBase64;
    window.showToast('✓ Изображение готово');
  };
  reader.readAsDataURL(file);
}
window.handleAtlasImageUpload = handleAtlasImageUpload;

function saveAtlasItem() {
  const title = document.getElementById('atlas-title')?.value.trim() || '';
  const category = document.getElementById('atlas-category')?.value || 'anatomy';
  const description = document.getElementById('atlas-description')?.value || '';
  if (!title) { window.showToast('⚠️ Введите название'); return; }
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
    items.push({ id: Date.now().toString(), title, category, description, image: atlasImageBase64, createdAt: Date.now(), updatedAt: Date.now() });
  }
  window.saveAtlasItems(items);
  window.showToast('✓ Элемент сохранён');
  window.showScreen('atlas-screen');
  renderAtlas();
}
window.saveAtlasItem = saveAtlasItem;

function editAtlasItem() {
  if (!currentAtlasId) return;
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const item = items.find(i => i.id === currentAtlasId);
  if (!item) return;
  const titleInput = document.getElementById('atlas-title');
  if (titleInput) titleInput.value = item.title || '';
  const categorySelect = document.getElementById('atlas-category');
  if (categorySelect) categorySelect.value = item.category || 'anatomy';
  const descInput = document.getElementById('atlas-description');
  if (descInput) descInput.value = item.description || '';
  if (item.image) {
    atlasImageBase64 = item.image;
    const previewImg = document.getElementById('atlas-preview-img');
    if (previewImg) previewImg.src = item.image;
    const previewDiv = document.getElementById('atlas-image-preview');
    if (previewDiv) previewDiv.style.display = 'block';
  } else {
    atlasImageBase64 = null;
    const previewDiv = document.getElementById('atlas-image-preview');
    if (previewDiv) previewDiv.style.display = 'none';
  }
  window.showScreen('atlas-editor-screen');
}
window.editAtlasItem = editAtlasItem;

function deleteAtlasItem() {
  if (!currentAtlasId) return;
  if (!confirm('Удалить этот элемент из атласа?')) return;
  const items = window.getAtlasItems ? window.getAtlasItems() : [];
  const item = items.find(i => i.id === currentAtlasId);
  if (item) { item.deleted = true; item.updatedAt = Date.now(); }
  window.saveAtlasItems(items);
  window.showToast('✓ Элемент удалён');
  window.showScreen('atlas-screen');
  renderAtlas();
}
window.deleteAtlasItem = deleteAtlasItem;

function closeAtlasEditor() {
  window.showScreen('atlas-screen');
  renderAtlas();
}
window.closeAtlasEditor = closeAtlasEditor;

// Вставка изображения через Ctrl+V в редакторе атласа
function handleAtlasPaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = async function(event) {
        const previewImg = document.getElementById('atlas-preview-img');
        const previewDiv = document.getElementById('atlas-image-preview');
        if (previewImg) previewImg.src = event.target.result;
        if (previewDiv) previewDiv.style.display = 'block';
        window.showToast('⏳ Загрузка изображения...');
        atlasImageBase64 = await (window.uploadImage ? window.uploadImage(event.target.result, 'atlas') : event.target.result);
        if (previewImg) previewImg.src = atlasImageBase64;
        window.showToast('✓ Изображение вставлено');
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Слушаем paste глобально, но реагируем только когда открыт редактор атласа
  document.addEventListener('paste', (e) => {
    const screen = document.getElementById('atlas-editor-screen');
    if (!screen || !screen.classList.contains('active')) return;
    handleAtlasPaste(e);
  });
});
