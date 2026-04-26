// ==================== PDF VIEWER ====================

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ==================== ДАННЫЕ ====================

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

// ==================== ЗАГРУЗКА PDF ====================

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

// ==================== СКАЧАТЬ / УДАЛИТЬ ====================

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

// ==================== СИНХРОНИЗАЦИЯ ====================

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

// ==================== РЕНДЕР СЕКЦИИ ====================

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

  let lib = getPdfLibrary().filter(p => !p.deleted);
  if (currentCat !== 'all') lib = lib.filter(p => (p.subject || 'bio') === currentCat);
  if (searchQ) {
    lib = lib.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchQ)) ||
      (p.desc && p.desc.toLowerCase().includes(searchQ)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQ)))
    );
  }

  if (lib.length === 0) {
    container.innerHTML = '';
    return;
  }

  const cards = lib.map(entry => {
    const isLocal = !!dl[entry.id];
    const badge = isLocal
      ? `<span class="pdf-badge pdf-badge--local">На устройстве</span>`
      : `<span class="pdf-badge pdf-badge--cloud">В облаке</span>`;
    const icon = entry.icon || '📄';
    const tags = (entry.tags || []).map((t, i) =>
      `<span class="card-tag ${['', 'sage', 'peach', 'sky'][i % 4]}">${window.escapeHtml(t)}</span>`
    ).join('');
    return `
      <div class="pdf-card" onclick="openPdfViewer('${entry.id}')">
        <div class="pdf-card-emoji">${icon}</div>
        <div class="pdf-card-info">
          <div class="pdf-card-name">${window.escapeHtml(entry.name)}</div>
          <div class="pdf-card-meta">${formatSize(entry.size)} ${badge}</div>
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

// ==================== ПРОСМОТРЩИК ====================

let _pdfDoc = null;
let _currentPage = 1;
let _twoPageMode = false;
let _currentPdfId = null;

// Кэш отрендеренных страниц: Map<pageNum, {canvas, width, height}>
const _pageCache = new Map();
const CACHE_SIZE = 5; // держим не более 5 страниц

// CSS-зум (без ре-рендера)
let _cssZoom = 1.0;
// Базовый зум рендера (ре-рендер только при сбросе)
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.25;
// Алиасы для совместимости
let _zoom = 1.0; // = _cssZoom

async function openPdfViewer(pdfId) {
  const dl = getPdfDownloaded();
  const lib = getPdfLibrary();
  const entry = lib.find(p => p.id === pdfId);
  if (!entry) return;

  _currentPdfId = pdfId;
  _currentPage = 1;
  _twoPageMode = false;
  _cssZoom = 1.0; _zoom = 1.0;
  _pageCache.clear();
  _isTransitioning = false;

  window.showScreen('pdf-viewer-screen');
  document.getElementById('pdf-viewer-title')?.setAttribute('textContent', entry.name);
  const titleEl = document.getElementById('pdf-viewer-title');
  if (titleEl) titleEl.textContent = entry.name;

  const wrap = document.getElementById('pdf-canvas-wrap');
  if (wrap) wrap.innerHTML = '<div class="pdf-loading">Загрузка...</div>';

  let pdfData;
  try {
    if (dl[pdfId]) {
      const stored = await window.dbGet('pdf_files', pdfId);
      if (stored && stored.blob) pdfData = await stored.blob.arrayBuffer();
    }
    if (!pdfData) {
      window.showToast('Скачивание...');
      const downloadUrl = await window.getYadiskDownloadUrl(entry.yadiskUrl);
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      pdfData = await blob.arrayBuffer();
      await window.dbPut('pdf_files', { id: pdfId, blob, updatedAt: Date.now() });
      const d2 = getPdfDownloaded(); d2[pdfId] = true; savePdfDownloaded(d2);
    }
    _pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
    _buildPageStrip();
    _setupGestures();
    updatePdfControls();
    await _showPage(_currentPage, false);
    _prefetchAround(_currentPage);
  } catch (e) {
    console.error('openPdfViewer:', e);
    if (wrap) wrap.innerHTML = '<div class="pdf-loading">Ошибка загрузки файла</div>';
    window.showToast('Ошибка открытия PDF');
  }
}
window.openPdfViewer = openPdfViewer;

function closePdfViewer() {
  _pdfDoc = null;
  _currentPdfId = null;
  _pageCache.clear();
  _destroyGestures();
  window.navTo('library');
}
window.closePdfViewer = closePdfViewer;

// ==================== STRIP — горизонтальная лента страниц ====================
// Архитектура: pdf-canvas-wrap содержит .pdf-strip — flex-row из слотов,
// каждый слот = одна страница. Переходы = translateX на strip.
// Зум = CSS transform: scale на .pdf-strip-inner (без ре-рендера).

let _strip = null;
let _stripInner = null;
let _isTransitioning = false;
let _renderQueue = new Set();

function _buildPageStrip() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  _stripInner = document.createElement('div');
  _stripInner.className = 'pdf-strip-inner';
  _stripInner.style.cssText = 'transform-origin: 50% 0%; will-change: transform;';

  _strip = document.createElement('div');
  _strip.className = 'pdf-strip';
  _strip.style.cssText = `
    display: flex; flex-direction: row;
    width: ${_pdfDoc.numPages * 100}%;
    will-change: transform;
    transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  `;

  for (let i = 1; i <= _pdfDoc.numPages; i++) {
    const slot = document.createElement('div');
    slot.className = 'pdf-page-slot';
    slot.dataset.page = i;
    slot.style.cssText = `
      width: ${100 / _pdfDoc.numPages}%;
      display: flex; align-items: flex-start; justify-content: center;
      padding: 8px;
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
    ? 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : 'none';
  _strip.style.transform = `translateX(-${pct}%)`;
}

function _applyZoomCSS(originX, originY, animate) {
  if (!_stripInner) return;
  _stripInner.style.transformOrigin = originX != null
    ? `${originX}% ${originY}%`
    : '50% 0%';
  _stripInner.style.transition = animate !== false ? 'transform 0.15s ease' : 'none';
  _stripInner.style.transform = `translate(${_panX}px, ${_panY}px) scale(${_cssZoom})`;
  const zoomEl = document.getElementById('pdf-zoom-level');
  if (zoomEl) zoomEl.textContent = Math.round(_cssZoom * 100) + '%';
}

function _clampPan() {
  if (!_stripInner || _cssZoom <= 1) { _panX = 0; _panY = 0; return; }
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;
  const wW = wrap.clientWidth, wH = wrap.clientHeight;
  const maxPanX = (wW * (_cssZoom - 1)) / 2;
  const maxPanY = (wH * (_cssZoom - 1)) / 2;
  _panX = Math.min(maxPanX, Math.max(-maxPanX, _panX));
  _panY = Math.min(maxPanY, Math.max(-maxPanY, _panY));
}

async function _showPage(num, animate) {
  if (!_pdfDoc || !_strip) return;
  _currentPage = num;
  // Сбрасываем пан при смене страницы
  _panX = 0; _panY = 0;
  if (_stripInner) {
    _stripInner.style.transition = 'none';
    _stripInner.style.transform = `translate(0px, 0px) scale(${_cssZoom})`;
  }
  _applyStripTranslate(num, animate);
  updatePdfControls();
  await _ensurePageRendered(num);
  _prefetchAround(num);
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
    const scale = (maxW / vp0.width) * (_cssZoom > 1.5 ? 1.5 : 1); // рендерим с качеством x1.5 если сильный зум
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    canvas.style.borderRadius = '4px';
    canvas.style.boxShadow = '0 2px 16px rgba(0,0,0,0.22)';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    slot.innerHTML = '';
    slot.appendChild(canvas);

    const task = page.render({ canvasContext: ctx, viewport });
    await task.promise;
    _pageCache.set(num, true);

    // Чистим старые страницы из кэша если слишком много
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
    if (!_pageCache.has(n) && !_renderQueue.has(n)) {
      _ensurePageRendered(n); // fire and forget
    }
  }
}

// Совместимость с внешними вызовами
async function renderPage(num) { await _showPage(num, false); }
window.renderPage = renderPage;

// ==================== УПРАВЛЕНИЕ ====================

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

  const modeBtn = document.getElementById('pdf-mode-toggle');
  if (modeBtn) {
    modeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="1"/></svg>`;
  }
}

window.pdfPrev = async function() {
  if (!_pdfDoc || _currentPage <= 1 || _isTransitioning) return;
  _isTransitioning = true;
  await _showPage(_currentPage - 1, true);
  setTimeout(() => { _isTransitioning = false; }, 320);
};
window.pdfNext = async function() {
  if (!_pdfDoc || _currentPage >= _pdfDoc.numPages || _isTransitioning) return;
  _isTransitioning = true;
  await _showPage(_currentPage + 1, true);
  setTimeout(() => { _isTransitioning = false; }, 320);
};
window.pdfToggleMode = function() {
  // В strip-режиме две страницы не нужны — пропускаем
  window.showToast('Листайте свайпом');
};
window.pdfZoomIn = function() {
  if (_cssZoom >= ZOOM_MAX) return;
  _cssZoom = Math.min(ZOOM_MAX, parseFloat((_cssZoom + ZOOM_STEP).toFixed(2)));
  _zoom = _cssZoom;
  _applyZoomCSS();
  updatePdfControls();
};
window.pdfZoomOut = function() {
  if (_cssZoom <= ZOOM_MIN) return;
  _cssZoom = Math.max(ZOOM_MIN, parseFloat((_cssZoom - ZOOM_STEP).toFixed(2)));
  _zoom = _cssZoom;
  _applyZoomCSS();
  updatePdfControls();
};
window.pdfZoomReset = function() {
  _cssZoom = 1.0; _zoom = 1.0; _panX = 0; _panY = 0;
  _applyZoomCSS();
  updatePdfControls();
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

// ==================== ЖЕСТЫ ====================

let _touchStartX = 0, _touchStartY = 0, _touchCurX = 0, _touchCurY = 0;
let _pinchStartDist = 0, _pinchStartZoom = 1;
let _pinchOriginX = 0, _pinchOriginY = 0;
let _isPinching = false, _isSwiping = false, _isPanning = false;
// Смещение при панорамировании (px)
let _panX = 0, _panY = 0;
let _panStartX = 0, _panStartY = 0;
let _gestureTarget = null;

function _getTouchDist(t1, t2) {
  const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function _onTouchStart(e) {
  if (e.touches.length === 2) {
    _isPinching = true; _isSwiping = false;
    _pinchStartDist = _getTouchDist(e.touches[0], e.touches[1]);
    _pinchStartZoom = _cssZoom;

    // Вычисляем точку фокуса в координатах stripInner
    if (_stripInner) {
      const rect = _stripInner.getBoundingClientRect();
      const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // Переводим в проценты от размера элемента до трансформации
      _pinchOriginX = ((midClientX - rect.left) / rect.width) * 100;
      _pinchOriginY = ((midClientY - rect.top) / rect.height) * 100;
      _stripInner.style.transformOrigin = `${_pinchOriginX}% ${_pinchOriginY}%`;
    }
    e.preventDefault();
  } else if (e.touches.length === 1) {
    _isPinching = false; _isSwiping = false; _isPanning = false;
    _touchStartX = _touchCurX = e.touches[0].clientX;
    _touchStartY = _touchCurY = e.touches[0].clientY;
    _panStartX = _panX;
    _panStartY = _panY;
  }
}

function _onTouchMove(e) {
  if (_isPinching && e.touches.length === 2) {
    const dist = _getTouchDist(e.touches[0], e.touches[1]);
    _cssZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat((_pinchStartZoom * dist / _pinchStartDist).toFixed(2))));
    _zoom = _cssZoom;
    if (_stripInner) {
      _stripInner.style.transformOrigin = `${_pinchOriginX}% ${_pinchOriginY}%`;
      _stripInner.style.transition = 'none';
      _stripInner.style.transform = `scale(${_cssZoom})`;
    }
    const zoomEl = document.getElementById('pdf-zoom-level');
    if (zoomEl) zoomEl.textContent = Math.round(_cssZoom * 100) + '%';
    e.preventDefault();
  } else if (!_isPinching && e.touches.length === 1) {
    _touchCurX = e.touches[0].clientX;
    _touchCurY = e.touches[0].clientY;
    const dx = _touchCurX - _touchStartX;
    const dy = _touchCurY - _touchStartY;

    if (_cssZoom > 1.05) {
      // Режим панорамирования
      if (!_isPanning && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        _isPanning = true;
      }
      if (_isPanning && _stripInner) {
        _panX = _panStartX + dx;
        _panY = _panStartY + dy;
        _clampPan();
        _stripInner.style.transition = 'none';
        _stripInner.style.transform = `translate(${_panX}px, ${_panY}px) scale(${_cssZoom})`;
        e.preventDefault();
      }
    } else {
      // Режим свайпа между страницами
      if (!_isSwiping && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        _isSwiping = true;
      }
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
    _applyZoomCSS(_pinchOriginX, _pinchOriginY);
    updatePdfControls();
    return;
  }

  if (_isPanning) {
    _isPanning = false;
    // Плавно фиксируем позицию с кламп
    _clampPan();
    if (_stripInner) {
      _stripInner.style.transition = 'transform 0.1s ease';
      _stripInner.style.transform = `translate(${_panX}px, ${_panY}px) scale(${_cssZoom})`;
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
}

function _setupGestures() {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;
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

// Закрыть меню при клике вне
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
});

// ==================== МЕНЮ + В БИБЛИОТЕКЕ ====================

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
});
