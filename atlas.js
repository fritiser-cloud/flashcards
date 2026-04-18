// ==================== АТЛАС ====================
let currentAtlasId = null;
let currentAtlasCategory = 'all';
let atlasImageBase64 = null;

function renderAtlas() {
  const items = getAtlasItems();
  const grid = getElement('atlas-grid');
  if (!grid) return;
  let filtered = currentAtlasCategory === 'all' ? items : items.filter(i => i.category === currentAtlasCategory);
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🗺️</div><div class="empty-state-text">Атлас пуст</div><div class="empty-state-sub">Нажми + чтобы добавить первый элемент</div></div>`;
    return;
  }
  grid.innerHTML = '';
  const categoryLabels = { anatomy: '🫀 Анатомия', botany: '🌿 Ботаника', zoology: '🦋 Зоология', cells: '🔬 Клетки', ecology: '🌍 Экология' };
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'atlas-card';
    card.innerHTML = `<div class="atlas-card-img">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}">` : '🖼️'}</div><div class="atlas-card-content"><div class="atlas-card-title">${escapeHtml(item.title)}</div><div class="atlas-card-category">${categoryLabels[item.category]}</div></div>`;
    card.onclick = () => openAtlasDetail(item.id);
    grid.appendChild(card);
  });
}
window.renderAtlas = renderAtlas;

function filterAtlas(category, btn) {
  currentAtlasCategory = category;
  document.querySelectorAll('.atlas-cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAtlas();
}
window.filterAtlas = filterAtlas;

function openAtlasDetail(id) {
  const items = getAtlasItems();
  const item = items.find(i => i.id === id);
  if (!item) return;
  currentAtlasId = id;
  const categoryLabels = { anatomy: '🫀 Анатомия', botany: '🌿 Ботаника', zoology: '🦋 Зоология', cells: '🔬 Клетки', ecology: '🌍 Экология' };
  const imgEl = getElement('atlas-detail-image');
  if (imgEl) { imgEl.src = item.image || ''; imgEl.style.display = item.image ? 'block' : 'none'; }
  getElement('atlas-detail-category').textContent = categoryLabels[item.category];
  getElement('atlas-detail-title').textContent = item.title;
  getElement('atlas-detail-desc').innerHTML = marked.parse(item.description || '');
  showScreen('atlas-detail-screen');
}
window.openAtlasDetail = openAtlasDetail;

function createAtlasItem() {
  currentAtlasId = null;
  atlasImageBase64 = null;
  getElement('atlas-title').value = '';
  getElement('atlas-category').value = 'anatomy';
  getElement('atlas-description').value = '';
  getElement('atlas-image-preview').style.display = 'none';
  showScreen('atlas-editor-screen');
}
window.createAtlasItem = createAtlasItem;

function triggerAtlasImageUpload() {
  getElement('atlas-image-input')?.click();
}
window.triggerAtlasImageUpload = triggerAtlasImageUpload;

function handleAtlasImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    atlasImageBase64 = e.target.result;
    getElement('atlas-preview-img').src = atlasImageBase64;
    getElement('atlas-image-preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}
window.handleAtlasImageUpload = handleAtlasImageUpload;

function saveAtlasItem() {
  const title = getElement('atlas-title')?.value.trim() || '';
  const category = getElement('atlas-category')?.value || 'anatomy';
  const description = getElement('atlas-description')?.value || '';
  if (!title) { showToast('⚠️ Введите название'); return; }
  const items = getAtlasItems();
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
  saveAtlasItems(items);
  showToast('✓ Элемент сохранён');
  showScreen('atlas-screen');
  renderAtlas();
}
window.saveAtlasItem = saveAtlasItem;

function editAtlasItem() {
  if (!currentAtlasId) return;
  const items = getAtlasItems();
  const item = items.find(i => i.id === currentAtlasId);
  if (!item) return;
  getElement('atlas-title').value = item.title || '';
  getElement('atlas-category').value = item.category || 'anatomy';
  getElement('atlas-description').value = item.description || '';
  if (item.image) {
    atlasImageBase64 = item.image;
    getElement('atlas-preview-img').src = item.image;
    getElement('atlas-image-preview').style.display = 'block';
  } else {
    atlasImageBase64 = null;
    getElement('atlas-image-preview').style.display = 'none';
  }
  showScreen('atlas-editor-screen');
}
window.editAtlasItem = editAtlasItem;

function deleteAtlasItem() {
  if (!currentAtlasId) return;
  if (!confirm('Удалить этот элемент из атласа?')) return;
  const items = getAtlasItems();
  const filtered = items.filter(i => i.id !== currentAtlasId);
  saveAtlasItems(filtered);
  showToast('✓ Элемент удалён');
  showScreen('atlas-screen');
  renderAtlas();
}
window.deleteAtlasItem = deleteAtlasItem;

function closeAtlasEditor() {
  showScreen('atlas-screen');
  renderAtlas();
}
window.closeAtlasEditor = closeAtlasEditor;
