// ==================== ФЛЕШ-КАРТОЧКИ ====================

let currentDeckId = null, studyQueue = [], studyIdx = 0, sessionKnown = 0, sessionErrors = 0, isFlipped = false;

function plural(n,one,few,many){ if(n%10===1&&n%100!==11) return one; if(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)) return few; return many; }

async function renderDecks(){
  try{
    const decks=await window.dbGetAll('decks');
    const list=window.getElement('decks-list'); if(!list) return;
    if(!decks.length){ list.innerHTML=`<div class="empty-state"><div class="empty-state-icon">🎴</div><div class="empty-state-text">Нет колод</div><div class="empty-state-sub">Добавьте карточки из библиотеки или загрузите JSON файл</div></div>`; return; }
    list.innerHTML='';
    for(const deck of decks){
      const el=document.createElement('div'); el.className='deck-item';
      const isMatch=deck.type==='match'; const total=deck.cards.length;
      el.innerHTML=`<div class="deck-icon" style="background:${deck.color||'#E8F4EE'}">${deck.icon||'📚'}</div><div class="deck-info"><div class="deck-name">${window.escapeHtml(deck.name)}</div><div class="deck-meta">${total} ${isMatch?'блоков':'карточек'}</div></div><span class="deck-type-badge ${isMatch?'match':''}">${isMatch?'🔗 Паронимы':'📋 Карточки'}</span><div class="deck-arrow">›</div>`;
      el.onclick=()=>startCardStudy(deck.id);
      list.appendChild(el);
    }
  } catch(error){ console.error(error); const list=window.getElement('decks-list'); if(list) list.innerHTML='<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Ошибка загрузки данных</div></div>'; }
}

async function startCardStudy(deckId){
  try{
    currentDeckId=deckId; const deck=await window.dbGet('decks',deckId); if(!deck) return;
    if(deck.type==='match'){ startMatch(deckId); return; }
    studyQueue=deck.cards.map((card,idx)=>({...card,idx})).sort(()=>Math.random()-0.5);
    studyIdx=0; sessionKnown=0; sessionErrors=0;
    const titleEl=window.getElement('deck-name-title'); if(titleEl) titleEl.textContent=deck.name;
    window.showScreen('study-screen'); showCard();
  } catch(error){ console.error(error); window.showToast?.('⚠️ Ошибка загрузки колоды'); }
}

function showCard(){
  if(studyIdx>=studyQueue.length){ showCompletionScreen(); return; }
  const card=studyQueue[studyIdx];
  const progressNum=window.getElement('progress-num'); if(progressNum) progressNum.textContent=studyIdx+1;
  const progressTotal=window.getElement('progress-total'); if(progressTotal) progressTotal.textContent=studyQueue.length;
  const progressFill=window.getElement('progress-fill'); if(progressFill) progressFill.style.width=`${(studyIdx/studyQueue.length)*100}%`;
  const frontEl=window.getElement('card-front'); if(frontEl) frontEl.textContent=card.q||'Вопрос';
  const backEl=window.getElement('card-back'); if(backEl) backEl.textContent=card.a||'Ответ';
  isFlipped=false; const cardInner=window.getElement('card-inner'); if(cardInner) cardInner.classList.remove('flipped');
  const controls=window.getElement('card-controls'); if(controls) controls.style.display='flex';
  const stats=window.getElement('card-stats'); if(stats) stats.style.display='flex';
  const completion=window.getElement('completion-screen'); if(completion) completion.style.display='none';
  updateSessionStats();
}

function flipCard(){ if(isFlipped) return; isFlipped=true; const cardInner=window.getElement('card-inner'); if(cardInner) cardInner.classList.add('flipped'); }
function answerCard(correct){ correct?sessionKnown++:sessionErrors++; updateSessionStats(); studyIdx++; showCard(); }
function markCard(correct){ answerCard(correct); }
function updateSessionStats(){
  const correctEl=window.getElement('stat-correct'); if(correctEl) correctEl.textContent=sessionKnown;
  const wrongEl=window.getElement('stat-wrong'); if(wrongEl) wrongEl.textContent=sessionErrors;
  const total=sessionKnown+sessionErrors; const rate=total>0?Math.round((sessionKnown/total)*100):0;
  const rateEl=window.getElement('stat-rate'); if(rateEl) rateEl.textContent=rate+'%';
}
function showCompletionScreen(){
  const controls=window.getElement('card-controls'); if(controls) controls.style.display='none';
  const stats=window.getElement('card-stats'); if(stats) stats.style.display='none';
  const completion=window.getElement('completion-screen'); if(completion) completion.style.display='flex';
  const compCorrect=window.getElement('comp-correct'); if(compCorrect) compCorrect.textContent=sessionKnown;
  const compWrong=window.getElement('comp-wrong'); if(compWrong) compWrong.textContent=sessionErrors;
  const total=sessionKnown+sessionErrors; const rate=total>0?Math.round((sessionKnown/total)*100):0;
  const compRate=window.getElement('comp-rate'); if(compRate) compRate.textContent=rate+'%';
}
function restartDeck(){ studyIdx=0; sessionKnown=0; sessionErrors=0; studyQueue=studyQueue.sort(()=>Math.random()-0.5); showCard(); }
function exitCards(){ window.showScreen('decks-screen'); renderDecks(); }
function exitStudy(){ exitCards(); }
function toggleFavorite(){ window.showToast?.('⭐ Функция избранного в разработке'); }

// ========== СОПОСТАВЛЕНИЕ ==========
let matchSets=[], matchSetIdx=0, matchSelected={left:null,right:null}, matchConnections=[], matchChecked=false;
async function startMatch(deckId){
  try{
    currentDeckId=deckId; const deck=await window.dbGet('decks',deckId); if(!deck) return;
    matchSets=[...deck.cards].sort(()=>Math.random()-0.5); matchSetIdx=0;
    const titleEl=window.getElement('match-deck-name'); if(titleEl) titleEl.textContent=deck.name;
    window.showScreen('match-screen'); renderMatchSet();
  } catch(error){ console.error(error); window.showToast?.('⚠️ Ошибка загрузки'); }
}
function renderMatchSet(){
  if(matchSetIdx>=matchSets.length){ showMatchCompletion(); return; }
  const set=matchSets[matchSetIdx]; const pairs=set.pairs||[];
  const progressInfo=window.getElement('match-progress-info'); if(progressInfo) progressInfo.textContent=`Блок ${matchSetIdx+1} из ${matchSets.length}`;
  matchSelected={left:null,right:null}; matchConnections=[]; matchChecked=false;
  const grid=window.getElement('match-grid'); if(!grid) return; grid.innerHTML='';
  const leftCol=document.createElement('div'); leftCol.className='match-column';
  pairs.forEach((pair,idx)=>{ const chip=document.createElement('div'); chip.className='match-chip'; chip.textContent=pair.word||''; chip.dataset.idx=idx; chip.dataset.side='left'; chip.onclick=()=>selectChip('left',idx,chip); leftCol.appendChild(chip); });
  const rightItems=[...pairs].sort(()=>Math.random()-0.5);
  const rightCol=document.createElement('div'); rightCol.className='match-column';
  rightItems.forEach((pair,displayIdx)=>{ const originalIdx=pairs.indexOf(pair); const chip=document.createElement('div'); chip.className='match-chip'; chip.textContent=pair.example||''; chip.dataset.displayIdx=displayIdx; chip.dataset.originalIdx=originalIdx; chip.dataset.side='right'; chip.onclick=()=>selectChip('right',displayIdx,chip,originalIdx); rightCol.appendChild(chip); });
  grid.appendChild(leftCol); grid.appendChild(rightCol);
}
function selectChip(side,idx,chip,originalIdx){
  if(matchChecked) return;
  document.querySelectorAll(`.match-chip[data-side="${side}"]`).forEach(c=>c.classList.remove('selected'));
  if(side==='left'){
    if(matchSelected.left===idx){ matchSelected.left=null; return; }
    matchSelected.left=idx; chip.classList.add('selected');
  } else {
    if(matchSelected.right===idx){ matchSelected.right=null; matchSelected.rightOriginal=null; return; }
    matchSelected.right=idx; matchSelected.rightOriginal=originalIdx; chip.classList.add('selected');
  }
  if(matchSelected.left!==null && matchSelected.right!==null) connectPair();
}
function connectPair(){
  matchConnections.push({left:matchSelected.left,rightDisplay:matchSelected.right,rightOriginal:matchSelected.rightOriginal});
  document.querySelectorAll('.match-chip.selected').forEach(c=>c.classList.remove('selected'));
  matchSelected={left:null,right:null}; drawLines();
}
function drawLines(){
  const canvas=window.getElement('match-canvas'); const grid=window.getElement('match-grid'); if(!canvas||!grid) return;
  canvas.innerHTML=''; const gridRect=grid.getBoundingClientRect();
  matchConnections.forEach(conn=>{
    const leftChip=document.querySelector(`.match-chip[data-side="left"][data-idx="${conn.left}"]`);
    const rightChip=document.querySelector(`.match-chip[data-side="right"][data-displayIdx="${conn.rightDisplay}"]`);
    if(!leftChip||!rightChip) return;
    const leftRect=leftChip.getBoundingClientRect(), rightRect=rightChip.getBoundingClientRect();
    const x1=leftRect.right-gridRect.left, y1=leftRect.top+leftRect.height/2-gridRect.top;
    const x2=rightRect.left-gridRect.left, y2=rightRect.top+rightRect.height/2-gridRect.top;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1); line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke','#9575CD'); line.setAttribute('stroke-width','2');
    canvas.appendChild(line);
  });
}
function restartMatch(){ matchSetIdx=0; matchSets=matchSets.sort(()=>Math.random()-0.5); renderMatchSet(); }
function exitMatch(){ window.showScreen('decks-screen'); renderDecks(); }
function skipMatchSet(){ matchSetIdx++; renderMatchSet(); }
function checkMatch(){ window.showToast?.('🔍 Проверка в разработке'); }
function showMatchCompletion(){ const completion=window.getElement('match-completion'); if(completion) completion.style.display='flex'; }

document.addEventListener('DOMContentLoaded',()=>{ const flashcard=window.getElement('flashcard'); if(flashcard) flashcard.addEventListener('click',flipCard); });

window.renderDecks=renderDecks; window.startCardStudy=startCardStudy; window.answerCard=answerCard; window.markCard=markCard;
window.restartDeck=restartDeck; window.exitCards=exitCards; window.exitStudy=exitStudy; window.toggleFavorite=toggleFavorite;
window.startMatch=startMatch; window.restartMatch=restartMatch; window.exitMatch=exitMatch; window.skipMatchSet=skipMatchSet; window.checkMatch=checkMatch;
