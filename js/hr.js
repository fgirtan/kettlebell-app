// Live heart rate from a Bluetooth chest strap (Polar H10 or any strap using the standard Heart Rate service).
// Uses Web Bluetooth: Chrome/Edge on Android, Windows, macOS, ChromeOS. Not available in iPhone browsers
// (except Web-Bluetooth browsers such as Bluefy).
(function (global) {
  'use strict';
  const listeners = new Set();
  let device = null, chr = null, bpm = null, lastAt = 0, wantConnected = false;
  let session = null; // { samples: [], zoneSec: [0,0,0,0,0], last: t }

  const HR = {
    supported: !!(navigator.bluetooth && navigator.bluetooth.requestDevice),
    get bpm() { return Date.now() - lastAt < 5000 ? bpm : null; },
    get connected() { return !!(device && device.gatt && device.gatt.connected); },
    get name() { return device ? device.name : ''; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    maxHr(S) { const age = +S.hrAge || 40; return Math.round(208 - 0.7 * age); }, // Tanaka formula
    zone(b, S) { // 1..5 by % of max heart rate
      if (!b) return 0;
      const p = b / HR.maxHr(S);
      return p < 0.6 ? 1 : p < 0.7 ? 2 : p < 0.8 ? 3 : p < 0.9 ? 4 : 5;
    },

    async connect() {
      if (!HR.supported) throw new Error('unsupported');
      device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }], optionalServices: ['battery_service'] });
      device.addEventListener('gattserverdisconnected', onDisconnect);
      wantConnected = true;
      await attach();
      return device.name;
    },
    disconnect() {
      wantConnected = false;
      try { if (device && device.gatt.connected) device.gatt.disconnect(); } catch (e) { /* ignore */ }
      bpm = null; emit();
    },

    // Session stats for a workout
    startSession() { session = { samples: [], zoneSec: [0, 0, 0, 0, 0, 0], last: Date.now() }; },
    stopSession() {
      if (!session) return null;
      const s = session; session = null;
      if (!s.samples.length) return null;
      const avg = Math.round(s.samples.reduce((a, b) => a + b, 0) / s.samples.length);
      return { avg, max: Math.max(...s.samples), zoneSec: s.zoneSec.slice(1).map(Math.round) };
    },
  };

  async function attach() {
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService('heart_rate');
    chr = await svc.getCharacteristic('heart_rate_measurement');
    chr.addEventListener('characteristicvaluechanged', onValue);
    await chr.startNotifications();
    emit();
  }

  function onValue(ev) {
    const v = ev.target.value;
    const flags = v.getUint8(0);
    const val = flags & 0x01 ? v.getUint16(1, true) : v.getUint8(1);
    if (!val) return;
    const now = Date.now();
    if (session && bpm) {
      const dt = Math.min(5, (now - session.last) / 1000);
      const z = HR.zone(bpm, global.KB_SETTINGS || {});
      session.zoneSec[z] += dt;
    }
    if (session) { session.samples.push(val); session.last = now; }
    bpm = val; lastAt = now;
    emit();
  }

  async function onDisconnect() {
    bpm = null; emit();
    // the strap can drop for a moment (e.g. lying on it) – try to reconnect a few times
    for (let i = 0; i < 5 && wantConnected; i++) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      try { await attach(); return; } catch (e) { /* retry */ }
    }
  }

  function emit() { listeners.forEach((fn) => { try { fn(HR.bpm); } catch (e) { /* ignore */ } }); }

  global.HR = HR;
})(window);
