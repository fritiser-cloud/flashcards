// ==================== ЗАМЕТКИ ====================

let currentNoteId = null, isPreviewMode = false, currentNotesFilter = 'all', notesSearchQuery = '';

function formatTimeAgo(date){
  const now=new Date(); const diff=now-date; const minutes=Math.floor(diff/60000); const hours=Math.floor(diff/3600000); const days=Math.floor(diff/86400000);
  if(minutes<1) return 'только что'; if(minutes<60) return `${minutes} мин назад`; if(hours<24) return `${hours} ч назад`; if(days<7) return `${days} дн назад`;
  const day=date.getDate().toString().padStart(2,'0'); const month=(date.getMonth()+1).toString().padStart(2,'0'); const year=date.getFullYear(); return `${day}.${month}.${year}`;
}
function renderNotes(){
  const notes=window.getNotes?.()||[]; const list=window.getElement('notes-list'); if(!list) return;
  let filtered=notes; if(currentNotesFilter!=='all') filtered=filtered.filter(n=>n.tag===currentNotesFilter);
  if(notesSearchQuery){ const q=notesSearchQuery.toLowerCase(); filtered=filtered.filter(n=>(n.title||'').toLowerCase().includes(q)||(n.content||'').toLowerCase().includes(q)); }
  const sorted=[...filtered].sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!sorted.length){ list.innerHTML=`<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">Нет заметок</div><div class="empty-state-sub">Создайте первую заметку с помощью кнопки +</div></div>`; return; }
  list.innerHTML='';
  sorted.forEach(note=>{
    const card=document.createElement('div'); card.className='note-card';
    const preview=(note.content||'').replace(/[#*`>\-[\]]/g,'').trim().substring(0,120);
    const date=new Date(note.updatedAt); const timeAgo=formatTimeAgo(date);
    const folderNames={'work':'💼 Работа','study':'📚 Учёба','personal':'✨ Личное','ideas':'💡 Идеи'};
    const folderName=folderNames[note.tag]||'📋 Без папки';
    card.innerHTML=`<div class="note-header"><div class="note-title">${window.escapeHtml(note.title)||'Без названия'}</div><div class="note-date">${timeAgo}</div></div><div class="note-preview">${window.escapeHtml(preview)||'Пустая заметка'}${preview.length>=120?'...':''}</div><div class="note-folder">${folderName}</div>`;
    card.onclick=()=>openNote(note.id);
    list.appendChild(card);
  });
}
function createNote(){ newNote(); }
function newNote(){
  const notes=window.getNotes?.()||[]; const newNote={id:Date.now().toString(),title:'',content:'',tag:'study',images:[],createdAt:Date.now(),updatedAt:Date.now()};
  notes.push(newNote); window.saveNotes?.(notes);
  currentNoteId=newNote.id;
  window.getElement('note-title').value=''; window.getElement('note-content').value=''; window.getElement('note-folder').value='study';
  window.getElement('note-images-container').innerHTML='';
  isPreviewMode=false; const previewDiv=window.getElement('note-preview'); if(previewDiv) previewDiv.style.display='none'; const contentDiv=window.getElement('note-content'); if(contentDiv) contentDiv.style.display='block';
  window.showScreen('note-editor-screen');
}
function openNote(noteId){
  const notes=window.getNotes?.()||[]; const note=notes.find(n=>n.id===noteId); if(!note) return;
  currentNoteId=noteId;
  const contentDiv=window.getElement('note-view-content'); if(!contentDiv) return;
  contentDiv.innerHTML='';
  const header=document.createElement('div'); header.style.cssText='margin-bottom:24px;';
  const title=document.createElement('h1'); title.style.cssText='font-family:var(--font-display);font-size:32px;font-weight:600;margin-bottom:12px;line-height:1.2;'; title.textContent=note.title||'Без названия'; header.appendChild(title);
  const meta=document.createElement('div'); meta.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap;';
  const dateSpan=document.createElement('span'); dateSpan.style.cssText='font-size:14px;color:var(--text3);'; dateSpan.textContent=`Обновлено ${formatTimeAgo(new Date(note.updatedAt))}`; meta.appendChild(dateSpan);
  if(note.tag){
    const folderNames={'work':'💼 Работа','study':'📚 Учёба','personal':'✨ Личное','ideas':'💡 Идеи'};
    const folderDiv=document.createElement('div'); folderDiv.style.cssText='font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;background:var(--lavender);color:var(--lavender-text);'; folderDiv.textContent=folderNames[note.tag]||'📋 Без папки'; meta.appendChild(folderDiv);
  }
  header.appendChild(meta); contentDiv.appendChild(header);
  if(note.content){
    const contentParsed=document.createElement('div'); contentParsed.style.cssText='font-size:16px;line-height:1.8;color:var(--text);';
    try{
      let markdown=note.content;
      if(note.images?.length) markdown=markdown.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g,(match,alt,index)=>{ const img=note.images[parseInt(index)]; return img?`![${alt}](${img})`:match; });
      contentParsed.innerHTML=typeof marked!=='undefined'?marked.parse(markdown):'<pre>'+window.escapeHtml(markdown)+'</pre>';
    } catch(e){ contentParsed.innerHTML='<pre>'+window.escapeHtml(note.content)+'</pre>'; }
    contentDiv.appendChild(contentParsed);
  }
  window.showScreen('note-view-screen');
}
function editNote(){
  if(!currentNoteId) return; const notes=window.getNotes?.()||[]; const note=notes.find(n=>n.id===currentNoteId); if(!note) return;
  window.getElement('note-title').value=note.title||''; window.getElement('note-content').value=note.content||''; window.getElement('note-folder').value=note.tag||'study';
  renderNoteImages(note.images||[]);
  isPreviewMode=false; const previewDiv=window.getElement('note-preview'); if(previewDiv) previewDiv.style.display='none'; const contentDiv=window.getElement('note-content'); if(contentDiv) contentDiv.style.display='block';
  window.showScreen('note-editor-screen');
}
function saveNote(){
  if(!currentNoteId) return; const notes=window.getNotes?.()||[]; const noteIndex=notes.findIndex(n=>n.id===currentNoteId); if(noteIndex===-1) return;
  const title=window.getElement('note-title')?.value.trim()||''; const content=window.getElement('note-content')?.value||''; const tag=window.getElement('note-folder')?.value||'study';
  notes[noteIndex].title=title||'Без названия'; notes[noteIndex].content=content; notes[noteIndex].tag=tag; notes[noteIndex].updatedAt=Date.now();
  window.saveNotes?.(notes); window.showToast?.('✓ Заметка сохранена');
}
function deleteNote(){ if(!currentNoteId) return; if(!confirm('Удалить эту заметку?')) return; const notes=window.getNotes?.()||[]; const filtered=notes.filter(n=>n.id!==currentNoteId); window.saveNotes?.(filtered); window.showToast?.('✓ Заметка удалена'); window.showScreen('notes-screen'); renderNotes(); }
function closeNoteEditor(){ saveNote(); window.showScreen('notes-screen'); renderNotes(); }
function togglePreview(){
  isPreviewMode=!isPreviewMode; const contentInput=window.getElement('note-content'); const previewDiv=window.getElement('note-preview'); const previewBtn=document.getElementById('preview-toggle-text');
  if(isPreviewMode){
    const notes=window.getNotes?.()||[]; const note=notes.find(n=>n.id===currentNoteId); let markdown=contentInput?.value||'';
    if(note?.images) markdown=markdown.replace(/!\[([^\]]*)\]\(image:(\d+)\)/g,(match,alt,index)=>{ const img=note.images[parseInt(index)]; return img?`![${alt}](${img})`:match; });
    if(previewDiv){ try{ previewDiv.innerHTML=typeof marked!=='undefined'?marked.parse(markdown):'<pre>'+window.escapeHtml(markdown)+'</pre>'; } catch(e){ previewDiv.innerHTML='<pre>'+window.escapeHtml(markdown)+'</pre>'; } previewDiv.style.display='block'; }
    if(contentInput) contentInput.style.display='none'; if(previewBtn) previewBtn.textContent='✏️ Редактировать';
  } else {
    if(contentInput) contentInput.style.display='block'; if(previewDiv) previewDiv.style.display='none'; if(previewBtn) previewBtn.textContent='👁 Превью';
  }
}
function triggerNoteImageUpload(){ document.getElementById('note-image-input')?.click(); }
function handleNoteImageUpload(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader(); reader.onload=e=>{
    const notes=window.getNotes?.()||[]; const note=notes.find(n=>n.id===currentNoteId);
    if(!note){ window.showToast?.('⚠️ Сначала сохраните заметку'); return; }
    if(!note.images) note.images=[]; note.images.push(e.target.result); window.saveNotes?.(notes); renderNoteImages(note.images); window.showToast?.('✓ Изображение добавлено');
  }; reader.readAsDataURL(file); event.target.value='';
}
function renderNoteImages(images){
  const container=window.getElement('note-images-container'); const galleryDiv=window.getElement('note-images-gallery'); if(!container) return;
  if(!images||!images.length){ if(galleryDiv) galleryDiv.style.display='none'; container.innerHTML=''; return; }
  if(galleryDiv) galleryDiv.style.display='block'; container.innerHTML='';
  const gallery=document.createElement('div'); gallery.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;';
  images.forEach((img,index)=>{ const item=document.createElement('div'); item.className='note-image-item'; item.innerHTML=`<img src="${img}" alt="Image ${index}"><div class="note-image-number">${index}</div><button class="note-image-delete" onclick="deleteNoteImage(${index})">✕</button>`; gallery.appendChild(item); });
  container.appendChild(gallery);
}
function deleteNoteImage(index){ if(!confirm('Удалить это изображение?')) return; const notes=window.getNotes?.()||[]; const note=notes.find(n=>n.id===currentNoteId); if(!note?.images) return; note.images.splice(index,1); window.saveNotes?.(notes); renderNoteImages(note.images); window.showToast?.('✓ Изображение удалено'); }
function searchNotes(){ const input=window.getElement('notes-search'); if(input) notesSearchQuery=input.value; renderNotes(); }
function filterNotesByFolder(folder,btn){ currentNotesFilter=folder; document.querySelectorAll('.folder-pill').forEach(p=>p.classList.remove('active')); if(btn) btn.classList.add('active'); renderNotes(); }

window.renderNotes=renderNotes; window.createNote=createNote; window.newNote=newNote; window.openNote=openNote; window.editNote=editNote; window.saveNote=saveNote; window.deleteNote=deleteNote;
window.closeNoteEditor=closeNoteEditor; window.togglePreview=togglePreview; window.triggerNoteImageUpload=triggerNoteImageUpload; window.handleNoteImageUpload=handleNoteImageUpload;
window.renderNoteImages=renderNoteImages; window.deleteNoteImage=deleteNoteImage; window.searchNotes=searchNotes; window.filterNotesByFolder=filterNotesByFolder;
