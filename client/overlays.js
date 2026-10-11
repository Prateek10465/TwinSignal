/* Twin Signal client: overlays (Bell Lab puzzle, case file, link-on/off race replay, scores). */
const GOLD = '#B8860B';
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const OV_FONT = "font-family: 'JetBrains Mono', ui-monospace, monospace";
const H_SILK = "font-family: 'Silkscreen', monospace; letter-spacing: 2px; color: #55583F; font-size: 12px";
const OUTLINE_BTN = "height: 36px; padding: 0 14px; background: transparent; border: 1px solid #556B2F; color: #556B2F; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 12px; letter-spacing: 1px";

function ovShell(title, body, wide) {
  const w = wide ? 1160 : 960, l = (1280 - w) / 2;
  return `<div data-act="close" class="ov-backdrop" style="position: absolute; inset: 0; background: rgba(20,23,12,0.88); z-index: 9"></div>
<div role="dialog" aria-modal="true" aria-label="${esc(title)}" class="ov-panel" style="position: absolute; left: ${l}px; top: 40px; width: ${w}px; max-height: 640px; overflow: auto; z-index: 10; box-sizing: border-box; padding: 18px 28px 22px; background: #F6F4EC; border: 2px solid #262B16; box-shadow: 8px 8px 0 #14170C; ${OV_FONT}; color: #262B16">
<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px">
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 20px; letter-spacing: 2px; color: #556B2F">${esc(title)}</span>
<button type="button" id="ov-close" data-act="close" class="btn btn-ghost" style="${OUTLINE_BTN}">CLOSE</button>
</div>
${body}
</div>`;
}

/* ---------------------------------------------------------------- Bell Lab: beat 75% with fixed answers */
const LAB_CARDS = [[0, 0], [0, 1], [1, 0], [1, 1]];
function labNew() { return { a: [0, 0], b: [0, 0], seen: [], best: 0, sim: null, simQ: null }; }
const labKey = L => L.a.join('') + L.b.join('');
function labScore(L) { return LAB_CARDS.filter(([x, y]) => ((L.a[x] ^ L.b[y]) === (x & y))).length; }
function labTouch(L) {
  const k = labKey(L);
  if (!L.seen.includes(k)) L.seen.push(k);
  L.best = Math.max(L.best, labScore(L));
  L.sim = null; L.simQ = null;
}
function labSim(L, quantum) {
  let w = 0; const N = 200;
  for (let i = 0; i < N; i++) {
    const x = Math.random() < 0.5 ? 0 : 1, y = Math.random() < 0.5 ? 0 : 1;
    if (quantum) w += Math.random() < Math.cos(Math.PI / 8) ** 2 ? 1 : 0;
    else w += ((L.a[x] ^ L.b[y]) === (x & y)) ? 1 : 0;
  }
  return w / N;
}
function labHtml(S) {
  const L = S.lab || (S.lab = labNew());
  const sc = labScore(L);
  const tog = (who, i, label) => {
    const cur = L[who][i];
    const b = v => `<button type="button" data-act="labset" data-who="${who}" data-i="${i}" data-v="${v}" aria-pressed="${cur === v}" class="btn ${cur === v ? 'btn-primary' : 'btn-ghost'}" style="width: 52px; height: 36px; font-size: 14px">${v ? 'R' : 'L'}</button>`;
    return `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px"><span style="display: flex; align-items: center; gap: 6px; font-size: 12px">${sw(i ? RED : BLUE)}${label}</span><span style="display: flex">${b(0)}${b(1)}</span></div>`;
  };
  const rows = LAB_CARDS.map(([x, y]) => {
    const a = L.a[x], b = L.b[y], ok = (a ^ b) === (x & y);
    return `<div style="display: grid; grid-template-columns: 150px 70px 70px 1fr; align-items: center; height: 34px; padding: 0 8px; font-size: 12px; ${ok ? 'background: rgba(85,107,47,0.14); border-left: 3px solid #556B2F' : 'border-left: 3px solid transparent; color: #55583F'}">
<span style="display: flex; align-items: center; gap: 6px">${sw(cardCol(x))}${sw(cardCol(y))}${x ? 'RED' : 'BLUE'} · ${y ? 'RED' : 'BLUE'}</span><span>A: ${a ? 'R' : 'L'}</span><span>B: ${b ? 'R' : 'L'}</span>
<span class="fadein" style="font-weight: 700; ${ok ? 'color: #556B2F' : ''}">${ok ? 'WIN' : 'LOSE'}${(x & y) ? ' · needs DIFFERENT doors' : ' · needs the SAME door'}</span></div>`;
  }).join('');
  const all = L.seen.length >= 16;
  const msg = all
    ? `You checked all 16 codebooks. The best any of them can do is 3 of 4 cards, so 75%. That is the classical wall.`
    : L.best >= 4 ? 'Impossible. Check again.' : `Try to win all four card pairs. Codebooks checked: ${L.seen.length} of 16. Best so far: ${L.best} of 4.`;
  const bar = (p, col, label) => `<div style="margin-top: 8px"><div style="display: flex; justify-content: space-between; font-size: 12px"><span style="font-weight: 700">${label}</span><span style="font-weight: 700">${(p * 100).toFixed(1)}%</span></div><div style="position: relative; height: 16px; margin-top: 4px; background: #DEDCCB"><div class="bar-fill" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${barW(p)}%; background: ${col}"></div><div style="position: absolute; left: 50%; top: -3px; bottom: -3px; width: 2px; background: #262B16"></div></div></div>`;
  return ovShell('BELL LAB · BEAT 75% WITH FIXED ANSWERS', `
<div style="display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 28px">
<div style="display: flex; flex-direction: column; gap: 10px">
<span style="${H_SILK}">YOUR CODEBOOK · AGREED BEFOREHAND</span>
<div style="font-size: 12px; color: #3B4228">Alice, door for each card</div>
${tog('a', 0, 'BLUE')}${tog('a', 1, 'RED')}
<div style="font-size: 12px; color: #3B4228; margin-top: 4px">Bob, door for each card</div>
${tog('b', 0, 'BLUE')}${tog('b', 1, 'RED')}
<div style="margin-top: 8px; padding: 10px 12px; background: #ECEADD; border: 1px solid #B3B198; font-size: 12px; line-height: 18px">${msg}</div>
</div>
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
<span style="${H_SILK}">THE FOUR CARD PAIRS · WIN IF a XOR b = x AND y</span>
${rows}
<div style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 26px; color: ${sc === 3 ? '#556B2F' : '#262B16'}; margin-top: 4px">${sc} OF 4 · ${sc * 25}%</div>
<div style="display: flex; gap: 10px; margin-top: 4px">
<button type="button" data-act="labsim" class="btn btn-ghost" style="${OUTLINE_BTN}">PLAY 200 ROUNDS WITH THIS CODEBOOK</button>
<button type="button" data-act="labsimq" class="btn btn-ghost" style="${OUTLINE_BTN}">PLAY 200 WITH A TWIN LINK</button>
</div>
${L.sim != null ? bar(L.sim, '#8A8A72', 'FIXED CODEBOOK, 200 RANDOM CARDS') : ''}
${L.simQ != null ? bar(L.simQ, '#556B2F', 'TWIN LINK, TUNED, 200 RANDOM CARDS') : ''}
<div style="font-size: 11px; line-height: 16px; color: #55583F; margin-top: 4px">The link run is sampled from cos²(π/8) ≈ 85.4%, the same figure the live game's circuit produces. The real circuit and the IonQ run are in Nerd Mode.</div>
</div>
</div>`);
}

/* ---------------------------------------------------------------- race replay */
function raceHtml(S) {
  const n = S.ov && S.ov.mission;
  const R = (S.races || {})[n];
  if (!R) return ovShell('LINK ON VS LINK OFF', '<div style="font-size: 13px">No race data for this mission yet.</div>');
  const N = R.actual.length, W = 1000, H = 300, px = 48, py = 18;
  const cum = s => { let c = 0; return Array.from(s, ch => (c += +ch)); };
  const A = cum(R.actual), B = cum(R.classical);
  const X = i => px + (W - px - 12) * (i / N), Y = v => H - py - (H - 2 * py) * (v / N);
  const pts = arr => arr.map((v, i) => `${X(i + 1).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const cuts = (R.cuts || []).map(c => `<line x1="${X(c)}" y1="${py}" x2="${X(c)}" y2="${H - py}" stroke="#E0B84C" stroke-width="2" stroke-dasharray="4 4"/><text x="${X(c) + 4}" y="${py + 12}" font-family="Silkscreen, monospace" font-size="10" fill="#8A6B00">DRIFT</text>`).join('');
  const lead = A[N - 1] - B[N - 1];
  return ovShell(`LINK ON VS LINK OFF · MISSION ${mm(n)}`, `
<div style="font-size: 13px; line-height: 20px; color: #3B4228; margin-bottom: 8px">Same cards, round by round. The grey line is a team on a fixed classical codebook (both always pick left, which wins every card pair except red/red, so 3 in 4). The green line is your team's actual result. Scrub to compare rounds.</div>
<svg id="race-svg" data-n="${N}" data-a="${A.join(',')}" data-b="${B.join(',')}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cumulative wins: your team ${A[N - 1]}, classical baseline ${B[N - 1]}" style="display: block; max-width: 100%; cursor: crosshair">
<rect x="${px}" y="${py}" width="${W - px - 12}" height="${H - 2 * py}" fill="#ECEADD"/>
<g stroke="#CDCBB5" stroke-width="1">${[0.25, 0.5, 0.75, 1].map(f => `<line x1="${px}" x2="${W - 12}" y1="${Y(N * f)}" y2="${Y(N * f)}"/>`).join('')}</g>
<g font-family="JetBrains Mono, monospace" font-size="10" fill="#55583F">${[0, 0.5, 1].map(f => `<text x="${px - 6}" y="${Y(N * f) + 3}" text-anchor="end">${Math.round(N * f)}</text>`).join('')}
<text x="${px}" y="${H - 2}">round 1</text><text x="${W - 12}" y="${H - 2}" text-anchor="end">round ${N}</text></g>
${cuts}
<polyline class="race-line" pathLength="1" points="${pts(B)}" fill="none" stroke="#8A8A72" stroke-width="3"/>
<polyline class="race-line" pathLength="1" points="${pts(A)}" fill="none" stroke="#556B2F" stroke-width="3"/>
<circle cx="${X(N)}" cy="${Y(A[N - 1])}" r="5" fill="#556B2F"/><circle cx="${X(N)}" cy="${Y(B[N - 1])}" r="5" fill="#8A8A72"/>
<g id="race-scrub" style="display: none; pointer-events: none">
  <line id="race-scrub-line" x1="0" y1="${py}" x2="0" y2="${H - py}" stroke="#262B16" stroke-width="1.5" stroke-dasharray="3 3"/>
  <circle id="race-scrub-dot-a" cx="0" cy="0" r="5" fill="#556B2F" stroke="#F6F4EC" stroke-width="1.5"/>
  <circle id="race-scrub-dot-b" cx="0" cy="0" r="5" fill="#8A8A72" stroke="#F6F4EC" stroke-width="1.5"/>
  <g id="race-scrub-pill" transform="translate(0, 0)">
    <rect x="-130" y="0" width="260" height="24" fill="#262B16" rx="3" ry="3"/>
    <text id="race-scrub-txt" x="0" y="16" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#F6F4EC">ROUND 1 · YOU 1 · CLASSICAL 1</text>
  </g>
</g>
</svg>
<div style="display: flex; gap: 28px; align-items: center; margin-top: 10px; font-size: 13px">
<span style="display: flex; align-items: center; gap: 8px"><span style="width: 24px; height: 4px; background: #556B2F; display: inline-block"></span><b>YOUR TEAM</b> ${A[N - 1]} wins</span>
<span style="display: flex; align-items: center; gap: 8px"><span style="width: 24px; height: 4px; background: #8A8A72; display: inline-block"></span><b>FIXED CODEBOOK</b> ${B[N - 1]} wins</span>
<span style="margin-left: auto; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 16px; color: ${lead > 0 ? '#556B2F' : '#55583F'}">${lead >= 0 ? '+' : ''}${lead} ROUNDS ${lead > 0 ? 'FROM THE LINK' : 'VS THE BASELINE'}</span>
</div>`, true);
}

/* ---------------------------------------------------------------- case file */
function caseHtml(S) {
  const sm = S.summary;
  if (!sm) return ovShell('CASE FILE', '<div style="font-size: 13px">The case file is written when the operation ends.</div>');
  const myPair = S.you && S.you.pair != null ? S.you.pair : 0;
  const rows = sm.missions.map(r => {
    const mine = r.pair === myPair || sm.mode === '2p';
    const race = mine && (S.races || {})[r.mission];
    const fk = sm.mode === '4p' && r.fake ? `<span style="padding: 1px 6px; background: #262B16; color: #F6F4EC; font-size: 10px; letter-spacing: 1px">FAKE LINK</span>` : '';
    return `<div class="case-row" style="display: grid; grid-template-columns: 54px 200px 1fr 110px 110px 120px; align-items: center; gap: 10px; height: 38px; padding: 0 8px; border-bottom: 1px solid #CDCBB5; font-size: 12px">
<span style="color: #55583F">M${r.mission}</span><span style="font-weight: 700">${esc(r.name)}${sm.mode === '4p' ? ' · PAIR ' + (r.pair + 1) : ''}</span>
<span style="display: flex; align-items: center; gap: 8px">${pct(r.rate)}% ${fk}${r.wager ? `<span style="font-size: 10px; color: ${r.wager_ok ? '#556B2F' : '#8A4B00'}; border: 1px solid currentColor; padding: 1px 5px">WAGER ${r.wager_ok ? 'WON' : 'LOST'}</span>` : ''}</span>
<span style="color: ${GOLD}; letter-spacing: 2px; font-size: 14px">${starStr(r.stars)}</span><span style="font-weight: 700">${r.points.toLocaleString()} pts</span>
${race ? `<button type="button" data-act="race" data-m="${r.mission}" class="btn btn-ghost" style="height: 28px; padding: 0 10px; font-size: 10px">REPLAY RACE</button>` : '<span></span>'}</div>`;
  }).join('');
  const ev = (sm.events || []).filter(e => e.t !== 'result').map(e => {
    if (e.t === 'vote') return `M${e.mission} · VOTE · ${e.burned ? esc(e.burned) + ' burned' + (e.was_mole ? ' (the Mole)' : ' (not the Mole)') : 'nobody burned'}`;
    if (e.t === 'retest') return `M${e.mission} · RETEST pair ${e.pair + 1} · ${e.wins} of ${e.n}`;
    if (e.t === 'alibi') return `M${e.mission} · ${esc(e.name)} showed an alibi · ${e.tuned ? 'knobs were tuned' : 'knobs were off'}`;
    return '';
  }).filter(Boolean).map(t => `<div>${t}</div>`).join('');
  const mole = sm.mole ? `<div style="margin-top: 10px; padding: 10px 12px; background: #262B16; color: #F6F4EC; font-size: 12px; line-height: 18px"><b style="font-family: 'Silkscreen', monospace; letter-spacing: 2px; color: #C9D79A">THE MOLE WAS ${esc(sm.mole)}</b><br>${sm.cheat_missions.length ? 'Faked the link on mission' + (sm.cheat_missions.length > 1 ? 's ' : ' ') + sm.cheat_missions.join(' and ') + '.' : 'Never used a fake link.'} ${sm.winner === 'crew' ? 'The crew burned them.' : 'They got away.'}</div>` : '';
  const rank = S.rank ? `<span style="padding: 3px 10px; background: #556B2F; color: #F6F4EC; font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 1px">RANK #${S.rank} ${S.rankBoard && S.rankBoard.startsWith('daily') ? 'TODAY' : 'ALL TIME'}</span>` : '';
  return ovShell(`CASE FILE · ${sm.variant === 'daily' ? 'DAILY ' + esc(sm.daily) : sm.variant === 'endless' ? 'ENDLESS' : sm.mode === '4p' ? 'FOUR AGENTS' : 'TWO AGENTS'}`, `
<div style="display: flex; align-items: center; gap: 18px; margin-bottom: 8px">
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 34px; color: #262B16">${sm.total_points.toLocaleString()} PTS</span>
<span style="color: ${GOLD}; font-size: 20px; letter-spacing: 2px">${sm.stars} ★</span>${rank}
</div>
<div style="${H_SILK}; margin: 6px 0">MISSIONS</div>
${rows}
${ev ? `<div style="${H_SILK}; margin: 14px 0 6px">TIMELINE</div><div style="font-size: 12px; line-height: 20px; color: #3B4228">${ev}</div>` : ''}
${mole}
<div style="${H_SILK}; margin: 14px 0 6px">SHARE</div>
<div style="display: flex; gap: 14px; align-items: stretch">
<textarea id="share-text" readonly aria-label="Share text" style="flex: 1; height: 128px; box-sizing: border-box; padding: 10px; background: #ECEADD; border: 1px solid #B3B198; ${OV_FONT}; font-size: 12px; color: #262B16; resize: none">${esc(sm.text)}</textarea>
<button type="button" data-act="copycase" class="btn btn-ghost" style="${OUTLINE_BTN}; align-self: flex-start">COPY</button>
</div>
<div style="margin-top: 8px; font-size: 11px; color: #55583F">Rounds were drawn from: ${esc(sm.engine || '')}.</div>`, true);
}

/* ---------------------------------------------------------------- scores */
function scoresHtml(S) {
  const b = S.board;
  const list = (rows) => (rows && rows.length)
    ? rows.map((r, i) => `<div class="score-row" style="display: grid; grid-template-columns: 34px 1fr 90px 60px; gap: 8px; height: 30px; align-items: center; border-bottom: 1px solid #CDCBB5; font-size: 12px"><span style="color: #55583F">${i + 1}</span><span style="font-weight: 700">${esc(r.name)}</span><span style="text-align: right; font-weight: 700">${r.points.toLocaleString()}</span><span style="color: ${GOLD}; text-align: right">${r.stars}★</span></div>`).join('')
    : `<div style="font-size: 12px; color: #55583F; padding: 12px 0">No scores yet. Be the first.</div>`;
  const body = b
    ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px"><div><div style="${H_SILK}; margin-bottom: 8px">DAILY CASE FILE · ${esc(b.daily.date)}</div>${list(b.daily.entries)}</div><div><div style="${H_SILK}; margin-bottom: 8px">ENDLESS · ALL TIME</div>${list(b.endless.entries)}</div></div>`
    : `<div style="font-size: 13px">Loading…</div>`;
  return ovShell('SCORES', body);
}

function guideHtml(S) {
  const body = `
<div style="display: flex; flex-direction: column; gap: 18px">
  <div style="font-size: 13px; line-height: 20px; color: #3B4228; border-bottom: 1px solid #CDCBB5; padding-bottom: 10px">
    <b>Twin Signal</b> is a co-op spy game built on real quantum physics. Two agents in sealed bunkers coordinate via entangled particles. Here are the <b>3 simple rules</b> to master the game:
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px">
    <!-- Card 1 -->
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; background: #ECEADD; border: 1px solid #B3B198; box-shadow: 3px 3px 0 rgba(38,43,22,0.15)">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 1px; color: #556B2F; font-weight: 700">STEP 1 · BRIEFING</span>
        <span style="font-size: 15px">🎛</span>
      </div>
      <div style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 13px; color: #262B16">TUNE DETECTORS</div>
      <div style="font-size: 12px; line-height: 18px; color: #3B4228">
        Turn your <b>Blue</b> and <b>Red</b> knobs. Watch the <b>TEAM AVG</b> meter — tune until it crosses the dashed 75% line into the <b>GOLD ZONE (&gt;75%)</b>.
      </div>
      <div style="margin-top: auto; padding: 6px 8px; background: #FFFDF6; border: 1px dashed #556B2F; font-size: 11px; color: #556B2F">
        ✔ <b>Goal:</b> Beat 75% before hitting LOCK IN!
      </div>
    </div>

    <!-- Card 2 -->
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; background: #ECEADD; border: 1px solid #B3B198; box-shadow: 3px 3px 0 rgba(38,43,22,0.15)">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 1px; color: #556B2F; font-weight: 700">STEP 2 · SILENT RUN</span>
        <span style="font-size: 15px">🚪</span>
      </div>
      <div style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 13px; color: #262B16">THE MISSION RULE</div>
      <div style="font-size: 12px; line-height: 18px; color: #3B4228">
        Agents get cards and auto-pick doors:
        <ul style="margin: 4px 0 0 16px; padding: 0">
          <li><b style="color: #8B0000">🔴 + 🔴 (Both Red):</b> Pick <b>DIFFERENT</b> doors (L+R or R+L)</li>
          <li><b>Any Other Cards:</b> Pick the <b>SAME</b> door (L+L or R+R)</li>
        </ul>
      </div>
      <div style="margin-top: auto; padding: 6px 8px; background: #FFFDF6; border: 1px dashed #556B2F; font-size: 11px; color: #556B2F">
        ✔ <b>Entanglement:</b> Unlocks up to <b>85% sync</b>!
      </div>
    </div>

    <!-- Card 3 -->
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; background: #ECEADD; border: 1px solid #B3B198; box-shadow: 3px 3px 0 rgba(38,43,22,0.15)">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 1px; color: #8B0000; font-weight: 700">STEP 3 · MEETING</span>
        <span style="font-size: 15px">🕵</span>
      </div>
      <div style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 13px; color: #262B16">SPOT THE MOLE</div>
      <div style="font-size: 12px; line-height: 18px; color: #3B4228">
        The Mole fakes their link with ordinary classical chips. <b>Classical links CANNOT break 75%.</b>
        <br><br>
        If a pair scores below 75% or fails a Bell Retest, <b>one of them is a Mole</b>!
      </div>
      <div style="margin-top: auto; padding: 6px 8px; background: #FFFDF6; border: 1px dashed #8B0000; font-size: 11px; color: #8B0000">
        ⚠ <b>Suspect anyone:</b> Stuck at or below 75%!
      </div>
    </div>
  </div>

  <details style="padding: 10px 14px; background: rgba(85,107,47,0.08); border: 1px solid #B3B198; font-size: 12px; line-height: 18px; color: #3B4228; cursor: pointer">
    <summary style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #556B2F; letter-spacing: 1px">
      WHY 75%? THE REAL QUANTUM SCIENCE (CLICK TO EXPAND)
    </summary>
    <div style="margin-top: 8px; font-size: 12px; line-height: 18px; color: #262B16">
      Without communication, normal everyday physics can only ever win 3 of the 4 card combinations simultaneously (3 out of 4 = <b>75.0%</b>). This is known as <i>Bell's Inequality</i>.
      <br><br>
      In 1964, physicist John Bell showed that entangled particles measured at offset angles (the knobs!) shatter this classical limit and reach <b>cos²(π/8) ≈ 85.4%</b>. Proving this won the <b>2022 Nobel Prize in Physics</b>.
    </div>
  </details>

  <div style="display: flex; justify-content: flex-end; gap: 12px">
    <button type="button" data-act="close" class="btn btn-primary" style="height: 40px; padding: 0 28px; ${BTN_PRIMARY}; font-size: 14px">GOT IT, LET'S PLAY</button>
  </div>
</div>`;
  return ovShell('HOW TO PLAY · 30-SECOND GUIDE', body, true);
}

function overlayHtml(S) {
  if (!S.ov) return '';
  switch (S.ov.k) {
    case 'guide': return guideHtml(S);
    case 'lab': return labHtml(S);
    case 'race': return raceHtml(S);
    case 'case': return caseHtml(S);
    case 'scores': return scoresHtml(S);
  }
  return '';
}

/* ---------------------------------------------------------------- role reveal splash (Among Us style) */
function roleSplashHtml(S) {
  const isMole = S.you && S.you.role === 'mole';
  const isCoop = S.variant === 'daily' || S.variant === 'endless';
  const myName = (S.you && (S.you.name || S.you.codename)) || (S.players && S.players[S.you && S.you.seat] && S.players[S.you.seat].name) || 'OPERATIVE';
  const myPair = S.you && S.you.pair != null ? S.you.pair + 1 : (S.you && S.you.seat != null ? (S.you.seat >> 1) + 1 : 1);
  const nameLabel = (S.you && S.you.name && S.you.codename && S.you.name !== S.you.codename) ? 'NICKNAME' : 'CODENAME';

  // Partner detection for 8p Mole network
  let partnerName = 'NONE';
  if (isMole && S.mode === '8p' && S.you && S.you.mole_cell && S.you.mole_cell.length) {
    const pSeat = S.you.mole_cell[0];
    const pObj = (S.players || []).find(p => p.seat === pSeat);
    partnerName = pObj ? (pObj.name || pObj.codename) : `SEAT ${pSeat + 1}`;
  }

  const shadowCharges = (S.you && S.you.shadow != null) ? S.you.shadow : (S.mode === '8p' ? 3 : 2);

  // Theme palettes
  const theme = isMole ? {
    bg: 'radial-gradient(ellipse at 50% 36%, #2E0B0B 0%, #170505 50%, #0A0202 100%)',
    primary: '#FF4D4D',
    sub: '#FF8A8A',
    border: '#7A1C1C',
    boxBg: 'rgba(38, 12, 12, 0.88)',
    tagBg: '#541212',
    shadowGlow: '0 0 35px rgba(255, 77, 77, 0.45)',
    btnBg: '#8A2020',
    title: 'MOLE',
    subtitle: 'INFILTRATOR · COVERT SABOTEUR',
    eyebrow: 'INTERCEPTED CELL FREQUENCY // EYES ONLY',
  } : isCoop ? {
    bg: 'radial-gradient(ellipse at 50% 36%, #2A240C 0%, #171406 50%, #0B0A03 100%)',
    primary: '#E0B84C',
    sub: '#F6F4EC',
    border: '#5C4A16',
    boxBg: 'rgba(32, 28, 12, 0.88)',
    tagBg: '#4A3D18',
    shadowGlow: '0 0 35px rgba(224, 184, 76, 0.35)',
    btnBg: '#8A6B00',
    title: 'AGENTS',
    subtitle: 'TWIN HARMONY · PURE CO-OP',
    eyebrow: 'DEEP SPACE QUANTUM CHANNEL // SYNCHRONIZING',
  } : {
    bg: 'radial-gradient(ellipse at 50% 36%, #1E2812 0%, #12180A 50%, #080A04 100%)',
    primary: '#C9D79A',
    sub: '#556B2F',
    border: '#3B4A22',
    boxBg: 'rgba(24, 32, 14, 0.88)',
    tagBg: '#2D3A18',
    shadowGlow: '0 0 35px rgba(201, 215, 154, 0.35)',
    btnBg: '#556B2F',
    title: 'AGENT',
    subtitle: 'FIELD OPERATIVE · CREW ALIGNED',
    eyebrow: 'AGENCY DIRECTIVE // TOP SECRET // COMPARTMENTED',
  };

  const iconMole = `
    <svg width="104" height="104" viewBox="0 0 100 100" fill="none" style="filter: drop-shadow(0 0 16px rgba(255,77,77,0.7)); display: block">
      <circle cx="50" cy="50" r="46" stroke="#FF4D4D" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>
      <path d="M50 16 C34 16 26 28 24 48 C22 66 18 78 12 86 L88 86 C82 78 78 66 76 48 C74 28 66 16 50 16 Z" fill="#200606" stroke="#FF4D4D" stroke-width="2.5"/>
      <path d="M30 46 L70 46 L66 54 L34 54 Z" fill="#FF4D4D"/>
      <line x1="22" y1="50" x2="78" y2="50" stroke="#FF8A8A" stroke-width="1.5"/>
      <path d="M47 54 L44 68 L53 72 L50 86" stroke="#FF4D4D" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  const iconAgent = `
    <svg width="104" height="104" viewBox="0 0 100 100" fill="none" style="filter: drop-shadow(0 0 16px rgba(201,215,154,0.6)); display: block">
      <circle cx="50" cy="50" r="46" stroke="#556B2F" stroke-width="2" stroke-dasharray="6 3" opacity="0.7"/>
      <line x1="50" y1="4" x2="50" y2="16" stroke="#C9D79A" stroke-width="2"/>
      <line x1="50" y1="84" x2="50" y2="96" stroke="#C9D79A" stroke-width="2"/>
      <line x1="4" y1="50" x2="16" y2="50" stroke="#C9D79A" stroke-width="2"/>
      <line x1="84" y1="50" x2="96" y2="50" stroke="#C9D79A" stroke-width="2"/>
      <path d="M50 20 C38 20 32 30 32 46 C32 60 22 74 16 86 L84 86 C78 74 68 60 68 46 C68 30 62 20 50 20 Z" fill="#131B0B" stroke="#C9D79A" stroke-width="2.5"/>
      <rect x="36" y="38" width="28" height="10" rx="3" fill="#556B2F" stroke="#C9D79A" stroke-width="1.5"/>
      <circle cx="44" cy="43" r="2.5" fill="#F6F4EC"/>
      <circle cx="56" cy="43" r="2.5" fill="#F6F4EC"/>
      <path d="M68 44 L76 34 L78 35" stroke="#C9D79A" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  const iconCoop = `
    <svg width="104" height="104" viewBox="0 0 100 100" fill="none" style="filter: drop-shadow(0 0 16px rgba(224,184,76,0.6)); display: block">
      <circle cx="50" cy="50" r="46" stroke="#8A6B00" stroke-width="2" stroke-dasharray="6 3" opacity="0.7"/>
      <circle cx="39" cy="50" r="20" stroke="#E0B84C" stroke-width="3"/>
      <circle cx="61" cy="50" r="20" stroke="#F6F4EC" stroke-width="3"/>
      <path d="M50 36 C55 42 55 58 50 64" stroke="#E0B84C" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`;

  const icon = isMole ? iconMole : isCoop ? iconCoop : iconAgent;

  const dossierHtml = isMole ? `
    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 18px;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,77,77,0.25); padding-bottom: 5px;">
        <span style="color: #A86060;">${nameLabel}</span><span style="font-weight: 700; color: #FFF;">${esc(myName)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,77,77,0.25); padding-bottom: 5px;">
        <span style="color: #A86060;">PAIR ASSIGNMENT</span><span style="font-weight: 700; color: #FFF;">PAIR ${myPair}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,77,77,0.25); padding-bottom: 5px;">
        <span style="color: #A86060;">SHADOW POOL</span><span style="font-weight: 700; color: #FF4D4D;">${shadowCharges} CHARGES</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 2px;">
        <span style="color: #A86060;">CELL NETWORK</span><span style="font-weight: 700; color: ${S.mode === '8p' ? '#FF8A8A' : '#FFF'};">${S.mode === '8p' ? 'PARTNER: ' + esc(partnerName) : 'SOLO OPERATIVE (1 MOLE)'}</span>
      </div>
    </div>` : isCoop ? `
    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 18px;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(224,184,76,0.25); padding-bottom: 5px;">
        <span style="color: #A89860;">${nameLabel}</span><span style="font-weight: 700; color: #FFF;">${esc(myName)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(224,184,76,0.25); padding-bottom: 5px;">
        <span style="color: #A89860;">OPERATION</span><span style="font-weight: 700; color: #E0B84C;">${S.variant === 'daily' ? 'DAILY CASE PROTOCOL' : 'ENDLESS SURVIVAL'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(224,184,76,0.25); padding-bottom: 5px;">
        <span style="color: #A89860;">THREAT LEVEL</span><span style="font-weight: 700; color: #C9D79A;">0 SABOTEURS · PURE CO-OP</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 2px;">
        <span style="color: #A89860;">QUANTUM CEILING</span><span style="font-weight: 700; color: #FFF;">cos²(π/8) ≈ 85.4%</span>
      </div>
    </div>` : `
    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 18px;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(85,107,47,0.35); padding-bottom: 5px;">
        <span style="color: #8A9670;">${nameLabel}</span><span style="font-weight: 700; color: #FFF;">${esc(myName)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(85,107,47,0.35); padding-bottom: 5px;">
        <span style="color: #8A9670;">PAIR ASSIGNMENT</span><span style="font-weight: 700; color: #FFF;">PAIR ${myPair}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(85,107,47,0.35); padding-bottom: 5px;">
        <span style="color: #8A9670;">THREAT LEVEL</span><span style="font-weight: 700; color: #E0B84C;">${S.mode === '8p' ? '2 MOLES IN NETWORK' : '1 MOLE AMONG US'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 2px;">
        <span style="color: #8A9670;">REQUIRED QUOTA</span><span style="font-weight: 700; color: #C9D79A;">> 75.0% TO SURPASS WALL</span>
      </div>
    </div>`;

  const directivesHtml = isMole ? `
    <div style="display: flex; flex-direction: column; gap: 9px; font-size: 12px; line-height: 17px; color: #F0D0D0;">
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #FF4D4D;">01</span>
        <span><b>MAINTAIN COVER:</b> Blend in during early runs so your pair's win rate doesn't trigger immediate alarm.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #FF4D4D;">02</span>
        <span><b>SHADOW ARSENAL:</b> Fake links to secretly collapse sync, or jam rivals' telemetry meters in debrief.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #FF4D4D;">03</span>
        <span><b>FORGE ALIBIS:</b> Cook plausible telemetry logs and steer burn votes away from ${S.mode === '8p' ? 'your cell' : 'yourself'}.</span>
      </div>
    </div>` : isCoop ? `
    <div style="display: flex; flex-direction: column; gap: 9px; font-size: 12px; line-height: 17px; color: #EDE8D0;">
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #E0B84C;">01</span>
        <span><b>COORDINATE SETTINGS:</b> Chat with your twin to dial in complementary measurement angles.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #E0B84C;">02</span>
        <span><b>HOLD QUANTUM MAX:</b> Lock in rates >80% to earn 3 stars and break the global leaderboard.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #E0B84C;">03</span>
        <span><b>COUNTER DRIFT:</b> Quickly recalibrate when thermal fluctuations shift your knobs off-center.</span>
      </div>
    </div>` : `
    <div style="display: flex; flex-direction: column; gap: 9px; font-size: 12px; line-height: 17px; color: #E6EAD6;">
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #C9D79A;">01</span>
        <span><b>TUNE DETECTORS:</b> Align angle knobs in the briefing room until the quantum hum stabilizes above 75%.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #C9D79A;">02</span>
        <span><b>AUDIT TELEMETRY:</b> Scrutinize coarse tags (SOLID / NOISY / WEAK) and interrogate suspicious drops.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Silkscreen', monospace; font-weight: 700; color: #C9D79A;">03</span>
        <span><b>ROOT OUT SABOTEURS:</b> Re-test suspect pairs and cast votes before the agency's energy runs dry.</span>
      </div>
    </div>`;

  return `
<div id="role-splash-overlay" class="fadein" style="position: absolute; inset: 0; width: 1280px; height: 720px; z-index: 25; background: ${theme.bg}; display: flex; flex-direction: column; justify-content: space-between; padding: 28px 48px 24px; box-sizing: border-box; font-family: 'JetBrains Mono', monospace; color: #F6F4EC; user-select: none;">
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${theme.border}; padding-bottom: 10px;">
    <span style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 3px; color: ${theme.primary};">${theme.eyebrow}</span>
    <span style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 2px; color: #8A8A72;">MISSION 1 READY</span>
  </div>

  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 6px;">
    <div style="margin-bottom: 12px;">${icon}</div>
    <div class="pop" style="font-family: 'Silkscreen', monospace; font-size: 64px; font-weight: 700; letter-spacing: 12px; color: ${theme.primary}; text-shadow: ${theme.shadowGlow}; line-height: 1; margin-bottom: 8px;">${theme.title}</div>
    <div style="font-family: 'Silkscreen', monospace; font-size: 13px; letter-spacing: 4px; color: ${theme.sub}; text-transform: uppercase;">${theme.subtitle}</div>
  </div>

  <div style="display: grid; grid-template-columns: 380px 1fr; gap: 24px; max-width: 1060px; width: 100%; margin: 0 auto;">
    <div style="background: ${theme.boxBg}; border: 1.5px solid ${theme.border}; padding: 16px 20px; box-shadow: 6px 6px 0 #000;">
      <div style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 2px; color: ${theme.primary}; margin-bottom: 12px;">DOSSIER SPECIFICATION</div>
      ${dossierHtml}
    </div>

    <div style="background: ${theme.boxBg}; border: 1.5px solid ${theme.border}; padding: 16px 20px; box-shadow: 6px 6px 0 #000;">
      <div style="font-family: 'Silkscreen', monospace; font-size: 11px; letter-spacing: 2px; color: ${theme.primary}; margin-bottom: 12px;">MISSION DIRECTIVES</div>
      ${directivesHtml}
    </div>
  </div>

  <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid ${theme.border}; padding-top: 14px;">
    <div style="display: flex; flex-direction: column; gap: 6px; width: 340px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8A8A72; font-family: 'Silkscreen', monospace; letter-spacing: 1px;">
        <span>DEPLOYING TO BRIEFING</span>
        <span>AUTO-COMMENCING</span>
      </div>
      <div style="position: relative; width: 100%; height: 4px; background: rgba(255,255,255,0.1); overflow: hidden;">
        <div class="role-prog" style="position: absolute; left: 0; top: 0; bottom: 0; background: ${theme.primary};"></div>
      </div>
    </div>

    <button type="button" id="role-proceed-btn" data-act="closerole" class="btn" style="height: 42px; padding: 0 32px; background: ${theme.btnBg}; color: #F6F4EC; border: 2px solid ${theme.primary}; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 12px; letter-spacing: 2px; box-shadow: 0 4px 14px rgba(0,0,0,0.6);">
      BEGIN MISSION [SPACE / ESC]
    </button>
  </div>
</div>`;
}

