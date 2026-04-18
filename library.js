// ==================== БИБЛИОТЕКА ПОСОБИЙ ====================

let currentGuideId = null;
let currentCat = 'all';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function filterLibrary(cat) {
  currentCat = cat;
  const pills = document.querySelectorAll('#library-cats .cat-pill');
  pills.forEach(p => p.classList.remove('active'));
  event.target?.classList.add('active');
  renderLibrary();
}

function renderLibrary() {
  const guides = window.getGuides ? window.getGuides() : [];
  const list = window.getElement('library-list');
  if (!list) return;
  
  const filtered = currentCat === 'all' ? guides : guides.filter(g => g.category === currentCat);
  
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-text">${guides.length === 0 ? 'Библиотека пуста' : 'Нет пособий в этой категории'}</div>
      <div class="empty-state-sub">Добавьте пособия через GitHub или загрузите JSON файл</div>
    </div>`;
    return;
  }
  
  list.innerHTML = '';
  filtered.forEach(guide => {
    const card = document.createElement('div');
    card.className = `guide-card ${guide.category || 'bio'}`;
    const tags = (guide.tags || []).map((t, i) => {
      const cls = ['', 'sage', 'peach', 'sky'][i % 4];
      return `<span class="card-tag ${cls}">${escapeHtml(t)}</span>`;
    }).join('');
    card.innerHTML = `
      <div class="card-emoji">${guide.icon || '📖'}</div>
      <div class="card-title">${escapeHtml(guide.name)}</div>
      <div class="card-sub">${escapeHtml(guide.desc || '')}</div>
      <div class="card-tags">${tags}</div>
      <div class="card-arrow">›</div>`;
    card.onclick = () => openGuide(guide.id);
    list.appendChild(card);
  });
}

function openGuide(id) {
  currentGuideId = id;
  const guides = window.getGuides ? window.getGuides() : [];
  const guide = guides.find(g => g.id === id);
  if (!guide) return;
  
  const titleEl = window.getElement('guide-title');
  if (titleEl) titleEl.textContent = guide.name;
  
  const contentDiv = window.getElement('guide-content');
  if (!contentDiv) return;
  contentDiv.innerHTML = '';
  
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text3); margin-bottom: 12px;">
      ${{'bio':'🧬 Биология','ru':'📖 Русский','phys':'⚛️ Физика'}[guide.category] || '📖 Пособие'}
    </div>
    <h1 style="font-family: var(--font-display); font-size: 32px; font-weight: 600; margin-bottom: 12px; line-height: 1.2;">
      ${escapeHtml(guide.name)}
    </h1>
    <p style="font-size: 16px; color: var(--text2); line-height: 1.7; margin-bottom: 24px;">
      ${escapeHtml(guide.desc || '')}
    </p>
  `;
  if (guide.tags && guide.tags.length) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'card-tags';
    tagsDiv.innerHTML = guide.tags.map((t,i)=>`<span class="card-tag ${['','sage','peach','sky'][i%4]}">${escapeHtml(t)}</span>`).join('');
    header.appendChild(tagsDiv);
  }
  contentDiv.appendChild(header);
  
  if (guide.content) {
    const mdDiv = document.createElement('div');
    mdDiv.style.cssText = 'margin-top: 32px; line-height: 1.8;';
    try {
      mdDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(guide.content) : '<pre>'+escapeHtml(guide.content)+'</pre>';
    } catch(e) { mdDiv.innerHTML = '<pre>'+escapeHtml(guide.content)+'</pre>'; }
    contentDiv.appendChild(mdDiv);
  }
  
  if (guide.url) {
    const btnDiv = document.createElement('div');
    btnDiv.style.cssText = 'margin-top: 24px;';
    btnDiv.innerHTML = `<button class="btn-primary" onclick="window.open('${escapeHtml(guide.url)}','_blank')" style="width:100%;padding:16px;border-radius:var(--radius-sm);border:none;background:var(--lavender-deep);color:white;font-size:16px;font-weight:600;cursor:pointer;">🔗 Открыть оригинал</button>`;
    contentDiv.appendChild(btnDiv);
  }
  window.showScreen('guide-screen');
}

function addGuideToDecks() {
  if (!currentGuideId) return;
  const guides = window.getGuides?.() || [];
  const guide = guides.find(g=>g.id===currentGuideId);
  if (!guide?.cards?.length) { window.showToast?.('⚠️ Нет карточек для добавления'); return; }
  const deck = {
    id: Date.now(), name: guide.name, icon: guide.icon || '📚',
    color: guide.category==='bio'?'#E8F5E9':guide.category==='ru'?'#FBE9E7':'#E3F2FD',
    cards: guide.cards, type: 'flashcard'
  };
  window.dbPut('decks', deck).then(()=>{ window.showToast?.('✓ Добавлено в карточки'); window.navTo?.('decks'); })
    .catch(()=>window.showToast?.('⚠️ Ошибка добавления'));
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
let currentAddType = 'guide';
let ghTabLoaded = false;
let GITHUB_USER = localStorage.getItem('gh_user') || 'fritiser-cloud';
let GITHUB_REPO = localStorage.getItem('gh_repo') || 'flashcards';

function filterCat(cat, btn) { currentCat=cat; document.querySelectorAll('.cat-pill').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderLibrary(); }
function openAddModal(type) {
  currentAddType=type; ghTabLoaded=false;
  const modalTitle=window.getElement('modal-title'); if(modalTitle) modalTitle.textContent=type==='guide'?'Добавить пособие':'Добавить колоду';
  const modalSub=window.getElement('modal-sub'); if(modalSub) modalSub.textContent=type==='guide'?'Загрузи JSON с описанием пособия':'Загрузи JSON с карточками';
  const addModal=window.getElement('add-modal'); if(addModal) addModal.classList.add('open');
  document.querySelectorAll('.modal-tab').forEach((b,i)=>b.classList.toggle('active',i===0));
  const tabFile=window.getElement('add-tab-file'); if(tabFile) tabFile.style.display='';
  const tabGithub=window.getElement('add-tab-github'); if(tabGithub) tabGithub.style.display='none';
}
function closeAddModal(e){ if(!e||e.target===window.getElement('add-modal')) window.getElement('add-modal')?.classList.remove('open'); }
function switchAddTab(tab,btn){
  document.querySelectorAll('.modal-tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  const tabFile=window.getElement('add-tab-file'); if(tabFile) tabFile.style.display=tab==='file'?'':'none';
  const tabGithub=window.getElement('add-tab-github'); if(tabGithub) tabGithub.style.display=tab==='github'?'':'none';
  if(tab==='github' && !ghTabLoaded){ ghTabLoaded=true; loadGithubList(); }
}
function triggerFileAdd(){ closeAddModal(); window.getElement('file-input')?.click(); }
async function handleFileAdd(event){
  const file=event.target.files[0]; if(!file) return; event.target.value='';
  try{
    const text=await file.text(); const data=JSON.parse(text);
    if(currentAddType==='guide'){
      if(!data.name||!data.category) throw new Error('bad format');
      const guides=window.getGuides?.()||[]; const existing=guides.findIndex(g=>g.name===data.name);
      if(existing>=0) guides[existing]=data; else guides.push({...data,id:Date.now()});
      window.saveGuides?.(guides); renderLibrary();
    } else {
      if(!data.name||!Array.isArray(data.cards)) throw new Error('bad format');
      const colors=['#E8F4EE','#FDF0E8','#FEF9E7','#EEF0FD','#FDE8F0'];
      const deck={name:data.name,icon:data.icon||'📚',type:data.type||'flashcard',color:data.color||colors[Math.floor(Math.random()*colors.length)],cards:data.cards,createdAt:Date.now()};
      await window.dbPut?.('decks',deck); window.renderDecks?.();
    }
    closeAddModal(); window.showToast?.(`✓ ${data.name} добавлено`);
  } catch(e){ window.showToast?.('⚠️ Ошибка: неверный формат файла'); }
}
async function loadGithubList(){
  const loading=window.getElement('gh-loading'), errEl=window.getElement('gh-error'), list=window.getElement('gh-list');
  try{
    const res=await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`,{headers:{'Accept':'application/vnd.github.v3+json'}});
    if(!res.ok) throw new Error(res.status);
    const files=await res.json();
    const jsonFiles=files.filter(f=>f.name.endsWith('.json')&&f.name!=='manifest.json'&&f.type==='file');
    if(loading) loading.style.display='none';
    if(!jsonFiles.length){ if(list) list.innerHTML='<div class="gh-loading">Нет JSON файлов в репозитории</div>'; return; }
    if(list) list.innerHTML='<div class="gh-loading">Загрузка...</div>';
    const filtered=[];
    for(const f of jsonFiles){
      try{
        const rawUrl=`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${f.name}`;
        const resp=await fetch(rawUrl); const data=await resp.json();
        filtered.push({...f,data});
      } catch(e){ console.warn('Не удалось загрузить',f.name); }
    }
    if(!filtered.length){ if(list) list.innerHTML='<div class="gh-loading">Нет подходящих файлов</div>'; return; }
    if(list){
      list.innerHTML='';
      for(const f of filtered){
        const el=document.createElement('div'); el.className='gh-item';
        el.innerHTML=`<div class="gh-item-icon">📄</div><div class="gh-item-info"><div class="gh-item-name">${escapeHtml(f.data.name||f.name)}</div><div class="gh-item-sub">${(f.size/1024).toFixed(1)} КБ</div></div><div class="gh-item-btn">Добавить</div>`;
        el.onclick=()=>importFromGithub(f.data,f.name);
        list.appendChild(el);
      }
    }
  } catch(e){ if(loading) loading.style.display='none'; if(errEl){ errEl.textContent=`Ошибка загрузки: ${e.message}`; errEl.style.display=''; } }
}
async function importFromGithub(data,filename){
  if(currentAddType==='guide'){
    const guides=window.getGuides?.()||[]; const existing=guides.findIndex(g=>g.name===data.name);
    if(existing>=0) guides[existing]={...data,sourceFile:filename}; else guides.push({...data,id:Date.now(),sourceFile:filename});
    window.saveGuides?.(guides); renderLibrary();
  } else {
    const deck={...data,sourceFile:filename,createdAt:Date.now()};
    await window.dbPut?.('decks',deck); window.renderDecks?.();
  }
  closeAddModal(); window.showToast?.(`✓ ${data.name||filename} добавлено`);
}
function openSampleModal(){
  closeAddModal(); const sampleModal=window.getElement('sample-modal'); if(sampleModal) sampleModal.classList.add('open');
  const title=window.getElement('sample-title'), sub=window.getElement('sample-sub'), pre=window.getElement('sample-pre');
  if(currentAddType==='guide'){
    if(title) title.textContent='Формат пособия'; if(sub) sub.textContent='JSON файл должен содержать следующие поля:';
    if(pre) pre.textContent=`{\n  "type": "guide",\n  "name": "Название пособия",\n  "category": "bio",\n  "desc": "Описание",\n  "icon": "🧬",\n  "tags": ["ЕГЭ", "Биология"],\n  "content": "# Markdown контент\\n\\nТекст пособия..."\n}`;
  } else {
    if(title) title.textContent='Формат колоды'; if(sub) sub.textContent='JSON файл должен содержать следующие поля:';
    if(pre) pre.textContent=`{\n  "type": "flashcard",\n  "name": "Название колоды",\n  "icon": "📚",\n  "cards": [\n    { "q": "Вопрос 1", "a": "Ответ 1" },\n    { "q": "Вопрос 2", "a": "Ответ 2" }\n  ]\n}`;
  }
}
function closeSampleModal(e){ if(!e||e.target===window.getElement('sample-modal')) window.getElement('sample-modal')?.classList.remove('open'); }

// Экспорты
window.filterLibrary=filterLibrary; window.filterCat=filterCat; window.renderLibrary=renderLibrary;
window.openGuide=openGuide; window.addGuideToDecks=addGuideToDecks;
window.openAddModal=openAddModal; window.closeAddModal=closeAddModal; window.switchAddTab=switchAddTab;
window.triggerFileAdd=triggerFileAdd; window.handleFileAdd=handleFileAdd;
window.loadGithubList=loadGithubList; window.importFromGithub=importFromGithub;
window.openSampleModal=openSampleModal; window.closeSampleModal=closeSampleModal;
window.escapeHtml=escapeHtml;
