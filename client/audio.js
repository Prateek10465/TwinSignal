/* Sound that follows the physics: a hum whose pitch rises with sync, silence during the run,
   a heartbeat when the quota is close, a siren at the meeting.  Everything is synthesised. */
const Snd = (() => {
  let ctx = null, hum = null, muted = false;
  try { muted = localStorage.getItem('ts-mute') === '1'; } catch (e) {}
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    return ctx;
  };
  const tone = (f, dur, type = 'sine', vol = 0.08, when = 0, slideTo = null) => {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  return {
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('ts-mute', m ? '1' : '0'); } catch (e) {} if (m) this.humStop(); },
    unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    humStart() {
      if (muted || hum || !ensure()) return;
      const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(ctx.destination);
      const a = ctx.createOscillator(), b = ctx.createOscillator();
      a.type = 'sine'; b.type = 'sine'; a.connect(g); b.connect(g); a.start(); b.start();
      g.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.6);
      hum = { a, b, g };
    },
    humPitch(avg) {   // 75% (the wall) sits low and flat; the quantum maximum rings clear and high
      if (!hum) return;
      const x = Math.max(0, Math.min(1, (avg - 0.5) / 0.354)), f = 82 + x * x * 110;
      hum.a.frequency.setTargetAtTime(f, ctx.currentTime, 0.15);
      hum.b.frequency.setTargetAtTime(f * (1.003 + (1 - x) * 0.02), ctx.currentTime, 0.15);   // beating = out of sync
    },
    humStop() {
      if (!hum) return; const h = hum; hum = null;
      try { h.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12); setTimeout(() => { h.a.stop(); h.b.stop(); }, 500); } catch (e) {}
    },
    click() { tone(520, 0.05, 'square', 0.03); },
    knob() { tone(300, 0.04, 'square', 0.04); },
    lock() { tone(110, 0.25, 'sawtooth', 0.07, 0, 55); tone(660, 0.1, 'square', 0.04, 0.2); },
    thump() { tone(60, 0.16, 'sine', 0.2, 0, 40); tone(60, 0.16, 'sine', 0.14, 0.2, 40); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, i * 0.1)); },
    fail() { tone(196, 0.5, 'sawtooth', 0.06, 0, 98); },
    siren() { for (let i = 0; i < 4; i++) { tone(660, 0.3, 'square', 0.03, i * 0.6); tone(880, 0.3, 'square', 0.03, i * 0.6 + 0.3); } },
    burn() { tone(880, 0.6, 'sawtooth', 0.06, 0, 55); },
    drift() { tone(300, 0.5, 'sawtooth', 0.05, 0, 180); },
    streak(n) {   // rises with the streak; only called at milestones
      const f = 440 * Math.pow(2, Math.min(n, 24) / 12);
      tone(f, 0.12, 'triangle', 0.05); tone(f * 1.5, 0.14, 'triangle', 0.04, 0.07);
    },
    streakBreak() { tone(220, 0.25, 'sine', 0.04, 0, 110); },
    lockon() { [784, 988, 1319].forEach((f, i) => tone(f, 0.18, 'sine', 0.06, i * 0.07)); },
    star(i) { tone(660 + i * 220, 0.3, 'triangle', 0.07, i * 0.25); },
    tick() { tone(1800, 0.015, 'square', 0.012); },
    roleAgent() {
      [261.6, 329.6, 392.0, 523.3, 659.3].forEach((f, i) => tone(f, 0.35, 'triangle', 0.06, i * 0.08));
      tone(1046.5, 0.6, 'sine', 0.04, 0.42);
    },
    roleMole() {
      tone(116.5, 0.9, 'sawtooth', 0.09, 0, 58.3);
      tone(82.4, 0.8, 'sawtooth', 0.08, 0.08, 55.0);
      tone(164.8, 0.5, 'square', 0.04, 0.18, 110.0);
      tone(233.1, 0.6, 'sawtooth', 0.05, 0.24, 116.5);
    },
  };
})();
