/* Twin Signal client templates, part B: meeting, burn result, Declassified (Nerd Mode). */

const BUST_L = `<g id="m-bust" shape-rendering="crispEdges">
<polygon points="6,64 10,46 24,40 36,40 50,46 54,64" fill="#262B16"/>
<rect x="22" y="22" width="16" height="18" fill="#3B4228"/>
<rect x="22" y="28" width="16" height="4" fill="#14170C"/>
<rect x="25" y="28" width="3" height="1" fill="#FFFDF6"/>
<polygon points="14,22 46,22 50,26 10,26" fill="#14170C"/>
<rect x="19" y="10" width="22" height="13" fill="#14170C"/>
</g>`;
const bustTie = c => `<rect x="19" y="19" width="22" height="3" fill="${c}"/><polygon points="28,40 32,40 33,52 30,56 27,52" fill="${c}"/>`;

function mmss(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

function oneIn(p) {
  if (p >= 0.5) return 'most of the time';
  if (p <= 0) return 'almost never';
  let n = Math.round(1 / p);
  if (n > 100) n = Math.round(n / 50) * 50; else if (n > 20) n = Math.round(n / 5) * 5;
  return `1 time in ${n}`;
}

function bellMeter(e) {
  const m = e.meter || e.llr;
  if (!m || (m !== 'LOW' && m !== 'MID' && m !== 'HIGH')) return '';
  const col = m === 'HIGH' ? '#556B2F' : (m === 'MID' ? '#B8860B' : '#8B0000');
  const txt = m === 'HIGH' ? '✔ QUANTUM (CLEARED)' : (m === 'MID' ? 'AMBIGUOUS' : '⚠ FAKED LINK (MOLE)');
  const pctW = m === 'LOW' ? '33%' : (m === 'MID' ? '66%' : '100%');
  return `<div style="display: flex; align-items: center; gap: 8px; font-size: 10px; color: #55583F" title="Bell test likelihood rating after retest">
<span style="width: 76px; letter-spacing: 1px">BELL METER</span>
<div style="position: relative; flex: 1; height: 8px; background: #DEDCCB"><div class="bar-fill bell-fill" style="position: absolute; left: 0; width: ${pctW}; top: 0; bottom: 0; background: ${col}"></div></div>
<span style="width: 130px; text-align: right; font-weight: 700; color: ${col}">${txt}</span>
</div>`;
}

function pairCard(e, S, hi) {
  const hist = e.history || [];
  const cur = hist[hist.length - 1] || { rate: e.rate };
  const is8p = (S.players || []).length > 4;
  const tag = e.tag || (e.rate >= 0.82 ? 'solid' : e.rate >= 0.76 ? 'noisy' : 'weak');
  const tagCol = tag === 'solid' ? '#556B2F' : (tag === 'noisy' ? '#B8860B' : '#8B0000');
  const tagText = tag === 'solid' ? 'QUANTUM CERTIFIED (>75%)' : (tag === 'noisy' ? 'NEAR QUOTA (~76%)' : '⚠ SUSPICIOUS (<75% WALL)');
  const chips = [1, 2, 3, 4].map(m => {
    const h = hist.find(x => x.m === m);
    if (!h) return `<span style="flex: 1; padding: 2px 4px; border: 1px dashed #B3B198; text-align: center; font-size: 9px">M${m} —</span>`;
    const isCur = h === cur;
    return `<span style="flex: 1; padding: 2px 4px; background: #DEDCCB${isCur ? '; color: #262B16; font-weight: 700' : ''}; font-size: 9px; text-align: center">M${m} ${pct(h.rate)}%</span>`;
  }).join('\n');
  const box = hi
    ? 'border: 1px solid #262B16; border-left: 6px solid #262B16'
    : 'border: 1px solid #B3B198';
  const isFlashing = S._flashPair === e.pair;
  return `<div class="${isFlashing ? 'pair-flash' : ''}" style="display: flex; flex-direction: column; gap: ${is8p ? '4px' : '6px'}; padding: ${is8p ? '8px 10px' : '10px 12px'}; background: #F6F4EC; ${box}">
<div style="display: flex; align-items: baseline; justify-content: space-between">
<span style="font-size: 11px; font-weight: 700">PAIR ${e.pair + 1} · ${esc(e.names[0])} + ${esc(e.names[1])}</span>
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: ${is8p ? '20px' : '26px'}; color: ${tagCol}">${pct(e.rate)}%</span>
</div>
<div style="position: relative; height: 8px; background: #DEDCCB">
<div class="bar-fill" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${barW(e.rate)}%; background: ${tagCol}"></div>
<div style="position: absolute; left: 50%; top: -3px; bottom: -3px; width: 2px; background: #262B16" title="75% Classical Wall"></div>
</div>
<div style="display: flex; justify-content: space-between; font-size: 10px; color: #55583F">
<span>75% WALL</span>
<span style="font-weight: 700; color: ${tagCol}">${tagText}</span>
</div>
<div style="display: flex; gap: 4px; font-size: 10px; color: #55583F">
${chips}
</div>
${bellMeter(e)}
</div>`;
}

function evidenceHtml(S) {
  const ev = S.meetEv || [];
  const selPair = S.sel != null ? (S.players || []).find(p => p.seat === S.sel)?.pair : null;
  const is8p = (S.players || []).length > 4;
  const retest = (S.retests || []).map(r => `<div style="font-size: 11px; color: #3B4228; font-family: 'Silkscreen', monospace">RETEST · PAIR ${r.pair + 1} · ${r.wins} OF ${r.n} SYNC</div>`).join('');
  return `<div style="display: flex; align-items: center; justify-content: space-between">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">EVIDENCE · MISSION ${S.meetMission || ''}</span>
<span style="padding: 2px 6px; border: 1px solid #556B2F; font-size: 10px; letter-spacing: 1px; color: #556B2F">NOISE: ${esc(S.noise || 'LOW')}</span>
</div>
<div style="padding: 5px 8px; background: rgba(38,43,22,0.06); border: 1px dashed #B3B198; font-size: 10px; line-height: 14px; color: #3B4228">
<b>🕵 MOLE CLUE:</b> Real quantum pairs beat 75%. Impostors fake signals with classical chips trapped below 75%. Suspect anyone with weak scores or a faked Bell meter!
</div>
<div style="display: flex; flex-direction: column; gap: ${is8p ? '6px' : '8px'}">
${ev.map(e => pairCard(e, S, e.pair === selPair)).join('\n')}
</div>
${retest}
<div style="font-size: 11px; line-height: 15px; color: #55583F">Rates are rounded to 2% and tagged. Each pair gets 1 signal energy to retest a suspect pair and read the Bell meter.</div>`;
}

const talking = (S, seat) => (S.chat || []).some(c => c.seat === seat && c.t && Date.now() - c.t < 6000);
function agentCard(p, S) {
  const me = S.you && p.seat === S.you.seat;
  const mate = S.you && p.seat === (S.you.seat ^ 1);
  const sel = S.sel === p.seat;
  const voted = (S.votes && S.votes.voted || []).includes(p.seat);
  const spect = S.you && S.you.spectator;
  const col = SEAT_COL[p.seat];
  const is8p = (S.players || []).length > 4;
  const isMole = S.you && S.you.role === 'mole';
  const shadow = S.you && (S.you.shadow != null ? S.you.shadow : S.you.cheats_left || 0);

  const tag = me
    ? `<span style="padding: 2px 6px; background: #262B16; color: #F6F4EC; font-size: 10px; letter-spacing: 1px">YOU · PAIR ${p.pair + 1}</span>`
    : `<span style="padding: 2px 6px; border: 1px solid #55583F; font-size: 10px; letter-spacing: 1px; color: #55583F">PAIR ${p.pair + 1}${mate || voted || p.burned || talking(S, p.seat) ? ' · ' : ''}${mate ? 'PARTNER' : voted ? 'VOTED' : p.burned ? 'BOT' : talking(S, p.seat) ? 'TALKING' : ''}</span>`;
  let action;
  if (p.burned) action = `<span style="height: ${is8p ? '32px' : '44px'}; display: flex; align-items: center; font-size: 11px; color: #55583F">LINK BURNED</span>`;
  else if (me) {
    if (!IS_DEMO && !spect && !p.burned && !(S.alibis || {})[p.seat]) {
      if (isMole) {
        action = `<div style="display: flex; gap: 4px; width: 100%">
          <button type="button" data-act="alibi" class="btn btn-ghost" style="flex: 1; height: 32px; font-size: 9px; letter-spacing: 0.5px">ALIBI</button>
          <button type="button" data-act="forge" ${shadow <= 0 ? 'disabled' : ''} class="btn btn-ink" style="flex: 1; height: 32px; font-size: 9px; letter-spacing: 0.5px; ${shadow <= 0 ? 'opacity: 0.4' : ''}">FORGE (-1)</button>
        </div>`;
      } else {
        action = `<button type="button" data-act="alibi" class="btn btn-ghost" style="height: ${is8p ? '32px' : '44px'}; width: 100%; font-size: ${is8p ? '11px' : '13px'}; letter-spacing: 1px">SHOW ALIBI</button>`;
      }
    } else {
      action = `<span style="height: ${is8p ? '32px' : '44px'}; display: flex; align-items: center; font-size: 11px; color: #55583F">${voted ? 'VOTED' : (S.alibis || {})[p.seat] ? 'ALIBI SHOWN' : 'THIS IS YOU'}</span>`;
    }
  } else if (spect) action = `<span style="height: ${is8p ? '32px' : '44px'}; display: flex; align-items: center; font-size: 11px; color: #55583F">${voted ? 'VOTED' : '—'}</span>`;
  else action = sel
    ? `<button type="button" data-act="burn" data-seat="${p.seat}" aria-pressed="true" class="btn btn-ink" style="height: ${is8p ? '32px' : '44px'}; width: 100%; font-size: ${is8p ? '11px' : '13px'}; letter-spacing: 1px">SELECTED</button>`
    : `<button type="button" data-act="burn" data-seat="${p.seat}" aria-pressed="false" class="btn btn-ghost" style="height: ${is8p ? '32px' : '44px'}; width: 100%; font-size: ${is8p ? '11px' : '13px'}; letter-spacing: 1px">BURN LINK</button>`;

  const bustH = is8p ? 48 : 64, bustW = is8p ? 45 : 60;
  const canSelect = !p.burned && !spect;
  return `<div class="agent-card${sel ? ' is-selected' : ''}" ${canSelect ? `data-act="burn" data-seat="${p.seat}"` : ''} style="display: flex; flex-direction: column; align-items: center; gap: ${is8p ? '4px' : '6px'}; padding: ${is8p ? '8px 6px' : '14px 10px'}; background: ${sel ? '#F6F4EC' : '#ECEADD'}; border: ${sel ? '3px solid #262B16' : '1px solid #B3B198'}${p.burned ? '; opacity: 0.55' : ''}">
<svg width="${bustW}" height="${bustH}" viewBox="0 0 60 64" aria-hidden="true"><use href="#m-bust"/>${bustTie(col)}</svg>
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: ${is8p ? '12px' : '15px'}; letter-spacing: 1px">${esc(p.name)}</span>
${tag}
${alibiLine(S, p)}
${action}
</div>`;
}

function alibiLine(S, p) {
  const a = (S.alibis || {})[p.seat];
  if (!a) return '';
  const isMole = S.you && S.you.role === 'mole';
  const tag = (a.forged && isMole) ? '<span style="color: #8B0000; font-weight: 700">[FORGED] </span>' : '';
  return `<div class="fadein" style="font-size: 10px; line-height: 13px; text-align: center; color: #3B4228">${tag}ALIBI · BLUE SNAP ${a.knobs[0] + 1} · RED SNAP ${a.knobs[1] + 1}${a.drift ? ' · DRIFT ' + (a.drift > 0 ? '+' : '') + a.drift : ''}<br><b style="color: ${a.tuned ? '#556B2F' : '#8A4B00'}">${a.tuned ? 'PAIR WAS TUNED' : 'PAIR OFF-TUNE · ' + pct(a.ideal) + '% IDEAL'}</b></div>`;
}

function meetingChat(S) {
  const lines = (S.chat || []).filter(c => c.scope !== 'pair' && c.scope !== 'mole').slice(-6);
  return lines.map(c => {
    const me = S.you && c.seat === S.you.seat;
    if (me) return `<div style="padding: 8px 10px; background: #556B2F; color: #F6F4EC"><span style="font-weight: 700">YOU</span> ${esc(c.text)}</div>`;
    const col = c.seat >= 0 ? SEAT_COL[c.seat] : '#556B2F';
    return `<div style="padding: 8px 10px; background: #ECEADD; border: 1px solid #B3B198"><span style="font-weight: 700; color: ${col}">${esc(c.from)}</span> ${esc(c.text)}</div>`;
  }).join('');
}

function tplMeeting(S) {
  const players = S.players || [];
  const is8p = players.length > 4;
  const votes = S.votes || { voted: [], count: 0, total: players.filter(p => !p.burned).length };
  const sq = Array.from({ length: votes.total }, (_, i) => i < votes.count
    ? `<span class="vote-sq-filled" style="animation-delay: ${i * 0.08}s"></span>`
    : `<span style="display: inline-block; width: 12px; height: 12px; box-sizing: border-box; border: 1px solid #55583F"></span>`).join('');
  const spect = S.you && S.you.spectator;
  const selP = S.sel != null ? players.find(p => p.seat === S.sel) : null;
  const canVote = !spect;
  const energy = S.energy != null ? S.energy : 0;
  const myPair = S.you ? S.you.pair : 0;
  const myEnergy = (S.pairEnergy && S.pairEnergy[myPair] != null) ? S.pairEnergy[myPair] : (energy > 0 ? 1 : 0);
  const moleRule = is8p
    ? 'Two Moles operate in separate pairs across these eight seats. Plurality burns an agent. Tie burns nobody.'
    : 'One of these four is the Mole. Plurality burns that agent\'s link. Tie burns nobody.';

  const colTemplate = is8p ? '340px minmax(520px, 1fr) 280px' : '380px 480px minmax(0, 1fr)';
  const gridTemplate = is8p ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))';

  return `<div style="${ROOT_L}">
<svg width="0" height="0" style="position: absolute" aria-hidden="true"><defs>${BUST_L}</defs></svg>

<div style="height: 56px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; box-sizing: border-box; border-bottom: 1px solid #B3B198; background: rgba(246,244,236,0.85)">
<div style="display: flex; align-items: baseline; gap: 16px">
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 22px; letter-spacing: 2px; color: #556B2F">TWIN SIGNAL</span>
<span style="font-size: 12px; letter-spacing: 2px; color: #55583F">MISSION ${S.meetMission || ''} COMPLETE · EMERGENCY MEETING</span>
</div>
<div style="display: flex; align-items: center; gap: 12px; font-size: 12px">
<span style="color: #55583F">VOTE CLOSES IN</span>
<span data-timer="${S.ends || 0}" style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 20px; letter-spacing: 2px; color: #556B2F">${mmss((S.ends || 0) - Date.now())}</span>
</div>
</div>

<div style="flex: 1; display: grid; grid-template-columns: ${colTemplate}; min-height: 0">

<div style="box-sizing: border-box; padding: 14px 18px; border-right: 1px solid #B3B198; background: #ECEADD; display: flex; flex-direction: column; gap: 10px; overflow-y: auto">
${evidenceHtml(S)}
</div>

<div style="box-sizing: border-box; padding: 14px 18px; border-right: 1px solid #B3B198; display: flex; flex-direction: column; gap: 10px">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">AGENTS · CAST YOUR VOTE</span>
<div style="display: grid; grid-template-columns: ${gridTemplate}; gap: ${is8p ? '6px' : '12px'}">
${players.map(p => agentCard(p, S)).join('\n')}
</div>
<div style="font-size: 11px; line-height: 15px; color: #55583F">${moleRule}</div>
</div>

<div style="box-sizing: border-box; padding: 14px 18px; background: #F0EEE2; display: flex; flex-direction: column; gap: 8px; min-width: 0">
<div style="display: flex; align-items: center; justify-content: space-between">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">MEETING CHAT · OPEN</span>
<span style="font-size: 11px; color: #55583F">PAIR ENERGY ${myEnergy}/1 · TOTAL ${energy}</span>
</div>
<div id="chat-log" aria-live="polite" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px; line-height: 16px">${meetingChat(S)}</div>
<div style="flex: 1"></div>
<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid #B3B198">
<button type="button" data-act="probe" ${myEnergy > 0 && !spect && S.sel != null ? '' : 'disabled'} class="btn btn-ghost" style="height: 40px; padding: 0 10px; font-size: 11px; letter-spacing: 1px; text-align: left${myEnergy > 0 && S.sel != null ? '' : '; opacity: 0.5'}">${myEnergy > 0 ? 'RETEST A PAIR · 20 ROUNDS · 1 PAIR ENERGY' : 'PAIR ENERGY SPENT (1 PER PAIR)'}</button>
${IS_DEMO ? '' : `<div style="display: flex; flex-wrap: wrap; gap: 4px">${['Show alibis', 'Retest them', 'Vote skip', 'Suspicious score'].map(t => `<button type="button" data-act="quick" data-text="${t}" ${spect ? 'disabled' : ''} class="quick-chip" style="height: 26px; padding: 0 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px">${t}</button>`).join('')}</div>`}
<div style="display: flex; gap: 6px">
<button type="button" data-act="quick" data-text="I'm clean" ${spect ? 'disabled' : ''} class="quick-chip" style="flex: 1; height: 36px; font-family: 'JetBrains Mono', monospace; font-size: 11px">I'm clean</button>
<button type="button" data-act="quick" data-text="Their score dropped" ${spect ? 'disabled' : ''} class="quick-chip" style="flex: 1; height: 36px; font-family: 'JetBrains Mono', monospace; font-size: 11px">Their score dropped</button>
</div>
<input id="chat-in" type="text" maxlength="140" ${spect ? 'disabled' : ''} aria-label="Meeting message" placeholder="Type a message" style="height: 38px; box-sizing: border-box; padding: 0 10px; background: #F6F4EC; border: 1px solid #B3B198; color: #262B16; font-family: 'JetBrains Mono', monospace; font-size: 12px">
</div>
</div>
</div>

<div style="height: 60px; flex: none; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: #ECEADD; border-top: 3px solid #556B2F">
<div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #55583F">
<span style="font-family: 'Silkscreen', monospace; letter-spacing: 2px">VOTES IN ${votes.count} / ${votes.total}</span>
<span style="display: flex; gap: 4px">${sq}</span>
</div>
<div style="display: flex; align-items: center; gap: 12px">
<button type="button" data-act="skip" ${canVote ? '' : 'disabled'} class="btn btn-ghost" style="height: 40px; padding: 0 16px; border-color: #262B16; color: #262B16; font-size: 13px; letter-spacing: 2px${canVote ? '' : '; opacity: 0.5'}">SKIP VOTE</button>
<button type="button" data-act="confirm" ${canVote && selP ? '' : 'disabled'} class="btn btn-primary" style="height: 40px; padding: 0 20px; ${BTN_PRIMARY}; font-size: 13px${canVote && selP ? '' : '; opacity: 0.5'}">${selP ? (S.myVote === selP.seat ? 'VOTE CAST: ' : 'CONFIRM VOTE: ') + esc(selP.name) : 'PICK AN AGENT'}</button>
</div>
</div>

${frame(`CASE FILE TS-${mm(S.meetMission || 0)} · MEETING`, false)}
</div>`;
}

/* ---------------------------------------------------------------- burn result */
function revealBars(hist, mode) {
  return (hist || []).map((h, i, a) => {
    const last = i === a.length - 1;
    const fake = h.fake === true;
    const col = fake ? '#8A8A72' : '#C9D79A';
    return `<div style="display: flex; align-items: center; gap: 12px; font-size: 12px">
<span style="width: 28px; color: #B9B79F">M${h.m}</span>
<div style="position: relative; flex: 1; height: 14px; background: #3B4228">
<div class="bar-fill" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${barW(h.rate)}%; background: ${col}"></div>
<div style="position: absolute; left: 50%; top: -3px; bottom: -3px; width: 2px; background: #F6F4EC"></div>
</div>
<span style="width: 120px; text-align: right${last ? '; font-weight: 700' : ''}">${pct(h.rate)}% ${fake ? 'FAKE LINK' : 'REAL LINK'}</span>
</div>`;
  }).join('');
}

function tplReveal(S) {
  const b = S.burn || {};
  const caughtAll = b.was_mole && b.game_over && b.winner === 'crew';
  const oneCellDown = b.was_mole && !b.game_over;
  const moleWin = b.winner === 'mole';
  const none = b.agent == null && !b.game_over;
  const accent = (caughtAll || oneCellDown) ? '#C9D79A' : '#E0B84C';
  const seat = b.agent != null ? b.agent : (b.mole != null ? (S.players || []).find(p => p.name === b.mole)?.seat : null);
  const nameOf = seat != null ? ((S.players || []).find(p => p.seat === seat)?.name || '') : '';
  const name = b.name || b.mole || nameOf || '';
  const col = seat != null ? SEAT_COL[seat] : '#8A8A72';
  const pair = (b.pair != null ? b.pair : (seat != null ? seat >> 1 : 0)) + 1;
  const hist = b.history || b.mole_history || [];
  let head, sub, barsTitle, foot, banner, bannerSub, tags, small = false, partnerFake = false;

  const maxW = b.max_wrong || (S.mode === '8p' ? 3 : 2);
  const cheatsMax = S.mode === '8p' ? 3 : 2;

  if (none) {
    head = `NOBODY<br>BURNED.`; sub = 'The vote tied or was skipped. The Mole stays hidden for another mission.';
    barsTitle = ''; banner = 'NO LINK BURNED'; bannerSub = 'Watch the scores on the next mission.';
  } else if (oneCellDown) {
    head = `${esc(name)} WAS<br>A MOLE.`;
    sub = `One cell down! A bot takes ${esc(name)}'s seat as they become a spectator. The second mole is still operating in the walls.`;
    barsTitle = 'HOW THEIR LINK PLAYED';
    foot = `Cheats used: ${b.cheats_used != null ? b.cheats_used : '—'} of ${cheatsMax}. White line is the 75% wall.`;
    banner = 'ONE CELL DOWN'; bannerSub = 'ONE STILL IN THE WALLS · MISSION CONTINUES';
    tags = true;
  } else if (caughtAll) {
    head = `${esc(name)} WAS<br>THE MOLE.`;
    sub = S.mode === '8p'
      ? `Both moles burned! The quantum network is fully secured.`
      : `Their link was a classical fake. No knob setting on a fake can beat the 75% wall, and Pair ${pair} stalled near it.`;
    barsTitle = 'HOW THEY GAVE THEMSELVES AWAY';
    foot = `Cheats used: ${b.cheats_used != null ? b.cheats_used : '—'} of ${cheatsMax}. White line is the 75% wall.`;
    banner = 'CREW WINS'; bannerSub = S.mode === '8p' ? 'All cells eliminated.' : `Mole caught on mission ${b.mission} of ${b.of}.`;
  } else if (moleWin) {
    head = b.reason === 'survived' ? `THE MOLES<br>WALK.` : `THE MOLE<br>WALKS.`;
    sub = b.reason === 'survived'
      ? 'Nobody burned them in time. Their fake link sat just under the wall and the crew never agreed.'
      : `${b.wrong_burns || maxW} honest agents were burned. The mole network wins.`;
    barsTitle = 'THE MOLE\'S PAIR, REVEALED';
    foot = `Cheats used: ${b.cheats_used != null ? b.cheats_used : '—'} of ${cheatsMax}. White line is the 75% wall.`;
    banner = 'MOLES WIN'; bannerSub = b.reason === 'survived' ? 'Survived every mission.' : `${maxW} wrong burns.`;
  } else {
    head = `${esc(name)} WAS NOT<br>A MOLE.`; small = true;
    partnerFake = hist.some(h => h.fake === true);
    sub = partnerFake
      ? `${esc(name)} played honest. The fake link was on the other end of Pair ${pair}, and the Mole is still hidden.`
      : `Their link was real. Pair ${pair} simply had an unlucky round, and the Mole is still hidden.`;
    barsTitle = 'WHY THEY LOOKED GUILTY';
    foot = 'White line is the 75% wall.';
    const rem = maxW - b.wrong_burns;
    banner = `WRONG BURN · ${b.wrong_burns} OF ${maxW}`;
    bannerSub = `${rem} more honest burn${rem === 1 ? '' : 's'} and the Mole wins. A bot takes ${esc(name)}'s seat.`;
    tags = true;
  }
  const art = `<svg viewBox="0 0 560 360" width="560" height="360" role="img" aria-label="${esc(name)} with a severed twin-link thread">
<circle cx="280" cy="190" r="170" fill="#2F3520" stroke="#4A5230" stroke-width="2"/>
<circle cx="280" cy="190" r="180" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="6 8" opacity="${(caughtAll || oneCellDown) ? 0.6 : 0.7}"/>
<g transform="translate(130,30) scale(5)">
<use href="#rv-bust"/>
${seat != null ? bustTie(col) : `<text x="30" y="34" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="14" fill="#F6F4EC">?</text>`}
</g>
<path d="M0,250 L108,250" fill="none" stroke="#C9D79A" stroke-width="4"/>
<path d="M452,250 L560,250" fill="none" stroke="#C9D79A" stroke-width="4"/>
<g fill="#F6F4EC" shape-rendering="crispEdges">
<rect x="114" y="238" width="5" height="5"/>
<rect x="124" y="256" width="4" height="4"/>
<rect x="120" y="226" width="3" height="3"/>
<rect x="436" y="238" width="5" height="5"/>
<rect x="428" y="258" width="4" height="4"/>
<rect x="434" y="224" width="3" height="3"/>
</g>
<g transform="translate(280,${tags ? 296 : 300}) rotate(-6)">
<rect x="-116" y="-22" width="232" height="44" fill="#F6F4EC"/>
<text x="0" y="7" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="20" letter-spacing="2" fill="#262B16">${none ? 'LINK INTACT' : moleWin && b.reason === 'survived' ? 'NEVER BURNED' : 'LINK BURNED'}</text>
</g>
${tags ? `<g transform="translate(300,338) rotate(3)">
<rect x="-100" y="-16" width="200" height="32" fill="#E0B84C"/>
<text x="0" y="6" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="15" letter-spacing="2" fill="#262B16">${partnerFake ? 'PLAYED HONEST' : (oneCellDown ? 'WAS A MOLE' : 'LINK WAS REAL')}</text>
</g>` : ''}
</svg>`;
  const bannerBg = (caughtAll || oneCellDown) ? '#C9D79A' : '#E0B84C';
  const gameOver = b.game_over;
  const host = S.you && S.you.host;
  const rightBtn = gameOver ? (host ? (S.canRematch ? 'REMATCH' : 'FINALE RUNNING…') : 'WAITING FOR HOST') : 'NEXT MISSION';
  const rAct = gameOver ? 'again' : 'continue';
  const iR = S.you && (S.players || []).find(p => p.seat === S.you.seat)?.ready;
  return `<div style="${ROOT_D}">
<svg width="0" height="0" style="position: absolute" aria-hidden="true">
<defs>
<g id="rv-bust" shape-rendering="crispEdges">
<polygon points="6,64 10,46 24,40 36,40 50,46 54,64" fill="#6B7440"/>
<rect x="22" y="22" width="16" height="18" fill="#B9B79F"/>
<rect x="22" y="28" width="16" height="4" fill="#14170C"/>
<rect x="25" y="28" width="3" height="1" fill="#F6F4EC"/>
<polygon points="14,22 46,22 50,26 10,26" fill="#14170C" stroke="#B9B79F" stroke-width="0.6"/>
<rect x="19" y="10" width="22" height="13" fill="#14170C" stroke="#B9B79F" stroke-width="0.6"/>
</g>
</defs>
</svg>

<div style="height: 56px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; box-sizing: border-box; border-bottom: 1px solid #4A5230">
<div style="display: flex; align-items: baseline; gap: 16px">
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 22px; letter-spacing: 2px; color: #C9D79A">TWIN SIGNAL</span>
<span style="font-size: 12px; letter-spacing: 2px; color: #B9B79F">MISSION ${b.mission || ''} · BURN RESULT</span>
</div>
<span style="font-size: 12px; letter-spacing: 2px; color: #B9B79F">ROOM ${esc(S.code || '')}</span>
</div>

<div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 48px; padding: 0 32px">
${art}
<div style="width: 560px; display: flex; flex-direction: column; gap: 18px">
<span style="font-size: 12px; letter-spacing: 2px; color: ${accent}">BURN RESULT · ${none ? 'NO ONE' : esc(name)}</span>
<h1 style="margin: 0; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: ${small ? 48 : 56}px; line-height: ${small ? 54 : 60}px; letter-spacing: 1px; color: #F6F4EC">${head}</h1>
<div style="font-size: 14px; line-height: 22px; color: #B9B79F">${sub}</div>
${(b.votes || []).length ? `<div aria-label="How everyone voted" style="display: flex; flex-wrap: wrap; gap: 6px">${b.votes.map((v, i) => `<span class="fadein" style="animation-delay: ${0.3 + i * 0.5}s; padding: 3px 8px; font-size: 11px; letter-spacing: 1px; ${v.to && v.to === b.name ? 'background: #E0B84C; color: #262B16; font-weight: 700' : 'border: 1px solid #4A5230; color: #B9B79F'}">${esc(v.from)} → ${v.to ? esc(v.to) : 'SKIP'}</span>`).join('')}</div>` : ''}
${barsTitle ? `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; background: #2F3520; border: 1px solid #4A5230">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #B9B79F">${barsTitle}</span>
${revealBars(moleWin || caughtAll || partnerFake ? hist : hist.map(h => ({ ...h, fake: false })))}
<span style="font-size: 11px; ${tags ? 'line-height: 16px; ' : ''}color: #B9B79F">${foot || ''}</span>
</div>` : ''}
<div style="display: flex; align-items: center; gap: 16px">
<span style="padding: 10px 18px; background: ${bannerBg}; color: #262B16; box-shadow: 4px 4px 0 #14170C; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: ${tags ? 16 : 20}px; letter-spacing: 2px">${banner}</span>
<span style="font-size: 12px; ${tags ? 'line-height: 18px; ' : ''}color: #B9B79F">${bannerSub}</span>
</div>
</div>
</div>

<div style="height: 80px; flex: none; box-sizing: border-box; display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 0 32px; border-top: 1px solid #4A5230">
${gameOver && S.summary ? `<button type="button" data-act="opencase" class="btn btn-ghost" style="height: 44px; padding: 0 20px; border-color: #E0B84C; color: #E0B84C; font-size: 14px; letter-spacing: 2px">CASE FILE</button>` : ''}
${gameOver ? `<button type="button" data-act="recap" class="btn btn-ghost" style="height: 44px; padding: 0 20px; border-color: #F6F4EC; color: #F6F4EC; font-size: 14px; letter-spacing: 2px">SEE RECAP</button>` : ''}
<button type="button" data-act="${rAct}" ${!gameOver && S.you && S.you.spectator ? 'disabled' : ''} class="btn btn-primary" style="height: 44px; padding: 0 24px; border: 0; background: #F6F4EC; color: #262B16; box-shadow: 4px 4px 0 #14170C; font-size: 14px; letter-spacing: 2px">${!gameOver && iR ? 'WAITING…' : rightBtn}</button>
</div>

${frame('CASE FILE TS-' + mm(b.mission || 0) + ' · BURN RESULT', true)}
</div>`;
}

/* ---------------------------------------------------------------- Declassified */
const CIRCUIT = `<svg width="732" height="236" viewBox="0 0 712 230" role="img" aria-label="Circuit: Hadamard then CNOT creates the pair, each agent applies a rotation set by their knob, then both qubits are measured">
<g font-family="Silkscreen, monospace" font-size="11" letter-spacing="1" fill="#55583F">
<text x="120" y="22">1 · PREPARE THE LINK</text>
<text x="320" y="22">2 · TURN YOUR KNOB</text>
<text x="500" y="22">3 · OPEN THE COIN</text>
</g>
<g stroke="#B3B198" stroke-width="1" stroke-dasharray="4 4">
<line x1="285" y1="34" x2="285" y2="196"/>
<line x1="465" y1="34" x2="465" y2="196"/>
</g>
<g font-family="JetBrains Mono, monospace" font-size="12" fill="#3B4228" text-anchor="end">
<text x="78" y="84">ALICE q0</text>
<text x="78" y="164">BOB q1</text>
</g>
<g stroke="#55583F" stroke-width="2">
<line x1="90" y1="80" x2="500" y2="80"/>
<line x1="90" y1="160" x2="500" y2="160"/>
</g>
<g stroke="#262B16" stroke-width="2">
<line x1="540" y1="78" x2="640" y2="78"/>
<line x1="540" y1="82" x2="640" y2="82"/>
<line x1="540" y1="158" x2="640" y2="158"/>
<line x1="540" y1="162" x2="640" y2="162"/>
</g>
<rect x="120" y="62" width="36" height="36" fill="#B9B79F" stroke="#262B16" stroke-width="2"/>
<text x="138" y="87" text-anchor="middle" font-family="Silkscreen, monospace" font-weight="700" font-size="16" fill="#262B16">H</text>
<line x1="220" y1="80" x2="220" y2="172" stroke="#262B16" stroke-width="2"/>
<circle cx="220" cy="80" r="5" fill="#262B16"/>
<circle cx="220" cy="160" r="12" fill="#F6F4EC" stroke="#262B16" stroke-width="2"/>
<line x1="208" y1="160" x2="232" y2="160" stroke="#262B16" stroke-width="2"/>
<text x="220" y="196" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#55583F">CNOT</text>
<text x="368" y="54" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#556B2F">ALICE'S KNOB</text>
<rect x="320" y="62" width="96" height="36" fill="#CDCBB5" stroke="#556B2F" stroke-width="2"/>
<text x="368" y="85" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="13" fill="#262B16">Ry(−2θA)</text>
<text x="368" y="134" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#556B2F">BOB'S KNOB</text>
<rect x="320" y="142" width="96" height="36" fill="#CDCBB5" stroke="#556B2F" stroke-width="2"/>
<text x="368" y="165" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="13" fill="#262B16">Ry(−2θB)</text>
<rect x="500" y="62" width="40" height="36" fill="#B9B79F" stroke="#262B16" stroke-width="2"/>
<path d="M508 90 A12 12 0 0 1 532 90" fill="none" stroke="#262B16" stroke-width="2"/>
<line x1="520" y1="90" x2="528" y2="72" stroke="#262B16" stroke-width="2"/>
<rect x="500" y="142" width="40" height="36" fill="#B9B79F" stroke="#262B16" stroke-width="2"/>
<path d="M508 170 A12 12 0 0 1 532 170" fill="none" stroke="#262B16" stroke-width="2"/>
<line x1="520" y1="170" x2="528" y2="152" stroke="#262B16" stroke-width="2"/>
<text x="656" y="86" font-family="JetBrains Mono, monospace" font-weight="700" font-size="18" fill="#556B2F">a</text>
<text x="656" y="166" font-family="JetBrains Mono, monospace" font-weight="700" font-size="18" fill="#556B2F">b</text>
<text x="356" y="222" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="13" fill="#262B16">WIN RULE: a XOR b = x AND y</text>
</svg>`;

const numBadge = n => `<span style="flex: none; width: 24px; height: 24px; background: #556B2F; color: #F6F4EC; font-family: 'Silkscreen', monospace; font-weight: 700; text-align: center; line-height: 24px">${n}</span>`;
const GRID = "display: grid; grid-template-columns: 170px 80px 90px minmax(0, 1fr) 70px; column-gap: 12px";
const angleRow = (c1, c2, a, b, same, hi) => `<div style="${GRID}; align-items: center; height: 44px; padding: 0 8px; font-size: 13px${hi ? '; background: rgba(85,107,47,0.12); border-left: 3px solid #556B2F' : ''}">
<span style="display: flex; align-items: center; gap: 6px">${sw(c1)}${sw(c2)}${c1 === RED ? 'RED' : 'BLUE'} · ${c2 === RED ? 'RED' : 'BLUE'}</span><span>${a}</span><span>${b}</span><span style="${hi ? 'font-weight: 700' : 'color: #3B4228'}">${same ? 'THE SAME' : 'DIFFERENT'}</span><span style="text-align: right; color: #556B2F; font-weight: 700">85.4%</span>
</div>`;

function tplNerd(S) {
  const n = S.nerd, linkOn = S.nerdLink !== false;
  const fromEnd = S.nerdFrom;
  const host = S.you && S.you.host;
  const backLabel = fromEnd === 'final' ? (host ? (S.canRematch ? 'REMATCH' : 'FINALE RUNNING…') : 'WAITING FOR HOST') : fromEnd === 'result' ? 'BACK TO RESULT' : 'BACK TO MISSION';
  const hw = n && n.win_rate != null;
  const sim = n && !n.hardware;
  const hwLabel = hw ? (n.hardware ? 'IONQ HARDWARE RUN' : 'IONQ SIMULATOR RUN') : 'IONQ SIMULATOR RUN';
  const hwRight = hw ? `<span style="font-weight: 700">${(n.win_rate * 100).toFixed(1)}%</span>` : `<span style="color: #55583F">${S.nerdPending ? 'RUNNING…' : 'AT THE FINALE'}</span>`;
  const hwBar = hw
    ? `<div style="position: relative; height: 22px; margin-top: 6px; background: #DEDCCB">
<div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${barW(n.win_rate)}%; background: #262B16"></div>
<div style="position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: #262B16; box-shadow: 0 0 0 1px #F6F4EC"></div>
</div>`
    : `<div style="position: relative; height: 22px; margin-top: 6px; box-sizing: border-box; border: 2px dashed #556B2F; display: flex; align-items: center; padding-left: 8px; font-size: 11px; color: #556B2F">${S.nerdPending ? 'SENDING THE FOUR CIRCUITS TO THE BACKEND…' : 'THE FOUR CIRCUITS RUN AFTER THE LAST MISSION'}
<div style="position: absolute; left: 50%; top: -6px; bottom: -6px; width: 2px; background: #262B16"></div>
</div>`;
  const foot = hw
    ? `SHOTS PER CARD PAIR: ${n.shots_per_pair} · BACKEND: ${esc(n.backend)}.${sim ? ' This was a simulator, not a physical device' + (n.note ? ' (' + esc(n.note) + ')' : '') + '.' : ' Hardware noise pulls the real result below the ideal line, and the game shows both.'}`
    : `SHOTS PER CARD PAIR: 1000 · BACKEND: IonQ simulator through Qollab. A noisy backend pulls the result below the ideal line, and the game shows both.`;
  return `<div style="${ROOT_L}">

<div style="height: 56px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; box-sizing: border-box; border-bottom: 1px solid #CDCBB5; background: rgba(246,244,236,0.92)">
<div style="display: flex; align-items: baseline; gap: 16px">
<span style="font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 22px; letter-spacing: 2px; color: #556B2F">TWIN SIGNAL</span>
<span style="font-size: 12px; letter-spacing: 2px; color: #55583F">DECLASSIFIED FILE · NERD MODE</span>
</div>
<div style="display: flex; gap: 10px">${S.summary ? `<button type="button" data-act="opencase" class="btn btn-ghost" style="height: 44px; padding: 0 18px; border-color: #B8860B; color: #8A6B00; font-size: 13px; letter-spacing: 2px">CASE FILE</button>` : ''}<button type="button" data-act="back" class="btn btn-ghost" style="height: 44px; padding: 0 18px; font-size: 13px; letter-spacing: 2px">${backLabel}</button></div>
</div>

<div style="height: 300px; flex: none; display: flex">
<div style="width: 780px; flex: none; box-sizing: border-box; padding: 16px 24px; border-right: 1px solid #CDCBB5; background: #ECEADD; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; align-items: center; justify-content: space-between">
<div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">THE TWIN LINK CIRCUIT · ONE RUN PER CARD PAIR</div>
<div style="display: flex; gap: 8px">
<button type="button" data-act="copyqiskit" class="btn btn-ghost" style="height: 26px; padding: 0 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #556B2F; color: #556B2F" title="Copy standalone Python Qiskit script">COPY QISKIT</button>
<button type="button" data-act="copyqasm" class="btn btn-ghost" style="height: 26px; padding: 0 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #556B2F; color: #556B2F" title="Copy OpenQASM 2.0 quantum snippet">COPY QASM</button>
</div>
</div>
${CIRCUIT}
</div>

<div style="position: relative; flex: 1; min-width: 0; box-sizing: border-box; padding: 16px 28px; display: flex; flex-direction: column; gap: 12px">
<div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">WHAT THE LINK DOES</div>
<div style="display: flex; gap: 12px; font-size: 13px; line-height: 20px; color: #3B4228">${numBadge(1)}<span>Two qubits start as an entangled pair. Neither has a fixed answer on its own.</span></div>
<div style="display: flex; gap: 12px; font-size: 13px; line-height: 20px; color: #3B4228">${numBadge(2)}<span>Your knob picks how your qubit is measured. Your card picks the knob.</span></div>
<div style="display: flex; gap: 12px; font-size: 13px; line-height: 20px; color: #3B4228">${numBadge(3)}<span>No message crosses between rooms. The correlation only shows up when the scores are compared.</span></div>
<div style="position: absolute; right: 24px; bottom: 16px; transform: rotate(-8deg); padding: 6px 12px; border: 3px solid #556B2F; color: #556B2F; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 20px; letter-spacing: 3px">DECLASSIFIED</div>
</div>
</div>

<div style="flex: 1; display: flex; border-top: 1px solid #CDCBB5">
<div style="width: 640px; flex: none; box-sizing: border-box; padding: 20px 24px; border-right: 1px solid #CDCBB5; background: #F0EEE2; display: flex; flex-direction: column; gap: 10px">
<div style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">KNOB ANGLES THAT BEAT THE WALL</div>
<div style="${GRID}; padding: 6px 8px; font-size: 11px; letter-spacing: 1px; color: #55583F; border-bottom: 1px solid #CDCBB5">
<span>CARDS</span><span>ALICE</span><span>BOB</span><span>WIN IF DOORS ARE</span><span style="text-align: right">IDEAL</span>
</div>
${angleRow(BLUE, BLUE, '0°', '22.5°', true)}
${angleRow(BLUE, RED, '0°', '−22.5°', true)}
${angleRow(RED, BLUE, '45°', '22.5°', true)}
${angleRow(RED, RED, '45°', '−22.5°', false, true)}
<div style="font-size: 12px; line-height: 18px; color: #55583F">Only the gaps between Alice's and Bob's angles matter. Slide all four together and nothing changes, so many setups win and the team has to agree on one.</div>
</div>

<div style="flex: 1; min-width: 0; box-sizing: border-box; padding: 20px 28px; background: #ECEADD; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; align-items: center; justify-content: space-between">
<span style="font-family: 'Silkscreen', monospace; font-size: 12px; letter-spacing: 2px; color: #55583F">WIN RATE · CLASSICAL VS QUANTUM</span>
<div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #262B16">
<button type="button" data-act="linkToggle" role="switch" aria-checked="${linkOn}" aria-label="Twin Link on" style="height: 44px; padding: 0 8px; border: 0; background: transparent; display: flex; align-items: center"><span style="position: relative; display: block; width: 52px; height: 26px; background: ${linkOn ? '#556B2F' : '#8A8A72'}"><span style="position: absolute; ${linkOn ? 'right' : 'left'}: 3px; top: 3px; width: 20px; height: 20px; background: #F6F4EC"></span></span></button>
<span style="font-weight: 700">TWIN LINK ${linkOn ? 'ON' : 'OFF'}</span>
</div>
</div>

<div>
<div style="display: flex; justify-content: space-between; font-size: 12px"><span style="color: #3B4228; font-weight: 700">BEST CLASSICAL STRATEGY</span><span style="font-weight: 700">75.0%</span></div>
<div style="position: relative; height: 22px; margin-top: 6px; background: #DEDCCB">
<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 50%; background: #8A8A72"></div>
<div style="position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: #262B16"></div>
</div>
</div>

<div style="${linkOn ? '' : 'opacity: 0.3'}">
<div style="display: flex; justify-content: space-between; font-size: 12px"><span style="color: #556B2F; font-weight: 700">IDEAL QUANTUM · cos²(π/8)</span><span style="color: #556B2F; font-weight: 700">85.4%</span></div>
<div style="position: relative; height: 22px; margin-top: 6px; background: #DEDCCB">
<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 70.7%; background: #556B2F"></div>
<div style="position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: #262B16"></div>
</div>
</div>

<div style="${linkOn ? '' : 'opacity: 0.3'}">
<div style="display: flex; justify-content: space-between; font-size: 12px"><span style="font-weight: 700">${hwLabel}</span>${hwRight}</div>
${hwBar}
</div>

<div style="display: flex; justify-content: space-between; font-size: 11px; color: #55583F"><span>50%</span><span>75% WALL</span><span>100%</span></div>
<div style="font-size: 11px; line-height: 16px; color: #55583F">${foot}</div>
</div>
</div>

${frame('CASE FILE TS-03 · DECLASSIFIED', false, true)}
</div>`;
}
