// User-added media: your own short video or photo for any exercise, stored on the device (IndexedDB).
// Shown instead of the built-in photo / animation everywhere in the app, offline included.
(function (global) {
  'use strict';
  const DB = 'kettlebell-media', STORE = 'media';
  const urls = new Map(); // exercise id -> { url, type }
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      } catch (e) { reject(e); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then((d) => new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode); const st = t.objectStore(STORE);
      const out = fn(st);
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
    }));
  }
  function remember(rec) {
    if (urls.has(rec.id)) URL.revokeObjectURL(urls.get(rec.id).url);
    urls.set(rec.id, { url: URL.createObjectURL(rec.blob), type: rec.type.startsWith('video') ? 'video' : 'image' });
  }

  const Media = {
    // Load everything once at start-up
    async init() {
      try {
        const all = await tx('readonly', (st) => st.getAll());
        (all || []).forEach(remember);
      } catch (e) { /* storage unavailable */ }
      return urls.size;
    },
    get(id) { return urls.get(id) || null; },
    count() { return urls.size; },
    async put(id, file) {
      const rec = { id, blob: file, type: file.type || 'video/mp4', name: file.name, added: Date.now() };
      await tx('readwrite', (st) => st.put(rec));
      remember(rec);
    },
    async remove(id) {
      await tx('readwrite', (st) => st.delete(id));
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id).url); urls.delete(id); }
    },
    // DOM element for an exercise's own media
    element(id, opts) {
      const m = urls.get(id);
      if (!m) return null;
      const box = document.createElement('div');
      box.className = 'ph own';
      if (m.type === 'video') {
        const v = document.createElement('video');
        v.src = m.url + (opts && opts.still ? '#t=0.5' : '');
        v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.loop = true;
        v.preload = opts && opts.still ? 'metadata' : 'auto';
        if (!(opts && opts.still)) { v.autoplay = true; v.play().catch(() => {}); }
        box.appendChild(v);
      } else {
        const img = document.createElement('img'); img.src = m.url; img.alt = ''; box.appendChild(img);
      }
      return box;
    },
  };
  global.Media = Media;
})(window);
