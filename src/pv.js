import * as THREE from 'three';

const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// [duration, from{x,y,z,look}, to{...}, title?]
const SHOTS = [
  { d: 9.0, from: [-3.4, 1.95, 11.6], to: [-1.2, 1.8, 9.6], look: [1.2, 2.5, 6.2], title: ['回南', 'HUI NAM'] },
  { d: 7.0, from: [2.6, 1.7, 8.5], to: [1.3, 1.62, 6.4], look: [0.4, 1.9, 5.6] },
  { d: 8.0, from: [-0.2, 1.66, 5.4], to: [-1.0, 1.55, 3.2], look: [-1.6, 1.35, 0.4] },
  { d: 6.0, from: [0.35, 1.35, 2.6], to: [0.1, 1.3, 2.35], look: [-0.7, 1.2, 2.9] },
  { d: 7.0, from: [0.2, 0.62, -1.15], to: [0.35, 1.55, -1.5], look: [0.7, 3.9, -4.2] },
  { d: 8.0, from: [-0.7, 5.15, 2.35], to: [-1.55, 5.05, 1.55], look: [-3.7, 4.75, 0.1], title: ['三樓', 'THE THIRD FLOOR'] },
  { d: 7.0, from: [3.25, 5.5, 4.7], to: [2.7, 5.35, 4.0], look: [2.45, 4.9, 3.1] },
  { d: 6.5, from: [0.4, 5.2, 4.15], to: [0.4, 5.2, 4.95], look: [0.5, 5.05, 6.2] },
  { d: 6.0, from: [-0.5, 5.15, 2.3], to: [-1.5, 5.08, 1.3], look: [-3.7, 4.75, 0.05], title: ['有人等緊你', 'SOMEONE IS WAITING'] },
];

export class PV {
  constructor({ engine, world, ui, audio, player }) {
    this.e = engine; this.w = world; this.ui = ui; this.audio = audio; this.player = player;
    this.active = false; this.shot = 0; this.t = 0; this.done = false;
    this.cam = engine.camera;
    this._look = new THREE.Vector3();
  }

  start() {
    this.active = true; this.shot = 0; this.t = 0; this.done = false;
    this.ui.menuShow(false);
    this.ui.hudOn(false);
    this.ui.letterboxOn(true);
    this.ui.fadeInstant(1);
    this.ui.fade(0, 1400);
    this.audio.setAmbience('alley', 2.5);
    this.audio.init();
    this.player.enabled = false;
    this._apply(0);
    const s0 = SHOTS[0];
    if (s0.title) { this.ui.pvTitleShow(s0.title[0], s0.title[1]); setTimeout(() => this.ui.pvTitleShow(null), 4200); }
  }

  stop(backToMenu = true) {
    this.active = false;
    this.ui.letterboxOn(false);
    this.ui.pvTitleShow(null);
    if (backToMenu) {
      this.ui.menuShow(true);
      this.ui.fadeInstant(1); this.ui.fade(0, 900);
    }
  }

  _apply(t) {
    const s = SHOTS[this.shot];
    if (!s) return;
    const k = ease(Math.min(1, t / s.d));
    const x = s.from[0] + (s.to[0] - s.from[0]) * k;
    const y = s.from[1] + (s.to[1] - s.from[1]) * k;
    const z = s.from[2] + (s.to[2] - s.from[2]) * k;
    this.cam.position.set(x, y, z);
    this._look.set(...s.look);
    this.cam.lookAt(this._look);
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const s = SHOTS[this.shot];
    if (!s) { this.stop(); return; }
    const local = this.t;
    if (local > s.d) {
      this.shot++;
      this.t = 0;
      if (this.shot >= SHOTS.length) {
        this.ui.pvTitleShow(null);
        this.ui.fade(1, 1400);
        setTimeout(() => this.stop(true), 1600);
        this.active = false;
        return;
      }
      const n = SHOTS[this.shot];
      if (n.title) { this.ui.pvTitleShow(n.title[0], n.title[1]); setTimeout(() => this.ui.pvTitleShow(null), 3200); }
      if (this.shot === 4) this.audio.setAmbience('stairs', 2.0);
      if (this.shot === 5) this.audio.setAmbience('apt', 2.0);
      if (this.shot === 6) this.audio.setAmbience('bath', 2.0);
      if (this.shot === 8) { this.audio.setAmbience('apt', 2.0); this.audio.heartbeat(3); }
      if (this.shot === 7) {
        // mirror ghost appears in the bathroom
        const b = this.w.bathRoom;
        if (b?.ghost) b.ghost.visible = true;
        this.audio.whisper();
        setTimeout(() => { if (b?.ghost) b.ghost.visible = false; }, 3000);
      }
    } else {
      this._apply(this.t);
    }
    if (this.t > 1.5 && s.title && this.shot === 0) { /* title handled on entry */ }
  }
}
