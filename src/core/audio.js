export { AudioEngine };

var AudioEngine = class {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.room = "alley";
    this.muted = false;
    this._timers = [];
    this._water = null;
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 3.4;
    comp.attack.value = 6e-3;
    comp.release.value = 0.24;
    master.connect(comp);
    comp.connect(ctx.destination);
    this.master = master;
    const conv = ctx.createConvolver();
    conv.buffer = this._impulse(2.8, 2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    conv.connect(wet);
    wet.connect(master);
    this.reverb = conv;
    this.wet = wet;
    this.noise = this._noiseBuffer(3);
    this.layers = {};
    this._makeAmbiences();
    this.ready = true;
    this.setAmbience(this.room, 0.01);
    this._startRandomEvents();
  }
  _noiseBuffer(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = w * 0.6 + last * 0.8;
      }
    }
    return b;
  }
  _impulse(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - Math.exp(-i / 200));
      }
    }
    return b;
  }
  _loopNoise() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start(0, Math.random() * 2);
    return s;
  }
  _makeAmbiences() {
    const c = this.ctx;
    const layer = (name) => {
      const g = c.createGain();
      g.gain.value = 0;
      g.connect(this.master);
      const send = c.createGain();
      send.gain.value = 0.2;
      g.connect(send);
      send.connect(this.reverb);
      this.layers[name] = { g, send };
      return g;
    };
    const rainG = layer("rain");
    const rN = this._loopNoise();
    const rBP = c.createBiquadFilter();
    rBP.type = "bandpass";
    rBP.frequency.value = 1400;
    rBP.Q.value = 0.4;
    const rHP = c.createBiquadFilter();
    rHP.type = "highpass";
    rHP.frequency.value = 380;
    const rGain = c.createGain();
    rGain.gain.value = 0.34;
    rN.connect(rBP);
    rBP.connect(rHP);
    rHP.connect(rGain);
    rGain.connect(rainG);
    const rum = c.createOscillator();
    rum.type = "sine";
    rum.frequency.value = 42;
    const rumG = c.createGain();
    rumG.gain.value = 0.05;
    rum.connect(rumG);
    rumG.connect(rainG);
    rum.start();
    const shopG = layer("shop");
    const sN = this._loopNoise();
    const sLP = c.createBiquadFilter();
    sLP.type = "lowpass";
    sLP.frequency.value = 420;
    const sG = c.createGain();
    sG.gain.value = 0.14;
    sN.connect(sLP);
    sLP.connect(sG);
    sG.connect(shopG);
    const hum = c.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 100;
    const humG = c.createGain();
    humG.gain.value = 0.022;
    hum.connect(humG);
    humG.connect(shopG);
    hum.start();
    const buzz = c.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 120;
    const buzzF = c.createBiquadFilter();
    buzzF.type = "bandpass";
    buzzF.frequency.value = 2400;
    buzzF.Q.value = 6;
    const buzzG = c.createGain();
    buzzG.gain.value = 0.012;
    buzz.connect(buzzF);
    buzzF.connect(buzzG);
    buzzG.connect(shopG);
    buzz.start();
    const stG = layer("stairs");
    const stN = this._loopNoise();
    const stLP = c.createBiquadFilter();
    stLP.type = "lowpass";
    stLP.frequency.value = 260;
    const stGain = c.createGain();
    stGain.gain.value = 0.24;
    stN.connect(stLP);
    stLP.connect(stGain);
    stGain.connect(stG);
    const drone = c.createOscillator();
    drone.type = "triangle";
    drone.frequency.value = 58;
    const droneG = c.createGain();
    droneG.gain.value = 0.02;
    drone.connect(droneG);
    droneG.connect(stG);
    drone.start();
    const aptG = layer("apt");
    const aN = this._loopNoise();
    const aLP = c.createBiquadFilter();
    aLP.type = "lowpass";
    aLP.frequency.value = 220;
    const aG = c.createGain();
    aG.gain.value = 0.2;
    aN.connect(aLP);
    aLP.connect(aG);
    aG.connect(aptG);
    const fridge = c.createOscillator();
    fridge.type = "sine";
    fridge.frequency.value = 120;
    const fG = c.createGain();
    fG.gain.value = 0.012;
    fridge.connect(fG);
    fG.connect(aptG);
    fridge.start();
    const bathG = layer("bath");
    const bN = this._loopNoise();
    const bLP = c.createBiquadFilter();
    bLP.type = "lowpass";
    bLP.frequency.value = 700;
    const bG = c.createGain();
    bG.gain.value = 0.1;
    bN.connect(bLP);
    bLP.connect(bG);
    bG.connect(bathG);
    this.ambGains = { rain: rainG, shop: shopG, stairs: stG, apt: aptG, bath: bathG };
  }
  setAmbience(name, time = 1.6) {
    if (!this.ready) {
      this.room = name;
      return;
    }
    this.room = name;
    const map = { alley: ["rain"], shop: ["shop"], stairs: ["stairs", "rain"], apt: ["apt"], bath: ["bath"] };
    const on = map[name] || [];
    const now2 = this.ctx.currentTime;
    for (const [k, g] of Object.entries(this.ambGains)) {
      const target = on.includes(k) ? k === "rain" ? 0.55 : 0.9 : 0;
      g.gain.cancelScheduledValues(now2);
      g.gain.setValueAtTime(Math.max(1e-4, g.gain.value), now2);
      g.gain.linearRampToValueAtTime(target, now2 + time);
    }
  }
  _startRandomEvents() {
    const tick = () => {
      if (!this.ready) return;
      const r = this.room;
      if (r === "bath" || r === "stairs") {
        if (Math.random() < 0.55) this.drip(r === "bath" ? 0.5 : 0.35);
      }
      if (r === "apt") {
        if (Math.random() < 0.35) this.clockTick();
        if (Math.random() < 0.12) this.creak(0.2);
      }
      if (r === "alley" && Math.random() < 0.2) this.drip(0.2);
      if (r === "shop" && Math.random() < 0.1) this.creak(0.15);
      this._timers.push(setTimeout(tick, 900 + Math.random() * 2600));
    };
    tick();
  }
  _env(node, t0, a, d, peak = 1) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + a + d);
    node.connect(g);
    return g;
  }
  _burst({ freq = 800, q = 1, dur = 0.1, gain = 0.2, type = "bandpass", pan = 0, send = 0.15, delay = 0 } = {}) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 6e-3);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
    const p = c.createStereoPanner();
    p.pan.value = pan;
    src.connect(f);
    f.connect(g);
    g.connect(p);
    p.connect(this.master);
    if (send > 0) {
      const s = c.createGain();
      s.gain.value = send;
      p.connect(s);
      s.connect(this.reverb);
    }
    src.start(t0, Math.random() * 2);
    src.stop(t0 + dur + 0.05);
  }
  _tone({ freq = 440, freq2 = null, dur = 0.3, type = "sine", gain = 0.15, pan = 0, send = 0.2, delay = 0 } = {}) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
    const p = c.createStereoPanner();
    p.pan.value = pan;
    o.connect(g);
    g.connect(p);
    p.connect(this.master);
    if (send > 0) {
      const s = c.createGain();
      s.gain.value = send;
      p.connect(s);
      s.connect(this.reverb);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  step(room, run) {
    const hard = room === "stairs" || room === "bath";
    const freq = hard ? 1500 : 620;
    this._burst({ freq, q: 0.8, dur: hard ? 0.14 : 0.1, gain: hard ? 0.16 : 0.11, type: "lowpass", pan: (Math.random() - 0.5) * 0.2 });
    this._tone({ freq: hard ? 110 : 78, freq2: 50, dur: 0.12, type: "sine", gain: hard ? 0.06 : 0.1, send: 0.05 });
    if (room === "apt" && Math.random() < 0.45) this.creak(0.1, 0.08);
  }
  doorCreak(power = 1) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(120 + Math.random() * 40, t0);
    o.frequency.linearRampToValueAtTime(340 + Math.random() * 80, t0 + 0.45);
    o.frequency.linearRampToValueAtTime(180, t0 + 0.9);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 7;
    const g = c.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.linearRampToValueAtTime(0.05 * power, t0 + 0.12);
    g.gain.linearRampToValueAtTime(0.018 * power, t0 + 0.7);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + 1);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    const s = c.createGain();
    s.gain.value = 0.4;
    g.connect(s);
    s.connect(this.reverb);
    o.start(t0);
    o.stop(t0 + 1.05);
    this._burst({ freq: 400, q: 2, dur: 0.2, gain: 0.06, delay: 0.85 });
  }
  creak(power = 0.3, delay = 0) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(60 + Math.random() * 40, t0);
    o.frequency.linearRampToValueAtTime(150 + Math.random() * 90, t0 + 1.2);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 400;
    f.Q.value = 9;
    const g = c.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.linearRampToValueAtTime(0.028 * power, t0 + 0.3);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + 1.6);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    const s = c.createGain();
    s.gain.value = 0.5;
    g.connect(s);
    s.connect(this.reverb);
    o.start(t0);
    o.stop(t0 + 1.7);
  }
  click(power = 1) {
    this._burst({ freq: 2600, q: 3, dur: 0.035, gain: 0.08 * power, send: 0.05 });
    this._tone({ freq: 900, freq2: 500, dur: 0.05, type: "triangle", gain: 0.02 * power, send: 0 });
  }
  drip(power = 0.5) {
    const f = 900 + Math.random() * 1400;
    this._tone({ freq: f, freq2: f * 0.35, dur: 0.09, type: "sine", gain: 0.07 * power, pan: (Math.random() - 0.5) * 0.8, send: 0.7 });
    this._burst({ freq: 3500, q: 2, dur: 0.03, gain: 0.015 * power, pan: (Math.random() - 0.5) * 0.8, send: 0.3 });
  }
  clockTick() {
    this._burst({ freq: 4200, q: 4, dur: 0.02, gain: 0.03, send: 0.25, pan: 0.2 });
  }
  matchStrike() {
    this._burst({ freq: 1800, q: 1.2, dur: 0.22, gain: 0.12, type: "highpass", send: 0.1 });
    this._burst({ freq: 700, q: 1, dur: 0.5, gain: 0.05, delay: 0.12, send: 0.2 });
  }
  whisper() {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f1 = c.createBiquadFilter();
    f1.type = "bandpass";
    f1.Q.value = 9;
    const f2 = c.createBiquadFilter();
    f2.type = "bandpass";
    f2.Q.value = 12;
    const g = c.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.2);
    g.gain.linearRampToValueAtTime(1e-4, t0 + 2.2);
    const p = c.createStereoPanner();
    for (let i = 0; i < 9; i++) {
      const t = t0 + i * 0.18;
      f1.frequency.setValueAtTime(400 + Math.random() * 900, t);
      f2.frequency.setValueAtTime(1200 + Math.random() * 1800, t);
      p.pan.setValueAtTime((Math.random() - 0.5) * 1.2, t);
    }
    src.connect(f1);
    f1.connect(f2);
    f2.connect(g);
    g.connect(p);
    p.connect(this.master);
    const s = c.createGain();
    s.gain.value = 0.6;
    p.connect(s);
    s.connect(this.reverb);
    src.start(t0);
    src.stop(t0 + 2.3);
  }
  screech() {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime;
    for (const [f, d, gain] of [[2200, 1.1, 0.05], [1730, 1.3, 0.04], [3100, 0.7, 0.025]]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.28, t0 + d);
      const g = c.createGain();
      g.gain.setValueAtTime(1e-4, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(1e-4, t0 + d);
      o.connect(g);
      g.connect(this.master);
      const s = c.createGain();
      s.gain.value = 0.5;
      g.connect(s);
      s.connect(this.reverb);
      o.start(t0);
      o.stop(t0 + d + 0.1);
    }
    this._burst({ freq: 1700, q: 0.7, dur: 1.2, gain: 0.09, type: "bandpass", send: 0.7 });
    this._tone({ freq: 46, freq2: 30, dur: 2, type: "sine", gain: 0.18, send: 0.3 });
  }
  heartbeat(n = 4) {
    for (let i = 0; i < n; i++) {
      this._tone({ freq: 62, freq2: 38, dur: 0.18, type: "sine", gain: 0.2, delay: i * 1.1, send: 0.1 });
      this._tone({ freq: 55, freq2: 34, dur: 0.2, type: "sine", gain: 0.14, delay: i * 1.1 + 0.28, send: 0.1 });
    }
  }
  water(on = true) {
    if (!this.ready) return;
    if (on && !this._water) {
      const c = this.ctx;
      const src = this._loopNoise();
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2600;
      f.Q.value = 0.7;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      g.gain.linearRampToValueAtTime(0.06, c.currentTime + 0.9);
      this._water = { src, g };
    } else if (!on && this._water) {
      const { src, g } = this._water;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
      setTimeout(() => {
        try {
          src.stop();
        } catch (e) {
        }
      }, 900);
      this._water = null;
    }
  }
  buzzBurst(power = 1) {
    this._tone({ freq: 120, dur: 0.4, type: "sawtooth", gain: 0.02 * power, send: 0.05 });
    this._burst({ freq: 2600, q: 5, dur: 0.35, gain: 0.02 * power });
  }
  sting() {
    this._tone({ freq: 180, freq2: 60, dur: 1.4, type: "sawtooth", gain: 0.08, send: 0.8 });
    this._tone({ freq: 1400, freq2: 300, dur: 0.8, type: "triangle", gain: 0.03, send: 0.9 });
  }
};
