// ==================== ЯНДЕКС ДИСК ====================
const YADISK_BASE = 'https://cloud-api.yandex.net/v1/disk';
const YADISK_ROOT = '/Биолаб';

function getYadiskToken() {
  return localStorage.getItem('yadisk_token') || '';
}

function yadiskHeaders() {
  return { Authorization: 'OAuth ' + getYadiskToken() };
}

// Создать папку если не существует
async function ensureYadiskFolder(path) {
  const token = getYadiskToken();
  if (!token) return;
  const res = await fetch(`${YADISK_BASE}/resources?path=${encodeURIComponent(path)}`, {
    headers: yadiskHeaders()
  });
  if (res.status === 404) {
    await fetch(`${YADISK_BASE}/resources?path=${encodeURIComponent(path)}`, {
      method: 'PUT', headers: yadiskHeaders()
    });
  }
}

// Загрузить любой файл (blob) на Яндекс Диск, опубликовать, вернуть public_url
async function uploadFileToYadisk(blob, filename, folder = 'misc') {
  const token = getYadiskToken();
  if (!token) return null;
  try {
    const folderPath = `${YADISK_ROOT}/${folder}`;
    await ensureYadiskFolder(YADISK_ROOT);
    await ensureYadiskFolder(folderPath);

    const filePath = `${folderPath}/${filename}`;

    // 1. Получить URL для загрузки
    const uploadRes = await fetch(
      `${YADISK_BASE}/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true`,
      { headers: yadiskHeaders() }
    );
    if (!uploadRes.ok) throw new Error('Ошибка получения upload URL');
    const { href } = await uploadRes.json();

    // 2. Загрузить файл
    const putRes = await fetch(href, { method: 'PUT', body: blob });
    if (!putRes.ok) throw new Error('Ошибка загрузки файла');

    // 3. Опубликовать
    await fetch(
      `${YADISK_BASE}/resources/publish?path=${encodeURIComponent(filePath)}`,
      { method: 'PUT', headers: yadiskHeaders() }
    );

    // 4. Получить public_url
    const infoRes = await fetch(
      `${YADISK_BASE}/resources?path=${encodeURIComponent(filePath)}&fields=public_url`,
      { headers: yadiskHeaders() }
    );
    if (!infoRes.ok) throw new Error('Ошибка получения public_url');
    const { public_url } = await infoRes.json();
    return public_url || null;
  } catch (err) {
    console.error('Яндекс Диск ошибка:', err);
    return null;
  }
}

// Получить прямую ссылку для скачивания по public_url
async function getYadiskDownloadUrl(publicUrl) {
  const token = getYadiskToken();
  const headers = token ? yadiskHeaders() : {};
  try {
    const res = await fetch(
      `${YADISK_BASE}/public/resources/download?public_key=${encodeURIComponent(publicUrl)}`,
      { headers }
    );
    if (!res.ok) return publicUrl;
    const { href } = await res.json();
    return href;
  } catch {
    return publicUrl;
  }
}

// Список файлов в папке Яндекс Диска
async function listYadiskFolder(folder) {
  const token = getYadiskToken();
  if (!token) return [];
  const folderPath = `${YADISK_ROOT}/${folder}`;
  const res = await fetch(
    `${YADISK_BASE}/resources?path=${encodeURIComponent(folderPath)}&fields=_embedded&limit=100`,
    { headers: yadiskHeaders() }
  ).catch(() => null);
  if (!res || !res.ok) return []; // 404 = папка ещё не создана, это нормально
  const data = await res.json();
  return data._embedded?.items || [];
}

// Скачать JSON-файл с Яндекс Диска по public_url
async function fetchYadiskJson(publicUrl) {
  const dlUrl = await getYadiskDownloadUrl(publicUrl);
  const res = await fetch(dlUrl);
  if (!res.ok) throw new Error('Ошибка загрузки файла');
  return await res.json();
}

// ==================== ИЗОБРАЖЕНИЯ ====================

// Сжать base64 через Canvas (max 1200px, JPEG 80%)
function compressImage(base64, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

// Upload image to Yandex Disk, return public_url (permanent).
// Falls back to compressed base64 if no token.
window.uploadImage = async function(base64) {
  const compressed = await compressImage(base64);
  const token = getYadiskToken();
  if (!token) return compressed;
  try {
    const fetchRes = await fetch(compressed);
    const blob = await fetchRes.blob();
    const filename = `img_${Date.now()}.jpg`;
    const publicUrl = await uploadFileToYadisk(blob, filename, 'images');
    return publicUrl || compressed; // store public_url, not download URL
  } catch {
    return compressed;
  }
};

// Display a Yandex Disk image in an <img> element.
// Fetches fresh download URL (cached in sessionStorage for the session).
window.loadYadiskImage = async function(url, imgEl) {
  if (!url) return;
  // base64 or regular URL — set directly
  if (url.startsWith('data:') || !url.includes('disk.yandex')) {
    imgEl.src = url;
    return;
  }
  // Check sessionStorage cache
  const cacheKey = 'ydl_' + url;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) { imgEl.src = cached; return; }
  // Get fresh download URL
  try {
    const dlUrl = await getYadiskDownloadUrl(url);
    sessionStorage.setItem(cacheKey, dlUrl);
    imgEl.src = dlUrl;
  } catch {
    imgEl.src = url; // fallback
  }
};

window.getYadiskToken = getYadiskToken;
window.uploadFileToYadisk = uploadFileToYadisk;
window.getYadiskDownloadUrl = getYadiskDownloadUrl;
window.listYadiskFolder = listYadiskFolder;
window.fetchYadiskJson = fetchYadiskJson;
