// ==================== PDF VIEWER ====================
// Strip architecture: horizontal flex row of pre-rendered page slots.
// CSS transforms only for transitions & zoom — no re-render on swipe/zoom.
// Features: pinch-zoom with focal point, pan when zoomed, double-tap zoom,
//           auto-hide UI chrome, page jump, thumbnail panel, reading position memory.

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ==================== DATA ====================

function getPdfLibrary() {
  try { return JSON.parse(localStorage.getItem('pdf_library') || '[]'); } catch { return []; }
}
function savePdfLibrary(data) {
  localStorage.setItem('pdf_library', JSON.stringify(data));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}
function getPdfDownloaded() {
  try { return JSON.parse(localStorage.getItem('pdf_downloaded') || '{}'); } catch { return {}; }
}
function savePdfDownloaded(data) {
  localStorage.setItem('pdf_downloaded', JSON.stringify(data));
  if (window.autoSaveToCloud) window.autoSaveToCloud();
}
window.getPdfLibrary = getPdfLibrary;
window.savePdfLibrary = savePdfLibrary;
window.getPdfDownloaded = getPdfDownloaded;
window.savePdfDownloaded = savePdfDownloaded;

function getPdfPositions() {
  try { return JSON.parse(localStorage.getItem('pdf_positions') || '{}'); } catch { return {}; }
}
function savePdfPosition(pdfId, page) {
  const pos = getPdfPositions();
  pos[pdfId] = page;
  localStorage.setItem('pdf_positions', JSON.stringify(pos));
}

// ==================== UPLOAD / DOWNLOAD / DELETE ====================

async function handlePdfFileSelect(file) {
  if (!file || file.type !== 'application/pdf') {
    window.showToast('Выберите PDF файл'); return;
  }
  const token = localStorage.getItem('yadisk_token');
  if (!token) {
    window.showToast('Укажите токен Яндекс Диска в настройках'); return;
  }
  window.showToast('Загрузка на Яндекс Диск...');
  const id = 'pdf_' + Date.now();
  const filename = id + '_' + file.name.replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_');
  try {
    const yadiskUrl = await window.uploadFileToYadisk(file, filename, 'pdfs');
    if (!yadiskUrl) { window.showToast('Ошибка загрузки на Яндекс Диск'); return; }
    const entry = {
      id, name: file.name.replace(/\.pdf$/i, ''), icon: '📄',
      subject: 'bio', tags: [], desc: '',
      yadiskUrl, size: file.size, uploadedAt: Date.now(), deleted: false
    };
    const lib = getPdfLibrary();
    lib.push(entry);
    savePdfLibrary(lib);
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
    await window.dbPut('pdf_files', { id, blob, updatedAt: Date.now() });
    const dl = getPdfDownloaded(); dl[id] = true; savePdfDownloaded(dl);
    renderPdfSection();
    window.showToast('PDF добавлен');
  } catch (e) {
    console.error('handlePdfFileSelect:', e);
    window.showToast('Ошибка: ' + e.message);
  }
}
window.handlePdfFileSelect = handlePdfFileSelect;

async function downloadPdfLocally(pdfId) {
  const entry = getPdfLibrary().find(p => p.id === pdfId);
  if (!entry) return;
  window.showToast('Скачивание...');
  try {
    const downloadUrl = await window.getYadiskDownloadUrl(entry.yadiskUrl);
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    await window.dbPut('pdf_files', { id: pdfId, blob, updatedAt: Date.now() });
    const dl = getPdfDownloaded(); dl[pdfId] = true; savePdfDownloaded(dl);
    renderPdfSection();
    window.showToast('Сохранено на устройстве');
  } catch (e) {
    console.error('downloadPdfLocally:', e);
    window.showToast('Ошибка скачивания');
  }
}
window.downloadPdfLocally = downloadPdfLocally;

async function deletePdfLocally(pdfId) {
  await window.dbDelete('pdf_files', pdfId);
  const dl = getPdfDownloaded(); delete dl[pdfId]; savePdfDownloaded(dl);
  renderPdfSection();
  window.showToast('Удалено с устройства');
}
window.deletePdfLocally = deletePdfLocally;

async function deletePdf(pdfId) {
  if (!confirm('Удалить PDF? Файл будет удалён со всех устройств.')) return;
  const lib = getPdfLibrary();
  const idx = lib.findIndex(p => p.id === pdfId);
  if (idx !== -1) { lib[idx].deleted = true; savePdfLibrary(lib); }
  await deletePdfLocally(pdfId);
  if (_currentPdfId === pdfId) closePdfViewer();
  renderPdfSection();
  window.showToast('PDF удалён');
}
window.deletePdf = deletePdf;

// ==================== SYNC ====================

async function syncPdfFiles() {
  const lib = getPdfLibrary();
  const dl = getPdfDownloaded();
  let changed = false;
  for (const entry of lib) {
    if (entry.deleted) {
      const existing = await window.dbGet('pdf_files', entry.id);
      if (existing) { await window.dbDelete('pdf_files', entry.id); delete dl[entry.id]; changed = true; }
    } else if (dl[entry.id]) {
      const existing = await window.dbGet('pdf_files', entry.id);
      if (!existing) {
        try {
          const downloadUrl = await window.getYadiskDownloadUrl(entry.yadiskUrl);
          const res = await fetch(downloadUrl);
          if (res.ok) {
            const blob = await res.blob();
            await window.dbPut('pdf_files', { id: entry.id, blob, updatedAt: Date.now() });
            changed = true;
          }
        } catch (e) {
          console.warn('syncPdfFiles: не удалось скачать', entry.id, e);
          delete dl[entry.id]; changed = true;
        }
      }
    }
  }
  if (changed) savePdfDownloaded(dl);
  renderPdfSection();
}
window.syncPdfFiles = syncPdfFiles;

// ==================== LIBRARY RENDER ====================

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

function renderPdfSection() {
  const container = document.getElementById('pdf-section');
  if (!container) return;

  const currentCat = window._getCurrentCat ? window._getCurrentCat() : 'all';
  const searchQ = window._getLibrarySearchQuery ? window._getLibrarySearchQuery() : '';
  const dl = getPdfDownloaded();
  const positions = getPdfPositions();

  let lib = getPdfLibrary().filter(p => !p.deleted);
  if (currentCat !== 'all') lib = lib.filter(p => (p.subject || 'bio') === currentCat);
  if (searchQ) {
    lib = lib.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchQ)) ||
      (p.desc && p.desc.toLowerCase().includes(searchQ)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQ)))
    );
  }

  if (lib.length === 0) { container.innerHTML = ''; return; }

  const cards = lib.map(entry => {
    const isLocal = !!dl[entry.id];
    const badge = isLocal
      ? `<span class="pdf-badge pdf-badge--local">На устройстве</span>`
      : `<span class="pdf-badge pdf-badge--cloud">В облаке</span>`;
    const icon = entry.icon || '📄';
    const tags = (entry.tags || []).map((t, i) =>
      `<span class="card-tag ${['', 'sage', 'peach', 'sky'][i % 4]}">${window.escapeHtml(t)}</span>`
    ).join('');
    const savedPage = positions[entry.id];
    const posHint = savedPage && savedPage > 1
      ? `<span class="pdf-badge pdf-badge--pos">стр. ${savedPage}</span>` : '';
    return `
      <div class="pdf-card" onclick="openPdfViewer('${entry.id}')">
        <div class="pdf-card-emoji">${icon}</div>
        <div class="pdf-card-info">
          <div class="pdf-card-name">${window.escapeHtml(entry.name)}</div>
          <div class="pdf-card-meta">${formatSize(entry.size)} ${badge}${posHint}</div>
          ${tags ? `<div class="pdf-card-tags">${tags}</div>` : ''}
        </div>
        <div class="pdf-card-actions" onclick="event.stopPropagation()">
          <button class="pdf-action-btn" onclick="window.openMetaEditModal('pdf','${entry.id}')" title="Редактировать">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          ${isLocal
            ? `<button class="pdf-action-btn" onclick="deletePdfLocally('${entry.id}')" title="Удалить с устройства">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                </svg></button>`
            : `<button class="pdf-action-btn" onclick="downloadPdfLocally('${entry.id}')" title="Скачать">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg></button>`
          }
          <button class="pdf-action-btn pdf-action-btn--danger" onclick="deletePdf('${entry.id}')" title="Удалить PDF">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="pdf-section-title">PDF файлы</div>${cards}`;
}
window.renderPdfSection = renderPdfSection;

// ==================== VIEWER STATE ====================

let _pdfDoc = null;
let _currentPage = 1;
let _currentPdfId = null;
let _isTransitioning = false;

// Strip DOM
let _strip = null;
let _stripInner = null;
let _renderQueue = new Set();

// Page render cache
const _pageCache = new Map();
const CACHE_SIZE = 5;

// Zoom & pan
let _cssZoom = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.25;
let _panX = 0, _panY = 0;
let _panStartX = 0, _panStartY = 0;

// Thumbnail cache
const _thumbCache = new Map();
let _thumbsRendering = false;
let _thumbsVisible = false;

// Auto-hide
let _controlsHidden = false;
let _autoHideTimer = null;

// ==================== OPEN / CLOSE ====================

async function openPdfViewer(pdfId) {
  const dl = getPdfDownloaded();
  const lib = getPdfLibrary();
  const entry = lib.find(p => p.id === pdfId);
  if (!entry) return;

  _currentPdfId = pdfId;
  _cssZoom = 1.0; _panX = 0; _panY = 0;
  _pageCache.clear(); _thumbCache.clear();
  _isTransitioning = false; _thumbsVisible = false;
  _controlsHidden = false;
  clearTimeout(_autoHideTimer);

  window.showScreen('pdf-viewer-screen');
  const titleEl = document.getElementById('pdf-viewer-title');
  if (titleEl) titleEl.textContent = entry.name;

  _updateProgress(0, 1);
  _showControls(true);

  const wrap = document.getElementById('pdf-canvas-wrap');
  if (wrap) wrap.innerHTML = '<div class="pdf-loading">Загрузка...</div>';

  // Restore reading position
  const savedPage = getPdfPositions()[pdfId] || 1;

  let pdfData;
  try {
    if (dl[pdfId]) {
      const stored = await window.dbGet('pdf_files', pdfId);
      if (stored && stored.blob) pdfData = await stored.blob.arrayBuffer();
    }
    if (!pdfData) {
      window.showToast('Скачивание...');
      const downloadUrl = await window.getYadiskDownloadUrl(entry.yadiskUrl);
      const proxyUrl = 'https://ege-pdf-proxy.fritiser.workers.dev/?url=' + encodeURIComponent(downloadUrl);
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      pdfData = await blob.arrayBuffer();
      await window.dbPut('pdf_files', { id: pdfId, blob, updatedAt: Date.now() });
      const d2 = getPdfDownloaded(); d2[pdfId] = true; savePdfDownloaded(d2);
    }
    _pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
    _currentPage = Math.min(savedPage, _pdfDoc.numPages);
    _buildPageStrip();
    _setupGestures();
    updatePdfControls();
    await _showPage(_currentPage, false);
    _prefetchAround(_currentPage);
    _scheduleThumbRender();
  } catch (e) {
    console.error('openPdfViewer:', e);
    if (wrap) wrap.innerHTML = '<div class="pdf-loading">Ошибка загрузки файла</div>';
    window.showToast('Ошибка открытия PDF');
  }
}
window.openPdfViewer = openPdfViewer;

function closePdfViewer() {
  if (_currentPdfId && _currentPage > 0) savePdfPosition(_currentPdfId, _currentPage);
  _pdfDoc = null;
  _currentPdfId = null;
  _pageCache.clear(); _thumbCache.clear();
  _thumbsRendering = false;
  // Reset all gesture state
  _isPinching = false; _isSwiping = false; _isPanning = false; _tapMoved = false;
  _touchStartX = 0; _touchStartY = 0; _touchCurX = 0; _touchCurY = 0;
  _lastTapTime = 0; _lastTapX = 0; _lastTapY = 0;
  clearTimeout(_singleTapTimer); _singleTapTimer = null;
  _cssZoom = 1.0; _panX = 0; _panY = 0;
  _destroyGestures();
  _hideThumbnails();
  clearTimeout(_autoHideTimer);
  _controlsHidden = false;
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (wrap) wrap.innerHTML = '';
  window.navTo('library');
}
window.closePdfViewer = closePdfViewer;

// ==================== STRIP ====================

function _buildPageStrip() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  _stripInner = document.createElement('div');
  _stripInner.className = 'pdf-strip-inner';
  _stripInner.style.cssText = 'width:100%;height:100%;transform-origin:50% 0%;will-change:transform;';

  _strip = document.createElement('div');
  _strip.className = 'pdf-strip';
  _strip.style.cssText = `
    display:flex;flex-direction:row;
    width:${_pdfDoc.numPages * 100}%;height:100%;
    will-change:transform;
    transition:transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94);
  `;

  for (let i = 1; i <= _pdfDoc.numPages; i++) {
    const slot = document.createElement('div');
    slot.className = 'pdf-page-slot';
    slot.dataset.page = i;
    slot.style.cssText = `
      width:${100 / _pdfDoc.numPages}%;height:100%;
      display:flex;align-items:flex-start;justify-content:center;
      padding:8px;overflow-y:auto;overflow-x:hidden;
    `;
    _strip.appendChild(slot);
  }

  _stripInner.appendChild(_strip);
  wrap.appendChild(_stripInner);
  _applyStripTranslate(_currentPage, false);
}

function _applyStripTranslate(pageNum, animate) {
  if (!_strip || !_pdfDoc) return;
  const pct = ((pageNum - 1) / _pdfDoc.numPages) * 100;
  _strip.style.transition = animate
    ? 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)'
    : 'none';
  _strip.style.transform = `translateX(-${pct}%)`;
}

function _applyZoomCSS(originX, originY, animate) {
  if (!_stripInner) return;
  if (originX != null) _stripInner.style.transformOrigin = `${originX}% ${originY}%`;
  _stripInner.style.transition = animate ? 'transform 0.2s ease' : 'none';
  _stripInner.style.transform = `translate(${_panX}px,${_panY}px) scale(${_cssZoom})`;
  const zoomEl = document.getElementById('pdf-zoom-level');
  if (zoomEl) zoomEl.textContent = Math.round(_cssZoom * 100) + '%';
}

function _clampPan() {
  if (!_stripInner || _cssZoom <= 1) { _panX = 0; _panY = 0; return; }
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap || !wrap.clientWidth || !wrap.clientHeight) return;
  const wW = wrap.clientWidth, wH = wrap.clientHeight;
  const maxPanX = (wW * (_cssZoom - 1)) / 2;
  const maxPanY = (wH * (_cssZoom - 1)) / 2;
  _panX = Math.min(maxPanX, Math.max(-maxPanX, _panX));
  _panY = Math.min(maxPanY, Math.max(-maxPanY, _panY));
}

async function _showPage(num, animate) {
  if (!_pdfDoc || !_strip) return;
  _currentPage = num;
  _panX = 0; _panY = 0;
  if (_stripInner) {
    _stripInner.style.transition = 'none';
    _stripInner.style.transform = `translate(0px,0px) scale(${_cssZoom})`;
  }
  _applyStripTranslate(num, animate);
  updatePdfControls();
  _updateProgress(num, _pdfDoc.numPages);
  savePdfPosition(_currentPdfId, num);
  // Update thumb active highlight
  if (_thumbsVisible) {
    document.querySelectorAll('.pdf-thumb-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.page) === num);
    });
    const cur = document.querySelector(`#pdf-thumb-grid [data-page="${num}"]`);
    if (cur) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  await _ensurePageRendered(num);
  _prefetchAround(num);
}

function _updateProgress(page, total) {
  const bar = document.getElementById('pdf-progress-bar');
  if (!bar) return;
  bar.style.width = total > 1 ? `${(page / total) * 100}%` : '0%';
}

async function _ensurePageRendered(num) {
  if (_pageCache.has(num)) return;
  const slot = _strip?.querySelector(`[data-page="${num}"]`);
  if (!slot || slot.querySelector('canvas')) return;

  _renderQueue.add(num);
  try {
    const dpr = window.devicePixelRatio || 1;
    const wrap = document.getElementById('pdf-canvas-wrap');
    const maxW = (wrap?.clientWidth || window.innerWidth) - 16;
    const page = await _pdfDoc.getPage(num);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = maxW / vp0.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    slot.innerHTML = '';
    slot.appendChild(canvas);

    await page.render({ canvasContext: ctx, viewport }).promise;
    _pageCache.set(num, true);

    // Evict distant pages
    if (_pageCache.size > CACHE_SIZE) {
      const toDelete = [..._pageCache.keys()].filter(k => Math.abs(k - _currentPage) > 2);
      for (const k of toDelete) {
        _pageCache.delete(k);
        const s = _strip?.querySelector(`[data-page="${k}"]`);
        if (s) s.innerHTML = '';
      }
    }
  } catch (e) {
    if (e?.name !== 'RenderingCancelledException') console.warn('render error page', num, e);
  } finally {
    _renderQueue.delete(num);
  }
}

async function _prefetchAround(num) {
  const neighbors = [num + 1, num - 1, num + 2].filter(n => n >= 1 && n <= (_pdfDoc?.numPages || 0));
  for (const n of neighbors) {
    if (!_pageCache.has(n) && !_renderQueue.has(n)) _ensurePageRendered(n);
  }
}

async function renderPage(num) { await _showPage(num, false); }
window.renderPage = renderPage;

// ==================== THUMBNAILS ====================

async function _renderThumbPage(num) {
  if (_thumbCache.has(num) || !_pdfDoc) return;
  try {
    const page = await _pdfDoc.getPage(num);
    const vp = page.getViewport({ scale: 0.2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    _thumbCache.set(num, canvas.toDataURL('image/jpeg', 0.75));
    if (_thumbsVisible) _updateThumbImg(num);
  } catch {}
}

function _scheduleThumbRender() {
  if (_thumbsRendering || !_pdfDoc) return;
  _thumbsRendering = true;
  let n = 1;
  const next = async () => {
    if (!_pdfDoc || n > _pdfDoc.numPages) { _thumbsRendering = false; return; }
    await _renderThumbPage(n++);
    setTimeout(next, 60);
  };
  setTimeout(next, 600);
}

function _updateThumbImg(num) {
  const img = document.querySelector(`#pdf-thumb-grid [data-page="${num}"] img.pdf-thumb-img`);
  if (img && _thumbCache.has(num)) {
    img.src = _thumbCache.get(num);
    img.style.background = '';
  }
}

function _showThumbnails() {
  if (!_pdfDoc) return;
  _thumbsVisible = true;
  const sheet = document.getElementById('pdf-thumb-sheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  _buildThumbGrid();
}

function _hideThumbnails() {
  _thumbsVisible = false;
  const sheet = document.getElementById('pdf-thumb-sheet');
  if (sheet) sheet.classList.remove('visible');
}

function _buildThumbGrid() {
  const grid = document.getElementById('pdf-thumb-grid');
  if (!grid || !_pdfDoc) return;
  grid.innerHTML = '';
  for (let i = 1; i <= _pdfDoc.numPages; i++) {
    const item = document.createElement('div');
    item.className = 'pdf-thumb-item' + (i === _currentPage ? ' active' : '');
    item.dataset.page = i;
    const pageNum = i;
    item.onclick = () => { _hideThumbnails(); _showPage(pageNum, true); };

    const img = document.createElement('img');
    img.className = 'pdf-thumb-img';
    if (_thumbCache.has(i)) {
      img.src = _thumbCache.get(i);
    } else {
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      img.style.background = '#ddd';
    }

    const label = document.createElement('div');
    label.className = 'pdf-thumb-label';
    label.textContent = i;

    item.appendChild(img);
    item.appendChild(label);
    grid.appendChild(item);
  }
  setTimeout(() => {
    const cur = grid.querySelector(`[data-page="${_currentPage}"]`);
    if (cur) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 50);
}

window.pdfShowThumbs = function() {
  if (_thumbsVisible) _hideThumbnails(); else _showThumbnails();
};
window.pdfHideThumbs = _hideThumbnails;

// ==================== AUTO-HIDE CONTROLS ====================

function _showControls(resetTimer) {
  _controlsHidden = false;
  const nav = document.querySelector('.pdf-viewer-nav');
  const ctrl = document.querySelector('.pdf-controls');
  const prog = document.getElementById('pdf-progress-wrap');
  if (nav) nav.style.transform = '';
  if (ctrl) ctrl.style.transform = '';
  if (prog) prog.style.opacity = '1';
  if (resetTimer) {
    clearTimeout(_autoHideTimer);
    _autoHideTimer = setTimeout(() => { if (_pdfDoc) _hideControls(); }, 4000);
  }
}

function _hideControls() {
  _controlsHidden = true;
  const nav = document.querySelector('.pdf-viewer-nav');
  const ctrl = document.querySelector('.pdf-controls');
  const prog = document.getElementById('pdf-progress-wrap');
  if (nav) nav.style.transform = 'translateY(-100%)';
  if (ctrl) ctrl.style.transform = 'translateY(100%)';
  if (prog) prog.style.opacity = '0.4';
}

function _toggleControls() {
  if (_controlsHidden) {
    _showControls(true);
  } else {
    clearTimeout(_autoHideTimer);
    _hideControls();
  }
}

// ==================== CONTROLS ====================

function updatePdfControls() {
  if (!_pdfDoc) return;
  const total = _pdfDoc.numPages;

  const counter = document.getElementById('pdf-page-counter');
  if (counter) counter.textContent = _currentPage + ' / ' + total;

  const prevBtn = document.getElementById('pdf-prev');
  const nextBtn = document.getElementById('pdf-next');
  if (prevBtn) prevBtn.disabled = _currentPage <= 1;
  if (nextBtn) nextBtn.disabled = _currentPage >= total;

  const zoomEl = document.getElementById('pdf-zoom-level');
  if (zoomEl) zoomEl.textContent = Math.round(_cssZoom * 100) + '%';
  const zoomOutBtn = document.getElementById('pdf-zoom-out');
  const zoomInBtn = document.getElementById('pdf-zoom-in');
  if (zoomOutBtn) zoomOutBtn.disabled = _cssZoom <= ZOOM_MIN;
  if (zoomInBtn) zoomInBtn.disabled = _cssZoom >= ZOOM_MAX;
}

window.pdfPrev = async function() {
  if (!_pdfDoc || _currentPage <= 1 || _isTransitioning) return;
  _isTransitioning = true;
  _showControls(true);
  await _showPage(_currentPage - 1, true);
  setTimeout(() => { _isTransitioning = false; }, 320);
};
window.pdfNext = async function() {
  if (!_pdfDoc || _currentPage >= _pdfDoc.numPages || _isTransitioning) return;
  _isTransitioning = true;
  _showControls(true);
  await _showPage(_currentPage + 1, true);
  setTimeout(() => { _isTransitioning = false; }, 320);
};
window.pdfZoomIn = function() {
  if (_cssZoom >= ZOOM_MAX) return;
  _cssZoom = Math.min(ZOOM_MAX, parseFloat((_cssZoom + ZOOM_STEP).toFixed(2)));
  // Keep current transform-origin so content doesn't jump
  _applyZoomCSS(null, null, true);
  updatePdfControls();
};
window.pdfZoomOut = function() {
  if (_cssZoom <= ZOOM_MIN) return;
  _cssZoom = Math.max(ZOOM_MIN, parseFloat((_cssZoom - ZOOM_STEP).toFixed(2)));
  if (_cssZoom <= 1) { _panX = 0; _panY = 0; }
  else _clampPan();
  _applyZoomCSS(null, null, true);
  updatePdfControls();
};
window.pdfZoomReset = function() {
  _cssZoom = 1.0; _panX = 0; _panY = 0;
  _applyZoomCSS(50, 0, true);
  updatePdfControls();
};

// Page jump: tap page counter → numeric input overlay
window.pdfJumpPage = function() {
  if (!_pdfDoc) return;
  const wrap = document.getElementById('pdf-page-input-wrap');
  if (!wrap) return;
  wrap.style.display = 'flex';
  const inp = document.getElementById('pdf-page-input');
  if (inp) { inp.max = _pdfDoc.numPages; inp.value = _currentPage; inp.focus(); inp.select(); }
  const total = document.getElementById('pdf-page-input-total');
  if (total) total.textContent = 'из ' + _pdfDoc.numPages;
};
window.pdfJumpConfirm = function() {
  const inp = document.getElementById('pdf-page-input');
  if (!inp || !_pdfDoc) return;
  const num = parseInt(inp.value);
  document.getElementById('pdf-page-input-wrap').style.display = 'none';
  if (!isNaN(num) && num >= 1 && num <= _pdfDoc.numPages) _showPage(num, true);
};
window.pdfJumpCancel = function() {
  const wrap = document.getElementById('pdf-page-input-wrap');
  if (wrap) wrap.style.display = 'none';
};

window.pdfShowMenu = function() {
  document.getElementById('pdf-viewer-menu')?.classList.toggle('visible');
};
window.pdfDownloadCurrent = async function() {
  document.getElementById('pdf-viewer-menu')?.classList.remove('visible');
  if (_currentPdfId) await downloadPdfLocally(_currentPdfId);
};
window.pdfDeleteCurrent = async function() {
  document.getElementById('pdf-viewer-menu')?.classList.remove('visible');
  if (_currentPdfId) await deletePdf(_currentPdfId);
};
window.pdfEditCurrent = function() {
  document.getElementById('pdf-viewer-menu')?.classList.remove('visible');
  if (_currentPdfId && window.openMetaEditModal) window.openMetaEditModal('pdf', _currentPdfId);
};

// ==================== GESTURES ====================

let _touchStartX = 0, _touchStartY = 0, _touchCurX = 0, _touchCurY = 0;
let _pinchStartDist = 0, _pinchStartZoom = 1;
let _pinchOriginX = 0, _pinchOriginY = 0;
let _isPinching = false, _isSwiping = false, _isPanning = false;
let _tapMoved = false;
let _lastTapTime = 0, _lastTapX = 0, _lastTapY = 0;
let _singleTapTimer = null; // used to cancel single-tap when double-tap detected
let _gestureTarget = null;

function _getTouchDist(t1, t2) {
  const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function _onTouchStart(e) {
  // Any touch resets auto-hide timer so controls don't disappear mid-gesture
  clearTimeout(_autoHideTimer);
  if (e.touches.length === 2) {
    _isPinching = true; _isSwiping = false; _isPanning = false;
    _pinchStartDist = _getTouchDist(e.touches[0], e.touches[1]);
    _pinchStartZoom = _cssZoom;

    if (_stripInner) {
      const rect = _stripInner.getBoundingClientRect();
      const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      _pinchOriginX = ((midClientX - rect.left) / rect.width) * 100;
      _pinchOriginY = ((midClientY - rect.top) / rect.height) * 100;
      _stripInner.style.transformOrigin = `${_pinchOriginX}% ${_pinchOriginY}%`;
    }
    e.preventDefault();
  } else if (e.touches.length === 1) {
    _isPinching = false; _isSwiping = false; _isPanning = false;
    _tapMoved = false;
    _touchStartX = _touchCurX = e.touches[0].clientX;
    _touchStartY = _touchCurY = e.touches[0].clientY;
    _panStartX = _panX;
    _panStartY = _panY;
  }
}

function _onTouchMove(e) {
  if (_isPinching && e.touches.length === 2) {
    const dist = _getTouchDist(e.touches[0], e.touches[1]);
    _cssZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
      parseFloat((_pinchStartZoom * dist / _pinchStartDist).toFixed(3))));
    if (_stripInner) {
      _stripInner.style.transformOrigin = `${_pinchOriginX}% ${_pinchOriginY}%`;
      _stripInner.style.transition = 'none';
      // Include pan in transform so content doesn't jump when switching modes
      _stripInner.style.transform = `translate(${_panX}px,${_panY}px) scale(${_cssZoom})`;
    }
    const zoomEl = document.getElementById('pdf-zoom-level');
    if (zoomEl) zoomEl.textContent = Math.round(_cssZoom * 100) + '%';
    e.preventDefault();
  } else if (!_isPinching && e.touches.length === 1) {
    _touchCurX = e.touches[0].clientX;
    _touchCurY = e.touches[0].clientY;
    const dx = _touchCurX - _touchStartX;
    const dy = _touchCurY - _touchStartY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) _tapMoved = true;

    if (_cssZoom > 1.05) {
      // Pan mode
      if (!_isPanning && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) _isPanning = true;
      if (_isPanning && _stripInner) {
        _panX = _panStartX + dx;
        _panY = _panStartY + dy;
        _clampPan();
        _stripInner.style.transition = 'none';
        _stripInner.style.transform = `translate(${_panX}px,${_panY}px) scale(${_cssZoom})`;
        e.preventDefault();
      }
    } else {
      // Swipe mode
      if (!_isSwiping && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) _isSwiping = true;
      if (_isSwiping && _strip) {
        const pct = (((_currentPage - 1) / _pdfDoc.numPages) * 100);
        _strip.style.transition = 'none';
        _strip.style.transform = `translateX(calc(-${pct}% + ${dx}px))`;
        e.preventDefault();
      }
    }
  }
}

function _onTouchEnd(e) {
  if (_isPinching) {
    _isPinching = false;
    if (_cssZoom <= 1.02) { _cssZoom = 1.0; _panX = 0; _panY = 0; }
    else _clampPan();
    _applyZoomCSS(_pinchOriginX, _pinchOriginY, true);
    updatePdfControls();
    return;
  }

  if (_isPanning) {
    _isPanning = false;
    _clampPan();
    if (_stripInner) {
      _stripInner.style.transition = 'transform 0.1s ease';
      _stripInner.style.transform = `translate(${_panX}px,${_panY}px) scale(${_cssZoom})`;
    }
    return;
  }

  if (_isSwiping && _cssZoom <= 1.05) {
    _isSwiping = false;
    const dx = _touchCurX - _touchStartX;
    const wrapW = document.getElementById('pdf-canvas-wrap')?.clientWidth || window.innerWidth;
    if (dx < -wrapW * 0.25 && _currentPage < _pdfDoc.numPages) {
      window.pdfNext();
    } else if (dx > wrapW * 0.25 && _currentPage > 1) {
      window.pdfPrev();
    } else {
      _applyStripTranslate(_currentPage, true);
    }
    return;
  }
  _isSwiping = false;

  // Tap handling (no significant movement)
  if (!_tapMoved) {
    const now = Date.now();
    const x = _touchStartX, y = _touchStartY;
    const dt = now - _lastTapTime;
    const dist = Math.hypot(x - _lastTapX, y - _lastTapY);

    if (dt < 280 && dist < 40) {
      // Double tap — cancel any pending single-tap action first
      clearTimeout(_singleTapTimer);
      _singleTapTimer = null;
      _lastTapTime = 0;
      if (_cssZoom > 1.05) {
        // Zoom out to 1x
        _cssZoom = 1.0; _panX = 0; _panY = 0;
        if (_stripInner) _stripInner.style.transformOrigin = '50% 0%';
        _applyZoomCSS(null, null, true);
      } else {
        // Zoom in 2.5x at tap point
        if (_stripInner) {
          const rect = _stripInner.getBoundingClientRect();
          const ox = ((x - rect.left) / rect.width) * 100;
          const oy = ((y - rect.top) / rect.height) * 100;
          _cssZoom = 2.5; _panX = 0; _panY = 0;
          _applyZoomCSS(ox, oy, true);
        }
      }
      updatePdfControls();
    } else {
      // Single tap — delay to allow double-tap cancellation
      _lastTapTime = now;
      _lastTapX = x; _lastTapY = y;
      clearTimeout(_singleTapTimer);
      _singleTapTimer = setTimeout(() => {
        _singleTapTimer = null;
        _toggleControls();
      }, 280);
    }
  }
}

function _setupGestures() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;
  // Guard against duplicate listeners if called twice
  if (_gestureTarget) _destroyGestures();
  _gestureTarget = wrap;
  wrap.addEventListener('touchstart', _onTouchStart, { passive: false });
  wrap.addEventListener('touchmove', _onTouchMove, { passive: false });
  wrap.addEventListener('touchend', _onTouchEnd, { passive: true });
}
function _destroyGestures() {
  if (!_gestureTarget) return;
  _gestureTarget.removeEventListener('touchstart', _onTouchStart);
  _gestureTarget.removeEventListener('touchmove', _onTouchMove);
  _gestureTarget.removeEventListener('touchend', _onTouchEnd);
  _gestureTarget = null;
}

// ==================== MENUS ====================

document.addEventListener('click', (e) => {
  const menu = document.getElementById('pdf-viewer-menu');
  if (menu?.classList.contains('visible') &&
      !e.target.closest('#pdf-viewer-menu') && !e.target.closest('#pdf-menu-btn')) {
    menu.classList.remove('visible');
  }
  const libMenu = document.getElementById('lib-add-menu');
  if (libMenu?.classList.contains('visible') &&
      !e.target.closest('#lib-add-menu') && !e.target.closest('.lib-add-wrap')) {
    libMenu.classList.remove('visible');
  }
  const thumbSheet = document.getElementById('pdf-thumb-sheet');
  if (thumbSheet?.classList.contains('visible') &&
      !e.target.closest('#pdf-thumb-sheet') && !e.target.closest('#pdf-thumbs-btn')) {
    _hideThumbnails();
  }
});

window.openLibraryAddMenu = function() {
  document.getElementById('lib-add-menu')?.classList.toggle('visible');
};
window.libAddMenuClose = function() {
  document.getElementById('lib-add-menu')?.classList.remove('visible');
};
window.addGuideFromMenu = function() {
  window.libAddMenuClose();
  if (window.openAddModal) window.openAddModal('guide');
};
window.addPdfFromMenu = function() {
  window.libAddMenuClose();
  document.getElementById('pdf-file-input')?.click();
};

document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('pdf-file-input');
  if (inp) {
    inp.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handlePdfFileSelect(file);
      inp.value = '';
    });
  }
  // Page jump — confirm on Enter
  const pageInp = document.getElementById('pdf-page-input');
  if (pageInp) {
    pageInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.pdfJumpConfirm();
      if (e.key === 'Escape') window.pdfJumpCancel();
    });
  }
});
