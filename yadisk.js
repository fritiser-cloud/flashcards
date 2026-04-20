// ==================== ЯНДЕКС ДИСК ====================
const YADISK_FOLDER = '/Биолаб';

function getYadiskToken() {
  return localStorage.getItem('yadisk_token') || '';
}

// Убедиться что папка существует
async function ensureFolder(token) {
  try {
    await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(YADISK_FOLDER)}`, {
      headers: { Authorization: 'OAuth ' + token }
    }).then(async r => {
      if (r.status === 404) {
        await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(YADISK_FOLDER)}`, {
          method: 'PUT',
          headers: { Authorization: 'OAuth ' + token }
        });
      }
    });
  } catch (_) {}
}

// Загрузить base64-изображение на Яндекс Диск, вернуть публичный URL
async function uploadToYadisk(base64) {
  const token = getYadiskToken();
  if (!token) return base64; // нет токена — возвращаем base64

  try {
    await ensureFolder(token);

    const filename = `img_${Date.now()}.jpg`;
    const path = `${YADISK_FOLDER}/${filename}`;

    // 1. Получить URL для загрузки
    const uploadUrlRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`,
      { headers: { Authorization: 'OAuth ' + token } }
    );
    if (!uploadUrlRes.ok) throw new Error('Ошибка получения URL загрузки');
    const { href } = await uploadUrlRes.json();

    // 2. Конвертировать base64 в blob и загрузить
    const fetchRes = await fetch(base64);
    const blob = await fetchRes.blob();
    const putRes = await fetch(href, { method: 'PUT', body: blob });
    if (!putRes.ok) throw new Error('Ошибка загрузки файла');

    // 3. Опубликовать файл
    await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/publish?path=${encodeURIComponent(path)}`,
      { method: 'PUT', headers: { Authorization: 'OAuth ' + token } }
    );

    // 4. Получить публичную ссылку (download_url)
    const infoRes = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&fields=public_url`,
      { headers: { Authorization: 'OAuth ' + token } }
    );
    if (!infoRes.ok) throw new Error('Ошибка получения публичной ссылки');
    const info = await infoRes.json();

    // Яндекс Диск даёт public_url — преобразуем в прямую ссылку на скачивание
    if (info.public_url) {
      const dlRes = await fetch(
        `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(info.public_url)}`,
        { headers: { Authorization: 'OAuth ' + token } }
      );
      if (dlRes.ok) {
        const { href: dlHref } = await dlRes.json();
        return dlHref; // прямая ссылка для <img src>
      }
      return info.public_url;
    }

    throw new Error('Нет публичной ссылки');
  } catch (err) {
    console.error('Яндекс Диск ошибка:', err);
    return base64; // fallback на base64
  }
}

window.getYadiskToken = getYadiskToken;
window.uploadToYadisk = uploadToYadisk;
