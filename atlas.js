// ==================== АТЛАС ====================

let currentAtlasId = null, currentAtlasCategory = 'all', atlasImageBase64 = null;
const CATEGORY_LABELS={'anatomy':'🫀 Анатомия','botany':'🌿 Ботаника','zoology':'🦋 Зоология','cells':'🔬 Клетки','ecology':'🌍 Экология'};

function filterAtlas(category,btn){
  currentAtlasCategory=category;
  document.querySelectorAll('.atlas-cat-pill').forEach(p=>p.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderAtlas();
}
function renderAtlas(){
  const items=window.getAtlasItems?.()||[]; const list=window.getElement('atlas-grid'); if(!list) return;
  const filtered=currentAtlasCategory==='all'?items:items.filter(i=>i.category===currentAtlasCategory);
  if(filtered.length===0){
    list.innerHTML=`<div class="empty-state"><div class="empty-state-icon">🧠</div><div class="empty-state-text">${items.length===0?'Атлас пуст':'Нет элементов в этой категории'}</div><div class="empty-state-sub">Добавьте элементы атласа с изображениями и описаниями</div></div>`;
    return;
  }
  list.innerHTML=''; const grid=document.createElement('div'); grid.className='atlas-grid';
  filtered.forEach(item=>{
    const card=document.createElement('div'); card.className='atlas-card';
    card.innerHTML=`<div class="atlas-card-img">${item.image?`<img src="${item.image}" alt="${window.escapeHtml(item.title)}">`:'🖼️'}</div><div class="atlas-card-content"><div class="atlas-card-title">${window.escapeHtml(item.title)}</div><div class="atlas-card-category">${CATEGORY_LABELS[item.category]||'Другое'}</div></div>`;
    card.onclick=()=>openAtlasItem(item.id);
    grid.appendChild(card);
  });
  list.appendChild(grid);
}
function openAtlasItem(id){
  const items=window.getAtlasItems?.()||[]; const item=items.find(i=>i.id===id); if(!item) return;
  currentAtlasId=id;
  const img=window.getElement('atlas-detail-image'); if(img) { if(item.image) img.src=item.image; else img.style.display='none'; }
  const categorySpan=window.getElement('atlas-detail-category'); if(categorySpan) categorySpan.textContent=CATEGORY_LABELS[item.category]||'Другое';
  const titleEl=window.getElement('atlas-detail-title'); if(titleEl) titleEl.textContent=item.title;
  const descDiv=window.getElement('atlas-detail-desc'); if(descDiv){
    try{ descDiv.innerHTML=typeof marked!=='undefined'?marked.parse(item.description||''):`<pre>${window.escapeHtml(item.description||'')}</pre>`; }
    catch(e){ descDiv.innerHTML=`<pre>${window.escapeHtml(item.description||'')}</pre>`; }
  }
  window.showScreen('atlas-detail-screen');
}
function newAtlasItem(){ currentAtlasId=null; atlasImageBase64=null; window.getElement('atlas-title').value=''; window.getElement('atlas-category').value='anatomy'; window.getElement('atlas-description').value=''; window.getElement('atlas-image-preview').style.display='none'; window.showScreen('atlas-editor-screen'); }
function createAtlasItem(){ newAtlasItem(); }
function triggerAtlasImageUpload(){ document.getElementById('atlas-image-input')?.click(); }
function handleAtlasImageUpload(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader(); reader.onload=e=>{ atlasImageBase64=e.target.result; const previewImg=window.getElement('atlas-preview-img'); if(previewImg) previewImg.src=atlasImageBase64; const previewDiv=window.getElement('atlas-image-preview'); if(previewDiv) previewDiv.style.display='block'; }; reader.readAsDataURL(file);
}
function saveAtlasItem(){
  const title=window.getElement('atlas-title')?.value.trim()||''; const category=window.getElement('atlas-category')?.value||'anatomy'; const description=window.getElement('atlas-description')?.value||'';
  if(!title){ window.showToast?.('⚠️ Введите название'); return; }
  const items=window.getAtlasItems?.()||[];
  if(currentAtlasId){
    const index=items.findIndex(i=>i.id===currentAtlasId);
    if(index!==-1){ items[index].title=title; items[index].category=category; items[index].description=description; if(atlasImageBase64) items[index].image=atlasImageBase64; items[index].updatedAt=Date.now(); }
  } else {
    items.push({id:Date.now().toString(),title,category,description,image:atlasImageBase64,createdAt:Date.now(),updatedAt:Date.now()});
  }
  window.saveAtlasItems?.(items); window.showToast?.('✓ Элемент сохранён'); window.showScreen('atlas-screen'); renderAtlas();
}
function editAtlasItem(){
  if(!currentAtlasId) return; const items=window.getAtlasItems?.()||[]; const item=items.find(i=>i.id===currentAtlasId); if(!item) return;
  window.getElement('atlas-title').value=item.title||''; window.getElement('atlas-category').value=item.category||'anatomy'; window.getElement('atlas-description').value=item.description||'';
  if(item.image){ atlasImageBase64=item.image; const previewImg=window.getElement('atlas-preview-img'); if(previewImg) previewImg.src=item.image; const previewDiv=window.getElement('atlas-image-preview'); if(previewDiv) previewDiv.style.display='block'; }
  else{ atlasImageBase64=null; const previewDiv=window.getElement('atlas-image-preview'); if(previewDiv) previewDiv.style.display='none'; }
  window.showScreen('atlas-editor-screen');
}
function deleteAtlasItem(){ if(!currentAtlasId) return; if(!confirm('Удалить этот элемент из атласа?')) return; const items=window.getAtlasItems?.()||[]; const filtered=items.filter(i=>i.id!==currentAtlasId); window.saveAtlasItems?.(filtered); window.showToast?.('✓ Элемент удалён'); window.showScreen('atlas-screen'); renderAtlas(); }
function closeAtlasEditor(){ window.showScreen('atlas-screen'); renderAtlas(); }

window.filterAtlas=filterAtlas; window.renderAtlas=renderAtlas; window.newAtlasItem=newAtlasItem; window.createAtlasItem=createAtlasItem;
window.triggerAtlasImageUpload=triggerAtlasImageUpload; window.handleAtlasImageUpload=handleAtlasImageUpload;
window.saveAtlasItem=saveAtlasItem; window.editAtlasItem=editAtlasItem; window.deleteAtlasItem=deleteAtlasItem; window.closeAtlasEditor=closeAtlasEditor;
