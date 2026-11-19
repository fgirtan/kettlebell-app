// Offline-first service worker. Bump VERSION when files change.
importScripts('js/voice-index.js');
const VERSION = 'kb-v14';
const PHOTO_FILES = ['photos/bridge1_0.jpg', 'photos/bridge1_1.jpg', 'photos/bridge_0.jpg', 'photos/bridge_1.jpg', 'photos/cleanHang_0.jpg', 'photos/cleanHang_1.jpg', 'photos/crunch_0.jpg', 'photos/crunch_1.jpg', 'photos/deadClean_0.jpg', 'photos/deadClean_1.jpg', 'photos/deadbug_0.jpg', 'photos/deadbug_1.jpg', 'photos/fig8_0.jpg', 'photos/fig8_1.jpg', 'photos/floorPress_0.jpg', 'photos/floorPress_1.jpg', 'photos/goblet_0.jpg', 'photos/goblet_1.jpg', 'photos/highPull_0.jpg', 'photos/highPull_1.jpg', 'photos/plankRow_0.jpg', 'photos/plankRow_1.jpg', 'photos/plank_0.jpg', 'photos/plank_1.jpg', 'photos/press_0.jpg', 'photos/press_1.jpg', 'photos/pushPress_0.jpg', 'photos/pushPress_1.jpg', 'photos/pushup_0.jpg', 'photos/pushup_1.jpg', 'photos/r_calf_0.jpg', 'photos/r_calf_1.jpg', 'photos/r_catcow_0.jpg', 'photos/r_catcow_1.jpg', 'photos/r_fig4_0.jpg', 'photos/r_fig4_1.jpg', 'photos/r_shoulder_0.jpg', 'photos/r_shoulder_1.jpg', 'photos/row_0.jpg', 'photos/row_1.jpg', 'photos/russianTwist_0.jpg', 'photos/russianTwist_1.jpg', 'photos/s_child_0.jpg', 'photos/s_child_1.jpg', 'photos/s_hipflex_0.jpg', 'photos/s_hipflex_1.jpg', 'photos/s_knees_0.jpg', 'photos/s_knees_1.jpg', 'photos/s_seated_0.jpg', 'photos/s_seated_1.jpg', 'photos/s_shoulder_0.jpg', 'photos/s_shoulder_1.jpg', 'photos/situp_0.jpg', 'photos/situp_1.jpg', 'photos/sldl_0.jpg', 'photos/sldl_1.jpg', 'photos/swing1_0.jpg', 'photos/swing1_1.jpg', 'photos/tgu_0.jpg', 'photos/tgu_1.jpg', 'photos/thruster_0.jpg', 'photos/thruster_1.jpg', 'photos/w_arms_0.jpg', 'photos/w_arms_1.jpg', 'photos/w_inch_0.jpg', 'photos/w_inch_1.jpg', 'photos/w_lunge_0.jpg', 'photos/w_lunge_1.jpg', 'photos/w_squat_0.jpg', 'photos/w_squat_1.jpg', 'photos/w_wgs_0.jpg', 'photos/w_wgs_1.jpg', 'photos/windmill_0.jpg', 'photos/windmill_1.jpg'];
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/voice-index.js', 'js/photos.js', 'js/media.js', 'js/figure.js', 'js/anims.js', 'js/exercises.js', 'js/generator.js', 'js/boxing.js', 'js/recovery.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.concat(PHOTO_FILES, (self.VOICE_SETS || []).flatMap((v) => (self.VOICE_CLIPS || []).map((k) => `audio/${v}/${k}.mp3`))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
