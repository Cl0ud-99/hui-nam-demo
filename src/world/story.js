import * as THREE from 'three';
import { M } from '../core/materials.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

export class Story {
  constructor({ world, ui, audio, player, camera }) {
    this.w = world; this.ui = ui; this.audio = audio; this.player = player; this.camera = camera;
    this.flag = { shop: false, stairs: false, apt: false, incense: 0, incenseDone: false, bathroom: false, mirror: false, bedroom: false, ended: false };
    this.busy = false;
    this._mirrorTimer = 0;
    this._makeGhosts();
  }

  _makeGhosts() {
    const mk = (op = 0.95) => {
      const g = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: 0x040507, transparent: true, opacity: op });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 6, 12), m);
      body.position.y = 1.02; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), m);
      head.position.y = 1.79; g.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), m);
      hair.scale.set(1.0, 1.4, 0.9); hair.position.y = 1.78; g.add(hair);
      const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.7, 4, 8), m);
      armL.position.set(-0.24, 1.05, 0); armL.rotation.z = 0.08; g.add(armL);
      const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.7, 4, 8), m);
      armR.position.set(0.24, 1.05, 0); armR.rotation.z = -0.08; g.add(armR);
      g.visible = false;
      return g;
    };
    this.stairGhost = mk(0.92);
    this.stairGhost.position.set(0.4, 3.6, -2.4);
    this.stairGhost.rotation.y = Math.PI;
    this.w.root.add(this.stairGhost);

    this.bedGhost = mk(0.96);
    this.bedGhost.position.set(0.4, 3.6, 5.55);
    this.bedGhost.rotation.y = Math.PI;
    this.w.root.add(this.bedGhost);
  }

  start() {
    this.ui.objective('返到三樓。阿婆等緊你。');
    setTimeout(() => this.ui.subtitle('雨落咗成晚，條巷好似比平日更長。', 6200), 2600);
    setTimeout(() => this.ui.subtitle('「阿婆話，午夜之後，唔好望塊鏡。」', 5600), 11000);
  }

  onRoom(id) {
    if (id === 'shop' && !this.flag.shop) {
      this.flag.shop = true;
      this.ui.objective('穿過藥行，行後樓梯。');
      setTimeout(() => this.ui.subtitle('藥材味，都蓋唔住牆身滲出嚟嘅霉味。', 5200), 1800);
      setTimeout(() => this.audio.creak(0.25, 0.4), 2600);
    }
    if (id === 'stairs' && !this.flag.stairs) {
      this.flag.stairs = true;
      this.ui.objective('上三樓。');
      setTimeout(() => this.ui.subtitle('樓梯好似比記憶中多咗幾級。', 4800), 2200);
      this._stairsBeat();
    }
    if (id === 'apt' && !this.flag.apt) {
      this.flag.apt = true;
      this.ui.objective('點三炷香，同阿婆講聲。');
      setTimeout(() => this.ui.subtitle('阿婆，我返嚟喇。', 5200), 1400);
      setTimeout(() => this.audio.creak(0.35, 0.2), 800);
    }
    if (id === 'bath') {
      if (!this.flag.bathroom) {
        this.flag.bathroom = true;
        setTimeout(() => this.ui.subtitle('水喉一直滴。屋企冇人，邊個開過？', 5200), 1200);
      }
    }
    if (id === 'apt' && this.flag.mirror && !this.flag.bedroom) {
      this._toBedroom();
    }
    if (id === 'apt' && this.flag.bedroom && !this.flag.ended) {
      const p = this.player.pos;
      if (p.z > 3.5) this._ending();
    }
  }

  async _stairsBeat() {
    await wait(4200);
    if (this.w.currentRoom !== 'stairs') return;
    this.stairGhost.visible = true;
    this.audio.buzzBurst(1.2);
    this.audio.sting();
    this.player.shake = 0.02;
    await wait(420);
    this.stairGhost.visible = false;
    this.audio.drip(0.8);
    await wait(2600);
    this.ui.subtitle('樓上有人。', 3600);
  }

  lightIncense() {
    if (this.flag.incenseDone) {
      this.ui.subtitle('香已經點晒。', 2200);
      return;
    }
    this.flag.incense++;
    this.audio.matchStrike();
    const lines = ['第一炷，保平安。', '第二炷，保團圓。', '第三炷……保你返唔到去。'];
    this.ui.subtitle(lines[Math.min(2, this.flag.incense - 1)], 3600);
    if (this.flag.incense >= 3) {
      this.flag.incenseDone = true;
      this._afterIncense();
    }
  }

  async _afterIncense() {
    await wait(2200);
    this.audio.whisper();
    this.ui.objective('去浴室洗把面。');
    this.ui.subtitle('廳嘅燈，忽然暗咗一半。', 4200);
    this.player.shake = 0.006;
    await wait(2600);
    this.ui.subtitle('「唔好望塊鏡。」', 4200);
  }

  useTap() {
    if (this._tapOn) { this.audio.water(false); this._tapOn = false; return; }
    this._tapOn = true;
    this.audio.water(true);
    this.ui.subtitle('水係暖嘅。', 2600);
    setTimeout(() => {
      if (this.w.currentRoom === 'bath' && !this.flag.mirror) {
        this.audio.whisper();
      }
    }, 2400);
  }

  lookMirror() {
    if (this.flag.mirror || this.busy) return;
    this.flag.mirror = true;
    this.busy = true;
    const bath = this.w.bathRoom;
    bath.ghost.visible = true;
    this.audio.heartbeat(3);
    this.ui.subtitle('鏡裡面……企咗個人。', 4200);
    this.player.shake = 0.01;
    setTimeout(() => {
      this.audio.screech();
      this.player.shake = 0.05;
    }, 2600);
    setTimeout(async () => {
      bath.ghost.visible = false;
      this.busy = false;
      this.ui.objective('返出廳。');
      this.ui.subtitle('水聲停咗。', 2600);
      this.audio.water(false);
    }, 5200);
  }

  async _toBedroom() {
    this.flag.bedroom = true;
    this.ui.objective('入房睇下。');
    this.ui.subtitle('睡房門，自己開咗。', 4200);
    this.audio.creak(0.6, 0.3);
    this.bedGhost.visible = false;
    await wait(600);
    this.audio.heartbeat(2);
  }

  async _ending() {
    if (this.flag.ended) return;
    this.flag.ended = true;
    this.player.enabled = false;
    this.ui.prompt(null);
    this.bedGhost.visible = true;
    this.audio.screech();
    this.player.shake = 0.06;
    await wait(900);
    this.bedGhost.position.set(this.camera.position.x + Math.sin(this.player.yaw) * -0.8, 3.6, this.camera.position.z + Math.cos(this.player.yaw) * -0.8);
    this.bedGhost.rotation.y = this.player.yaw + Math.PI;
    this.audio.whisper();
    this.player.shake = 0.03;
    await wait(1500);
    this.bedGhost.visible = false;
    this.audio.sting();
    await this.ui.fade(1, 900);
    this.ui.hudOn(false);
    await wait(700);
    this.ui.endcardOn(true);
    this.audio.setAmbience('bath', 3);
    this.onEnd?.();
  }

  update(dt) {
    const inBath = this.w.currentRoom === 'bath';
    if (inBath && this.flag.incenseDone && !this.flag.mirror) {
      const mesh = this.w.bathRoom?.mirror?.mesh;
      if (mesh) {
        const wp = new THREE.Vector3();
        mesh.getWorldPosition(wp);
        const to = wp.clone().sub(this.camera.position);
        const dist = to.length();
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        if (dist < 2.7 && fwd.dot(to.normalize()) > 0.955) {
          this._mirrorTimer += dt;
          if (this._mirrorTimer > 1.0) this.lookMirror();
        } else {
          this._mirrorTimer = Math.max(0, this._mirrorTimer - dt * 0.6);
        }
      }
    }
    if (this.flag.bedroom && !this.flag.ended && this.w.currentRoom === 'apt' && this.player.pos.z > 3.55) {
      this._ending();
    }
  }
}
