/* Twin Signal client: thin. All game state lives on the server; this file renders it. */
const S = {
  screen: 'title', started: false, roleSplash: null, code: null, mode: '4p', you: null, players: [], lobby: [], mission: null, phase: 'lobby',
  ends: 0, gauges: null, avg: null, knobs: [2, 2], chat: [], round: null, roundNo: 0, wins: 0, log: [],
  result: null, meetEv: null, meetMission: null, noise: 'LOW', votes: null, sel: null, retests: [], burn: null,
  nerd: null, nerdPending: false, nerdFrom: null, nerdLink: true, energy: 0, pairEnergy: { 0: 1, 1: 1, 2: 1, 3: 1 }, tokens: 0, err: '', testCard: 1,
  nameDraft: '', codeDraft: '', variant: 'story', daily: '', canRematch: false, q: null, hq: null, summary: null,
  races: {}, ov: null, lab: null, board: null, rank: 0, alibis: {}, streak: 0, bestStreak: 0, hidden: null, best: false, bellBroken: false, autoStartSolo: false,
};
try { const inv = new URLSearchParams(location.search).get('room'); if (inv) S.codeDraft = inv.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); } catch (e) {}
const $ = id => document.getElementById(id);
const stage = $('stage');
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo');

/* ---------------------------------------------------------------- scaling + settings */
function fit() {
  const vw = (window.visualViewport && visualViewport.width) || innerWidth, vh = (window.visualViewport && visualViewport.height) || innerHeight;
  const s = Math.min(vw / 1280, (vh - 32) / 720);
  $('wrap').style.transform = `translate(${-640 * s}px, ${-360 * s}px) scale(${s})`;
}
addEventListener('resize', fit); if (window.visualViewport) visualViewport.addEventListener('resize', fit); fit();

let reduced = false;
try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('ts-rm') === '1'; } catch (e) {}
function applySettings() {
  $('wrap').classList.toggle('rm', reduced);
  $('b-snd').textContent = Snd.muted ? 'SOUND OFF' : 'SOUND ON';
  $('b-snd').setAttribute('aria-pressed', String(!Snd.muted));
  $('b-rm').textContent = reduced ? 'MOTION OFF' : 'MOTION ON';
  $('b-rm').setAttribute('aria-pressed', String(reduced));
}
$('b-snd').onclick = () => { Snd.unlock(); Snd.setMuted(!Snd.muted); applySettings(); syncHum(); };
$('b-rm').onclick = () => { reduced = !reduced; try { localStorage.setItem('ts-rm', reduced ? '1' : '0'); } catch (e) {} applySettings(); };
applySettings();

/* ---------------------------------------------------------------- network */
let ws = null, queue = [];
function send(msg) {
  if (DEMO) return;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); else queue.push(msg);
}
function connect() {
  if (DEMO) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => { queue.forEach(m => ws.send(JSON.stringify(m))); queue = []; };
  ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  ws.onclose = () => { if (S.code) { S.err = 'Connection lost. Reload to rejoin.'; toast('CONNECTION LOST'); } };
}

/* ---------------------------------------------------------------- state from server */
function screenFor(phase) {
  if (phase === 'brief' || phase === 'lock' || phase === 'drift') return 'brief';
  if (phase === 'run' || phase === 'debrief') return 'run';
  if (phase === 'meeting') return 'meeting';
  return S.screen;
}
function go(screen) {
  if (S.screen === screen) return;
  S.screen = screen; S.fresh = true;
  if (screen === 'meeting') Snd.siren();
}
function toast(t) {
  const el = $('toast'); el.textContent = t;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.classList.remove('show'); el.style.display = 'none'; }, 2200);
  $('live').textContent = t;
}
function shake() { if (reduced) return; stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

function onMsg(m) {
  switch (m.type) {
    case 'error': S.err = m.msg; toast(m.msg.toUpperCase().slice(0, 40)); break;
    case 'room': {
      const wasStarted = S.started;
      S.started = !!m.started;
      S.code = m.code; S.mode = m.mode; S.you = m.you; S.players = m.players; S.lobby = m.lobby;
      S.energy = m.energy; if (m.pair_energy) S.pairEnergy = m.pair_energy; S.tokens = m.tokens; S.wrong = m.wrong_burns; S.maxWrong = m.max_wrong || (m.mode === '8p' ? 3 : 2);
      S.variant = m.variant || 'story'; S.daily = m.daily || ''; S.canRematch = !!m.can_rematch;
      if (!m.started && S.screen !== 'title') resetGame();
      if (m.mission) S.mission = m.mission;
      if (m.you && m.you.knobs) S.knobs = m.you.knobs;
      S.err = '';
      if (S.autoStartSolo && S.you && S.you.host && !m.started) {
        S.autoStartSolo = false;
        send({ type: 'start' });
      }
      if (m.started && !wasStarted && m.you && !m.you.spectator && (!m.mission || m.mission.n === 1)) {
        openRoleSplash();
      }
      if (m.started && S.screen === 'title') go(screenFor(m.phase) === S.screen ? 'brief' : screenFor(m.phase));
      break;
    }
    case 'ready':
      m.players.forEach(p => { const q = S.players.find(x => x.seat === p.seat); if (q) { q.ready = p.ready; q.voted = p.voted; } });
      render();
      break;
    case 'phase': {
      const prev = S.phase;
      S.phase = m.name; S.ends = Date.now() + m.ends_in * 1000; if (m.mission) S.mission = m.mission;
      if (m.name === 'lock') { S.log = []; S.round = null; S.roundNo = 0; S.wins = 0; S.result = null; S.chat = S.chat.filter(c => c.scope === 'meeting' || c.scope === 'mole'); Snd.lock(); S.bellBroken = false; }
      if (m.name === 'brief') { S.log = []; S.round = null; S.roundNo = 0; S.wins = 0; S.result = null; S.sel = null; S.burn = null; S.fresh = true; S.nerdPending = false; S.best = false; S.hq = null; S.streak = 0; S._driftFlash = false; S._prevKnobs = [...S.knobs]; S.bellBroken = false; }
      if (m.name === 'drift') {
        Snd.drift(); $('live').textContent = 'Link drift: one knob moved a snap. Recalibrate or retune.';
        S._driftFlash = true;
        if (S._prevKnobs) {
          if (S._prevKnobs[0] !== S.knobs[0]) S._driftMovedSlot = 0;
          else if (S._prevKnobs[1] !== S.knobs[1]) S._driftMovedSlot = 1;
          else S._driftMovedSlot = 0;
        } else {
          S._driftMovedSlot = 0;
        }
        setTimeout(() => { S._driftFlash = false; render(); }, 1200);
      }
      if (m.name === 'meeting') { S.sel = null; S.myVote = null; S.retests = []; S.chat = S.chat.filter(c => c.scope === 'mole'); S.votes = null; S.burn = null; S.alibis = {}; }
      if (m.name === 'finale') { S.nerdPending = true; }
      if (m.name === 'brief' || m.name === 'drift' || m.name === 'lock' || m.name === 'run' || m.name === 'debrief' || m.name === 'meeting') go(screenFor(m.name));
      if (m.name === 'brief' && prev !== 'brief') go('brief');
      if (m.name === 'debrief') S.fresh = false;
      break;
    }
    case 'gauges': {
      const wasAbove = S.avg != null && S.avg > 0.75 + 1e-9;
      S.gauges = m.v; S.avg = m.avg; S.drift = m.drift; S.hidden = m.hidden;
      const nowAbove = S.avg != null && S.avg > 0.75 + 1e-9;
      if (!wasAbove && nowAbove) {
        S._avgPulse = Date.now() + 1800;
        setTimeout(() => { S._avgPulse = 0; render(); }, 1850);
      }
      if (m.best && !S.best && S.phase === 'brief') { Snd.lockon(); toast('LOCKED ON · QUANTUM MAX'); }
      S.best = !!m.best; break;
    }
    case 'quota': S.q = m; break;
    case 'alibi': S.alibis[m.seat] = m; Snd.click(); break;
    case 'bell': { const e = (S.meetEv || []).find(x => x.pair === m.pair); if (e) { e.llr = m.llr; e.meter = m.meter || m.llr; } break; }
    case 'summary': S.summary = m; $('b-case').style.display = ''; $('b-case').classList.add('hot'); toast('CASE FILE READY'); break;
    case 'leaderboard': S.board = { daily: m.daily, endless: m.endless }; if (m.rank) { S.rank = m.rank; S.rankBoard = m.board; } break;
    case 'chat':
      if (m.typewriter && m.from === 'HQ') { S.hq = { text: m.text, t0: Date.now(), done: false, dismissed: false }; break; }
      S.chat.push({ t: Date.now(), seat: m.seat, from: m.from, text: m.text, scope: S.phase === 'meeting' || S.phase === 'reveal' ? 'meeting' : m.scope });
      if (S.chat.length > 40) S.chat.shift();
      Snd.click();
      break;
    case 'round':
      S.round = m; S.roundNo = m.i + 1; S.wins = m.wins; S.log[m.i] = m.win ? 1 : 2;
      if (m.streak < S.streak && S.streak >= 6) Snd.streakBreak();
      S.streak = m.streak; S.bestStreak = m.best;
      if ([3, 5, 8, 12, 16, 20, 30].includes(m.streak)) Snd.streak(m.streak);
      if (S.roundNo >= 16 && !S.bellBroken && (S.wins / S.roundNo >= 0.76)) {
        S.bellBroken = true;
        Snd.lockon();
        toast('⚡ BELL LIMIT BROKEN · 85.4% ACTIVE');
      }
      break;
    case 'result':
      S.result = m; S.wins = m.wins; S.races[m.mission] = m.race;
      if (m.passed) Snd.win(); else Snd.fail();
      for (let i = 0; i < m.stars; i++) setTimeout(() => Snd.star(i), 500);
      break;
    case 'meeting':
      S.meetEv = m.pairs; S.meetMission = m.mission; S.noise = m.noise; S.energy = m.energy; if (m.pair_energy) S.pairEnergy = m.pair_energy; break;
    case 'votes': S.votes = m; break;
    case 'retest':
      S.retests.push(m); S.energy = m.energy; if (m.pair_energy) S.pairEnergy = m.pair_energy;
      S._flashPair = m.pair;
      setTimeout(() => { if (S._flashPair === m.pair) { S._flashPair = null; render(); } }, 900);
      break;
    case 'burn':
      S.burn = m; S.sel = null; go('reveal'); S.fresh = true; shake(); Snd.burn(); break;
    case 'toast': toast(m.text); break;
    case 'nerd_pending': S.nerdPending = true; break;
    case 'nerd': S.nerd = m; S.nerdPending = false; break;
  }
  render();
}

let roleSplashTimeout = null;
function openRoleSplash() {
  if (!S.you) return;
  const isMole = S.you.role === 'mole';
  S.roleSplash = { active: true, t0: Date.now(), expires: Date.now() + 3800 };
  Snd.unlock();
  if (isMole) Snd.roleMole(); else Snd.roleAgent();
  if (roleSplashTimeout) clearTimeout(roleSplashTimeout);
  roleSplashTimeout = setTimeout(() => {
    if (S.roleSplash && S.roleSplash.active) {
      S.roleSplash = null;
      render();
    }
  }, 3800);
}
function closeRoleSplash() {
  if (roleSplashTimeout) { clearTimeout(roleSplashTimeout); roleSplashTimeout = null; }
  if (S.roleSplash) { S.roleSplash = null; render(); }
}

function resetGame() {
  if (roleSplashTimeout) { clearTimeout(roleSplashTimeout); roleSplashTimeout = null; }
  Object.assign(S, { screen: 'title', started: false, roleSplash: null, phase: 'lobby', mission: null, gauges: null, avg: null, chat: [], round: null, roundNo: 0, wins: 0,
    log: [], result: null, meetEv: null, votes: null, sel: null, retests: [], burn: null, nerd: null, nerdPending: false,
    pairEnergy: { 0: 1, 1: 1, 2: 1, 3: 1 },
    q: null, hq: null, summary: null, races: {}, ov: null, rank: 0, alibis: {}, streak: 0, best: false, fresh: true, bellBroken: false, autoStartSolo: false });
  $('b-case').style.display = 'none'; $('b-case').classList.remove('hot');
}
function openOv(k, extra) {
  S.ov = { k, ...(extra || {}) };
  if (k === 'lab' && !S.lab) S.lab = labNew();
  if (k === 'scores') { fetch('/api/leaderboard').then(r => r.json()).then(b => { S.board = b; render(); }).catch(() => {}); }
  if (k === 'case') $('b-case').classList.remove('hot');
  render();
}
document.querySelectorAll('#bar [data-top]').forEach(b => { b.onclick = () => { Snd.unlock(); Snd.click(); openOv(b.dataset.top); }; });
addEventListener('keydown', e => {
  if (S.roleSplash && S.roleSplash.active && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    closeRoleSplash();
    return;
  }
  if (e.key === 'Escape' && S.ov) { S.ov = null; render(); }
});

/* ---------------------------------------------------------------- render */
let raf = 0;
function render() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

function preserveInputs(fn) {
  const a = document.activeElement;
  const keep = a && a.tagName === 'INPUT' ? { id: a.id, v: a.value, s: a.selectionStart, e: a.selectionEnd } : null;
  const drafts = {};
  stage.querySelectorAll('input').forEach(i => { if (i.id) drafts[i.id] = i.value; });
  fn();
  stage.querySelectorAll('input').forEach(i => { if (i.id && drafts[i.id] && !i.value) i.value = drafts[i.id]; });
  if (keep) { const el = $(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  const f = S.focusKnob;
  if (f != null) { const k = stage.querySelector(`.knob[data-slot="${f}"]`); if (k) k.focus(); }
}

function draw() {
  const scr = S.screen;
  if (scr === 'run') {
    if (!stage.querySelector('#r-cells') || S.fresh) { stage.innerHTML = tplRun(S); S.fresh = false; }
    runUpdate(S, stage);
  } else {
    preserveInputs(() => {
      stage.innerHTML = scr === 'title' ? tplTitle(S) : scr === 'brief' ? tplBrief(S) : scr === 'meeting' ? tplMeeting(S)
        : scr === 'reveal' ? tplReveal(S) : tplNerd(S);
    });
    const log = $('chat-log'); if (log) log.scrollTop = log.scrollHeight;
  }
  const ov = overlayHtml(S);
  if (ov !== drawOv.last) {
    const was = drawOv.last; drawOv.last = ov; $('ov').innerHTML = ov;
    if (ov && !was) { const c = $('ov-close'); if (c) c.focus(); }
    if (!ov && was && drawOv.opener) { try { drawOv.opener.focus(); } catch (e) {} }
  }
  const splashHtml = (S.roleSplash && S.roleSplash.active) ? roleSplashHtml(S) : '';
  if (splashHtml !== drawSplash.last) {
    drawSplash.last = splashHtml;
    let el = $('role-ov');
    if (!el) {
      el = document.createElement('div');
      el.id = 'role-ov';
      $('wrap').appendChild(el);
      el.addEventListener('click', onActClick);
    }
    el.innerHTML = splashHtml;
  }
  syncHum();
}
const drawOv = { last: '' };
const drawSplash = { last: '' };

let humOn = false;
function syncHum() {
  const want = !Snd.muted && S.screen === 'brief' && (S.phase === 'brief' || S.phase === 'drift') && !!S.gauges;
  if (want && !humOn) { Snd.unlock(); Snd.humStart(); humOn = true; }
  if (!want && humOn) { Snd.humStop(); humOn = false; }
  if (want) Snd.humPitch(S.avg != null ? S.avg : 0.75);
}

setInterval(() => {   // countdown text and the preview card
  stage.querySelectorAll('[data-timer]').forEach(el => {
    const t = Math.max(0, Math.ceil((+el.dataset.timer - Date.now()) / 1000));
    el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  });
}, 250);
setInterval(() => { if (S.screen === 'brief' && S.phase === 'brief') { S.testCard = S.testCard === 1 ? 0 : 1; render(); } }, 2600);
setInterval(() => {   // heartbeat when the quota is close
  if (nearQuota(S)) Snd.thump();
}, 900);
function nearQuota(S) {
  if (!(S.screen === 'run' && S.phase === 'run' && S.mission && S.roundNo >= S.mission.rounds * 0.6)) return false;
  const quota = (S.q && S.q.quota) || S.mission.quota;
  const proj = S.wins / S.roundNo * S.mission.rounds;
  return Math.abs(proj - quota) < 6;
}
setInterval(() => {   // HQ typewriter
  const h = S.hq; if (!h || h.dismissed) return;
  const n = Math.min(h.text.length, Math.floor((Date.now() - h.t0) / 28));
  const el = $('hq-t'); if (el && el.dataset.n !== String(n)) { el.textContent = h.text.slice(0, n); el.dataset.n = String(n); if (n % 4 === 0 && n < h.text.length) Snd.tick(); }
  if (n >= h.text.length && !h.done) { h.done = true; h.doneAt = Date.now(); }
  if (h.done && Date.now() - h.doneAt > 9000) { h.dismissed = true; render(); }
}, 40);

/* ---------------------------------------------------------------- input */
function updateKnobDom(slot, pos) {
  const k = stage.querySelector(`.knob[data-slot="${slot}"]`);
  if (!k) return;
  k.setAttribute('aria-valuenow', pos + 1);
  k.setAttribute('aria-valuetext', `snap ${pos + 1} of 5`);
  const snapSpan = k.querySelector('.knob-snap-label');
  if (snapSpan) snapSpan.textContent = `SNAP ${pos + 1} OF 5`;
  const needle = k.querySelector('.knob-needle');
  if (needle && typeof TICKS !== 'undefined') needle.style.transform = `rotate(${90 - TICKS[pos]}deg)`;
  k.querySelectorAll('.knob-tick').forEach(t => {
    const idx = +t.dataset.idx;
    if (idx === pos) {
      t.setAttribute('stroke', '#556B2F');
      t.setAttribute('stroke-width', '3');
      t.classList.add('knob-act-tick');
    } else {
      t.setAttribute('stroke', '#8A8A72');
      t.setAttribute('stroke-width', '2');
      t.classList.remove('knob-act-tick');
    }
  });
}
function setKnob(slot, pos) {
  pos = Math.max(0, Math.min(4, pos));
  if (S.knobs[slot] === pos) return;
  S.knobs[slot] = pos; Snd.knob(); send({ type: 'knob', slot, pos });
  updateKnobDom(slot, pos);
  if (DEMO) return;
  // optimistic: the server re-sends the true gauges right away
  render();
}
function angleToPos(ev, el) {
  const svg = el.querySelector('svg').getBoundingClientRect();
  const x = ev.clientX - (svg.left + svg.width / 2), y = ev.clientY - (svg.top + svg.height / 2);
  const a = Math.atan2(-y, x) * 180 / Math.PI;
  let t = ((210 - a) % 360 + 360) % 360;
  if (t > 240) t = (t - 240 > 360 - t) ? 0 : 240;
  return Math.round(t / 60);
}
let dragging = null;
stage.addEventListener('pointerdown', e => {
  const k = e.target.closest('.knob'); if (!k) return;
  Snd.unlock(); dragging = k; S.focusKnob = +k.dataset.slot;
  k.classList.add('is-drag');
  setKnob(+k.dataset.slot, angleToPos(e, k));
});
addEventListener('pointermove', e => {
  if (dragging) {
    const k = stage.querySelector(`.knob[data-slot="${dragging.dataset.slot}"]`) || dragging;
    k.classList.add('is-drag');
    setKnob(+k.dataset.slot, angleToPos(e, k));
  }
});
addEventListener('pointerup', () => {
  if (dragging) {
    stage.querySelectorAll('.knob.is-drag').forEach(el => el.classList.remove('is-drag'));
    dragging = null;
  }
});
addEventListener('pointercancel', () => {
  if (dragging) {
    stage.querySelectorAll('.knob.is-drag').forEach(el => el.classList.remove('is-drag'));
    dragging = null;
  }
});
stage.addEventListener('keydown', e => {
  const k = e.target.closest && e.target.closest('.knob');
  if (k) {
    const slot = +k.dataset.slot, cur = S.knobs[slot];
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); S.focusKnob = slot; setKnob(slot, cur + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); S.focusKnob = slot; setKnob(slot, cur - 1); }
    return;
  }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    if (e.target.id === 'chat-in') { const t = e.target.value.trim(); if (t) { send({ type: 'chat', text: t }); e.target.value = ''; } }
    if (e.target.id === 'mole-chat-in') { const t = e.target.value.trim(); if (t) { send({ type: 'chat', text: t, scope: 'mole' }); e.target.value = ''; } }
    if (e.target.id === 'name-in' || e.target.id === 'code-in') (S.code ? null : act('join'));
  }
});
stage.addEventListener('input', e => {
  if (e.target.id === 'name-in') S.nameDraft = e.target.value;
  if (e.target.id === 'code-in') { S.codeDraft = e.target.value.toUpperCase(); e.target.value = S.codeDraft; }
});
stage.addEventListener('focusin', e => { if (!e.target.closest('.knob')) S.focusKnob = null; });
function onActClick(e) {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  Snd.unlock(); Snd.click();
  act(b.dataset.act, b);
}
stage.addEventListener('click', onActClick);
$('ov').addEventListener('click', onActClick);

// Interactive quantum decrypt effect on title hover
const GLYPHS = ['0', '1', 'Ψ', 'Φ', '∿', '⨂', '+', 'λ'];
stage.addEventListener('mouseover', e => {
  const ch = e.target.closest('.t-char');
  if (!ch || ch.dataset.scrambling) return;
  const origHtml = ch.dataset.origHtml || ch.innerHTML;
  ch.dataset.origHtml = origHtml;
  ch.dataset.scrambling = '1';
  if (!Snd.muted) Snd.tick();
  let step = 0;
  const iv = setInterval(() => {
    step++;
    if (step < 3) {
      ch.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    } else {
      clearInterval(iv);
      ch.innerHTML = origHtml;
      delete ch.dataset.scrambling;
    }
  }, 45);
});

// Pointer scrub for race replay overlay
$('ov').addEventListener('pointermove', e => {
  const svg = e.target.closest('#race-svg');
  if (!svg) return;
  const N = +svg.dataset.n;
  const A = svg.dataset.a.split(',').map(Number);
  const B = svg.dataset.b.split(',').map(Number);
  const W = 1000, H = 300, px = 48, py = 18;
  const X = i => px + (W - px - 12) * (i / N), Y = v => H - py - (H - 2 * py) * (v / N);

  const scrubG = svg.querySelector('#race-scrub');
  const line = svg.querySelector('#race-scrub-line');
  const dotA = svg.querySelector('#race-scrub-dot-a');
  const dotB = svg.querySelector('#race-scrub-dot-b');
  const pill = svg.querySelector('#race-scrub-pill');
  const txt = svg.querySelector('#race-scrub-txt');
  if (!scrubG || !line) return;

  const rect = svg.getBoundingClientRect();
  const svgX = (e.clientX - rect.left) / rect.width * W;
  if (svgX < px || svgX > W - 12) {
    scrubG.style.display = 'none';
    return;
  }
  const r = Math.max(1, Math.min(N, Math.round(((svgX - px) / (W - px - 12)) * N)));
  const x = X(r);
  const yA = Y(A[r - 1]), yB = Y(B[r - 1]);
  scrubG.style.display = '';
  line.setAttribute('x1', x.toFixed(1));
  line.setAttribute('x2', x.toFixed(1));
  dotA.setAttribute('cx', x.toFixed(1));
  dotA.setAttribute('cy', yA.toFixed(1));
  dotB.setAttribute('cx', x.toFixed(1));
  dotB.setAttribute('cy', yB.toFixed(1));
  const pillX = Math.max(130, Math.min(W - 140, x));
  pill.setAttribute('transform', `translate(${pillX.toFixed(1)}, ${py + 4})`);
  txt.textContent = `ROUND ${r}: YOU ${A[r - 1]} · CLASSICAL ${B[r - 1]}`;
});
$('ov').addEventListener('pointerleave', e => {
  const scrubG = $('ov').querySelector('#race-scrub');
  if (scrubG) scrubG.style.display = 'none';
});

function myReady() { return S.players.find(p => S.you && p.seat === S.you.seat)?.ready; }
function act(a, b) {
  switch (a) {
    case 'solo': {
      const name = ($('name-in')?.value || S.nameDraft || 'AGENT 01').trim();
      S.nameDraft = name; S.err = '';
      S.autoStartSolo = true;
      send({ type: 'create', name, mode: '4p' });
      connectOnce(); break;
    }
    case 'create': case 'join': {
      const name = ($('name-in')?.value || S.nameDraft || '').trim();
      S.nameDraft = name; S.err = '';
      if (a === 'create') send({ type: 'create', name, mode: '4p' });
      else {
        const code = ($('code-in')?.value || S.codeDraft || '').trim().toUpperCase();
        if (!code) { S.err = 'Enter the 4-letter room code.'; render(); return; }
        send({ type: 'join', room: code, name });
      }
      connectOnce(); break;
    }
    case 'mode': send({ type: 'set_mode', mode: b.dataset.v }); break;
    case 'variant': send({ type: 'set_variant', variant: b.dataset.v }); break;
    case 'invite': {
      const url = `${location.origin}${location.pathname.replace(/index\.html$/, '')}?room=${S.code}`;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('INVITE LINK COPIED'), () => { prompt('Copy this invite link', url); });
      break;
    }
    case 'wager': send({ type: 'wager', on: !(S.q && S.q.wager) }); break;
    case 'alibi': send({ type: 'alibi' }); break;
    case 'forge': send({ type: 'forge' }); break;
    case 'jam': send({ type: 'jam', pair: +b.dataset.pair }); break;
    case 'molechat': { const el = $('mole-chat-in'); if (el && el.value.trim()) { send({ type: 'chat', text: el.value.trim(), scope: 'mole' }); el.value = ''; } break; }
    case 'hqx': if (S.hq) { S.hq.dismissed = true; render(); } break;
    case 'closerole': closeRoleSplash(); break;
    case 'close': S.ov = null; render(); break;
    case 'guide': openOv('guide'); break;
    case 'opencase': openOv('case'); break;
    case 'race': openOv('race', { mission: +(b.dataset.m || (S.result && S.result.mission)) }); break;
    case 'copycase': {
      const t = $('share-text'); if (!t) break;
      const copyBtn = b || document.querySelector('[data-act="copycase"]');
      const orig = copyBtn ? copyBtn.textContent : 'COPY';
      const onCopied = () => {
        toast('COPIED');
        if (copyBtn) {
          copyBtn.textContent = 'COPIED';
          setTimeout(() => { if (copyBtn) copyBtn.textContent = orig; }, 1200);
        }
      };
      (navigator.clipboard ? navigator.clipboard.writeText(S.summary.text) : Promise.reject()).then(onCopied, () => {
        t.select(); document.execCommand && document.execCommand('copy');
        onCopied();
      });
      break;
    }
    case 'labset': { const L = S.lab; L[b.dataset.who][+b.dataset.i] = +b.dataset.v; labTouch(L); render(); break; }
    case 'labsim': S.lab.sim = labSim(S.lab, false); render(); break;
    case 'labsimq': S.lab.simQ = labSim(S.lab, true); render(); break;
    case 'start': send({ type: 'start' }); break;
    case 'ready':
      if (b) {
        b.style.transform = 'translate(2px, 2px)';
        b.style.boxShadow = '2px 2px 0 #2C3A18';
        setTimeout(() => { if (b) { b.style.transform = ''; b.style.boxShadow = ''; } }, 140);
      }
      send({ type: 'ready', v: !myReady() });
      break;
    case 'continue': {
      send({ type: 'ready', v: true });
      const me = S.players && S.players.find(p => S.you && p.seat === S.you.seat);
      if (me) me.ready = true;
      const btn = document.querySelector('[data-act="continue"]');
      if (btn) {
        btn.textContent = 'WAITING FOR OTHERS';
        btn.className = 'btn btn-ghost';
        btn.style.border = '2px solid #556B2F';
        btn.style.background = 'transparent';
        btn.style.color = '#556B2F';
        btn.style.pointerEvents = 'none';
      }
      render();
      break;
    }
    case 'recal': send({ type: 'recalibrate' }); break;
    case 'cheat': send({ type: 'mole_choice', cheat: true }); break;
    case 'honest': send({ type: 'mole_choice', cheat: false }); break;
    case 'burn': S.sel = +b.dataset.seat; render(); break;
    case 'confirm': if (S.sel != null) { S.myVote = S.sel; send({ type: 'vote', target: S.sel }); render(); } break;
    case 'skip': S.myVote = 'skip'; send({ type: 'vote', target: null }); break;
    case 'probe': { const p = S.players.find(x => x.seat === S.sel); if (p) send({ type: 'probe', pair: p.pair }); break; }
    case 'quick': send({ type: 'chat', text: b.dataset.text }); break;
    case 'nerd': S.nerdFrom = 'mission'; S.prevScreen = S.screen; go('nerd'); render(); break;
    case 'recap': S.nerdFrom = 'result'; S.prevScreen = 'reveal'; go('nerd'); render(); break;
    case 'back':
      if (S.nerdFrom === 'final') act('again'); else { go(S.prevScreen || 'brief'); S.fresh = true; render(); }
      break;
    case 'again':
      if (S.you && S.you.host && S.canRematch) send({ type: 'rematch' });
      else toast(S.you && S.you.host ? 'FINALE STILL RUNNING' : 'WAITING FOR THE HOST TO START THE REMATCH');
      break;
    case 'linkToggle': S.nerdLink = !S.nerdLink; render(); break;
    case 'copyqiskit': {
      const copyBtn = b || document.querySelector('[data-act="copyqiskit"]');
      const orig = copyBtn ? copyBtn.textContent : 'COPY QISKIT';
      const code = `# ==============================================================================
# TWIN SIGNAL — CHSH Bell State Circuit (Qiskit 1.0+)
# Quantum Playground Track: Qollab × IonQ Hackathon
# ==============================================================================
# Bell Inequality Classical Bound: 75.0%
# Tsirelson Quantum Maximum: cos²(π/8) ≈ 85.36% (S = 2√2 ≈ 2.828)
# ==============================================================================

import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

def make_chsh_circuit(card_alice=0, card_bob=0):
    # Optimal CHSH knob settings:
    # Alice: Blue = 0, Red = π/4 (45°)
    # Bob:   Blue = π/8 (22.5°), Red = -π/8 (-22.5°)
    theta_a = 0.0 if card_alice == 0 else np.pi / 4
    theta_b = np.pi / 8 if card_bob == 0 else -np.pi / 8

    qc = QuantumCircuit(2, 2, name=f"twin_link_x{card_alice}_y{card_bob}")
    # 1. Prepare entangled Bell state |Φ+⟩ = (|00⟩ + |11⟩) / √2
    qc.h(0)
    qc.cx(0, 1)
    # 2. Basis rotations for card measurement
    qc.ry(-2 * theta_a, 0)
    qc.ry(-2 * theta_b, 1)
    # 3. Readout (doors: 0 = L, 1 = R)
    qc.measure([0, 1], [0, 1])
    return qc

sim = AerSimulator()
qc = make_chsh_circuit(card_alice=0, card_bob=0)
counts = sim.run(qc, shots=1000).result().get_counts()
print("CHSH Counts:", counts)
print(qc.draw(output='text'))
`;
      const onCopied = () => {
        toast('QISKIT SCRIPT COPIED');
        if (copyBtn) {
          copyBtn.textContent = 'COPIED';
          setTimeout(() => { if (copyBtn) copyBtn.textContent = orig; }, 1200);
        }
      };
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(onCopied, () => {
        prompt('Copy Qiskit Circuit:', code);
        onCopied();
      });
      break;
    }
    case 'copyqasm': {
      const copyBtn = b || document.querySelector('[data-act="copyqasm"]');
      const orig = copyBtn ? copyBtn.textContent : 'COPY QASM';
      const qasm = `// ==============================================================================
// TWIN SIGNAL — OpenQASM 2.0 Bell State CHSH Circuit
// Qollab × IonQ Hackathon
// Optimal Basis Rotations for 85.36% Quantum Win Rate
// ==============================================================================
OPENQASM 2.0;
include "qelib1.inc";

qreg q[2];
creg c[2];

// 1. Entangled pair generation: |Phi+> = (|00> + |11>) / sqrt(2)
h q[0];
cx q[0], q[1];

// 2. CHSH Measurement Rotations: Ry(-2*theta)
// Alice (q0): theta = 0 rad (Blue card)
// Bob   (q1): theta = pi/8 rad (Blue card) -> Ry(-pi/4) = Ry(-0.785398)
ry(0.0) q[0];
ry(-0.785398) q[1];

// 3. Final readout
barrier q;
measure q[0] -> c[0];
measure q[1] -> c[1];
`;
      const onCopied = () => {
        toast('OPENQASM COPIED');
        if (copyBtn) {
          copyBtn.textContent = 'COPIED';
          setTimeout(() => { if (copyBtn) copyBtn.textContent = orig; }, 1200);
        }
      };
      (navigator.clipboard ? navigator.clipboard.writeText(qasm) : Promise.reject()).then(onCopied, () => {
        prompt('Copy OpenQASM Circuit:', qasm);
        onCopied();
      });
      break;
    }
  }
}
let connected = false;
function connectOnce() { if (!connected) { connected = true; connect(); } }

/* ---------------------------------------------------------------- demo states (pixel reference for the concept art) */
function demo(name) {
  const players2 = [{ seat: 0, name: 'FOX', human: true, bot: false, ready: false, pair: 0 }, { seat: 1, name: 'AVA', human: true, bot: false, ready: true, pair: 0 }];
  const players4 = ['FOX', 'WREN', 'LYNX', 'OTTER'].map((n, i) => ({ seat: i, name: n, human: true, bot: false, ready: false, pair: i >> 1, burned: false }));
  Object.assign(S, { code: 'K7QF', you: { seat: 0, is_alice: true, role: 'agent', host: true } });
  const mis = { n: 3, of: 3, name: 'TWIN LINK ONLINE', rounds: 200, quota: 160, id: 2 };
  if (name === 'title') { S.code = null; S.you = null; S.screen = 'title'; }
  if (name === 'brief') {
    Object.assign(S, { screen: 'brief', phase: 'brief', players: players2, mission: mis, gauges: [0.71, 0.86, 0.88, 0.91], avg: 0.84, knobs: [1, 3], testCard: 1, ends: Date.now() + 38000,
      chat: [{ seat: 1, from: 'AVA', text: 'blue-blue is dragging us down' }, { seat: 0, from: 'FOX', text: 'moving blue to snap 2' }, { seat: 1, from: 'AVA', text: 'red-red jumped, keep it' }] });
  }
  if (name === 'run') {
    const log = []; let w = 0;
    for (let i = 0; i < 112; i++) { const miss = ((i * 53 + 7) % 112) < 16; log[i] = miss ? 2 : 1; if (!miss) w++; }
    Object.assign(S, { screen: 'run', phase: 'run', players: players2, mission: mis, log, roundNo: 112, wins: w, demoGhost: 83, round: { i: 111, card: 1, door: 1, win: true, wins: w } });
    S.fresh = true;
  }
  if (name === 'meeting') {
    S.you = { seat: 0, is_alice: true, role: 'agent' };
    const hist = (a, b) => [{ m: 1, rate: a }, { m: 2, rate: b }];
    Object.assign(S, { screen: 'meeting', phase: 'meeting', players: players4, meetMission: 2, noise: 'LOW', energy: 3, sel: 2, ends: Date.now() + 24000,
      meetEv: [
        { pair: 0, names: ['FOX', 'WREN'], rate: 0.87, lo: 0.78, hi: 0.924, verdict: 'inside', p_honest_le: 0.5, p_fake_ge: 0.001, history: hist(0.85, 0.87) },
        { pair: 1, names: ['LYNX', 'OTTER'], rate: 0.78, lo: 0.78, hi: 0.924, verdict: 'edge', p_honest_le: 1 / 40, p_fake_ge: 0.25, history: hist(0.84, 0.78) }],
      votes: { voted: [0, 3], count: 2, total: 4 },
      chat: [{ seat: 3, from: 'OTTER', text: 'we tuned it exactly like mission 1', scope: 'meeting' }, { seat: 2, t: Date.now(), from: 'LYNX', text: '78 is not far off. maybe noise got us', scope: 'meeting' },
        { seat: 1, from: 'WREN', text: 'you hit 84 in mission 1, now 78?', scope: 'meeting' }, { seat: 0, from: 'FOX', text: 'retest pair 2 before we vote?', scope: 'meeting' }] });
    S.players[0].voted = true;
  }
  if (name === 'reveal' || name === 'reveal_b') {
    S.players = players4; S.you = { seat: 0, is_alice: true, role: 'agent' }; S.screen = 'reveal';
    S.meetEv = [{ pair: 1, p_honest_le: 1 / 40 }, { pair: 0, p_honest_le: 0.5 }];
    S.burn = name === 'reveal'
      ? { agent: 2, name: 'LYNX', was_mole: true, winner: 'crew', game_over: true, pair: 1, mission: 2, of: 4, cheats_used: 1, history: [{ m: 1, rate: 0.84, fake: false }, { m: 2, rate: 0.78, fake: true }], wrong_burns: 0 }
      : { agent: 2, name: 'LYNX', was_mole: false, winner: null, game_over: false, pair: 1, mission: 2, of: 4, wrong_burns: 1, history: [{ m: 1, rate: 0.84, fake: false }, { m: 2, rate: 0.78, fake: false }] };
  }
  if (name === 'nerd') { S.screen = 'nerd'; S.nerdFrom = 'mission'; }
  if (name === 'role_agent') {
    Object.assign(S, { code: 'K7QF', mode: '4p', variant: 'story', screen: 'brief', phase: 'brief', mission: { n: 1, of: 4, name: 'FIRST CONTACT' },
      players: players4, you: { seat: 0, is_alice: true, role: 'agent', codename: 'FOX', pair: 0, host: true } });
    S.roleSplash = { active: true, t0: Date.now(), expires: Date.now() + 999999 };
    Snd.roleAgent();
  }
  if (name === 'role_mole') {
    const players8 = ['FOX', 'WREN', 'LYNX', 'OTTER', 'HAWK', 'BADGER', 'PIKE', 'RAVEN'].map((n, i) => ({ seat: i, name: n, codename: n, human: true, bot: false, ready: false, pair: i >> 1, burned: false }));
    Object.assign(S, { code: 'M9LX', mode: '8p', variant: 'story', screen: 'brief', phase: 'brief', mission: { n: 1, of: 4, name: 'FIRST CONTACT' },
      players: players8, you: { seat: 2, is_alice: true, role: 'mole', codename: 'LYNX', pair: 1, mole_cell: [6], shadow: 3, host: false } });
    S.roleSplash = { active: true, t0: Date.now(), expires: Date.now() + 999999 };
    Snd.roleMole();
  }
  if (name === 'role_coop') {
    Object.assign(S, { code: 'D7CP', mode: '4p', variant: 'daily', screen: 'brief', phase: 'brief', mission: { n: 1, of: 5, name: 'CALIBRATION' },
      players: players4, you: { seat: 0, is_alice: true, role: 'agent', codename: 'FOX', pair: 0, host: true } });
    S.roleSplash = { active: true, t0: Date.now(), expires: Date.now() + 999999 };
    Snd.roleAgent();
  }
  S.phase = S.phase || 'brief';
}

if (DEMO) { demo(DEMO); draw(); } else { draw(); }
