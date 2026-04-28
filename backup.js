// ==================== BACKUP / TRANSFER ====================
// .biolab archive: JSON bundle of localStorage + IndexedDB
// Soft-delete convention: { deleted: true, updatedAt: timestamp }
// Merge: union by id, higher updatedAt wins (tombstones propagate naturally)

const BACKUP_VERSION = 2;

// Keys never merged — stay local (settings)
const LS_SETTINGS_KEYS = new Set(['gh_user', 'gh_repo', 'yadisk_token', 'theme', 'debug']);
// Keys to skip entirely
const LS_SKIP_PREFIXES = ['firebase:', '__firebase', '__sentry'];
// Array-type LS keys where items have { id, updatedAt, deleted? }
const LS_ARRAY_KEYS = ['notes', 'atlas', 'bio_guides', 'glossary_terms', 'pdf_library'];

// ==================== EXPORT ====================
function _bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let b = '';
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

function _b64ToBuf(b64) {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function exportBackup() {
  try {
    showToast('Подготовка архива...');
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || LS_SKIP_PREFIXES.some(p => key.startsWith(p))) continue;
      try { ls[key] = JSON.parse(localStorage.getItem(key)); }
      catch { ls[key] = localStorage.getItem(key); }
    }

    await openDB();
    const [decks, stats, favorites, reviews, pdfFilesRaw] = await Promise.all([
      dbGetAll('decks'),
      dbGetAll('stats'),
      dbGetAll('favorites'),
      dbGetAll('reviews'),
      dbGetAll('pdf_files'),
    ]);

    // Serialize ArrayBuffers to base64
    const pdf_files = pdfFilesRaw.map(p => ({
      ...p,
      data: p.data ? _bufToB64(p.data) : null,
      _b64: true,
    }));

    const archive = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      appVersion: '3.0',
      localStorage: ls,
      indexedDB: { decks, stats, favorites, reviews, pdf_files },
    };

    const json = JSON.stringify(archive, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `biolab-backup-${date}.biolab`;

    if (window.Android && window.Android.saveFile) {
      // Android WebView: передаём base64 через нативный мост
      const b64 = btoa(unescape(encodeURIComponent(json)));
      window.Android.saveFile(filename, b64);
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast('Архив сохранён');
    }
  } catch (e) {
    console.error('Export error', e);
    showToast('Ошибка экспорта');
  }
}
window.exportBackup = exportBackup;

// ==================== IMPORT UI ====================
let _pendingArchive = null;

function importBackup() {
  document.getElementById('backup-file-input')?.click();
}
window.importBackup = importBackup;

async function handleBackupFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    const archive = JSON.parse(await file.text());
    if (!archive.version || !archive.localStorage || !archive.indexedDB) {
      showToast('Неверный формат архива');
      return;
    }
    _pendingArchive = archive;
    _showImportModal(archive);
  } catch (e) {
    showToast('Ошибка чтения файла');
    console.error(e);
  }
}
window.handleBackupFile = handleBackupFile;

function _showImportModal(archive) {
  const modal = document.getElementById('backup-import-modal');
  const info = document.getElementById('backup-import-info');
  if (!modal || !info) return;

  const date = new Date(archive.exportedAt).toLocaleString('ru');
  const ls = archive.localStorage;
  const idb = archive.indexedDB;
  const counts = [
    ['Заметок', (ls.notes || []).filter(n => !n.deleted).length],
    ['Пособий', (ls.bio_guides || []).filter(g => !g.deleted).length],
    ['Колод', (idb.decks || []).filter(d => !d.deleted).length],
    ['Атлас', (ls.atlas || []).filter(a => !a.deleted).length],
    ['Словарь', (ls.glossary_terms || []).filter(t => !t.deleted).length],
    ['PDF', (ls.pdf_library || []).filter(p => !p.deleted).length],
  ];

  info.innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">
      Дата архива: <b style="color:var(--text)">${date}</b>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${counts.map(([l, n]) => `<div class="backup-chip">${l}: <b>${n}</b></div>`).join('')}
    </div>
  `;
  modal.classList.add('open');
}

function closeImportModal() {
  document.getElementById('backup-import-modal')?.classList.remove('open');
  _pendingArchive = null;
}
window.closeImportModal = closeImportModal;

async function confirmImport(mode) {
  const archive = _pendingArchive;
  closeImportModal();
  if (!archive) return;
  try {
    if (mode === 'replace') await _replaceImport(archive);
    else await _mergeImport(archive);
    showToast('Данные восстановлены');
    setTimeout(() => location.reload(), 1200);
  } catch (e) {
    console.error('Import error', e);
    showToast('Ошибка импорта: ' + e.message);
  }
}
window.confirmImport = confirmImport;

// ==================== REPLACE ====================
async function _replaceImport(archive) {
  // Keep auth tokens
  const keep = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && LS_SKIP_PREFIXES.some(p => k.startsWith(p))) keep.push([k, localStorage.getItem(k)]);
  }
  localStorage.clear();
  keep.forEach(([k, v]) => localStorage.setItem(k, v));
  for (const [k, v] of Object.entries(archive.localStorage)) {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }

  await openDB();
  for (const store of ['decks', 'stats', 'favorites', 'reviews']) {
    await _clearStore(store);
    for (const item of (archive.indexedDB[store] || [])) await dbPut(store, item);
  }
  await _clearStore('pdf_files');
  for (const p of (archive.indexedDB.pdf_files || [])) {
    if (p._b64 && p.data) await dbPut('pdf_files', { id: p.id, data: _b64ToBuf(p.data), addedAt: p.addedAt });
  }
}

// ==================== MERGE ====================
async function _mergeImport(archive) {
  const inc = archive.localStorage;
  const exportedAt = archive.exportedAt;

  // --- Soft-delete aware array merge ---
  for (const key of LS_ARRAY_KEYS) {
    _mergeLocalStorageArray(key, inc[key] || [], exportedAt);
  }

  // --- Schedule: per-day per-task, done=true wins ---
  if (inc['study_schedule']) {
    _mergeStudySchedule(inc['study_schedule']);
  }
  // legacy: per-day keys with schedule_ prefix
  for (const key of Object.keys(inc)) {
    if (!key.startsWith('schedule_')) continue;
    _mergeScheduleKey(key, inc[key]);
  }

  // --- Scores: max values ---
  _mergeScoreKeys(inc);

  // --- Other LS keys: add if missing locally ---
  for (const [key, val] of Object.entries(inc)) {
    if (LS_ARRAY_KEYS.includes(key)) continue;
    if (LS_SETTINGS_KEYS.has(key)) continue;
    if (LS_SKIP_PREFIXES.some(p => key.startsWith(p))) continue;
    if (key === 'study_schedule' || key.startsWith('schedule_') || key.startsWith('scores_') || key === 'ege_scores') continue;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
  }

  // --- IDB ---
  await openDB();
  await _mergeDecks(archive.indexedDB.decks || []);
  await _mergeStats(archive.indexedDB.stats || []);
  await _mergeFavorites(archive.indexedDB.favorites || []);
  await _mergeReviews(archive.indexedDB.reviews || []);
  await _mergePdfFiles(archive.indexedDB.pdf_files || []);
}

// Merge array where items have { id, updatedAt?, deleted? }
// Tombstones (deleted:true) are included so they propagate across devices.
function _mergeLocalStorageArray(key, incoming, exportedAt) {
  let local;
  try { local = JSON.parse(localStorage.getItem(key) || '[]'); } catch { local = []; }

  const map = new Map(local.map(item => [String(item.id), item]));

  for (const inc of incoming) {
    const id = String(inc.id);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, inc); // new item or tombstone — add it
    } else {
      // Higher updatedAt wins. If equal or no timestamps, keep local.
      const incTs = inc.updatedAt || exportedAt;
      const localTs = existing.updatedAt || 0;
      if (incTs > localTs) map.set(id, inc);
    }
  }

  localStorage.setItem(key, JSON.stringify([...map.values()]));
}

function _mergeScheduleKey(key, incRaw) {
  let localTasks, incTasks;
  try { localTasks = JSON.parse(localStorage.getItem(key) || '[]'); } catch { localTasks = []; }
  try { incTasks = Array.isArray(incRaw) ? incRaw : JSON.parse(incRaw || '[]'); } catch { incTasks = []; }

  const localMap = new Map(localTasks.map(t => [t.id, t]));
  const merged = localTasks.map(t => {
    const ct = incTasks.find(it => it.id === t.id);
    return ct ? { ...t, done: t.done || ct.done } : t;
  });
  for (const it of incTasks) {
    if (!localMap.has(it.id)) merged.push(it);
  }
  localStorage.setItem(key, JSON.stringify(merged));
}

function _mergeStudySchedule(incRaw) {
  let local, incoming;
  try { local = JSON.parse(localStorage.getItem('study_schedule') || '{}'); } catch { local = {}; }
  try { incoming = typeof incRaw === 'string' ? JSON.parse(incRaw) : incRaw; } catch { incoming = {}; }
  if (!incoming || typeof incoming !== 'object') return;

  for (const [dateKey, incTasks] of Object.entries(incoming)) {
    if (!Array.isArray(incTasks)) continue;
    if (!local[dateKey]) {
      local[dateKey] = incTasks; // day doesn't exist locally — take all
    } else {
      const localMap = new Map(local[dateKey].map(t => [t.id, t]));
      // merge existing tasks: done=true wins
      local[dateKey] = local[dateKey].map(t => {
        const ct = incTasks.find(it => it.id === t.id);
        return ct ? { ...t, done: t.done || ct.done, text: t.text } : t;
      });
      // add tasks that exist in archive but not locally
      for (const it of incTasks) {
        if (!localMap.has(it.id)) local[dateKey].push(it);
      }
    }
  }
  localStorage.setItem('study_schedule', JSON.stringify(local));
}

function _mergeScoreKeys(inc) {
  // ege_scores object
  _mergeNumericObject('ege_scores', inc['ege_scores']);
  // scores_variants_* arrays
  for (const key of Object.keys(inc)) {
    if (!key.startsWith('scores_')) continue;
    const raw = inc[key];
    const val = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    if (!val) continue;
    if (Array.isArray(val)) {
      // Array of variant objects — union by id
      let local;
      try { local = JSON.parse(localStorage.getItem(key) || '[]'); } catch { local = []; }
      const localIds = new Set(local.map(v => String(v.id)));
      for (const v of val) { if (!localIds.has(String(v.id))) local.push(v); }
      localStorage.setItem(key, JSON.stringify(local));
    } else {
      _mergeNumericObject(key, val);
    }
  }
}

function _mergeNumericObject(key, incoming) {
  if (!incoming) return;
  let local;
  try { local = JSON.parse(localStorage.getItem(key) || '{}'); } catch { local = {}; }
  const inc = typeof incoming === 'string' ? (() => { try { return JSON.parse(incoming); } catch { return {}; } })() : incoming;
  for (const [k, v] of Object.entries(inc || {})) {
    if (typeof v === 'number' && (local[k] === undefined || v > local[k])) local[k] = v;
  }
  localStorage.setItem(key, JSON.stringify(local));
}

// --- IDB merge helpers ---

async function _mergeDecks(incoming) {
  const local = await dbGetAll('decks');
  const localMap = new Map(local.map(d => [d.id, d]));

  for (const inc of incoming) {
    const existing = localMap.get(inc.id);
    if (!existing) {
      await dbPut('decks', inc); // new or tombstone
    } else {
      const incTs = inc.updatedAt || 0;
      const localTs = existing.updatedAt || 0;
      if (incTs > localTs) {
        await dbPut('decks', inc);
      } else if (!inc.deleted) {
        // Same age — merge cards: union by card q (question)
        const cardMap = new Map((existing.cards || []).map(c => [c.q, c]));
        for (const ic of (inc.cards || [])) {
          if (!cardMap.has(ic.q)) cardMap.set(ic.q, ic);
        }
        await dbPut('decks', { ...existing, cards: [...cardMap.values()] });
      }
    }
  }
}

async function _mergeStats(incoming) {
  const local = await dbGetAll('stats');
  const localMap = new Map(local.map(s => [s.id, s]));
  for (const inc of incoming) {
    const existing = localMap.get(inc.id);
    if (!existing) {
      await dbPut('stats', inc);
    } else {
      // Take max for all numeric fields
      const merged = { ...existing };
      for (const [k, v] of Object.entries(inc)) {
        if (typeof v === 'number' && (merged[k] === undefined || v > merged[k])) merged[k] = v;
      }
      await dbPut('stats', merged);
    }
  }
}

async function _mergeFavorites(incoming) {
  const local = await dbGetAll('favorites');
  const localIds = new Set(local.map(f => f.id));
  for (const inc of incoming) {
    if (!localIds.has(inc.id)) await dbPut('favorites', inc);
  }
}

async function _mergeReviews(incoming) {
  const local = await dbGetAll('reviews');
  const localMap = new Map(local.map(r => [r.id, r]));
  for (const inc of incoming) {
    const existing = localMap.get(inc.id);
    if (!existing) {
      await dbPut('reviews', inc);
    } else {
      // Keep the one with later next_review_date (more review progress)
      const incD = new Date(inc.next_review_date).getTime() || 0;
      const locD = new Date(existing.next_review_date).getTime() || 0;
      if (incD > locD) await dbPut('reviews', inc);
    }
  }
}

async function _mergePdfFiles(incoming) {
  const local = await dbGetAll('pdf_files');
  const localIds = new Set(local.map(p => p.id));
  for (const p of incoming) {
    if (!p._b64 || !p.data || localIds.has(p.id)) continue;
    await dbPut('pdf_files', { id: p.id, data: _b64ToBuf(p.data), addedAt: p.addedAt });
  }
}

function _clearStore(store) {
  return new Promise((resolve, reject) => {
    if (!db) { reject('DB not initialized'); return; }
    const req = db.transaction(store, 'readwrite').objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
