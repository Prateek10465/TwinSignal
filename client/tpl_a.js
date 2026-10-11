/* Twin Signal client templates, part A: shared pieces, title, briefing, run.
   Markup and numbers are taken 1:1 from the concept boards (1280x720). */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = v => Math.round(v * 100);
const barW = p => Math.max(0, Math.min(100, (p - 0.5) * 200));
const SEAT_COL = ['#556B2F', '#B8860B', '#5C6B73', '#8B5E83'];
const ROOT_L = "position: relative; width: 1280px; height: 720px; overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; background-color: #F6F4EC; background-image: radial-gradient(rgba(85,107,47,0.10) 1px, transparent 1px); background-size: 8px 8px; font-family: 'JetBrains Mono', ui-monospace, monospace; color: #262B16";
const ROOT_D = "position: relative; width: 1280px; height: 720px; overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; background-color: #262B16; background-image: radial-gradient(rgba(246,244,236,0.06) 1px, transparent 1px); background-size: 8px 8px; font-family: 'JetBrains Mono', ui-monospace, monospace; color: #F6F4EC";
const BTN_PRIMARY = "border: 0; background: #556B2F; color: #F6F4EC; box-shadow: 4px 4px 0 #2C3A18; font-family: 'Silkscreen', monospace; font-weight: 700; letter-spacing: 2px";

function frame(label, dark, left) {
  const pos = left ? 'left: 44px' : 'right: 44px';
  if (dark) return `<div style="position: absolute; inset: 10px; pointer-events: none; border: 1px solid #F6F4EC; opacity: 0.2"></div>
<div style="position: absolute; ${pos}; top: 3px; padding: 0 8px; background: #262B16; font-family: Silkscreen, monospace; font-size: 11px; letter-spacing: 2px; color: #B9B79F; pointer-events: none">${label}</div>
<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)"></div>
<div style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)"></div>`;
  return `<div style="position: absolute; inset: 10px; pointer-events: none; border: 1px solid #55583F; opacity: 0.4"></div>
<div style="position: absolute; ${pos}; top: 3px; padding: 0 8px; background: #F6F4EC; font-family: Silkscreen, monospace; font-size: 11px; letter-spacing: 2px; color: #55583F; pointer-events: none">${label}</div>
<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(50,55,30,0.05) 0px, rgba(50,55,30,0.05) 1px, transparent 1px, transparent 3px)"></div>
<div style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(70,75,30,0.2) 100%)"></div>`;
}

const sw = c => `<span style="display: inline-block; width: 8px; height: 12px; background: ${c}"></span>`;
const RED = '#D13A42', BLUE = '#4FB4FF';
const cardCol = c => (c === 1 ? RED : BLUE);

function steps(active) {
  const names = ['1 BRIEF', '2 LOCK', '3 RUN', '4 DEBRIEF'];
  return names.map((n, i) => i === active
    ? `<li aria-current="step" style="padding: 8px 14px; background: #556B2F; color: #F6F4EC; font-weight: 700">${n}</li>`
    : `<li style="padding: 7px 13px; border: 1px solid #B3B198; color: #55583F">${n}</li>`).join('');
}

function topbarL(label, mid, right) {
  return `<div style="height: 56px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; box-sizing: border-box; border-bottom: 1px solid #CDCBB5; background: rgba(246,244,236,0.92)">
<div style="display: flex; align-items: baseline; gap: 16px">
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 22px; letter-spacing: 2px; color: #556B2F">TWIN SIGNAL</span>
<span style="font-size: 12px; letter-spacing: 2px; color: #55583F">${label}</span>
</div>
${mid}
${right}
</div>`;
}

const IS_DEMO = new URLSearchParams(location.search).has('demo');   // demo pages show the concept art without the added controls

function coachHtml(S) {
  if (IS_DEMO) return '';
  const classical = S.mission && (S.mission.mode === 'classical' || S.mission.name === 'TRAINING DAY');
  let k = '', t = '';
  if (S.screen === 'brief') {
    if (S.phase === 'drift') {
      k = 'A KNOB SLIPPED';
      t = 'One setting drifted. Recalibrate with a token, or turn the knobs until the bars go green again.';
    } else if (S.phase === 'lock') {
      k = 'SETTINGS FROZEN';
      t = 'The silent run is next. You will only see your own card and the door you pick. No talking.';
    } else if (classical) {
      k = 'NO LINK YET';
      t = 'Agree a plan in chat. Without the Twin Link, 75% is the best any pair can lock in. That wall is the lesson.';
    } else {
      k = 'TUNE TOGETHER';
      t = 'Each knob is for one card colour. Grey bars = ordinary guessing. Green = the link is doing something a pre-agreed plan cannot.';
    }
  } else if (S.screen === 'run' && S.phase !== 'debrief') {
    k = 'SILENT RUN';
    t = 'Green squares are matches. Stay above the quota mark. If you beat 75%, you are watching the quantum advantage live.';
  } else if (S.screen === 'meeting') {
    k = 'READ THE SCORES';
    t = 'SOLID usually means a real Twin Link. WEAK or a sudden drop can mean a fake. Retest if unsure, then vote.';
  }
  if (!t) return '';
  return `<div class="coach fadein"><b>${k}</b>${t}</div>`;
}
const mm = n => String(n).padStart(2, '0');
const missionLabel = S => S.mission ? `MISSION ${mm(S.mission.n)} · ${S.mission.name}` : 'MISSION';
const caseNo = S => `TS-${mm(S.mission ? S.mission.n : 0)}`;

/* ---------------------------------------------------------------- room art */
function roomDefs(p, labels) {
  const lab = labels ? `
<text transform="translate(140,150) matrix(1,-0.5,0,1,0,0)" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="18" fill="#556B2F">L</text>` : '';
  const labR = labels ? `
<text transform="translate(420,150) matrix(1,0.5,0,1,0,0)" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="18" fill="#556B2F">R</text>` : '';
  return `<radialGradient id="${p}-gl" cx="50%" cy="50%" r="50%">
<stop offset="0" stop-color="#556B2F" stop-opacity="0.55"/>
<stop offset="1" stop-color="#556B2F" stop-opacity="0"/>
</radialGradient>
<g id="${p}-room" shape-rendering="crispEdges">
<polygon points="40,330 280,450 280,470 40,350" fill="#8F9078"/>
<polygon points="280,450 520,330 520,350 280,470" fill="#A4A58B"/>
<polygon points="280,210 520,330 280,450 40,330" fill="#E6E5D3"/>
<g stroke="#556B2F" stroke-opacity="0.16" stroke-width="1" fill="none">
<line x1="100" y1="360" x2="340" y2="240"/>
<line x1="160" y1="390" x2="400" y2="270"/>
<line x1="220" y1="420" x2="460" y2="300"/>
<line x1="100" y1="300" x2="340" y2="420"/>
<line x1="160" y1="270" x2="400" y2="390"/>
<line x1="220" y1="240" x2="460" y2="360"/>
</g>
<ellipse cx="250" cy="338" rx="70" ry="34" fill="url(#${p}-gl)"/>
<polygon points="40,330 280,210 280,20 40,140" fill="#D5D5BF"/>
<polygon points="280,210 520,330 520,140 280,20" fill="#E4E3D0"/>
<polygon points="40,330 280,210 280,198 40,318" fill="#B3B398"/>
<polygon points="280,210 520,330 520,318 280,198" fill="#A4A58B"/>
<polyline points="40,140 280,20 520,140" fill="none" stroke="#B3B198" stroke-width="2"/>
<polyline points="40,152 280,32" fill="none" stroke="#556B2F" stroke-opacity="0.5" stroke-width="2"/>
<polyline points="280,32 520,152" fill="none" stroke="#556B2F" stroke-opacity="0.5" stroke-width="2"/>
<line x1="280" y1="20" x2="280" y2="210" stroke="#94957D" stroke-width="2"/>

<polygon points="104,298 176,262 176,147 104,183" fill="#B3B398"/>
<polygon points="110,295 170,265 170,155 110,185" fill="#14170C"/>
<rect x="158" y="214" width="5" height="7" fill="#556B2F"/>${lab}

<polygon points="384,262 456,298 456,183 384,147" fill="#94957D"/>
<polygon points="390,265 450,295 450,185 390,155" fill="#14170C"/>
<rect x="397" y="214" width="5" height="7" fill="#556B2F"/>${labR}

<polygon points="280,292 340,320 280,348 220,320" fill="#F6F4E6" stroke="#556B2F" stroke-opacity="0.6" stroke-width="1"/>
<polygon points="220,320 280,348 280,378 220,350" fill="#CDCBB5"/>
<polygon points="280,348 340,320 340,350 280,378" fill="#B9B79F"/>

<polygon points="250,306 270,316 250,326 230,316" fill="#556B2F"/>
<polygon points="230,316 250,326 250,338 230,328" fill="#3F5122"/>
<polygon points="250,326 270,316 270,328 250,338" fill="#2C3A18"/>
</g>
<g id="${p}-agent" shape-rendering="crispEdges">
<ellipse cx="0" cy="2" rx="20" ry="7" fill="#000000" opacity="0.22"/>
<rect x="-9" y="-30" width="7" height="30" fill="#262B16"/>
<rect x="2" y="-30" width="7" height="30" fill="#262B16"/>
<rect x="-22" y="-88" width="8" height="50" fill="#2E331E"/>
<rect x="14" y="-88" width="8" height="50" fill="#2E331E"/>
<polygon points="-14,-92 14,-92 18,-24 -18,-24" fill="#232814" stroke="#3B4228" stroke-width="1"/>
<polyline points="14,-92 18,-24" fill="none" stroke="#556B2F" stroke-opacity="0.6" stroke-width="2"/>
<rect x="-8" y="-112" width="16" height="18" fill="#3B4228"/>
<rect x="-8" y="-106" width="16" height="4" fill="#000000"/>
<rect x="-5" y="-106" width="3" height="1" fill="#FFFDF6"/>
<polygon points="-20,-112 20,-112 24,-108 -24,-108" fill="#14170C"/>
<rect x="-12" y="-126" width="24" height="15" fill="#14170C"/>
<rect x="-12" y="-117" width="24" height="3" fill="#556B2F"/>
</g>`;
}
const tie = (c, o) => `<polygon points="-3,-92 3,-92 4,-66 0,-60 -4,-66" fill="${c}"${o ? ` opacity="${o}"` : ''}/>`;
const deskCard = (c) => `<g transform="translate(305,322) matrix(1,0.5,-1,0.5,0,0)">
<rect x="-9" y="-12" width="18" height="24" fill="${cardCol(c)}" stroke="#262B16" stroke-width="1.5"/>
<rect x="-3" y="-3" width="6" height="6" fill="${c === 1 ? '#FFFDF6' : '#262B16'}"/>
</g>`;
const THREAD = (d, w1, w2, blur) => `<path d="${d}" fill="none" stroke="#556B2F" stroke-width="${w1}" opacity="0.35" filter="url(#${blur})"/>
<path d="${d}" fill="none" stroke="#556B2F" stroke-width="${w2}"/>
<path d="${d}" fill="none" stroke="#262B16" stroke-width="1"/>
<path d="${d}" fill="none" stroke="#C9D79A" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round"/>`;

/* ---------------------------------------------------------------- title + lobby */
function titleActions(S) {
  const inp = "height: 44px; box-sizing: border-box; padding: 0 12px; background: #F6F4EC; border: 1px solid #B3B198; color: #262B16; font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 2px";
  const err = S.err ? `<div role="alert" style="font-size: 12px; color: #D13A42; font-weight: 700">${esc(S.err)}</div>` : '';
  if (!S.code) {
    return `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px">
<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
<button type="button" data-act="solo" class="btn btn-primary" style="height: 44px; padding: 0 18px; background: #262B16; color: #F6F4EC; border: 2px solid #556B2F; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 13px; letter-spacing: 1.5px; box-shadow: 0 2px 8px rgba(85, 107, 47, 0.25); display: flex; align-items: center; gap: 8px; cursor: pointer" title="Instant 1-click solo match with 3 AI bot agents"><span style="color: #E0B84C">⚡</span> SOLO TRAINING (1-CLICK)</button>
<button type="button" data-act="create" class="btn btn-primary" style="height: 44px; padding: 0 18px; ${BTN_PRIMARY}; font-size: 14px">CREATE ROOM</button>
<input id="code-in" type="text" maxlength="4" aria-label="Room code" placeholder="CODE" value="${esc(S.codeDraft || '')}" style="${inp}; width: 85px; text-transform: uppercase">
<button type="button" data-act="join" class="btn btn-ghost" style="height: 44px; padding: 0 16px; font-size: 14px">JOIN</button>
</div>
<input id="name-in" type="text" maxlength="8" aria-label="Your nickname" placeholder="YOUR NICKNAME" value="${esc(S.nameDraft || '')}" style="${inp}; width: 220px">
<div style="font-size: 12px; line-height: 18px; color: #262B16; text-shadow: 0 0 8px #F6F4EC, 0 0 14px #F6F4EC, 0 0 3px #F6F4EC; max-width: 480px">Your nickname is what everyone sees. Leave blank and HQ assigns a call sign. Solo training pairs you instantly with AI bots.</div>
<div style="display: flex; gap: 8px; margin-top: 2px">
<button type="button" data-act="guide" class="btn btn-ghost" style="height: 32px; padding: 0 12px; font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 1px; color: #556B2F; border: 1.5px solid #556B2F; background: #F6F4EC">HOW TO PLAY · 30-SEC GUIDE</button>
</div>
${err}
</div>`;
  }
  const host = S.you && S.you.host;
  const rows = (S.lobby || []).map(p => `<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #ECEADD; border: 1px solid #B3B198; font-size: 13px"><span style="font-weight: 700">${esc(p.name)}</span>${p.host ? `<span style="font-size: 11px; letter-spacing: 1px; color: #556B2F">HOST</span>` : ''}</div>`).join('');
  const cap = S.mode === '8p' ? 8 : 4;
  const vOk = v => host && S.mode === '4p';
  const varBtn = (v, label) => `<button type="button" ${vOk(v) ? '' : 'disabled'} data-act="variant" data-v="${v}" aria-pressed="${S.variant === v}" class="btn ${S.variant === v ? 'btn-primary' : 'btn-ghost'}" style="flex: 1; height: 34px; font-size: 12px; letter-spacing: 1px; color: ${S.variant === v ? '#F6F4EC' : '#262B16'}; background: ${S.variant === v ? '#556B2F' : 'transparent'}; border: 1px solid ${S.variant === v ? '#556B2F' : '#B3B198'}${vOk(v) ? '' : '; opacity: 0.5'}">${label}</button>`;
  const varNote = S.variant === 'endless' ? 'The link gets worse every level. Two missed quotas end the run. Climb the board.'
    : S.variant === 'daily' ? `Daily case file ${esc(S.daily)}: the same cards for every team today. Ranked.`
    : S.mode === '8p' ? 'Four missions, two Moles, and emergency meetings.' : 'Four missions, a Mole, and emergency meetings.';
  const modeBtn = (m, label) => `<button type="button" ${host ? '' : 'disabled'} data-act="mode" data-v="${m}" aria-pressed="${S.mode === m}" class="btn ${S.mode === m ? 'btn-primary' : 'btn-ghost'}" style="flex: 1; height: 38px; display: flex; align-items: center; justify-content: center; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 13px; letter-spacing: 1px; color: ${S.mode === m ? '#F6F4EC' : '#262B16'}; background: ${S.mode === m ? '#556B2F' : 'transparent'}; border: 1px solid ${S.mode === m ? '#556B2F' : '#B3B198'}">${label}</button>`;
  return `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px; padding: 16px; background: rgba(246,244,236,0.96); border: 1px solid #B3B198; box-shadow: 4px 4px 0 rgba(44,58,24,0.25)">
<div style="display: flex; align-items: baseline; gap: 14px"><span style="font-size: 12px; letter-spacing: 2px; color: #55583F">ROOM CODE</span><span aria-label="Room code ${esc(S.code)}" style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 40px; letter-spacing: 6px; color: #556B2F">${esc(S.code)}</span><button type="button" data-act="invite" class="btn btn-ghost" style="margin-left: auto; align-self: center; height: 30px; padding: 0 10px; font-size: 11px">COPY INVITE LINK</button></div>
<div style="display: flex; flex-direction: column; gap: 6px">${rows}</div>
<div style="display: flex; gap: 10px">${modeBtn('4p', '4 PLAYERS')}${modeBtn('8p', '8 PLAYERS')}</div>
${S.mode === '8p' ? '' : `<div style="display: flex; gap: 8px">${varBtn('story', 'STORY')}${varBtn('endless', 'ENDLESS')}${varBtn('daily', 'DAILY')}</div>`}
<div style="font-size: 12px; line-height: 18px; color: #55583F">${varNote} ${(S.lobby || []).length} of ${cap} seats taken. Empty seats are filled by bots, so you can play alone.</div>
<div style="display: flex; align-items: center; gap: 12px">${host
    ? `<button type="button" data-act="start" class="btn btn-primary" style="height: 44px; padding: 0 22px; ${BTN_PRIMARY}; font-size: 15px">START MISSION</button>`
    : `<span style="font-size: 13px; color: #3B4228">Waiting for the host to start…</span>`}
<button type="button" data-act="guide" class="btn btn-ghost" style="height: 44px; padding: 0 16px; font-size: 13px; margin-left: auto">HOW TO PLAY</button>
</div>
${err}
</div>`;
}

function tplTitle(S) {
  return `<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; box-sizing: border-box; background-color: #F6F4EC; background-image: radial-gradient(rgba(85,107,47,0.10) 1px, transparent 1px); background-size: 8px 8px; font-family: 'JetBrains Mono', ui-monospace, monospace; color: #262B16">

<svg viewBox="0 0 1280 720" width="1280" height="720" style="position: absolute; left: 0; top: 0; display: block" role="img" aria-label="Two isometric rooms joined by a glowing arch of light">
<defs>
${roomDefs('t', false)}
<filter id="t-blur" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="7"/>
</filter>
</defs>

<!-- Ambient Radar Grid in background centered at (620, 300) -->
<g class="ambient-radar" opacity="0.65">
  <circle cx="620" cy="300" r="100" fill="none" stroke="#556B2F" stroke-opacity="0.12" stroke-width="1" stroke-dasharray="4 6"/>
  <circle cx="620" cy="300" r="220" fill="none" stroke="#556B2F" stroke-opacity="0.09" stroke-width="1" stroke-dasharray="4 6"/>
  <circle cx="620" cy="300" r="340" fill="none" stroke="#556B2F" stroke-opacity="0.06" stroke-width="1" stroke-dasharray="4 8"/>
  <line x1="620" y1="40" x2="620" y2="560" stroke="#556B2F" stroke-opacity="0.08" stroke-width="1" stroke-dasharray="3 6"/>
  <line x1="260" y1="300" x2="980" y2="300" stroke="#556B2F" stroke-opacity="0.08" stroke-width="1" stroke-dasharray="3 6"/>
  <g class="radar-sweep" style="transform-origin: 620px 300px">
    <line x1="620" y1="300" x2="620" y2="20" stroke="#556B2F" stroke-opacity="0.25" stroke-width="1.5"/>
  </g>
</g>

<ellipse cx="280" cy="662" rx="222" ry="22" fill="#262B16" opacity="0.13"/>
<ellipse cx="1008" cy="662" rx="222" ry="22" fill="#262B16" opacity="0.13"/>
<g transform="translate(56,300) scale(0.8)">
<use href="#t-room"/>
<circle class="door-led led-red" cx="160" cy="210" r="3.5"/>
<circle class="door-led led-green" cx="380" cy="210" r="3.5"/>
<g class="card-red">${deskCard(1)}</g>
<g transform="translate(180,335) scale(0.8)">
<g class="bob-a">
<use href="#t-agent"/>
${tie('#556B2F')}
</g>
</g>
<polygon class="room-perimeter" points="280,20 520,140 520,350 280,470 40,350 40,140" fill="none" stroke="#556B2F" stroke-opacity="0.4" stroke-width="2"/>
</g>

<g transform="translate(784,300) scale(0.8)">
<use href="#t-room"/>
<circle class="door-led led-green" cx="160" cy="210" r="3.5"/>
<circle class="door-led led-red" cx="380" cy="210" r="3.5"/>
<g class="card-blue">${deskCard(0)}</g>
<g transform="translate(390,330) scale(0.8)">
<g class="bob-b">
<use href="#t-agent"/>
${tie('#FFFDF6')}
</g>
</g>
<polygon class="room-perimeter" points="280,20 520,140 520,350 280,470 40,350 40,140" fill="none" stroke="#556B2F" stroke-opacity="0.4" stroke-width="2"/>
</g>

${THREAD('M256,545 C256,380 440,300 620,300 C800,300 984,380 984,545', 12, 4, 't-blur')}
<path class="beam-forward" d="M256,545 C256,380 440,300 620,300 C800,300 984,380 984,545" fill="none" stroke="#E0B84C" stroke-width="3" stroke-dasharray="16 75" stroke-linecap="round"/>
<path class="beam-reverse" d="M256,545 C256,380 440,300 620,300 C800,300 984,380 984,545" fill="none" stroke="#8CA05A" stroke-width="2.5" stroke-dasharray="14 85" stroke-linecap="round"/>
<path class="spark-1" d="M256,545 C256,380 440,300 620,300 C800,300 984,380 984,545" fill="none" stroke="#FFFDF6" stroke-width="3.5" stroke-dasharray="6 260" stroke-linecap="round"/>
<path class="spark-2" d="M256,545 C256,380 440,300 620,300 C800,300 984,380 984,545" fill="none" stroke="#E0B84C" stroke-width="3" stroke-dasharray="8 300" stroke-linecap="round"/>

<!-- Transmitter Emitter Bases at the Desks -->
<ellipse class="desk-emitter-ring" cx="256" cy="545" rx="14" ry="7" fill="none" stroke="#E0B84C" stroke-width="2"/>
<circle cx="256" cy="545" r="3.5" fill="#E0B84C"/>
<ellipse class="desk-emitter-ring emitter-b" cx="984" cy="545" rx="14" ry="7" fill="none" stroke="#8CA05A" stroke-width="2"/>
<circle cx="984" cy="545" r="3.5" fill="#8CA05A"/>

<g fill="#262B16" shape-rendering="crispEdges">
<rect class="repeater rep-1" x="286" y="435" width="5" height="5"/>
<rect class="repeater rep-2" x="369" y="359" width="5" height="5"/>
<rect class="repeater rep-3" x="485" y="313" width="5" height="5"/>
<rect class="repeater rep-4" x="751" y="313" width="5" height="5"/>
<rect class="repeater rep-5" x="867" y="359" width="5" height="5"/>
<rect class="repeater rep-6" x="950" y="435" width="5" height="5"/>
</g>
<circle class="twin-ripple r1" cx="620" cy="300" r="14" fill="none" stroke="#556B2F" stroke-width="2"/>
<circle class="twin-ripple r2" cx="620" cy="300" r="14" fill="none" stroke="#E0B84C" stroke-width="1.5"/>
<circle class="twin-reticle" cx="620" cy="300" r="28" fill="none" stroke="#556B2F" stroke-width="1.5" stroke-dasharray="6 8"/>
<circle cx="620" cy="300" r="34" fill="url(#t-gl)"/>
<circle cx="620" cy="300" r="13" fill="#F6F4EC" stroke="#556B2F" stroke-width="3"/>
<circle class="twin-core-pip" cx="620" cy="300" r="4"/>
<text class="twin-link-txt" x="620" y="338" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="12" letter-spacing="2" fill="#556B2F">TWIN LINK</text>
</svg>

<div class="title-brand" style="position: absolute; left: 64px; top: 48px; display: flex; flex-direction: column; gap: 14px">
<div class="title-meta" style="display: flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 2px; color: #556B2F">
  <span class="beacon-pip" aria-hidden="true"></span>
  <span>QOLLAB × IONQ · GLOBAL QUANTUM HACKATHON · TRACK 02</span>
</div>
<h1 class="title-heading" style="margin: 0; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 88px; line-height: 80px; letter-spacing: 2px">
  <span class="title-word title-twin"><span class="t-char" style="--i:0">T</span><span class="t-char t-char-w" style="--i:1" aria-label="W"><svg viewBox="0 0 7 5" width="0.84em" height="0.625em" style="display:inline-block; vertical-align: -0.01em; fill: currentColor; overflow: visible" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="0" width="2" height="4"/><rect x="5" y="0" width="2" height="4"/><rect x="3" y="2" width="1" height="2"/><rect x="1" y="4" width="2" height="1"/><rect x="4" y="4" width="2" height="1"/></svg></span><span class="t-char" style="--i:2">I</span><span class="t-char" style="--i:3">N</span></span><br>
  <span class="title-word title-signal"><span class="t-char" style="--i:4">S</span><span class="t-char" style="--i:5">I</span><span class="t-char" style="--i:6">G</span><span class="t-char" style="--i:7">N</span><span class="t-char" style="--i:8">A</span><span class="t-char" style="--i:9">L</span></span>
</h1>
<div class="title-telemetry" style="display: flex; align-items: center; gap: 12px; margin-top: 2px; padding: 6px 12px; background: rgba(38,43,22,0.05); border: 1px solid rgba(85,107,47,0.3); border-radius: 2px; width: fit-content; box-shadow: 2px 2px 0 rgba(44,58,24,0.12)">
  <svg width="60" height="16" viewBox="0 0 60 16" style="overflow: visible; flex-shrink: 0" aria-hidden="true">
    <path d="M0,8 Q7.5,0 15,8 T30,8 T45,8 T60,8" fill="none" stroke="#8A8A72" stroke-width="1.5" opacity="0.4"/>
    <path class="telemetry-pulse" d="M0,8 Q7.5,0 15,8 T30,8 T45,8 T60,8" fill="none" stroke="#556B2F" stroke-width="2.5" stroke-dasharray="14 46" stroke-linecap="round"/>
  </svg>
  <div style="display: flex; flex-direction: column; gap: 1px">
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 1.5px; font-weight: 700; color: #262B16">
      CARRIER: <span style="color: #556B2F">433.92 MHz</span> · <span style="color: #556B2F">|Ψ⁺⟩ ENTANGLED</span>
    </div>
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 1px; color: #55583F">
      BELL CORRELATION CH-0/CH-1 · S = 2√2 LOCKED
    </div>
  </div>
</div>
</div>

<div style="position: absolute; left: 720px; top: 96px; width: 496px; display: flex; flex-direction: column; gap: 12px">
<div style="font-weight: 700; font-size: 26px; line-height: 32px; color: #262B16">Two agents. Two sealed rooms.<br>One rule.</div>
<div style="font-size: 13px; line-height: 20px; color: #3B4228">Beat a score limit that no classical team can break, using a link only quantum physics allows.</div>
<div id="t-actions">${titleActions(S)}</div>
</div>

<div style="position: absolute; left: 64px; bottom: 16px; font-size: 12px; letter-spacing: 1px; color: #55583F">OCT 9–11, 2026 · 2 PLAYERS · 1 ROOM CODE · IONQ SIMULATOR FINALE</div>

${frame('CASE FILE TS-00 · EYES ONLY', false)}
</div>`;
}

/* ---------------------------------------------------------------- briefing */
const TICKS = [210, 150, 90, 30, -30];
function knobSvg(pos, ring, slot) {
  const pt = (deg, r) => [50 + r * Math.cos(deg * Math.PI / 180), 50 - r * Math.sin(deg * Math.PI / 180)];
  let idle = '', act = '';
  TICKS.forEach((d, i) => {
    const [x1, y1] = pt(d, 36), [x2, y2] = pt(d, 42);
    const l = `<line class="knob-tick${i === pos ? ' knob-act-tick' : ''}" data-idx="${i}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;
    if (i === pos) act = `${l} stroke="#556B2F" stroke-width="3"/>`; else idle += `${l} stroke="#8A8A72" stroke-width="2"/>\n`;
  });
  const rot = 90 - TICKS[pos];
  const ringSvg = ring ? `<circle cx="50" cy="50" r="34" fill="none" stroke="${slot === 1 ? '#D13A42' : '#2D5B88'}" stroke-width="2.5" stroke-dasharray="4 2"/>` : '';
  return `<svg width="84" height="84" viewBox="0 0 100 100" aria-hidden="true">
<g stroke="#8A8A72" stroke-width="2">
${idle}</g>
${act}
${ringSvg}
<circle class="knob-ring" cx="50" cy="50" r="30" fill="#B9B79F" stroke="#B3B198" stroke-width="3"/>
<circle cx="50" cy="50" r="22" fill="#CDCBB5"/>
<g class="knob-needle" style="transform-origin: 50px 50px; transform: rotate(${rot}deg); transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1)">
<line x1="50" y1="50" x2="50" y2="26" stroke="#556B2F" stroke-width="5" stroke-linecap="square"/>
</g>
</svg>`;
}
function knobBox(slot, pos, label, ring, flash) {
  const name = slot === 1 ? 'RED CARD' : 'BLUE CARD';
  return `<div class="knob${ring ? ' knob-active' : ''}${flash ? ' gold-flash' : ''}" data-slot="${slot}" tabindex="0" role="slider" aria-label="${name} knob" aria-valuemin="1" aria-valuemax="5" aria-valuenow="${pos + 1}" aria-valuetext="snap ${pos + 1} of 5" style="display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100px; cursor: pointer; touch-action: none">
${knobSvg(pos, ring, slot)}
<span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #262B16${ring ? '; font-weight: 700' : ''}">${sw(slot === 1 ? RED : BLUE)}${name}</span>
<span class="knob-snap-label" style="font-size: 11px; color: #55583F">SNAP ${pos + 1} OF 5</span>
</div>`;
}

const gaugeRow = (c1, c2, p, bold) => {
  if (p == null) {
    return `<div style="display: flex; align-items: center; gap: 10px; height: 18px">
<div style="width: 112px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: #3B4228; white-space: nowrap">${sw(cardCol(c1))}${sw(cardCol(c2))}<span>${c1 ? 'RED' : 'BLUE'} · ${c2 ? 'RED' : 'BLUE'}</span></div>
<div style="position: relative; flex: 1; height: 12px; background: repeating-linear-gradient(45deg, #CDCBB5 0 4px, #DEDCCB 4px 8px)"><div style="position: absolute; left: 50%; top: -3px; bottom: -3px; width: 2px; background: #262B16"></div></div>
<div style="width: 44px; text-align: right; font-size: 12px; color: #55583F">BLACKOUT</div>
</div>`;
  }
  const good = p > 0.75 + 1e-9;
  return `<div style="display: flex; align-items: center; gap: 10px; height: 18px">
<div style="width: 112px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: #3B4228; white-space: nowrap">${sw(cardCol(c1))}${sw(cardCol(c2))}<span>${c1 ? 'RED' : 'BLUE'} · ${c2 ? 'RED' : 'BLUE'}</span></div>
<div style="position: relative; flex: 1; height: 12px; background: #DEDCCB">
<div class="bar-fill" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${barW(p)}%; background: ${good ? '#556B2F' : '#8A8A72'}"></div>
<div style="position: absolute; left: 50%; top: -3px; bottom: -3px; width: 2px; background: #262B16"></div>
</div>
<div style="width: 44px; text-align: right; font-size: 12px; color: ${good ? '#262B16' : '#55583F'}">${pct(p)}%</div>
</div>`;
};

function gaugesHtml(S) {
  const g = S.gauges || [0.75, 0.75, 0.75, 0.75];
  const alice = !S.you || S.you.is_alice !== false;
  // server order is (x=Alice card, y=Bob card); show every row as (my card, partner's card)
  const idx = (mine, theirs) => (alice ? mine * 2 + theirs : theirs * 2 + mine);
  const rows = [[1, 1], [1, 0], [0, 1], [0, 0]].map(([a, b]) => gaugeRow(a, b, g[idx(a, b)])).join('\n');
  const blind = g.some(v => v == null);
  const avg = blind ? null : (S.avg != null ? S.avg : g.reduce((s, v) => s + v, 0) / 4);
  const above = avg != null && avg > 0.75 + 1e-9;
  const pulsing = !!(S._avgPulse && Date.now() < S._avgPulse);
  const avgTxt = avg == null ? '??' : pct(avg) + '%';
  return `<div style="display: flex; align-items: baseline; justify-content: space-between">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">SYNC GAUGES · SHARED</span>
<span style="font-size: 12px; color: ${above ? '#556B2F' : '#B8860B'}; font-weight: 700">${blind ? 'ONE GAUGE BLACKED OUT · TUNE BY THEORY' : `TEAM ${avgTxt} · ${above ? '✔ WINNING ZONE (>75%)' : '⚠ UNDER QUOTA (TUNE PAST 75%)'}`}</span>
</div>
${rows}
<div style="display: flex; align-items: center; gap: 10px; height: 20px; margin-top: 4px; padding-top: 6px; border-top: 1px solid #CDCBB5">
<div class="${pulsing ? 'hb' : ''}" style="width: 112px; font-size: 12px; font-weight: 700; color: #262B16">TEAM AVG</div>
<div style="position: relative; flex: 1; height: 16px; background: #DEDCCB">
<div class="bar-fill${pulsing ? ' hbg' : ''}" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${avg == null ? 0 : barW(avg)}%; background: ${above ? '#556B2F' : '#8A8A72'}"></div>
<div style="position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: #262B16"></div>
<div style="position: absolute; left: 70.8%; top: -4px; bottom: -4px; width: 2px; background: #556B2F; box-shadow: 0 0 0 1px #F6F4EC"></div>
</div>
<div class="${pulsing ? 'hb' : ''}" style="width: 44px; text-align: right; font-size: 12px; font-weight: 700; color: ${above ? '#556B2F' : '#55583F'}">${avgTxt}</div>
</div>
<div style="display: flex; gap: 18px; padding-left: 122px; font-size: 11px; color: #55583F">
<span>WHITE LINE = 75% CLASSICAL LIMIT</span>
<span style="color: #556B2F">GREEN LINE = 85.4% QUANTUM MAX</span>
</div>`;
}

function chatLinesBrief(S) {
  const lines = (S.chat || []).filter(c => c.scope !== 'meeting' && c.scope !== 'mole').slice(-3);
  return lines.map(c => {
    const me = S.you && c.seat === S.you.seat;
    return `<div><span style="color: ${me ? '#556B2F' : '#262B16'}; font-weight: 700">${me ? 'YOU' : esc(c.from)}</span> ${esc(c.text)}</div>`;
  }).join('');
}

function briefScene(S) {
  const me = S.you || {};
  const alice = me.is_alice !== false;
  const partner = (S.players || []).find(p => S.you && p.seat === (S.you.seat ^ 1));
  const pname = partner ? partner.name : 'PARTNER';
  const myTie = alice ? '#556B2F' : '#FFFDF6', thTie = alice ? '#FFFDF6' : '#556B2F';
  return `<svg viewBox="0 0 1280 470" width="1280" height="470" style="display: block" role="img" aria-label="Two isometric rooms, one per agent, joined by a glowing twin-link thread">
<defs>
${roomDefs('b', true)}
<filter id="b-blur" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="6"/>
</filter>
<pattern id="b-scan" width="4" height="4" patternUnits="userSpaceOnUse">
<rect width="4" height="1" fill="#F6F4EC" opacity="0.7"/>
</pattern>
</defs>

<ellipse cx="330" cy="440" rx="262" ry="26" fill="#262B16" opacity="0.13"/>
<ellipse cx="950" cy="440" rx="262" ry="26" fill="#262B16" opacity="0.13"/>
<g transform="translate(64,6) scale(0.95)">
<use href="#b-room"/>
${deskCard(S.testCard === 0 ? 0 : 1)}
<g transform="translate(180,335) scale(0.8)">
<use href="#b-agent"/>
${tie(myTie)}
</g>
<polygon points="280,20 520,140 520,350 280,470 40,350 40,140" fill="none" stroke="#556B2F" stroke-opacity="0.4" stroke-width="2"/>
</g>

<g transform="translate(684,6) scale(0.95)">
<g opacity="0.5">
<use href="#b-room"/>
<g transform="translate(305,322) matrix(1,0.5,-1,0.5,0,0)">
<rect x="-9" y="-12" width="18" height="24" fill="#3B4228" stroke="#8A8A72" stroke-width="1.5"/>
<text x="0" y="5" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="13" fill="#55583F">?</text>
</g>
<g transform="translate(390,330) scale(0.8)">
<use href="#b-agent"/>
${tie(thTie)}
</g>
</g>
<polygon points="280,20 520,140 520,350 280,470 40,350 40,140" fill="url(#b-scan)" opacity="0.55"/>
<polygon points="280,20 520,140 520,350 280,470 40,350 40,140" fill="none" stroke="#8A8A72" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="6 6"/>
</g>

${THREAD('M302,300 C302,120 480,70 640,70 C800,70 922,120 922,300', 10, 3, 'b-blur')}
<g fill="#262B16" shape-rendering="crispEdges">
<rect x="309" y="198" width="3" height="3"/>
<rect x="350" y="128" width="3" height="3"/>
<rect x="440" y="90" width="3" height="3"/>
<rect x="540" y="74" width="3" height="3"/>
<rect x="740" y="74" width="3" height="3"/>
<rect x="840" y="90" width="3" height="3"/>
<rect x="900" y="128" width="3" height="3"/>
<rect x="916" y="198" width="3" height="3"/>
</g>
<circle cx="640" cy="70" r="30" fill="url(#b-gl)"/>
<circle cx="640" cy="70" r="12" fill="#F6F4EC" stroke="#556B2F" stroke-width="3"/>
<circle cx="640" cy="70" r="4" fill="#262B16"/>
<text x="640" y="108" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="12" letter-spacing="2" fill="#556B2F">TWIN LINK · LIVE</text>

<text x="330" y="466" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="13" letter-spacing="2" fill="#262B16">AGENT ${alice ? 'A' : 'B'} · YOU</text>
<text x="950" y="466" text-anchor="middle" font-family="Silkscreen, monospace" font-size="13" letter-spacing="2" fill="#55583F">AGENT ${alice ? 'B' : 'A'} · ${esc(pname)} · KNOBS HIDDEN</text>
</svg>`;
}

function moleChatLines(S) {
  const lines = (S.chat || []).filter(c => c.scope === 'mole').slice(-4);
  if (!lines.length) return '<div style="color: #6E7B5B; font-style: italic">No cell chatter yet.</div>';
  return lines.map(c => {
    const me = S.you && c.seat === S.you.seat;
    return `<div><span style="color: ${me ? '#556B2F' : '#8B0000'}; font-weight: 700">${me ? 'YOU' : esc(c.from)}:</span> ${esc(c.text)}</div>`;
  }).join('');
}

function molePanel(S) {
  if (!S.you || S.you.role !== 'mole' || S.phase !== 'brief' || !S.mission || S.mission.id === 1) return '';
  const shadow = S.you.shadow != null ? S.you.shadow : (S.you.cheats_left || 0);
  const cheat = !!S.you.cheat_now;
  const b = (on, act, label, dis) => {
    let extra = '';
    if (act === 'cheat' && on) extra = ' crimson-pulse';
    else if (on) extra = ' btn-ink';
    else extra = ' btn-ghost';
    return `<button type="button" data-act="${act}" ${dis ? 'disabled' : ''} aria-pressed="${on}" class="btn${extra}" style="flex: 1; height: 28px; padding: 0 4px; font-size: 10px; ${dis ? 'opacity: 0.4' : ''}">${label}</button>`;
  };

  const myPair = S.you.pair != null ? S.you.pair : 0;
  const numPairs = S.mode === '8p' ? 4 : 2;
  const otherPairs = [];
  for (let p = 0; p < numPairs; p++) {
    if (p !== myPair) otherPairs.push(p);
  }
  const jamBtns = otherPairs.map(p => {
    return `<button type="button" data-act="jam" data-pair="${p}" ${shadow <= 0 ? 'disabled' : ''} title="Jam pair ${p + 1} depolarizing mix (-1 shadow)" class="btn btn-ghost" style="flex: 1; height: 24px; padding: 0 2px; font-size: 9px; ${shadow <= 0 ? 'opacity: 0.4' : ''}">P${p + 1}</button>`;
  }).join('');

  const cell = S.you.cell || S.you.moles || [];
  const mates = cell.filter(m => m.seat !== S.you.seat);
  const cellDesc = mates.length
    ? mates.map(m => `CELL: ${esc(m.name)} (P${(m.pair != null ? m.pair : 0) + 1})`).join(', ')
    : 'SOLO CELL';

  return `<div style="position: absolute; left: 28px; top: 76px; width: 220px; box-sizing: border-box; padding: 8px 10px; background: #ECEADD; border: 2px solid #262B16; box-shadow: 3px 3px 0 rgba(38,43,22,0.25); display: flex; flex-direction: column; gap: 6px; z-index: 2">
<div style="display: flex; justify-content: space-between; align-items: center">
  <span style="font-family: 'Silkscreen', monospace; font-size: 10px; letter-spacing: 1px; color: #55583F; font-weight: 700">MOLE EYES ONLY</span>
  <span style="font-family: 'Silkscreen', monospace; font-size: 10px; letter-spacing: 1px; color: #8B0000; font-weight: 700">SHADOW ${shadow}</span>
</div>
<div style="font-size: 9px; font-family: 'Silkscreen', monospace; color: #55583F">${cellDesc}</div>
<div style="display: flex; gap: 4px">${b(!cheat, 'honest', 'HONEST', false)}${b(cheat, 'cheat', 'CHEAT', shadow <= 0 && !cheat)}</div>
<div style="display: flex; gap: 4px; align-items: center">
  <span style="font-family: 'Silkscreen', monospace; font-size: 9px; color: #55583F; letter-spacing: 0.5px">JAM:</span>
  ${jamBtns}
</div>
<div style="display: flex; flex-direction: column; gap: 3px; border-top: 1px dashed #B3B198; padding-top: 4px">
  <span style="font-family: 'Silkscreen', monospace; font-size: 9px; color: #55583F; letter-spacing: 1px">CELL CHAT</span>
  <div id="mole-chat-log" style="max-height: 44px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; font-size: 10px; line-height: 12px; color: #262B16">${moleChatLines(S)}</div>
  <div style="display: flex; gap: 4px">
    <input id="mole-chat-in" type="text" maxlength="140" placeholder="Cell msg..." style="flex: 1; height: 22px; box-sizing: border-box; padding: 0 4px; background: #F6F4EC; border: 1px solid #B3B198; color: #262B16; font-family: 'JetBrains Mono', monospace; font-size: 10px">
    <button type="button" data-act="molechat" class="btn btn-ink" style="height: 22px; padding: 0 6px; font-size: 9px">SEND</button>
  </div>
</div>
</div>`;
}

function quotaChip(S) {
  if (IS_DEMO || !S.mission || (S.you && S.you.spectator)) return '';
  const q = S.q || { quota: S.mission.quota, base: S.mission.quota, wager: false, s2: (S.mission.stars || [])[0], s3: (S.mission.stars || [])[1] };
  const open = S.phase === 'brief';
  const top = S.you && S.you.role === 'mole' ? 'top: 14px' : 'top: 14px';
  return `<div style="position: absolute; left: 28px; ${top}; width: 206px; box-sizing: border-box; padding: 6px 8px; background: #F6F4EC; border: 1px solid #B3B198; display: flex; flex-direction: column; gap: 4px">
<span style="font-size: 11px; color: #262B16; white-space: nowrap"><b>QUOTA ${q.quota}</b> <span style="color: #B8860B">★</span> ${q.base} <span style="color: #B8860B">★★</span> ${q.s2} <span style="color: #B8860B">★★★</span> ${q.s3}</span>
<button type="button" data-act="wager" ${open ? '' : 'disabled'} aria-pressed="${!!q.wager}" title="Quota +10. Hit it for double points, miss it and lose half." style="height: 24px; background: ${q.wager ? '#262B16' : 'transparent'}; color: ${q.wager ? '#F6F4EC' : '#262B16'}; border: 1px solid #262B16; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 10px; letter-spacing: 1px; ${open ? '' : 'opacity: 0.5'}">WAGER +10 · ×2 · ${q.wager ? 'ON' : 'OFF'}</button>
</div>`;
}

function hqPanel(S) {
  const h = S.hq;
  if (!h || h.dismissed || S.phase !== 'brief') return '';
  const n = Math.min(h.text.length, Math.floor((Date.now() - h.t0) / 28));
  return `<div data-act="hqx" role="note" aria-label="HQ briefing" style="position: absolute; left: 400px; top: 128px; width: 480px; box-sizing: border-box; padding: 12px 16px; background: #262B16; border: 1px solid #C9D79A; box-shadow: 6px 6px 0 rgba(20,23,12,0.35); cursor: pointer; z-index: 3">
<div style="display: flex; justify-content: space-between; font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 2px; color: #B9B79F"><span>HQ // INCOMING</span><span>CLICK TO CLOSE</span></div>
<div id="hq-t" data-n="${n}" style="margin-top: 8px; min-height: 66px; font-size: 13px; line-height: 20px; color: #C9D79A">${esc(h.text.slice(0, n))}</div>
<span class="sr">${esc(h.text)}</span>
</div>`;
}

function tplBrief(S) {
  const spect = S.you && S.you.spectator;
  const mm_ = Math.max(0, Math.ceil(((S.ends || 0) - Date.now()) / 1000));
  const timer = `<span data-timer="${S.ends || 0}" style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 20px; letter-spacing: 2px; color: #556B2F">${Math.floor(mm_ / 60)}:${String(mm_ % 60).padStart(2, '0')}</span>`;
  const humans = (S.players || []).filter(p => p.human).length;
  const stepIdx = S.phase === 'lock' ? 1 : S.phase === 'drift' ? 2 : 0;
  const top = topbarL(missionLabel(S), `<ol style="display: flex; gap: 8px; margin: 0; padding: 0; list-style: none; font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 1px">${steps(stepIdx)}</ol>`,
    `<div style="display: flex; align-items: center; gap: 14px; font-size: 12px; color: #55583F">
<span style="font-family: 'Silkscreen', monospace; letter-spacing: 2px; color: #262B16">ROOM ${esc(S.code || '')}</span>
<span>${humans}/${(S.players || []).length} CONNECTED</span>
</div>`);
  const kn = S.knobs || [2, 2];
  const testCard = S.testCard === 0 ? 0 : 1;
  const g = S.gauges || [0.75, 0.75, 0.75, 0.75];
  const avg = g.some(v => v == null) ? null : (S.avg != null ? S.avg : g.reduce((s, v) => s + v, 0) / 4);
  const above = avg != null && avg > 0.75 + 1e-9;
  const left = spect
    ? `<div style="display: flex; flex-direction: column; gap: 10px"><div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">SPECTATING</div><div style="font-size: 12px; line-height: 18px; color: #3B4228">Your link was burned. A bot took your seat. Watch the pair play on.</div></div>`
    : `<div style="display: flex; flex-direction: column; gap: 8px">
<div style="display: flex; justify-content: space-between; align-items: baseline">
<div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">YOUR SIDE · AGENT ${S.you && S.you.is_alice === false ? 'B' : 'A'}</div>
<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border: 1px solid ${above ? '#556B2F' : '#B8860B'}; background: ${above ? 'rgba(85,107,47,0.12)' : 'rgba(184,134,11,0.12)'}; color: ${above ? '#556B2F' : '#B8860B'}">${above ? '✔ WINNING ZONE' : '⚠ TUNE PAST 75%'}</span>
</div>
<div style="display: flex; align-items: flex-start; gap: 14px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 64px">
<div style="width: 60px; height: 84px; box-sizing: border-box; border: 2px solid #262B16; background: ${cardCol(testCard)}; display: flex; align-items: center; justify-content: center">
<div style="width: 20px; height: 20px; background: ${testCard ? '#FFFDF6' : '#262B16'}; transform: rotate(45deg)"></div>
</div>
<span style="font-size: 11px; letter-spacing: 1px; color: #55583F">TEST CARD</span>
</div>
${knobBox(1, kn[1], '', testCard === 1, S.phase === 'drift' && S._driftFlash && S._driftMovedSlot === 1)}
${knobBox(0, kn[0], '', testCard === 0, S.phase === 'drift' && S._driftFlash && S._driftMovedSlot === 0)}
</div>
<div style="font-size: 11px; line-height: 14px; color: #55583F">💡 <i>Turn knobs until TEAM AVG crosses into the gold zone (>75%).</i></div>
</div>`;
  const readyN = (S.players || []).filter(p => p.ready).length;
  const iReady = S.you && (S.players || []).find(p => p.seat === S.you.seat)?.ready;
  let action;
  if (S.phase === 'drift') {
    const t = S.tokens || 0;
    action = `<button type="button" data-act="recal" ${t > 0 && !spect ? '' : 'disabled'} class="btn ${t > 0 ? 'btn-primary' : 'btn-ghost'}" style="height: 44px; ${t > 0 ? BTN_PRIMARY : 'border: 1px solid #B3B198; background: transparent; color: #55583F; font-family: \'Silkscreen\', monospace; font-weight: 700; letter-spacing: 2px'}; font-size: 15px">RECALIBRATE · ${t} TOKEN${t === 1 ? '' : 'S'}</button>`;
  } else if (S.phase === 'lock') {
    action = `<button type="button" disabled class="btn btn-primary" style="height: 44px; ${BTN_PRIMARY}; font-size: 16px">LINK LOCKED</button>`;
  } else {
    action = `<button type="button" data-act="ready" ${spect ? 'disabled' : ''} aria-pressed="${!!iReady}" class="btn ${iReady ? 'btn-ghost' : 'btn-primary'}" style="height: 44px; ${iReady ? "border: 2px solid #556B2F; background: transparent; color: #556B2F; font-family: 'Silkscreen', monospace; font-weight: 700; letter-spacing: 2px" : BTN_PRIMARY}; font-size: 16px">${iReady ? 'LOCKED · ' : 'LOCK IN · '}${readyN}/${(S.players || []).length} READY</button>`;
  }
  const chatOpen = S.phase === 'brief' || S.phase === 'drift';
  return `<div style="${ROOT_L}">
${top}
<div style="position: relative; height: 470px; flex: none">
${briefScene(S)}
${(S.phase === 'drift' || S.drift) ? `<div style="position: absolute; left: 50%; transform: translateX(-50%); top: 10px; z-index: 10; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 6px 20px; background: #E0B84C; border: 2px solid #262B16; box-shadow: 2px 2px 0 #262B16; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 12px; letter-spacing: 2px; color: #262B16; white-space: nowrap">⚠️ LINK DRIFT · ONE KNOB MOVED A SNAP</div>` : ''}
${(!S.mission || S.mission.n === 1 || S.mission.id === 1) ? `<div style="position: absolute; left: 50%; transform: translateX(-50%); top: ${(S.phase === 'drift' || S.drift) ? '48px' : '14px'}; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 5px 14px; background: rgba(246, 244, 236, 0.95); border: 1px solid #556B2F; box-shadow: 2px 2px 0 rgba(38,43,22,0.25); font-size: 11px; white-space: nowrap">
  <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #556B2F; letter-spacing: 1px">RULE:</span>
  <span style="font-weight: 700; color: #8B0000">🔴 + 🔴 (BOTH RED)</span> ➔ <b>OPPOSITE DOORS</b>
  <span style="color: #CDCBB5">·</span>
  <span>ANY OTHER CARDS</span> ➔ <b>SAME DOOR</b>
</div>` : ''}
${quotaChip(S)}
${molePanel(S)}
${hqPanel(S)}
<div style="position: absolute; right: 32px; top: 14px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px">
${S.phase === 'brief' || S.phase === 'drift' ? timer : ''}
<button type="button" data-act="nerd" aria-label="Open Nerd Mode" class="btn btn-ghost" style="height: 28px; padding: 0 8px; font-size: 11px">NERD MODE</button>
</div>
</div>
<div style="flex: 1; display: grid; grid-template-columns: 340px minmax(0, 1fr) 300px; gap: 28px; padding: 16px 32px; box-sizing: border-box; background: #ECEADD; border-top: 1px solid #CDCBB5">
${left}
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
${gaugesHtml(S)}
</div>
<div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">
<div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">BRIEFING CHAT · ${chatOpen ? 'OPEN' : 'LOCKED'}</div>
<div id="chat-log" aria-live="polite" style="display: flex; flex-direction: column; gap: 3px; font-size: 12px; line-height: 16px; color: #3B4228">${chatLinesBrief(S)}</div>
<input id="chat-in" type="text" maxlength="140" ${chatOpen && !spect ? '' : 'disabled'} aria-label="Message to your partner" placeholder="Talk it through. Chat locks on RUN." style="height: 32px; box-sizing: border-box; padding: 0 10px; background: #F6F4EC; border: 1px solid #B3B198; color: #262B16; font-family: 'JetBrains Mono', monospace; font-size: 12px">
${action}
</div>
</div>
${frame(`CASE FILE ${caseNo(S)} · BRIEFING`, false)}
</div>`;
}

/* ---------------------------------------------------------------- run */
const CHECK = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><polyline points="2,8 6,12 12,3" fill="none" stroke="#556B2F" stroke-width="2"/></svg>`;
const CROSS = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><line x1="3" y1="3" x2="11" y2="11" stroke="#55583F" stroke-width="2"/><line x1="11" y1="3" x2="3" y2="11" stroke="#55583F" stroke-width="2"/></svg>`;
const DOOR_OPEN = {
  R: `<polygon points="450,295 450,185 426,197 426,307" fill="#B3B398" stroke="#B3B198" stroke-width="1"/>
<polygon points="390,265 450,295 450,185 390,155" fill="url(#r-light)"/>
<ellipse cx="428" cy="300" rx="85" ry="42" fill="url(#r-gl)"/>
<polygon points="450,295 450,185 426,197 426,307" fill="#B3B398" stroke="#B3B198" stroke-width="1"/>`,
  L: `<polygon points="110,295 110,185 134,197 134,307" fill="#B3B398" stroke="#B3B198" stroke-width="1"/>
<polygon points="170,265 110,295 110,185 170,155" fill="url(#r-light)"/>
<ellipse cx="132" cy="300" rx="85" ry="42" fill="url(#r-gl)"/>
<polygon points="110,295 110,185 134,197 134,307" fill="#B3B398" stroke="#B3B198" stroke-width="1"/>`,
};
const AG = { idle: [280, 400], L: [165, 320], R: [395, 320] };

const qOf = S => (S.q && S.q.quota) || (S.mission && S.mission.quota) || 160;
function tplRun(S) {
  const N = (S.mission && S.mission.rounds) || 200, quota = qOf(S);
  const debrief = S.phase === 'debrief';
  const top = topbarL(missionLabel(S), `<ol style="display: flex; gap: 8px; margin: 0; padding: 0; list-style: none; font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 1px">${steps(debrief ? 3 : 2)}</ol>`,
    `<div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: #262B16">
<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
<rect x="3" y="7" width="10" height="7" fill="#556B2F"/>
<path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#556B2F" stroke-width="2"/>
</svg>
<span id="r-comms" style="font-family: 'Silkscreen', monospace; letter-spacing: 2px; color: #556B2F">${debrief ? 'MISSION OVER' : 'COMMS LOCKED'}</span>
<span id="r-roundtxt" style="color: #55583F">ROUND ${S.roundNo || 0} / ${N}</span>
</div>`);
  const cells = Array.from({ length: N }, (_, i) => `<div data-c="${i}" style="width: 8px; height: 8px; box-sizing: border-box; background: transparent; border: 1px solid #C5C4AB"></div>`).join('');
  return `<div style="${ROOT_L}">
${top}
<div style="height: 520px; flex: none; display: flex">
<div style="position: relative; width: 860px; flex: none">
<svg viewBox="0 0 860 520" width="860" height="520" style="display: block" role="img" aria-label="Your agent walking through the lit door of an isometric room">
<defs>
${roomDefs('r', false)}
<linearGradient id="r-light" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#C9D79A"/>
<stop offset="1" stop-color="#556B2F"/>
</linearGradient>
<filter id="r-blur" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="5"/>
</filter>
<pattern id="r-scan" width="4" height="4" patternUnits="userSpaceOnUse">
<rect width="4" height="1" fill="#F6F4EC" opacity="0.7"/>
</pattern>
</defs>

<rect x="24" y="24" width="200" height="140" fill="#DEDCCB"/>
<g transform="translate(124,150) scale(0.7)">
<use href="#r-agent" opacity="0.6"/>
${tie('#FFFDF6', 0.6)}
</g>
<rect x="24" y="24" width="200" height="140" fill="url(#r-scan)" opacity="0.6"/>
<rect x="24" y="24" width="200" height="140" fill="none" stroke="#8A8A72" stroke-width="2" stroke-dasharray="6 6"/>
<text x="24" y="17" font-family="Silkscreen, monospace" font-size="12" letter-spacing="2" fill="#55583F">AGENT ${S.you && S.you.is_alice === false ? 'A' : 'B'} · SIGNAL ONLY</text>

<ellipse cx="430" cy="488" rx="262" ry="24" fill="#262B16" opacity="0.13"/>
<g transform="translate(150,30)">
<use href="#r-room"/>
<text id="r-lbL" transform="translate(140,150) matrix(1,-0.5,0,1,0,0)" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="18" fill="#8A8A72">L</text>
<text id="r-lbR" transform="translate(420,150) matrix(1,0.5,0,1,0,0)" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="18" fill="#8A8A72">R</text>
<g id="r-openL" style="display: none">${DOOR_OPEN.L}</g>
<g id="r-openR" style="display: none">${DOOR_OPEN.R}</g>

<g id="r-a2" class="mv" opacity="0.12" transform="translate(${AG.idle[0]},${AG.idle[1]}) scale(0.9)"><use href="#r-agent"/></g>
<g id="r-a1" class="mv" opacity="0.22" transform="translate(${AG.idle[0]},${AG.idle[1]}) scale(0.9)"><use href="#r-agent"/></g>
<g id="r-ag" class="mv" transform="translate(${AG.idle[0]},${AG.idle[1]}) scale(0.9)">
<use href="#r-agent"/>
${tie('#556B2F').replace('<polygon', '<polygon id="r-tie"')}
</g>

<g id="r-card" class="mv" transform="translate(${AG.idle[0] - 11},${AG.idle[1] - 162})" style="display: none">
<rect id="r-card-bg" x="0" y="0" width="24" height="32" fill="#D13A42" stroke="#262B16" stroke-width="2" shape-rendering="crispEdges"/>
<polygon id="r-card-sh" points="12,8 19,16 12,24 5,16" fill="#FFFDF6" shape-rendering="crispEdges"/>
</g>
<polygon points="250,306 270,316 250,326 230,316" fill="#556B2F"/>
</g>

<path d="M400,340 C380,250 170,260 124,168" fill="none" stroke="#556B2F" stroke-width="9" opacity="0.35" filter="url(#r-blur)"/>
<path d="M400,340 C380,250 170,260 124,168" fill="none" stroke="#556B2F" stroke-width="3"/>
<path d="M400,340 C380,250 170,260 124,168" fill="none" stroke="#262B16" stroke-width="1"/>
<path d="M400,340 C380,250 170,260 124,168" fill="none" stroke="#C9D79A" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round"/>
<g fill="#262B16" shape-rendering="crispEdges">
<rect x="353" y="286" width="3" height="3"/>
<rect x="270" y="253" width="3" height="3"/>
<rect x="182" y="219" width="3" height="3"/>
</g>
<circle cx="124" cy="166" r="9" fill="#F6F4EC" stroke="#556B2F" stroke-width="3"/>
<circle cx="124" cy="166" r="3" fill="#262B16"/>

<rect x="624" y="24" width="212" height="84" fill="#ECEADD" stroke="#CDCBB5" stroke-width="2"/>
<text id="r-hud-round" x="640" y="48" font-family="Silkscreen, monospace" font-size="12" letter-spacing="2" fill="#55583F">ROUND 0</text>
<text x="640" y="72" font-family="JetBrains Mono, monospace" font-size="14" fill="#3B4228">YOUR CARD</text>
<text id="r-hud-card" x="820" y="72" text-anchor="end" font-family="JetBrains Mono, monospace" font-weight="700" font-size="14" fill="#262B16">—</text>
<text x="640" y="94" font-family="JetBrains Mono, monospace" font-size="14" fill="#3B4228">YOUR DOOR</text>
<text id="r-hud-door" x="820" y="94" text-anchor="end" font-family="JetBrains Mono, monospace" font-weight="700" font-size="14" fill="#556B2F">—</text>
<g id="r-streak" style="display: none"><rect x="624" y="116" width="212" height="30" fill="#262B16"/><text id="r-streak-t" x="640" y="136" font-family="Silkscreen, monospace" font-weight="700" font-size="13" letter-spacing="2" fill="#E0B84C">STREAK 0</text></g>
${(!S.mission || S.mission.n === 1 || S.mission.id === 1) ? `<g transform="translate(250, 24)">
<rect width="350" height="28" fill="#ECEADD" stroke="#556B2F" stroke-width="1.5" rx="2"/>
<text x="12" y="18" font-family="Silkscreen, monospace" font-size="10" font-weight="700" fill="#556B2F">RULE:</text>
<text x="56" y="18" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#8B0000">🔴+🔴 OPPOSITE DOORS</text>
<text x="210" y="18" font-family="JetBrains Mono, monospace" font-size="11" fill="#3B4228">| OTHER CARDS SAME DOOR</text>
</g>` : ''}
</svg>
</div>

<div id="r-panel" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 14px 20px; background: #ECEADD; border-left: 1px solid #CDCBB5; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; overflow-x: hidden">
<div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">MISSION BOARD</div>
<div style="display: flex; flex-direction: column; gap: 4px">
<div id="r-rate" style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 56px; line-height: 56px; color: #556B2F">0.0%</div>
<div id="r-rate-sub" style="font-size: 12px; color: #3B4228">LIVE SYNC RATE</div>
<div id="r-bell-stinger" class="bell-banner" style="display: none; margin-top: 4px; padding: 6px 10px; background: #262B16; border: 1.5px solid #E0B84C; color: #E0B84C; font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 1px; font-weight: 700; text-align: center">⚡ BELL LIMIT BROKEN · 85.4% ACTIVE</div>
</div>

<div id="r-bars" style="display: flex; flex-direction: column; gap: 12px">
<div>
<div style="display: flex; justify-content: space-between; font-size: 12px"><span style="font-weight: 700">YOUR TEAM</span><span id="r-team-n" style="color: #556B2F; font-weight: 700">0 SYNCS</span></div>
<div style="position: relative; height: 14px; margin-top: 6px; background: #DEDCCB">
<div id="r-team-bar" style="position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: #556B2F"></div>
<div style="position: absolute; left: ${quota / N * 100}%; top: -3px; bottom: -3px; width: 2px; background: #262B16"></div>
${S.mission && S.mission.stars ? S.mission.stars.map(v => `<div style="position: absolute; left: ${v / N * 100}%; top: 2px; bottom: 2px; width: 1px; background: #B8860B"></div>`).join('') : ''}
</div>
<div style="position: relative; height: 16px; margin-top: 4px"><span style="position: absolute; left: ${quota / N * 100}%; transform: translateX(-50%); font-size: 11px; color: #262B16; white-space: nowrap">QUOTA ${quota}</span></div>
</div>
<div>
<div style="display: flex; justify-content: space-between; font-size: 12px"><span style="font-weight: 700; color: #3B4228">BUREAU GHOST</span><span id="r-ghost-n" style="color: #55583F; font-weight: 700">0 SYNCS</span></div>
<div style="position: relative; height: 14px; margin-top: 6px; background: #DEDCCB">
<div id="r-ghost-bar" style="position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: #8A8A72"></div>
<div style="position: absolute; left: ${quota / N * 100}%; top: -3px; bottom: -3px; width: 2px; background: #262B16"></div>
</div>
</div>
<div id="r-proj" style="font-size: 12px; color: #3B4228">PROJECTED — · QUOTA ${quota}</div>
${IS_DEMO ? '' : `<div id="r-starsleg" style="font-size: 11px; color: #55583F"><span style="color: #B8860B">★★</span> ${S.mission && S.mission.stars ? S.mission.stars[0] : '—'} · <span style="color: #B8860B">★★★</span> ${S.mission && S.mission.stars ? S.mission.stars[1] : '—'}${S.q && S.q.wager ? ' · <b style="color: #262B16">WAGER ON</b>' : ''}</div>`}
</div>

<div id="r-lastbox" style="display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid #CDCBB5">
<div id="r-lasth" style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">LAST ROUNDS</div>
<div id="r-last" style="display: flex; flex-direction: column; gap: 6px"></div>
</div>
<div id="r-end" style="margin-top: auto; padding-top: 6px"></div>
</div>
</div>

<div style="flex: 1; box-sizing: border-box; padding: 16px 32px; background: #F0EEE2; border-top: 1px solid #CDCBB5; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; align-items: center; justify-content: space-between">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">ROUND LOG · ONE SQUARE PER ROUND</span>
<div style="display: flex; align-items: center; gap: 16px; font-size: 11px; color: #55583F">
<span style="display: flex; align-items: center; gap: 6px"><span style="display: inline-block; width: 8px; height: 8px; background: #556B2F"></span>SYNC</span>
<span style="display: flex; align-items: center; gap: 6px"><span style="display: inline-block; width: 8px; height: 8px; background: #8A8A72"></span>MISS</span>
<span style="display: flex; align-items: center; gap: 6px"><span style="display: inline-block; width: 8px; height: 8px; box-sizing: border-box; border: 1px solid #C5C4AB"></span>TO PLAY</span>
</div>
</div>
<div id="r-cells" role="img" aria-label="Round log" style="display: flex; flex-wrap: wrap; gap: 3px; width: 1100px">${cells}</div>
<div id="r-foot" style="font-size: 12px; color: #55583F">No talking now. You see your own card, your own door and the score. Nothing else gets through.</div>
</div>

${frame(`CASE FILE ${caseNo(S)} · SILENT RUN`, false)}
</div>`;
}

/* Incremental update of the run screen: only touches elements that change. */
function runUpdate(S, root, anim) {
  const q = id => root.querySelector('#' + id);
  const N = (S.mission && S.mission.rounds) || 200, quota = qOf(S);
  const log = S.log || [];
  const played = S.roundNo || 0;
  const wins = S.wins || 0;
  root.querySelectorAll('[data-c]').forEach(el => {
    const i = +el.dataset.c, v = log[i] || 0;
    const bg = v === 1 ? '#556B2F' : v === 2 ? '#8A8A72' : 'transparent';
    const bd = (i === played - 1 && played < N && S.phase === 'run') ? '#262B16' : (v ? bg : '#C5C4AB');
    if (el.dataset.v !== String(v) + bd) {
      el.style.background = bg;
      el.style.borderColor = bd;
      el.dataset.v = String(v) + bd;
      if (i === played - 1 && v > 0 && S.phase === 'run') {
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
    }
  });
  const rate = played ? wins / played : 0;
  const ghost = S.demoGhost != null ? S.demoGhost : Math.floor(0.75 * played);
  q('r-rate').textContent = (rate * 100).toFixed(1) + '%';
  q('r-rate').style.color = rate > 0.75 ? '#556B2F' : '#55583F';
  q('r-rate-sub').textContent = played ? `LIVE SYNC RATE · ${rate > 0.75 ? 'ABOVE' : 'AT OR BELOW'} THE 75% CLASSICAL WALL` : 'LIVE SYNC RATE';
  const bellEl = q('r-bell-stinger');
  if (bellEl) {
    const showBell = !!(S.bellBroken && rate >= 0.75);
    bellEl.style.display = showBell ? 'block' : 'none';
  }
  q('r-team-n').textContent = `${wins} SYNCS`;
  q('r-team-bar').style.width = (wins / N * 100) + '%';
  q('r-ghost-n').textContent = `${ghost} SYNCS`;
  q('r-ghost-bar').style.width = (ghost / N * 100) + '%';
  const proj = played ? Math.round(wins / played * N) : null;
  const done = S.phase === 'debrief';
  q('r-proj').innerHTML = done
    ? `FINAL ${wins} · QUOTA ${quota} · <span style="color: ${wins >= quota ? '#556B2F' : '#55583F'}; font-weight: 700">${wins >= quota ? 'QUOTA MET' : 'QUOTA MISSED'}</span>`
    : proj == null ? `PROJECTED — · QUOTA ${quota}` : `PROJECTED ${proj} · QUOTA ${quota} · <span style="color: ${proj >= quota ? '#556B2F' : '#55583F'}; font-weight: 700">${proj >= quota ? 'ON PACE' : 'BEHIND PACE'}</span>`;
  q('r-roundtxt').textContent = `ROUND ${played} / ${N}`;
  const near = nearQuota(S);
  q('r-rate').classList.toggle('hb', near); q('r-team-bar').classList.toggle('hbg', near);
  const st = S.phase === 'run' ? (S.streak || 0) : 0;
  q('r-streak').style.display = st >= 3 ? '' : 'none';
  if (st >= 3) {
    const prevSt = +q('r-streak').dataset.st || 0;
    if (st > prevSt) {
      q('r-streak').classList.remove('pop');
      void q('r-streak').offsetWidth;
      q('r-streak').classList.add('pop');
    }
    q('r-streak').dataset.st = String(st);
    q('r-streak-t').textContent = `STREAK ${st}${st >= 10 ? ' · ON FIRE' : ''}`;
  } else {
    q('r-streak').dataset.st = '0';
  }
  q('r-hud-round').textContent = `ROUND ${played}`;
  const last = [];
  for (let i = played - 1; i >= Math.max(0, played - 4); i--) last.push(i);
  const R_ = S.result;
  const deb = S.phase === 'debrief' && R_;
  const sl = q('r-starsleg'); if (sl) sl.style.display = deb ? 'none' : '';
  q('r-panel').style.padding = deb ? '8px 18px' : '14px 20px'; q('r-panel').style.gap = deb ? '4px' : '8px';
  q('r-bars').style.gap = deb ? '6px' : '12px'; q('r-lastbox').style.gap = deb ? '3px' : '6px'; q('r-lastbox').style.paddingTop = deb ? '4px' : '10px';
  q('r-rate').style.fontSize = deb ? '44px' : '56px'; q('r-rate').style.lineHeight = deb ? '44px' : '56px';
  if (S.phase === 'debrief' && R_) {
    q('r-lasth').textContent = 'MISSION RESULT';
    const key = `${R_.mission}:${R_.points}:${R_.stars}`;
    if (q('r-last').dataset.k !== key) {
      q('r-last').dataset.k = key;
      q('r-last').innerHTML = `<div style="font-size: 20px; line-height: 22px; letter-spacing: 4px; color: #B8860B" aria-label="${R_.stars} of 3 stars">${[0, 1, 2].map(i => `<span class="${i < R_.stars ? 'pop' : ''}" style="animation-delay: ${0.5 + i * 0.25}s; ${i < R_.stars ? '' : 'color: #B3B198'}">${i < R_.stars ? '★' : '☆'}</span>`).join('')}</div>
<div style="font-size: 12px; line-height: 16px; color: #3B4228"><b style="color: #262B16">+${R_.points.toLocaleString()} PTS</b> · TOTAL ${R_.total_points.toLocaleString()}${R_.wager ? ` · <b style="color: ${R_.wager_ok ? '#556B2F' : '#8A4B00'}">WAGER ${R_.wager_ok ? 'WON ×2' : 'LOST ÷2'}</b>` : ''}<br>BEST STREAK ${R_.best_streak}${R_.variant === 'endless' ? ` · MISSES ${R_.strikes} OF 2` : ''}</div>
<button type="button" data-act="race" data-m="${R_.mission}" class="btn btn-ghost" style="align-self: flex-start; height: 26px; padding: 0 10px; font-size: 10px">REPLAY · LINK ON VS OFF</button>`;
    }
  } else {
    q('r-lasth').textContent = 'LAST ROUNDS'; q('r-last').dataset.k = '';
  }
  if (!(S.phase === 'debrief' && R_)) q('r-last').innerHTML = last.map(i => {
    const w = log[i] === 1;
    return `<div style="display: flex; align-items: center; gap: 10px; font-size: 12px${w ? '' : '; color: #55583F'}">${w ? CHECK : CROSS}<span>R${i + 1}</span><span style="${w ? 'color: #556B2F; ' : ''}font-weight: 700">${w ? 'SYNC' : 'MISS'}</span></div>`;
  }).join('');
  // door / agent
  const r = S.round;
  if (r && S.phase === 'run' && r.card >= 0) {
    const side = r.door === 1 ? 'R' : 'L', other = side === 'R' ? 'L' : 'R';
    const openDoorEl = q('r-open' + side);
    if (openDoorEl.style.display === 'none') {
      openDoorEl.style.display = '';
      openDoorEl.classList.remove('door-fade');
      void openDoorEl.offsetWidth;
      openDoorEl.classList.add('door-fade');
    }
    q('r-open' + other).style.display = 'none';
    q('r-lb' + side).setAttribute('fill', '#556B2F'); q('r-lb' + other).setAttribute('fill', '#8A8A72');
    const [x, y] = AG[side];
    const set = (id, tx, ty) => q(id).setAttribute('transform', `translate(${tx},${ty}) scale(0.9)`);
    set('r-ag', x, y);
    set('r-a1', x + (side === 'R' ? -28 : 28), y + 13);
    set('r-a2', x + (side === 'R' ? -56 : 56), y + 27);
    const c = q('r-card');
    c.style.display = '';
    c.setAttribute('transform', `translate(${x - 11},${y - 162})`);
    const cardKey = `${r.card}:${side}`;
    if (c.dataset.ck !== cardKey) {
      c.dataset.ck = cardKey;
      c.classList.remove('pop');
      void c.offsetWidth;
      c.classList.add('pop');
    }
    q('r-card-bg').setAttribute('fill', cardCol(r.card));
    q('r-card-sh').setAttribute('fill', r.card === 1 ? '#FFFDF6' : '#262B16');
    q('r-hud-card').textContent = r.card === 1 ? 'RED' : 'BLUE';
    q('r-hud-door').textContent = side;
    q('r-tie') && q('r-tie').setAttribute('fill', S.you && S.you.is_alice === false ? '#FFFDF6' : '#556B2F');
  } else if (!r || S.phase !== 'run') {
    ['L', 'R'].forEach(s => { q('r-open' + s).style.display = 'none'; q('r-lb' + s).setAttribute('fill', '#8A8A72'); });
    if (S.phase !== 'run' && !(r && S.phase === 'debrief')) { q('r-card').style.display = 'none'; }
  }
  if (S.phase === 'debrief' && S.result) {
    const ok = S.result.passed;
    const last_ = S.mission && S.mission.n === S.mission.of;
    const next = S.mode === '4p' && S.mission && S.mission.id > 1 ? 'TO THE MEETING' : last_ ? 'TO THE FINALE' : 'NEXT MISSION';
    const iR = S.you && (S.players || []).find(p => p.seat === S.you.seat)?.ready;
    q('r-end').innerHTML = `<div style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 16px; letter-spacing: 2px; color: ${ok ? '#556B2F' : '#262B16'}; margin-bottom: 6px">${ok ? 'MISSION CLEARED' : 'MISSION FAILED'}</div>
<button type="button" data-act="continue" ${S.you && S.you.spectator ? 'disabled' : ''} class="btn ${iR ? 'btn-ghost' : 'btn-primary'}" style="width: 100%; height: 42px; ${iR ? "border: 2px solid #556B2F; background: transparent; color: #556B2F; font-family: 'Silkscreen', monospace; font-weight: 700; letter-spacing: 2px" : BTN_PRIMARY}; font-size: 14px">${iR ? 'WAITING FOR OTHERS' : 'CONTINUE · ' + next}</button>`;
    q('r-foot').textContent = ok ? `${wins} of ${N} rounds synced. The quota was ${quota}. ${rate > 0.75 ? 'You beat the classical wall.' : 'A classical team could do this well.'}` : `${wins} of ${N} rounds synced. The quota was ${quota}.`;
    q('r-comms').textContent = 'MISSION OVER';
  } else if (q('r-end').innerHTML && S.phase !== 'debrief') {
    q('r-end').innerHTML = '';
  }
}
