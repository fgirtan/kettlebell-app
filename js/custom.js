// "My workouts": build, save, edit and run your own kettlebell workouts.
(function (global) {
  'use strict';
  let editing = null; // workout being edited (copy)
  let pickerQuery = '', pickerCat = 'all';

  const newId = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const blank = (S) => ({ id: newId(), name: 'My workout', items: [], rounds: 2, restBetween: 15, roundRest: 60, warmOn: true, coolOn: true });

  function list(api) { api.store.custom = api.store.custom || []; return api.store.custom; }

  function durationOf(def, api) {
    if (!def.items.length) return 0;
    return Generator.customPlan(def, api.S.timing).target;
  }

  // ---------- list of saved workouts ----------
  function renderList(v, api) {
    const { ICON, fmtMin, $, $$, save, toast } = api;
    const all = list(api);
    v.insertAdjacentHTML('beforeend', `
      <button class="btn primary block big" id="cwNew">${ICON.plus.replace('<svg', '<svg fill="none" stroke="currentColor" stroke-width="2.4"')} New workout</button>
      <div style="height:12px"></div>
      ${all.length ? '' : '<div class="card muted">No saved workouts yet. Tap <b>New workout</b>, or use <b>Save as my workout</b> on a generated one.</div>'}
      <div id="cwList"></div>`);
    const box = $('#cwList');
    all.forEach((w) => {
      const c = document.createElement('div');
      c.className = 'card cw-item';
      const names = w.items.slice(0, 5).map((it) => (EX[it.ex] ? EX[it.ex].name : it.ex)).join(' · ') + (w.items.length > 5 ? ' …' : '');
      c.innerHTML = `<div class="row"><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px">${esc(w.name)}</div>
          <div class="small muted">${w.items.length} exercises × ${w.rounds} ${w.rounds === 1 ? 'round' : 'rounds'} · ${fmtMin(durationOf(w, api))}</div>
          <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${names}</div></div></div>
        <div class="row" style="margin-top:10px;gap:8px">
          <button class="btn primary" data-act="start" style="flex:1">${ICON.play.replace('<svg', '<svg fill="currentColor"')} Start</button>
          <button class="btn ghost" data-act="edit">Edit</button>
          <button class="btn ghost" data-act="dup">Copy</button>
          <button class="btn ghost" data-act="del" aria-label="Delete">${ICON.close}</button></div>`;
      c.querySelector('[data-act=start]').onclick = () => {
        if (!w.items.length) return toast('Add some exercises first');
        api.startPlayer(Generator.customPlan(w, api.S.timing));
      };
      c.querySelector('[data-act=edit]').onclick = () => { editing = JSON.parse(JSON.stringify(w)); api.rerender(); };
      c.querySelector('[data-act=dup]').onclick = () => { const cp = JSON.parse(JSON.stringify(w)); cp.id = newId(); cp.name = w.name + ' (copy)'; all.push(cp); save(); api.rerender(); };
      c.querySelector('[data-act=del]').onclick = () => { if (confirm(`Delete "${w.name}"?`)) { all.splice(all.indexOf(w), 1); save(); api.rerender(); } };
      box.appendChild(c);
    });
    $('#cwNew').onclick = () => { editing = blank(api.S); api.rerender(); };
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- editor ----------
  function renderEditor(v, api) {
    const { ICON, fmt, fmtSec, fmtMin, $, $$, save, toast, S } = api;
    const w = editing;
    const step = (key, label, sub, min, max, st) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
      <div class="stepper"><button class="icon-btn" data-cstep="${key}" data-d="${-st}" data-min="${min}" data-max="${max}">${ICON.minus}</button>
      <b>${key === 'rounds' ? w[key] : fmtSec(w[key])}</b>
      <button class="icon-btn" data-cstep="${key}" data-d="${st}" data-min="${min}" data-max="${max}">${ICON.plus}</button></div></div>`;
    v.innerHTML = `
      <div class="row" style="margin-bottom:12px"><button class="btn ghost" id="cwBack">‹ Back</button><div class="spacer"></div><button class="btn primary" id="cwSave">Save</button></div>
      <div class="card">
        <p class="label">Name</p>
        <input class="search" id="cwName" value="${esc(w.name)}" maxlength="40" style="margin:0">
      </div>
      <div class="card">
        <p class="label">Exercises <span class="muted" style="text-transform:none;letter-spacing:0">· time per exercise</span></p>
        <div id="cwItems"></div>
        <button class="btn ghost block" id="cwAdd" style="margin-top:10px">${ICON.plus.replace('<svg', '<svg fill="none" stroke="currentColor" stroke-width="2.4"')} Add exercises</button>
        <p class="small muted" style="margin:8px 2px 0">One-arm / one-leg moves split their time between the two sides.</p>
      </div>
      <div class="card">
        <p class="label">Structure</p>
        ${step('rounds', 'Rounds', 'How many times to go through the list', 1, 10, 1)}
        ${step('restBetween', 'Rest between exercises', '0 = straight into the next one', 0, 120, 5)}
        ${step('roundRest', 'Rest between rounds', '', 0, 300, 15)}
        <div class="set-row"><div>Warm-up (3 min)</div><label class="switch"><input type="checkbox" id="cwWarm" ${w.warmOn ? 'checked' : ''}><span></span></label></div>
        <div class="set-row"><div>Cool-down (2 min)</div><label class="switch"><input type="checkbox" id="cwCool" ${w.coolOn ? 'checked' : ''}><span></span></label></div>
        <p class="small muted" style="margin:8px 2px 0" id="cwTotal"></p>
      </div>
      <button class="btn primary block big" id="cwStart">${ICON.play.replace('<svg', '<svg fill="currentColor"')} Save & start</button>
      <div id="cwPicker"></div>`;

    const drawItems = () => {
      const box = $('#cwItems');
      box.innerHTML = w.items.length ? '' : '<p class="small muted" style="margin:0">No exercises yet.</p>';
      w.items.forEach((it, i) => {
        const e = EX[it.ex];
        const row = document.createElement('div');
        row.className = 'cw-row';
        row.innerHTML = `<div class="cw-num">${i + 1}</div><div class="cw-name">${e.name}${e.uni ? '<span class="tag">each side</span>' : ''}</div>
          <div class="stepper sm"><button class="icon-btn" data-sec="-5">${ICON.minus}</button><b>${it.sec}s</b><button class="icon-btn" data-sec="5">${ICON.plus}</button></div>
          <div class="cw-move"><button class="icon-btn" data-mv="-1" aria-label="Move up">↑</button><button class="icon-btn" data-mv="1" aria-label="Move down">↓</button><button class="icon-btn" data-rm aria-label="Remove">${ICON.close}</button></div>`;
        $$('[data-sec]', row).forEach((b) => (b.onclick = () => { it.sec = Math.max(10, Math.min(180, it.sec + +b.dataset.sec)); drawItems(); }));
        $$('[data-mv]', row).forEach((b) => (b.onclick = () => { const j = i + +b.dataset.mv; if (j < 0 || j >= w.items.length) return; [w.items[i], w.items[j]] = [w.items[j], w.items[i]]; drawItems(); }));
        row.querySelector('[data-rm]').onclick = () => { w.items.splice(i, 1); drawItems(); };
        row.querySelector('.cw-name').onclick = () => api.openSheet(it.ex);
        box.appendChild(row);
      });
      const tot = durationOf(w, api);
      $('#cwTotal').textContent = w.items.length ? `Total: ${fmtMin(tot)} (${fmt(tot)}) · ${w.items.length * w.rounds} exercise blocks` : '';
    };
    drawItems();

    $$('[data-cstep]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.cstep;
      w[k] = Math.max(+b.dataset.min, Math.min(+b.dataset.max, w[k] + +b.dataset.d));
      b.parentElement.querySelector('b').textContent = k === 'rounds' ? w[k] : fmtSec(w[k]);
      drawItems();
    }));
    $('#cwWarm').onchange = (e) => { w.warmOn = e.target.checked; drawItems(); };
    $('#cwCool').onchange = (e) => { w.coolOn = e.target.checked; drawItems(); };
    $('#cwName').oninput = (e) => { w.name = e.target.value || 'My workout'; };
    const commit = () => {
      const all = list(api);
      const k = all.findIndex((x) => x.id === w.id);
      if (k >= 0) all[k] = JSON.parse(JSON.stringify(w)); else all.push(JSON.parse(JSON.stringify(w)));
      save();
    };
    $('#cwSave').onclick = () => { if (!w.items.length) return toast('Add some exercises first'); commit(); editing = null; toast('Saved'); api.rerender(); };
    $('#cwBack').onclick = () => { editing = null; api.rerender(); };
    $('#cwStart').onclick = () => { if (!w.items.length) return toast('Add some exercises first'); commit(); const plan = Generator.customPlan(w, S.timing); editing = null; api.rerender(); api.startPlayer(plan); };
    $('#cwAdd').onclick = () => openPicker(api, () => drawItems());
  }

  // ---------- exercise picker (sheet) ----------
  function openPicker(api, done) {
    const { $, $$, S, toast, ICON } = api;
    const sh = $('#sheet');
    const cats = ['all', 'squat', 'hinge', 'lunge', 'push', 'pull', 'arms', 'core', 'total', 'ballistic', 'warmup', 'stretch', 'recovery'];
    sh.innerHTML = `<div class="sheet-body" role="dialog" aria-label="Add exercises">
      <div class="grab"></div>
      <div class="row"><h2 style="font-size:20px">Add exercises</h2><div class="spacer"></div><button class="btn primary" id="pkDone">Done</button></div>
      <input class="search" type="search" placeholder="Search…" value="${pickerQuery}" style="margin-top:12px">
      <div class="chips">${cats.map((c) => `<button class="chip ${c === pickerCat ? 'on' : ''}" data-c="${c}">${c === 'all' ? 'All' : CAT_LABEL[c]}</button>`).join('')}</div>
      <div class="small muted" id="pkCount" style="margin:8px 2px"></div>
      <div class="ex-list" id="pkList"></div></div>`;
    sh.hidden = false;
    const close = () => { sh.hidden = true; sh.innerHTML = ''; done(); };
    let added = 0;
    const draw = () => {
      const q = pickerQuery.trim().toLowerCase();
      const items = EXERCISES.filter((e) => (pickerCat === 'all' || e.cat === pickerCat) && (!q || [e.name, e.muscles.join(' ')].join(' ').toLowerCase().includes(q)));
      $('#pkCount', sh).textContent = `${items.length} exercises · tap + to add${added ? ` · ${added} added` : ''}`;
      const box = $('#pkList', sh); box.innerHTML = '';
      items.forEach((e) => {
        const add = () => { editing.items.push({ ex: e.id, sec: S.timing.work }); added++; toast(`Added ${e.name}`); draw(); };
        const row = api.exItem(e.id, undefined, { onSwap: add });
        row.querySelector('.info').onclick = add; row.querySelector('.thumb').onclick = add;
        const btn = row.querySelector('.icon-btn:last-child');
        if (btn) { btn.innerHTML = ICON.plus.replace('<svg', '<svg fill="none" stroke="currentColor" stroke-width="2.4"'); btn.setAttribute('aria-label', 'Add'); }
        const n = editing.items.filter((it) => it.ex === e.id).length;
        if (n) row.classList.add('picked');
        box.appendChild(row);
      });
    };
    $('.search', sh).oninput = (e) => { pickerQuery = e.target.value; draw(); };
    $$('.chip[data-c]', sh).forEach((c) => (c.onclick = () => { pickerCat = c.dataset.c; $$('.chip[data-c]', sh).forEach((x) => x.classList.toggle('on', x === c)); draw(); }));
    $('#pkDone', sh).onclick = close;
    sh.onclick = (ev) => { if (ev.target === sh) close(); };
    draw();
  }

  function render(v, api) {
    if (editing) renderEditor(v, api); else renderList(v, api);
  }

  // Start editing a copy of a generated workout
  function fromPlan(plan, api) {
    editing = blank(api.S);
    editing.name = `Workout ${new Date().toLocaleDateString()}`;
    editing.items = plan.main.map((ex) => ({ ex, sec: plan.timing.work }));
    editing.rounds = 1;
    editing.restBetween = 0; editing.roundRest = 0;
    // keep the generated rests: insert them as "rest between exercises" is not per item, so use the closest equivalent
    editing.restBetween = plan.timing.restEvery === 1 ? plan.timing.rest : 0;
  }

  global.Custom = { render, fromPlan, isEditing: () => !!editing };
})(window);
