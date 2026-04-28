// ==================== PDF VIEWER ====================
// Storage: metadata in localStorage ('pdf_library'), binary in IDB ('pdf_files')
// Works offline in both Electron (PC) and Android local APK

const PDF_LIB_KEY = 'pdf_library';

function getPdfLibrary() {
  try { return JSON.parse(localStorage.getItem(PDF_LIB_KEY) || '[]'); } catch { return []; }
}
function savePdfLibrary(data) { localStorage.setItem(PDF_LIB_KEY, JSON.stringify(data)); }
window.getPdfLibrary = getPdfLibrary;

// ==================== IMPORT ====================
function openPdfImport() {
  if (window.electronAPI && window.electronAPI.openPdfDialog) {
    window.electronAPI.openPdfDialog().then(result => {
      if (result) _handlePdfData(result.buffer, result.name);
    });
    return;
  }
  document.getElementById('pdf-file-input')?.click();
}
window.openPdfImport = openPdfImport;

async function handlePdfFileInput(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  await _handlePdfData(await file.arrayBuffer(), file.name);
}
window.handlePdfFileInput = handlePdfFileInput;

async function _handlePdfData(buffer, fileName) {
  try {
    showToast('Загрузка PDF...');
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) { showToast('PDF.js не загружен'); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

    const pdfDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
    const pages = pdfDoc.numPages;
    pdfDoc.destroy();

    const id = 'pdf_' + Date.now();
    await openDB();
    await dbPut('pdf_files', { id, data: buffer, addedAt: Date.now() });

    const lib = getPdfLibrary();
    lib.unshift({ id, name: fileName.replace(/\.pdf$/i, ''), size: buffer.byteLength, pages, addedAt: Date.now(), deleted: false });
    savePdfLibrary(lib);
    showToast('PDF добавлен');
    renderPdfSection();
  } catch (e) {
    console.error('PDF import error', e);
    showToast('Ошибка загрузки PDF');
  }
}

// ==================== DELETE ====================
function deletePdf(id) {
  if (!confirm('Удалить PDF?')) return;
  const lib = getPdfLibrary();
  const idx = lib.findIndex(p => p.id === id);
  if (idx !== -1) { lib[idx].deleted = true; lib[idx].updatedAt = Date.now(); }
  savePdfLibrary(lib);
  openDB().then(() => dbDelete('pdf_files', id));
  if (_currentPdfId === id) window.showScreen('library-screen');
  renderPdfSection();
  showToast('PDF удалён');
}
window.deletePdf = deletePdf;

// ==================== LIBRARY SECTION ====================
function renderPdfSection() {
  const container = document.getElementById('pdf-section');
  if (!container) return;
  const pdfs = getPdfLibrary().filter(p => !p.deleted);
  if (pdfs.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <div class="pdf-section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      PDF-файлы
    </div>
    ${pdfs.map(p => `
      <div class="pdf-card" onclick="openPdfViewer('${p.id}')">
        <div class="pdf-card-icon">${p.icon ? `<span style="font-size:24px;line-height:1">${p.icon}</span>` : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`}</div>
        <div class="pdf-card-info">
          <div class="pdf-card-name">${window.escapeHtml(p.name)}</div>
          <div class="pdf-card-meta">${p.pages} стр · ${_fmtSize(p.size)}${p.tags && p.tags.length ? ' · ' + p.tags.slice(0,2).map(t => window.escapeHtml(t)).join(', ') : ''}</div>
        </div>
        <button class="pdf-card-del" onclick="event.stopPropagation();window.openMetaEditModal&&window.openMetaEditModal('pdf','${p.id}')" title="Редактировать">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="pdf-card-del" onclick="event.stopPropagation();deletePdf('${p.id}')" style="margin-left:2px">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`).join('')}`;
}
window.renderPdfSection = renderPdfSection;

function _fmtSize(b) {
  if (!b) return '';
  return b < 1048576 ? (b / 1024).toFixed(0) + ' КБ' : (b / 1048576).toFixed(1) + ' МБ';
}

// ==================== VIEWER STATE ====================
let _pdfDoc = null, _currentPage = 1, _totalPages = 0, _currentPdfId = null, _twoPage = false;
let _zoom = 1.0;           // CSS visual zoom (on top of base scale)
let _zoomTimer = null;
let _rendering = false;

// ---- Zoom constants ----
const ZOOM_MIN = 0.5, ZOOM_MAX = 5, ZOOM_STEP = 0.15;

async function openPdfViewer(id) {
  try {
    const meta = getPdfLibrary().find(p => p.id === id);
    if (!meta) return;
    showToast('Открытие...');

    await openDB();
    const record = await dbGet('pdf_files', id);
    if (!record) { showToast('Файл не найден в базе'); return; }

    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) { showToast('PDF.js не загружен'); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

    if (_pdfDoc) { _pdfDoc.destroy(); _pdfDoc = null; }
    _pdfDoc = await pdfjsLib.getDocument({ data: record.data.slice(0) }).promise;
    _totalPages = _pdfDoc.numPages;
    _currentPage = 1;
    _currentPdfId = id;
    _twoPage = false;

    const titleEl = document.getElementById('pdf-viewer-title');
    if (titleEl) titleEl.textContent = meta.name;

    const twoBtn = document.getElementById('pdf-two-page-btn');
    if (twoBtn) twoBtn.classList.remove('active');

    _zoom = 1.0;
    window.showScreen('pdf-viewer-screen');
    await _renderCurrentPage();
    _setupGestures();
  } catch (e) {
    console.error('PDF open error', e);
    showToast('Ошибка открытия PDF');
  }
}
window.openPdfViewer = openPdfViewer;

// ==================== RENDER ====================
function _getBaseWidth() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return window.innerWidth - 32;
  const w = wrap.clientWidth || window.innerWidth;
  // On wide screens cap single page to readable width
  return _twoPage ? w - 32 : Math.min(w - 32, 900);
}

async function _renderCurrentPage(opts = {}) {
  if (_rendering && !opts.force) return;
  _rendering = true;
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap || !_pdfDoc) { _rendering = false; return; }

  // Fade out current content
  const old = wrap.querySelector('#pdf-content-inner');
  if (old) old.style.opacity = '0';

  // Create new inner container
  const inner = document.createElement('div');
  inner.id = 'pdf-content-inner';
  inner.style.cssText = 'opacity:0;transition:opacity 0.15s;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;min-width:100%';

  try {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxW = _getBaseWidth() * _zoom;

    if (_twoPage && _currentPage < _totalPages) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:flex-start;width:100%';
      await _renderPage(row, _currentPage, (maxW - 8) / 2, dpr);
      await _renderPage(row, _currentPage + 1, (maxW - 8) / 2, dpr);
      inner.appendChild(row);
    } else {
      await _renderPage(inner, _currentPage, maxW, dpr);
    }

    wrap.innerHTML = '';
    wrap.appendChild(inner);
    requestAnimationFrame(() => { inner.style.opacity = '1'; });
  } catch (e) {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3)">Ошибка рендера</div>';
  }
  _rendering = false;
  _updateControls();
}

async function _renderPage(container, num, maxW, dpr) {
  const page = await _pdfDoc.getPage(num);
  const vp = page.getViewport({ scale: 1 });
  const scale = Math.max(0.1, (maxW / vp.width)) * dpr;
  const scaled = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  canvas.style.cssText = `width:${scaled.width/dpr}px;height:${scaled.height/dpr}px;display:block;border-radius:6px;box-shadow:0 2px 16px rgba(0,0,0,.15);flex-shrink:0`;
  container.appendChild(canvas);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise;
  page.cleanup();
}

function _updateControls() {
  const el = document.getElementById('pdf-page-info');
  if (el) el.textContent = `${_currentPage} / ${_totalPages}`;
  const prev = document.getElementById('pdf-prev');
  const next = document.getElementById('pdf-next');
  if (prev) prev.disabled = _currentPage <= 1;
  if (next) next.disabled = _currentPage >= _totalPages;
  // Show zoom level
  const zEl = document.getElementById('pdf-zoom-label');
  if (zEl) zEl.textContent = Math.round(_zoom * 100) + '%';
}

// ==================== ZOOM ====================
function _applyZoom(newZoom, focalX, focalY) {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;
  const oldZoom = _zoom;
  _zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
  if (_zoom === oldZoom) return;

  // Compensate scroll so focal point stays under cursor/finger
  const ratio = _zoom / oldZoom;
  wrap.scrollLeft = (wrap.scrollLeft + focalX) * ratio - focalX;
  wrap.scrollTop  = (wrap.scrollTop  + focalY) * ratio - focalY;

  _updateControls();
  clearTimeout(_zoomTimer);
  _zoomTimer = setTimeout(() => _renderCurrentPage({ force: true }), 220);
}

function pdfZoomIn()  { const w = document.getElementById('pdf-canvas-wrap'); _applyZoom(_zoom * (1 + ZOOM_STEP), (w?.clientWidth||320)/2, (w?.clientHeight||500)/2); }
function pdfZoomOut() { const w = document.getElementById('pdf-canvas-wrap'); _applyZoom(_zoom * (1 - ZOOM_STEP), (w?.clientWidth||320)/2, (w?.clientHeight||500)/2); }
function pdfZoomReset() { _zoom = 1.0; _renderCurrentPage({ force: true }); _updateControls(); }
window.pdfZoomIn = pdfZoomIn;
window.pdfZoomOut = pdfZoomOut;
window.pdfZoomReset = pdfZoomReset;

// ==================== PAGE NAV ====================
function pdfPrevPage() {
  if (_currentPage <= 1) return;
  _currentPage = _twoPage ? Math.max(1, _currentPage - 2) : _currentPage - 1;
  _renderCurrentPage();
}
window.pdfPrevPage = pdfPrevPage;

function pdfNextPage() {
  if (_currentPage >= _totalPages) return;
  _currentPage = _twoPage ? Math.min(_totalPages, _currentPage + 2) : _currentPage + 1;
  _renderCurrentPage();
}
window.pdfNextPage = pdfNextPage;

function pdfToggleTwoPage() {
  _twoPage = !_twoPage;
  document.getElementById('pdf-two-page-btn')?.classList.toggle('active', _twoPage);
  _renderCurrentPage({ force: true });
}
window.pdfToggleTwoPage = pdfToggleTwoPage;

function closePdfViewer() {
  if (_pdfDoc) { _pdfDoc.destroy(); _pdfDoc = null; }
  _currentPdfId = null;
  _zoom = 1.0;
  window.showScreen('library-screen');
}
window.closePdfViewer = closePdfViewer;

// ==================== GESTURES ====================
let _gesturesAttached = false;
let _touchStartX = 0, _touchStartY = 0;
let _pinchStartDist = 0, _pinchStartZoom = 1;
let _pinchFocalX = 0, _pinchFocalY = 0;
let _lastTap = 0;

function _setupGestures() {
  if (_gesturesAttached) return;
  _gesturesAttached = true;
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;

  // ---- Mouse wheel zoom ----
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const focalX = e.clientX - rect.left;
    const focalY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP);
    _applyZoom(_zoom * factor, focalX, focalY);
  }, { passive: false });

  // ---- Touch gestures ----
  wrap.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      _pinchStartDist = Math.hypot(dx, dy);
      _pinchStartZoom = _zoom;
      const rect = wrap.getBoundingClientRect();
      _pinchFocalX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      _pinchFocalY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
    }
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      if (_pinchStartDist > 0) {
        _applyZoom(_pinchStartZoom * (dist / _pinchStartDist), _pinchFocalX, _pinchFocalY);
      }
    }
  }, { passive: false });

  wrap.addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      const dx = e.changedTouches[0].clientX - _touchStartX;
      const dy = e.changedTouches[0].clientY - _touchStartY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      // Double tap to reset zoom
      const now = Date.now();
      if (absDx < 15 && absDy < 15) {
        if (now - _lastTap < 300) {
          pdfZoomReset();
        }
        _lastTap = now;
        return;
      }

      // Swipe to navigate — only when near fit-to-width
      if (_zoom < 1.15 && absDx > 50 && absDx > absDy * 1.5) {
        if (dx < 0) pdfNextPage();
        else pdfPrevPage();
      }
    }
  }, { passive: true });
}

// ==================== KEYBOARD ====================
document.addEventListener('keydown', e => {
  if (!document.getElementById('pdf-viewer-screen')?.classList.contains('active')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pdfNextPage();
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') pdfPrevPage();
  else if (e.key === '+' || e.key === '=') pdfZoomIn();
  else if (e.key === '-') pdfZoomOut();
  else if (e.key === '0') pdfZoomReset();
  else if (e.key === 'Escape') closePdfViewer();
});

// Re-render on resize
window.addEventListener('resize', () => {
  if (!document.getElementById('pdf-viewer-screen')?.classList.contains('active')) return;
  clearTimeout(_zoomTimer);
  _zoomTimer = setTimeout(() => _renderCurrentPage({ force: true }), 300);
});
