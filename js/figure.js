// Animated stick figure engine (side view, facing right).
// Pose angles are in degrees. Limb angles use a "down" convention:
// 0 = segment points straight down, +90 = points forward (+x), 180 = points up.
// Torso angle `a`: 0 = upright, + = leaning forward, -90 = lying on back (head left).
(function (global) {
  const L = { shin: 36, thigh: 38, torso: 48, neck: 5, head: 9, ua: 28, fa: 26 };
  const G = 188; // ground line
  const R = Math.PI / 180;
  const sin = (d) => Math.sin(d * R);
  const cos = (d) => Math.cos(d * R);
  const atan2d = (y, x) => Math.atan2(y, x) / R;

  const DEF = { root: 'foot', fx: 100, fy: G, hx: 100, hy: G - 74, t1: 0, s1: 0, a: 0, u1: 0, f1: 0, hd: 0 };

  function norm(p) {
    const q = Object.assign({}, DEF, p);
    if (q.t2 === undefined) q.t2 = q.t1;
    if (q.s2 === undefined) q.s2 = q.s1;
    if (q.u2 === undefined) q.u2 = q.u1;
    if (q.f2 === undefined) q.f2 = q.f1;
    return q;
  }

  function ik(from, target, a, b, bend) {
    let dx = target[0] - from[0], dy = target[1] - from[1];
    let d = Math.hypot(dx, dy);
    const max = a + b - 0.01;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    const theta = atan2d(dx, dy);
    const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))) / R;
    const u = theta + bend * al;
    const mid = [from[0] + a * sin(u), from[1] + a * cos(u)];
    const f = atan2d(from[0] + dx - mid[0], from[1] + dy - mid[1]);
    return [u, f];
  }

  function solve(p) {
    let hip, k1, an1;
    if (p.root === 'foot') {
      an1 = [p.fx, p.fy];
      k1 = [an1[0] - sin(p.s1) * L.shin, an1[1] - cos(p.s1) * L.shin];
      hip = [k1[0] - sin(p.t1) * L.thigh, k1[1] - cos(p.t1) * L.thigh];
    } else {
      hip = [p.hx, p.hy];
      k1 = [hip[0] + sin(p.t1) * L.thigh, hip[1] + cos(p.t1) * L.thigh];
      an1 = [k1[0] + sin(p.s1) * L.shin, k1[1] + cos(p.s1) * L.shin];
    }
    const k2 = [hip[0] + sin(p.t2) * L.thigh, hip[1] + cos(p.t2) * L.thigh];
    const an2 = [k2[0] + sin(p.s2) * L.shin, k2[1] + cos(p.s2) * L.shin];
    const sh = [hip[0] + sin(p.a) * L.torso, hip[1] - cos(p.a) * L.torso];
    const ha = p.a + p.hd;
    const head = [sh[0] + sin(ha) * (L.neck + L.head), sh[1] - cos(ha) * (L.neck + L.head)];
    const e1 = [sh[0] + sin(p.u1) * L.ua, sh[1] + cos(p.u1) * L.ua];
    const h1 = [e1[0] + sin(p.f1) * L.fa, e1[1] + cos(p.f1) * L.fa];
    const e2 = [sh[0] + sin(p.u2) * L.ua, sh[1] + cos(p.u2) * L.ua];
    const h2 = [e2[0] + sin(p.f2) * L.fa, e2[1] + cos(p.f2) * L.fa];
    const toe = (an, s) => [an[0] + cos(s) * 9, an[1] - sin(s) * 9];
    return { hip, k1, an1, k2, an2, sh, head, e1, h1, e2, h2, t1: toe(an1, p.s1), t2: toe(an2, p.s2) };
  }

  // Resolve IK targets into plain angles.
  function resolve(raw) {
    const p = norm(raw);
    if (p.lk1 && p.root === 'hip') {
      const r = ik([p.hx, p.hy], p.lk1, L.thigh, L.shin, p.lb1 || 1); p.t1 = r[0]; p.s1 = r[1];
      if (raw.t2 === undefined && !raw.lk2) { p.t2 = r[0]; p.s2 = r[1]; }
    }
    if (p.ik1 || p.ik2 || p.lk2) {
      const j = solve(p);
      if (p.ik1) { const r = ik(j.sh, p.ik1, L.ua, L.fa, p.b1 || 1); p.u1 = r[0]; p.f1 = r[1]; if (raw.u2 === undefined && !raw.ik2) { p.u2 = r[0]; p.f2 = r[1]; } }
      if (p.ik2) { const r = ik(j.sh, p.ik2, L.ua, L.fa, p.b2 || 1); p.u2 = r[0]; p.f2 = r[1]; }
      if (p.lk2) { const r = ik(j.hip, p.lk2, L.thigh, L.shin, p.lb2 || 1); p.t2 = r[0]; p.s2 = r[1]; }
    }
    delete p.ik1; delete p.ik2; delete p.lk1; delete p.lk2;
    return p;
  }

  function toHip(p) {
    if (p.root === 'hip') return p;
    const j = solve(p);
    return Object.assign({}, p, { root: 'hip', hx: j.hip[0], hy: j.hip[1] });
  }

  const NUM = ['fx', 'fy', 'hx', 'hy', 't1', 's1', 't2', 's2', 'a', 'u1', 'f1', 'u2', 'f2', 'hd'];
  function lerp(A, B, t) {
    let a = A, b = B;
    if (A.root !== B.root || A.root === 'hip') { a = toHip(A); b = toHip(B); }
    const o = { root: a.root, kb: t < 0.5 ? A.kb : B.kb, km: t < 0.5 ? A.km : B.km, front: t < 0.5 ? A.front : B.front };
    for (const k of NUM) o[k] = a[k] + (b[k] - a[k]) * t;
    return o;
  }
  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  const KB_OFF = { hang: [0, 10], top: [-6, 4], rack: [-4, 7], on: [0, -9], under: [0, 7], up: [0, -11] };

  // ---------- SVG rendering ----------
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // A clothed, solid-bodied figure: skin, shirt, pants, shoes, a face that shows where the person looks.
  // Far-side limbs are drawn first and slightly faded so depth is obvious.
  function build(svg) {
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.innerHTML = '';
    el('ellipse', { cx: 100, cy: G + 3, rx: 70, ry: 4, class: 'fg-shadow' }, svg);
    el('line', { x1: 8, y1: G + 3, x2: 192, y2: G + 3, class: 'fg-ground' }, svg);
    const far = el('g', { class: 'fg-far' }, svg);
    const seg = (g, cls) => el('line', { class: cls }, g);
    const parts = {};
    parts.farUA = seg(far, 'fg-shirt fg-ua'); parts.farFA = seg(far, 'fg-skin fg-fa'); parts.farHand = el('circle', { r: 3.6, class: 'fg-skin-fill' }, far);
    parts.farTh = seg(far, 'fg-pants fg-th'); parts.farSh = seg(far, 'fg-pants fg-sh'); parts.farFoot = seg(far, 'fg-shoe fg-ft');
    const body = el('g', { class: 'fg-body' }, svg);
    parts.torso = seg(body, 'fg-shirt fg-torso');
    parts.pelvis = el('circle', { r: 7.5, class: 'fg-pants-fill' }, body);
    parts.nearTh = seg(body, 'fg-pants fg-th'); parts.nearSh = seg(body, 'fg-pants fg-sh'); parts.nearFoot = seg(body, 'fg-shoe fg-ft');
    parts.neck = seg(body, 'fg-skin fg-neck');
    parts.hair = el('circle', { r: L.head + 0.6, class: 'fg-hair' }, body);
    parts.face = el('circle', { r: L.head - 0.6, class: 'fg-skin-fill' }, body);
    parts.eye = el('circle', { r: 1.3, class: 'fg-eye' }, body);
    parts.eye2 = el('circle', { r: 1.3, class: 'fg-eye' }, body);
    parts.far = far;
    parts.kbG = el('g', { class: 'fg-kb' }, svg);
    parts.kbBody = el('circle', { r: 8 }, parts.kbG);
    parts.kbHandle = el('path', { fill: 'none' }, parts.kbG);
    const nearArm = el('g', { class: 'fg-near-arm' }, svg);
    parts.nearUA = seg(nearArm, 'fg-shirt fg-ua'); parts.nearFA = seg(nearArm, 'fg-skin fg-fa'); parts.nearHand = el('circle', { r: 3.8, class: 'fg-skin-fill' }, nearArm);
    return parts;
  }

  const f1 = (v) => v.toFixed(1);
  const line = (l, a, b) => { l.setAttribute('x1', f1(a[0])); l.setAttribute('y1', f1(a[1])); l.setAttribute('x2', f1(b[0])); l.setAttribute('y2', f1(b[1])); };
  const dot = (c, a) => { c.setAttribute('cx', f1(a[0])); c.setAttribute('cy', f1(a[1])); };

  function draw(parts, p) {
    const j = solve(p);
    line(parts.farUA, j.sh, j.e2); line(parts.farFA, j.e2, j.h2); dot(parts.farHand, j.h2);
    line(parts.farTh, j.hip, j.k2); line(parts.farSh, j.k2, j.an2); line(parts.farFoot, j.an2, j.t2);
    // torso from just above the hip to just below the shoulder so the joints look rounded
    line(parts.torso, j.hip, j.sh); dot(parts.pelvis, j.hip);
    line(parts.nearTh, j.hip, j.k1); line(parts.nearSh, j.k1, j.an1); line(parts.nearFoot, j.an1, j.t1);
    const ha = (p.a + (p.hd || 0)) * Math.PI / 180;
    const up = [Math.sin(ha), -Math.cos(ha)], fwd = [Math.cos(ha), Math.sin(ha)];
    const neckTop = [j.sh[0] + up[0] * (L.neck + 1), j.sh[1] + up[1] * (L.neck + 1)];
    line(parts.neck, j.sh, neckTop);
    dot(parts.hair, [j.head[0] - fwd[0] * 1.2, j.head[1] - fwd[1] * 1.2]);
    dot(parts.face, [j.head[0] + fwd[0] * 1.1, j.head[1] + fwd[1] * 1.1]);
    if (p.front) {
      // facing the viewer: both eyes, hair as a cap, both sides fully visible
      dot(parts.hair, [j.head[0] + up[0] * 1.6, j.head[1] + up[1] * 1.6]);
      dot(parts.face, [j.head[0] - up[0] * 0.8, j.head[1] - up[1] * 0.8]);
      dot(parts.eye, [j.head[0] + fwd[0] * 3 + up[0] * 0.5, j.head[1] + fwd[1] * 3 + up[1] * 0.5]);
      dot(parts.eye2, [j.head[0] - fwd[0] * 3 + up[0] * 0.5, j.head[1] - fwd[1] * 3 + up[1] * 0.5]);
      parts.eye2.style.display = ''; parts.far.style.opacity = '1';
    } else {
      dot(parts.eye, [j.head[0] + fwd[0] * 4.6 + up[0] * 1.2, j.head[1] + fwd[1] * 4.6 + up[1] * 1.2]);
      parts.eye2.style.display = 'none'; parts.far.style.opacity = '';
    }
    line(parts.nearUA, j.sh, j.e1); line(parts.nearFA, j.e1, j.h1); dot(parts.nearHand, j.h1);
    if (p.kb) {
      let h = p.kb === 'far' ? j.h2 : p.kb === 'both' ? [(j.h1[0] + j.h2[0]) / 2, (j.h1[1] + j.h2[1]) / 2] : j.h1;
      let c;
      if (p.km === 'float') {
        const e = p.kb === 'far' ? j.e2 : j.e1;
        const dx = h[0] - e[0], dy = h[1] - e[1], d = Math.hypot(dx, dy) || 1;
        c = [h[0] + (dx / d) * 10, h[1] + (dy / d) * 10];
      } else {
        const o = KB_OFF[p.km || 'hang'];
        c = [h[0] + o[0], h[1] + o[1]];
      }
      parts.kbG.style.display = '';
      parts.kbBody.setAttribute('cx', f1(c[0]));
      parts.kbBody.setAttribute('cy', f1(c[1]));
      const ang = Math.atan2(h[1] - c[1], h[0] - c[0]);
      const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
      const b1 = [c[0] + ux * 5 + px * 5, c[1] + uy * 5 + py * 5];
      const b2 = [c[0] + ux * 5 - px * 5, c[1] + uy * 5 - py * 5];
      const top = [c[0] + ux * 15, c[1] + uy * 15];
      parts.kbHandle.setAttribute('d', `M${f1(b1[0])},${f1(b1[1])} Q${f1(top[0] + px * 7)},${f1(top[1] + py * 7)} ${f1(top[0])},${f1(top[1])} Q${f1(top[0] - px * 7)},${f1(top[1] - py * 7)} ${f1(b2[0])},${f1(b2[1])}`);
    } else {
      parts.kbG.style.display = 'none';
    }
    return j;
  }

  // ---------- Animation runtime ----------
  const cache = {};
  function frames(key) {
    if (cache[key]) return cache[key];
    const def = global.ANIMS[key] || global.ANIMS.stand;
    const fr = def.map((k) => ({ p: resolve(k.p), d: k.d === undefined ? 700 : k.d }));
    cache[key] = fr;
    return fr;
  }

  function poseAt(key, ms, speed) {
    const fr = frames(key);
    if (fr.length === 1) return fr[0].p;
    const total = fr.reduce((s, f) => s + f.d, 0) / (speed || 1);
    let t = ms % total;
    for (let i = 0; i < fr.length; i++) {
      const d = fr[i].d / (speed || 1);
      if (t < d || i === fr.length - 1) {
        const next = fr[(i + 1) % fr.length];
        const k = d > 0 ? Math.min(1, t / d) : 1;
        return lerp(fr[i].p, next.p, ease(k));
      }
      t -= d;
    }
    return fr[0].p;
  }

  const active = new Set();
  let running = false;
  function loop(now) {
    if (!active.size) { running = false; return; }
    for (const a of active) {
      if (!a.svg.isConnected) { active.delete(a); continue; }
      if (a.paused) continue;
      draw(a.parts, poseAt(a.key, now - a.start, a.speed));
    }
    requestAnimationFrame(loop);
  }

  function animate(svg, key, opts) {
    opts = opts || {};
    stop(svg);
    const a = { svg, key, parts: build(svg), start: performance.now(), speed: opts.speed || 1, paused: false };
    svg._fig = a;
    draw(a.parts, frames(key)[0].p);
    active.add(a);
    if (!running) { running = true; requestAnimationFrame(loop); }
    return a;
  }

  function stop(svg) {
    if (svg._fig) { active.delete(svg._fig); svg._fig = null; }
  }

  function still(svg, key, idx) {
    stop(svg);
    const parts = build(svg);
    const fr = frames(key);
    const i = idx === undefined ? (global.ANIM_PEAK && global.ANIM_PEAK[key] !== undefined ? global.ANIM_PEAK[key] : Math.min(1, fr.length - 1)) : idx;
    const j = draw(parts, fr[Math.min(i, fr.length - 1)].p);
    // zoom static thumbnails onto the figure
    const ptsAll = Object.values(j);
    let x0 = Math.min(...ptsAll.map((q) => q[0])) - 14, x1 = Math.max(...ptsAll.map((q) => q[0])) + 14;
    let y0 = Math.min(...ptsAll.map((q) => q[1])) - 16; const y1 = G + 6;
    const size = Math.max(x1 - x0, y1 - y0, 90);
    const cx = (x0 + x1) / 2;
    svg.setAttribute('viewBox', `${(cx - size / 2).toFixed(1)} ${(y1 - size).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`);
  }

  function setPaused(svg, paused) {
    const a = svg._fig;
    if (!a) return;
    if (paused && !a.paused) { a.paused = true; a.pausedAt = performance.now(); }
    else if (!paused && a.paused) { a.paused = false; a.start += performance.now() - a.pausedAt; }
  }

  global.Figure = { animate, stop, still, setPaused, frames, L, G };
})(window);
