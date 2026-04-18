// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================

if(typeof marked!=='undefined') marked.setOptions({breaks:true,gfm:true});
else { window.marked={ parse:(txt)=>'<pre>'+(window.escapeHtml?window.escapeHtml(txt):txt)+'</pre>' }; }

function updateSettingsStats(){
  const guides=window.getGuides?.()||[]; const notes=window.getNotes?.()||[]; const atlas=window.getAtlasItems?.()||[];
  const guideCount=window.getElement('settings-guide-count'); if(guideCount) guideCount.textContent=guides.length;
  const atlasCount=window.getElement('settings-atlas-count'); if(atlasCount) atlasCount.textContent=atlas.length;
  const notesCount=window.getElement('settings-notes-count'); if(notesCount) notesCount.textContent=notes.length;
  window.dbGetAll('decks').then(decks=>{ const deckCount=window.getElement('settings-deck-count'); if(deckCount) deckCount.textContent=decks.length; }).catch(()=>{});
}
function clearAllData(){
  if(!confirm('Удалить ВСЕ данные: колоды, заметки, атлас, пособия? Отменить нельзя.')) return;
  localStorage.removeItem('notes'); localStorage.removeItem('atlas'); localStorage.removeItem('bio_guides'); localStorage.removeItem('gh_user'); localStorage.removeItem('gh_repo');
  window.dbGetAll('decks').then(decks=>Promise.all(decks.map(d=>window.dbDelete('decks',d.id)))).then(()=>{
    window.showToast?.('🗑 Все данные удалены'); window.renderLibrary?.(); window.renderDecks?.(); window.renderAtlas?.(); window.renderNotes?.(); updateSettingsStats();
  }).catch(err=>console.error(err));
}
function saveSettings(){
  const ghUser=window.getElement('gh-user-input')?.value.trim()||'fritiser-cloud';
  const ghRepo=window.getElement('gh-repo-input')?.value.trim()||'flashcards';
  localStorage.setItem('gh_user',ghUser); localStorage.setItem('gh_repo',ghRepo);
  window.showToast?.('✓ Настройки сохранены');
}
function signInWithGoogle(){ window.showToast?.('🔐 Авторизация через Google будет доступна в следующей версии'); }
function signOut(){ window.showToast?.('🔓 Выход из аккаунта (демо-режим)'); showAuthUI(false); }
function showAuthUI(isLoggedIn){
  const loggedOut=window.getElement('auth-logged-out'); const loggedIn=window.getElement('auth-logged-in');
  if(loggedOut) loggedOut.style.display=isLoggedIn?'none':'block';
  if(loggedIn) loggedIn.style.display=isLoggedIn?'block':'none';
  if(isLoggedIn){
    const avatar=window.getElement('user-avatar'); if(avatar) avatar.src='https://ui-avatars.com/api/?background=9575CD&color=fff&bold=true&name=User';
    const name=window.getElement('user-name'); if(name) name.textContent='Демо-пользователь';
    const email=window.getElement('user-email'); if(email) email.textContent='demo@example.com';
  }
}
function checkAuth(){ showAuthUI(false); }

(async function init(){
  try{
    console.log('🚀 Запуск приложения...');
    await window.openDB();
    console.log('✓ База данных инициализирована');
    if(window.renderLibrary) window.renderLibrary();
    if(window.renderDecks) window.renderDecks();
    if(window.renderAtlas) window.renderAtlas();
    if(window.renderNotes) window.renderNotes();
    if(window.navTo) window.navTo('library');
    checkAuth();
    updateSettingsStats();
    console.log('✓ Приложение готово');
  } catch(error){
    console.error('❌ Ошибка инициализации:',error);
    window.showToast?.('⚠️ Ошибка инициализации');
    if(window.renderLibrary) window.renderLibrary();
    if(window.navTo) window.navTo('library');
  }
})();

window.addEventListener('online',()=>window.showToast?.('🟢 Соединение восстановлено'));
window.addEventListener('offline',()=>window.showToast?.('🔴 Нет соединения'));
window.addEventListener('error',(event)=>console.error('Глобальная ошибка:',event.error));
window.addEventListener('unhandledrejection',(event)=>console.error('Необработанное отклонение:',event.reason));

window.updateSettingsStats=updateSettingsStats; window.clearAllData=clearAllData; window.saveSettings=saveSettings;
window.signInWithGoogle=signInWithGoogle; window.signOut=signOut;
console.log('📚 Биолаб • Карточки • Заметки v3.0');
