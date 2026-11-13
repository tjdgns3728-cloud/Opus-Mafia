// audio module: sound effects and music. engine.audio.play("소리/딩.mp3", {volume, loop}), .stop(path) / .stop(),
// .music(path) (one at a time, fades), .beep(freq, seconds) (made-up sound, no file needed).
// A missing file plays a short beep instead, so a game never fails for lack of sound. No audio = silent.
// Made-up sounds without files (recipes are data, so a game keeps them in its own files):
//   .synth(parts, volume)  one sound from parts. A part: {kind: "tone"|"noise", at (s), dur (s), wave, freq (or [..] = pick one),
//                          to + sweep (slide to this frequency), filter: {type, freq, q}, attack, decay, peak, ramp: "exp"|"linear"}
//   .loopSynth(parts, every, volume) → stop()   the same sound again and again (a loop with no file)
//   .score(layers, {fade}) / .score(null)       generated music, crossfaded. A layer:
//      {kind: "pad", freqs, cutoff, q, lfo, depth, detune, wave, volume}           a slow chord through a moving filter
//      {kind: "noise", filter: {type, freq, q}, lfo, depth, volume}                 a bed of noise (wind)
//      {kind: "bursts", every (s), chance, randomVolume, part}                      a short part now and then (crackle, creak, notes, pulse)
WebEngine.module("audio", engine => {
  const has = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  let ctx = null;
  const ac = () => (ctx = ctx || (has ? new (window.AudioContext || window.webkitAudioContext)() : null));
  const playing = new Map();
  let music = null, layers = [], bus = null;
  const pick = v => Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
  function noiseSource(c, dur, loop) {
    const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; s.loop = !!loop; return s;
  }
  // One part of a made-up sound, into `out` (the speakers or the music bus).
  function part(c, p, volume, out) {
    const t = c.currentTime + (p.at || 0), a = p.attack ?? 0.005, d = p.decay ?? 0.2, peak = Math.max(0.0001, (p.peak ?? 1) * volume);
    const src = p.kind === "noise" ? noiseSource(c, p.dur || a + d + 0.05) : c.createOscillator(), g = c.createGain();
    if (p.kind !== "noise") {
      src.type = p.wave || "sine"; const f = pick(p.freq) || 440;
      src.frequency.setValueAtTime(f, t);
      if (p.to) src.frequency[p.slide === "linear" ? "linearRampToValueAtTime" : "exponentialRampToValueAtTime"](p.to, t + (p.sweep || d));
    }
    let node = src;
    if (p.filter) { const f = c.createBiquadFilter(); f.type = p.filter.type || "lowpass"; f.frequency.value = p.filter.freq || 1000; if (p.filter.q) f.Q.value = p.filter.q; node = node.connect(f); }
    const ramp = p.ramp === "linear" ? "linearRampToValueAtTime" : "exponentialRampToValueAtTime";
    g.gain.setValueAtTime(0.0001, t); g.gain[ramp](peak, t + a); g.gain[ramp](0.0001, t + a + d);
    node.connect(g).connect(out);
    src.start(t); src.stop(t + Math.max(p.dur || 0, a + d) + 0.05);
  }
  const musicBus = c => { if (!bus) { bus = c.createGain(); bus.gain.value = 0.9; bus.connect(c.destination); } return bus; };
  const fadeIn = (c, g, vol, secs) => { const t = c.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(Math.max(0.0001, vol), t + secs); };
  function layer(c, L, fade) {
    const out = musicBus(c), g = c.createGain(), stops = [];
    if (L.kind === "pad" || L.kind === "noise") {
      const f = c.createBiquadFilter(), lfo = c.createOscillator(), depth = c.createGain();
      const base = L.kind === "pad" ? L.cutoff || 400 : (L.filter && L.filter.freq) || 450;
      f.type = L.kind === "pad" ? "lowpass" : (L.filter && L.filter.type) || "bandpass"; f.frequency.value = base; f.Q.value = L.q ?? (L.filter && L.filter.q) ?? 0.7;
      lfo.frequency.value = L.lfo ?? 0.07; depth.gain.value = L.depth ?? base * 0.35; lfo.connect(depth).connect(f.frequency); lfo.start();
      const srcs = L.kind === "pad"
        ? (L.freqs || []).flatMap(hz => [-(L.detune ?? 6), L.detune ?? 6].map(dt => { const o = c.createOscillator(); o.type = L.wave || "sawtooth"; o.frequency.value = hz; o.detune.value = dt; o.connect(f); o.start(); return o; }))
        : [(() => { const n = noiseSource(c, 4, true); n.connect(f); n.start(); return n; })()];
      f.connect(g).connect(out); fadeIn(c, g, L.volume ?? 0.02, fade);
      stops.push(() => { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + fade * 0.8); [...srcs, lfo].forEach(o => o.stop(t + fade * 0.8 + 0.1)); });
    } else if (L.kind === "bursts") {
      g.gain.value = 1; g.connect(out);
      const id = setInterval(() => { if (Math.random() < (L.chance ?? 1)) part(c, L.part || {}, L.randomVolume ? Math.random() : 1, g); }, (L.every || 1) * 1000);
      stops.push(() => clearInterval(id));
    }
    return {stop: () => stops.forEach(s => s())};
  }
  const api = {
    synth(parts, volume = 1) { const c = ac(); if (!c) return; for (const p of [].concat(parts || [])) part(c, p, volume, c.destination); },
    loopSynth(parts, every = 4, volume = 1) { api.synth(parts, volume); const id = setInterval(() => api.synth(parts, volume), every * 1000); return () => clearInterval(id); },
    score(list, {fade = 3} = {}) {
      layers.forEach(l => l.stop()); layers = [];
      const c = ac(); if (!c || !list) return;
      layers = list.map(L => layer(c, L, fade));
    },
    beep(freq = 660, seconds = 0.12, volume = 0.15) {
      const c = ac(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = freq; g.gain.setValueAtTime(volume, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + seconds);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + seconds);
    },
    play(path, {volume = 1, loop = false} = {}) {
      if (typeof Audio === "undefined" || !engine.assets) return null;
      const a = new Audio(engine.assets.url(path));
      a.volume = Math.max(0, Math.min(1, volume)); a.loop = loop;
      a.play().catch(() => {});
      a.onerror = () => { api.beep(); engine.log("audio", `소리 파일이 없어 짧은 소리로 대신함: ${path}`); };
      if (!playing.has(path)) playing.set(path, new Set());
      playing.get(path).add(a); a.onended = () => playing.get(path) && playing.get(path).delete(a);
      return a;
    },
    stop(path) {
      for (const [p, set] of playing) if (!path || p === path) { set.forEach(a => a.pause()); set.clear(); }
      if (!path && music) { music.pause(); music = null; }
    },
    resume() { if (ctx && ctx.state === "suspended") ctx.resume(); },   // browsers start sound only after a click
    music(path, {volume = 0.6} = {}) {
      if (music) { const old = music; engine.tween && engine.tween.to(old, {volume: 0}, 0.8).then(() => old.pause()); }
      music = path ? api.play(path, {volume: 0, loop: true}) : null;
      if (music && engine.tween) engine.tween.to(music, {volume}, 0.8); else if (music) music.volume = volume;
    }
  };
  engine.bus.on("unload", () => {});            // sounds outlive scenes on purpose (music keeps playing)
  return api;
});

// 🔊 Sound: plays a sound when the object starts (or when code calls play()).
WebEngine.define("Sound", class extends WebEngine.Component {
  static icon = "🔊"; static title = "소리";
  static help = "소리 파일을 튼다. '시작하면 재생'을 끄면 코드에서 this.node.get(\"Sound\").play()로 튼다";
  static props = {asset: {type: "asset", default: "", label: "소리 파일"}, autoplay: {type: "bool", default: true, label: "시작하면 재생"},
                  loop: {type: "bool", default: false, label: "반복"}, volume: {type: "number", default: 1, label: "크기", help: "0 = 소리 없음 · 1 = 원래 크기", min: 0, max: 1}};
  start() { if (this.props.autoplay) this.play(); }
  play() { if (this.engine.audio && this.props.asset) this.a = this.engine.audio.play(this.props.asset, {volume: this.props.volume, loop: this.props.loop}); }
  destroy() { if (this.a) this.a.pause(); }
}, "builtin", "audio");
