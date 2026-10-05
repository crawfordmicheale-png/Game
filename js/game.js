/*
 * UI layer: state, save/load and DOM rendering.
 */
(function () {
  const CF = window.CF;
  const SAVE_KEY = 'wildbrood-save-v1';
  const MAX_CREATURES = 4;

  let state = { creatures: [], selected: null, codex: {}, tab: 'care' };

  // ------------------------------------------------------------- persistence

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable: play continues unsaved */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) state = { ...state, ...JSON.parse(raw) };
    } catch (e) {
      /* corrupt or blocked storage: start fresh */
    }
  }

  function discover(c) {
    if (!state.codex[c.formId]) state.codex[c.formId] = c.element;
  }

  // ------------------------------------------------------------------ helpers

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const selected = () => state.creatures.find((c) => c.id === state.selected);

  function toast(msg) {
    const t = $('#toast');
    const el = document.createElement('div');
    el.className = 'toast-item';
    el.textContent = msg;
    t.appendChild(el);
    while (t.children.length > 3) t.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }

  function bar(label, value, max, cls, extra = '') {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `<div class="bar-row"><span class="bar-label">${label}</span><div class="bar ${cls}"><div style="width:${pct}%"></div></div><span class="bar-val">${extra || Math.round(value)}</span></div>`;
  }

  // Two-sided meter: value in [-max, max].
  function meter(left, right, value, max, cls) {
    const pct = 50 + (Math.max(-max, Math.min(max, value)) / max) * 50;
    return `<div class="meter ${cls}"><span>${left}</span><div class="meter-track"><div class="meter-mid"></div><div class="meter-dot" style="left:${pct}%"></div></div><span>${right}</span></div>`;
  }

  // ------------------------------------------------------------------ modal

  const modalQueue = [];
  let modalOpen = false;

  function showModal(html, onMount) {
    modalQueue.push({ html, onMount });
    if (!modalOpen) nextModal();
  }

  function nextModal() {
    const m = modalQueue.shift();
    if (!m) {
      modalOpen = false;
      $('#modal').classList.add('hidden');
      render();
      return;
    }
    modalOpen = true;
    $('#modal').classList.remove('hidden');
    $('#modal-card').innerHTML = m.html;
    if (m.onMount) m.onMount($('#modal-card'));
  }

  function closeModal() {
    nextModal();
  }

  // --------------------------------------------------------------- rendering

  function render() {
    renderRoster();
    renderDetail();
    $('#hatch-btn').disabled = state.creatures.length >= MAX_CREATURES;
    $('#hatch-btn').title = state.creatures.length >= MAX_CREATURES ? `Your nest holds at most ${MAX_CREATURES} creatures.` : 'Hatch a random egg';
    $('#endday-btn').disabled = state.creatures.length === 0;
    const found = Object.keys(state.codex).length;
    $('#codex-count').textContent = `${found}/${Object.keys(CF.FORMS).length}`;
  }

  function renderRoster() {
    const r = $('#roster');
    if (!state.creatures.length) {
      r.innerHTML = '<p class="muted small">Your nest is empty.</p>';
      return;
    }
    r.innerHTML = state.creatures
      .map((c) => {
        const f = CF.FORMS[c.formId];
        const alerts = (c.event ? '❗' : '') + (c.sick ? '🤒' : '') + (CF.evolutionStatus(c).ready ? '✨' : '');
        return `<button class="roster-card ${c.id === state.selected ? 'active' : ''}" data-id="${c.id}">
          <div class="roster-art">${CF.creatureSVG(CF.specFor(c))}</div>
          <div class="roster-info">
            <strong>${esc(c.nickname)}</strong>
            <span class="small">${f.name !== c.nickname ? esc(f.name) + ' · ' : ''}${CF.STAGE_NAMES[c.stage]}</span>
            <span class="small">Day ${c.age} · ${'●'.repeat(c.ap)}${'○'.repeat(CF.AP_PER_DAY - c.ap)} ${alerts}</span>
          </div>
        </button>`;
      })
      .join('');
    r.querySelectorAll('.roster-card').forEach((b) =>
      b.addEventListener('click', () => {
        state.selected = b.dataset.id;
        save();
        render();
      })
    );
  }

  function renderDetail() {
    const d = $('#detail');
    const c = selected();
    if (!c) {
      d.innerHTML = `<div class="welcome">
        ${CF.eggSVG(false)}
        <h2>Welcome to Wildbrood</h2>
        <p>Hatch a creature, raise it, and shape what it becomes.</p>
        <p class="muted">Six hatchlings. Twelve juveniles. Twenty-four adults. Forty-eight apex forms.<br/>
        What it evolves into depends on <em>how you train it</em>, <em>how strictly you raise it</em>,
        <em>how it fights</em> and <em>how well you care for it</em>.</p>
        <button class="primary big" id="welcome-hatch">🥚 Hatch your first egg</button>
      </div>`;
      $('#welcome-hatch').addEventListener('click', hatch);
      return;
    }
    const f = CF.FORMS[c.formId];
    const el = CF.ELEMENTS[c.element];
    const n = c.needs;
    const tabs = [
      ['care', 'Care'],
      ['battle', 'Battle'],
      ['growth', 'Growth'],
      ['journal', 'Journal'],
    ];

    d.innerHTML = `
      <div class="detail-head">
        <div class="portrait ${c.sick ? 'sick' : ''}">${CF.creatureSVG(CF.specFor(c), { cls: 'bob' })}</div>
        <div class="head-info">
          <h2><span id="nick">${esc(c.nickname)}</span> <button class="icon-btn" id="rename" title="Rename">✏️</button></h2>
          <div class="form-line">${esc(f.name)} · <span class="stage-tag s${c.stage}">${CF.STAGE_NAMES[c.stage]}</span> · ${el.icon} ${el.label}</div>
          <p class="muted small">${esc(f.desc)}</p>
          <div class="small">Day ${c.age} · Actions left: <span class="ap">${'●'.repeat(c.ap)}${'○'.repeat(CF.AP_PER_DAY - c.ap)}</span>
            ${c.sick ? '<span class="badge bad">🤒 Sick</span>' : ''}</div>
          <div class="needs">
            ${bar('🍖 Fullness', n.fullness, 100, 'b-full')}
            ${bar('⚡ Energy', n.energy, 100, 'b-energy')}
            ${bar('😊 Mood', n.mood, 100, 'b-mood')}
            ${bar('🫧 Hygiene', n.hygiene, 100, 'b-hyg')}
          </div>
        </div>
      </div>
      ${
        c.event
          ? `<div class="event"><span>❗ <strong>${esc(c.nickname)}</strong> ${esc(c.event)}</span>
            <div><button id="ev-scold">Scold</button><button id="ev-indulge">Let it slide</button></div></div>`
          : ''
      }
      <nav class="tabs">${tabs.map(([id, label]) => `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</nav>
      <div class="tab-body">${renderTab(c)}</div>
      <div class="detail-foot"><button class="link danger" id="release">Release ${esc(c.nickname)} into the wild</button></div>
    `;

    d.querySelectorAll('.tab').forEach((b) =>
      b.addEventListener('click', () => {
        state.tab = b.dataset.tab;
        save();
        renderDetail();
      })
    );
    $('#rename').addEventListener('click', () => {
      const name = prompt('Name your creature:', c.nickname);
      if (name && name.trim()) {
        c.nickname = name.trim().slice(0, 20);
        save();
        render();
      }
    });
    $('#release').addEventListener('click', () => {
      if (confirm(`Release ${c.nickname}? This cannot be undone.`)) {
        state.creatures = state.creatures.filter((x) => x !== c);
        state.selected = state.creatures[0] ? state.creatures[0].id : null;
        save();
        render();
      }
    });
    if (c.event) {
      $('#ev-scold').addEventListener('click', () => {
        toast(CF.resolveEvent(c, 'scold'));
        save();
        render();
      });
      $('#ev-indulge').addEventListener('click', () => {
        toast(CF.resolveEvent(c, 'indulge'));
        save();
        render();
      });
    }
    bindTab(c);
  }

  function renderTab(c) {
    if (state.tab === 'care') {
      const card = (a) => {
        const can = CF.canDo(c, a.id);
        return `<button class="action ${a.kind}" data-action="${a.id}" ${can.ok ? '' : 'disabled'} title="${esc(can.ok ? a.desc : can.why)}">
          <span class="a-icon">${a.icon}</span><span class="a-label">${a.label}</span><span class="a-desc">${esc(a.desc)}</span></button>`;
      };
      const care = CF.ACTIONS.filter((a) => a.kind === 'care' && (a.id !== 'medicine' || c.sick));
      const train = CF.ACTIONS.filter((a) => a.kind === 'train');
      return `<h3>Care</h3><div class="actions">${care.map(card).join('')}</div>
        <h3>Training</h3><div class="actions">${train.map(card).join('')}</div>
        <p class="muted small">Each creature gets ${CF.AP_PER_DAY} actions per day. When you're done, press <strong>End Day</strong>.</p>`;
    }

    if (state.tab === 'battle') {
      const b = c.battles;
      const can = CF.canBattle(c);
      if (c.stage < 1) {
        return `<div class="locked">🔒 ${esc(can.why)}<br/><span class="muted small">Hatchlings evolve on day ${CF.EVOLUTION_GATES[1].age}.</span></div>`;
      }
      return `<p>Record: <strong>${b.wins}W</strong> / <strong>${b.losses}L</strong> · Moves used: ${b.aggressive} aggressive, ${b.tactical} tactical</p>
        <p class="muted small">Every battle costs one action and some energy. The moves you choose decide whether
        ${esc(c.nickname)} grows into an Aggressive or Tactical fighter, and they train its traits too
        (aggressive moves → Fury &amp; Might, tactical moves → Wit &amp; Guard).</p>
        <div class="tiers">${Object.entries(CF.TIERS)
          .map(
            ([id, t]) => `<button class="tier" data-tier="${id}" ${can.ok ? '' : 'disabled'}>
            <strong>${t.label}</strong><span class="small">${t.desc}</span></button>`
          )
          .join('')}</div>
        ${can.ok ? '' : `<p class="warn">${esc(can.why)}</p>`}
        <h3>Element wheel</h3>
        <p class="small wheel">${Object.entries(CF.ELEMENT_BEATS)
          .map(([a, b]) => `${CF.ELEMENTS[a].icon} ${CF.ELEMENTS[a].label} beats ${CF.ELEMENTS[b].icon} ${CF.ELEMENTS[b].label}`)
          .join('<br/>')}</p>`;
    }

    if (state.tab === 'growth') {
      const maxT = Math.max(20, ...CF.TRAITS.map((t) => c.traits[t]));
      const l = CF.leanings(c);
      const ss = CF.styleScores(c);
      const status = CF.evolutionStatus(c);
      const forecast = CF.forecastFormId(c);
      let next = '';
      if (status.final) {
        next = `<p>🏆 ${esc(c.nickname)} has reached its final form.</p>`;
      } else {
        const known = state.codex[forecast];
        next = `<div class="forecast">
          <div class="forecast-art">${CF.formSVG(forecast, c.element, { silhouette: !known })}</div>
          <div>
            <p><strong>If it evolved today:</strong> ${known ? esc(CF.FORMS[forecast].name) : '???'}</p>
            <ul class="reqs">${status.reqs.map((r) => `<li class="${r.met ? 'met' : ''}">${r.met ? '✅' : '⬜'} ${r.label} (${r.have}/${r.need})</li>`).join('')}</ul>
            <p class="muted small">Next stage decides: ${['', 'training focus + temperament', 'training focus + temperament + battle style', 'training focus + temperament + battle style + bond'][status.stage]}.</p>
          </div></div>`;
      }
      const scores = CF.traitScores(c);
      return `
        <h3>Traits <span class="muted small">— the strongest recent focus picks the body type</span></h3>
        ${CF.TRAITS.map((t) => bar(`${CF.TRAIT_INFO[t].icon} ${CF.TRAIT_INFO[t].label}${t === l.trait ? ' ★' : ''}`, c.traits[t], maxT, 'b-trait', c.traits[t].toFixed(1)).replace('class="bar b-trait"', `class="bar b-trait" style="--c:${CF.TRAIT_INFO[t].color}"`)).join('')}
        <p class="muted small">Leading focus: <strong>${CF.TRAIT_INFO[l.trait].label}</strong> (score ${scores[l.trait].toFixed(1)}). Growth since its last evolution counts double.</p>
        <h3>Leanings</h3>
        ${meter('Wild', 'Disciplined', c.discipline, 30, 'm-disc')}
        ${meter('Aggressive', 'Tactical', ss.tactical - ss.aggressive, Math.max(6, Math.abs(ss.tactical - ss.aggressive)), 'm-style')}
        ${meter('Shadow', 'Radiant', c.bond - 50, 50, 'm-bond')}
        <p class="muted small">Currently: <strong>${CF.TEMPERAMENTS[l.temperament].label}</strong>${c.stage >= 1 ? `, <strong>${CF.STYLES[l.style].label}</strong>` : ''}${c.stage >= 2 ? `, <strong>${CF.BONDS[l.bond].label}</strong>` : ''}.</p>
        <h3>Next evolution</h3>${next}
        <h3>Lineage</h3>
        <div class="lineage">${c.history
          .map((h, i) => `${i ? '<span class="arrow">→</span>' : ''}<div class="lin-step" title="${esc(h.reasons.join(' '))}">${CF.formSVG(h.formId, c.element)}<span class="small">${esc(CF.FORMS[h.formId].name)}</span><span class="small muted">Day ${h.day}</span></div>`)
          .join('')}</div>`;
    }

    // journal
    return `<ul class="journal">${c.log.map((e) => `<li><span class="muted">Day ${e.day}</span> ${esc(e.msg)}</li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul>`;
  }

  function bindTab(c) {
    document.querySelectorAll('[data-action]').forEach((b) =>
      b.addEventListener('click', () => {
        const res = CF.perform(c, b.dataset.action);
        toast(res.msg);
        save();
        render();
      })
    );
    document.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => beginBattle(c, b.dataset.tier)));
  }

  // ------------------------------------------------------------------ hatch

  function hatch() {
    if (state.creatures.length >= MAX_CREATURES) return;
    showModal(
      `<div class="hatch">
        <h2>A mysterious egg</h2>
        <div class="egg-wrap wobble" id="egg">${CF.eggSVG(false)}</div>
        <p class="muted">Tap the egg to hatch it.</p>
      </div>`,
      (root) => {
        let taps = 0;
        const egg = root.querySelector('#egg');
        egg.addEventListener('click', () => {
          taps++;
          if (taps === 1) {
            egg.innerHTML = CF.eggSVG(true);
            egg.classList.add('wobble-hard');
            return;
          }
          const c = CF.createCreature();
          state.creatures.push(c);
          state.selected = c.id;
          state.tab = 'care';
          discover(c);
          save();
          const h = CF.HATCHLINGS.find((x) => x.id === c.hatchling);
          root.innerHTML = `<div class="hatch">
            <h2>It's a ${h.name}!</h2>
            <div class="reveal">${CF.creatureSVG(CF.specFor(c), { cls: 'bob' })}</div>
            <p>${CF.ELEMENTS[h.element].icon} ${CF.ELEMENTS[h.element].label} element. ${esc(h.desc)}</p>
            <p class="muted small">Its nature is only a nudge. How you raise it decides what it becomes.</p>
            <label class="small">Name it: <input id="hatch-name" maxlength="20" placeholder="${h.name}"/></label>
            <div><button class="primary" id="hatch-ok">Welcome home</button></div>
          </div>`;
          root.querySelector('#hatch-ok').addEventListener('click', () => {
            const v = root.querySelector('#hatch-name').value.trim();
            if (v) c.nickname = v;
            save();
            closeModal();
          });
        });
      }
    );
  }

  // ----------------------------------------------------------------- battle

  function beginBattle(c, tierId) {
    const res = CF.startBattle(c, tierId);
    if (!res.ok) {
      toast(res.msg);
      return;
    }
    save();
    const battle = res.battle;
    showModal('<div id="battle"></div>', (root) => drawBattle(root, c, battle));
  }

  function fighterHTML(f, side) {
    const pct = (f.hp / f.st.maxHp) * 100;
    const el = CF.ELEMENTS[f.c.element];
    const spec = f.c.id === 'opp' ? { ...CF.FORMS[f.c.formId], element: f.c.element } : CF.specFor(f.c);
    return `<div class="fighter ${side}">
      <div class="f-name">${esc(f.c.nickname)} <span class="small">${el.icon}</span></div>
      <div class="bar b-hp ${pct < 30 ? 'low' : ''}"><div style="width:${pct}%"></div></div>
      <div class="small">${Math.ceil(f.hp)}/${f.st.maxHp} HP ${f.focused ? '🎯' : ''}${f.exposed ? '⚠️' : ''}</div>
      <div class="f-art ${side === 'foe' ? 'flip' : ''}">${CF.creatureSVG(spec)}</div>
    </div>`;
  }

  function drawBattle(root, c, battle) {
    const recent = battle.log.slice(-8);
    root.innerHTML = `<div class="battle">
      <div class="arena">${fighterHTML(battle.p, 'me')}<div class="vs">VS</div>${fighterHTML(battle.o, 'foe')}</div>
      <ul class="battle-log">${recent.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      ${
        battle.over
          ? `<div class="battle-end"><button class="primary" id="b-done">Continue</button></div>`
          : `<div class="moves">${Object.values(CF.MOVES)
              .map((m) => `<button class="move ${m.style}" data-move="${m.id}" title="${esc(m.desc)}"><span>${m.icon} ${m.name}</span><span class="small">${m.style}</span><span class="small muted">${esc(m.desc)}</span></button>`)
              .join('')}</div>
            <div class="battle-foot"><span class="small muted">This battle: ${battle.used.aggressive} aggressive · ${battle.used.tactical} tactical</span><button class="link" id="b-flee">Flee</button></div>`
      }
    </div>`;
    const log = root.querySelector('.battle-log');
    log.scrollTop = log.scrollHeight;
    root.querySelectorAll('[data-move]').forEach((b) =>
      b.addEventListener('click', () => {
        battle.choose(b.dataset.move);
        drawBattle(root, c, battle);
      })
    );
    const flee = root.querySelector('#b-flee');
    if (flee)
      flee.addEventListener('click', () => {
        battle.forfeit();
        drawBattle(root, c, battle);
      });
    const done = root.querySelector('#b-done');
    if (done)
      done.addEventListener('click', () => {
        const summary = CF.applyBattleResult(c, battle);
        save();
        root.innerHTML = `<div class="hatch"><h2>${battle.winner === 'player' ? '🏆 Victory' : '💢 Defeat'}</h2>
          <ul class="summary">${summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          <button class="primary" id="b-close">Back to the nest</button></div>`;
        root.querySelector('#b-close').addEventListener('click', closeModal);
      });
  }

  // ---------------------------------------------------------------- end day

  function endDay() {
    const notes = [];
    state.creatures.forEach((c) => {
      const res = CF.endDay(c);
      res.msgs.forEach((m) => notes.push(m));
      if (res.evolution) {
        discover(c);
        const ev = res.evolution;
        const from = CF.FORMS[ev.from];
        const to = CF.FORMS[ev.to];
        showModal(
          `<div class="hatch evolve">
            <h2>What? ${esc(from.name)} is evolving!</h2>
            <div class="evo-stage"><div class="evo-from">${CF.formSVG(ev.from, c.element)}</div><div class="evo-flash"></div><div class="evo-to">${CF.formSVG(ev.to, c.element, { cls: 'bob' })}</div></div>
            <h3>It became <span class="glow">${esc(to.name)}</span>!</h3>
            <p class="small">${CF.STAGE_NAMES[to.stage]} · ${esc(to.desc)}</p>
            <ul class="summary">${ev.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
            ${to.stage === 1 ? '<p class="small"><strong>Battles unlocked!</strong> How it fights will shape its next evolution.</p>' : ''}
            <button class="primary" id="evo-ok">Amazing!</button>
          </div>`,
          (root) => root.querySelector('#evo-ok').addEventListener('click', closeModal)
        );
      }
    });
    save();
    render();
    toast(notes.length ? `🌙 A new day dawns. ${notes.length} note${notes.length > 1 ? 's' : ''} in the journals.` : '🌙 A new day dawns. Everyone slept well.');
  }

  // ------------------------------------------------------------------ codex

  function openCodex() {
    const stages = [0, 1, 2, 3];
    const html = `<div class="codex">
      <div class="codex-head"><h2>📖 Codex</h2><button class="link" id="codex-close">Close ✕</button></div>
      <p class="muted small">Every form, addressed by how it was raised. Discover them all by raising creatures differently.</p>
      ${stages
        .map((s) => {
          const forms = CF.formsAtStage(s);
          const found = forms.filter((f) => state.codex[f.id]).length;
          return `<h3>${CF.STAGE_NAMES[s]} <span class="muted small">${found}/${forms.length}</span></h3>
            <div class="codex-grid">${forms
              .map((f) => {
                const el = state.codex[f.id];
                const tags = [f.trait && s > 0 ? CF.TRAIT_INFO[f.trait].label : null, f.temperament && CF.TEMPERAMENTS[f.temperament].label, f.style && CF.STYLES[f.style].label, f.bond && CF.BONDS[f.bond].label].filter(Boolean);
                return `<div class="codex-cell ${el ? '' : 'unknown'}" title="${el ? esc(f.desc) : 'Undiscovered'}">
                  ${CF.formSVG(f.id, el || f.element || 'wind', { silhouette: !el })}
                  <span class="small">${el ? esc(f.name) : '???'}</span>
                  <span class="tiny muted">${tags.join(' · ')}</span></div>`;
              })
              .join('')}</div>`;
        })
        .join('')}
    </div>`;
    showModal(html, (root) => root.querySelector('#codex-close').addEventListener('click', closeModal));
  }

  // ------------------------------------------------------------------- boot

  function boot() {
    load();
    if (state.selected && !selected()) state.selected = state.creatures[0] ? state.creatures[0].id : null;
    $('#hatch-btn').addEventListener('click', hatch);
    $('#endday-btn').addEventListener('click', endDay);
    $('#codex-btn').addEventListener('click', openCodex);
    $('#help-btn').addEventListener('click', () =>
      showModal(document.getElementById('help-template').innerHTML, (root) => root.querySelector('#help-close').addEventListener('click', closeModal))
    );
    render();
  }

  boot();
})();
