import { CapsuleGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
export { Story };

var wait = (ms) => new Promise((r) => setTimeout(r, ms));
var Story = class {
  constructor({ world, ui, audio, player, camera, gentle = false }) {
    this.gentle = gentle;
    this.w = world;
    this.ui = ui;
    this.audio = audio;
    this.player = player;
    this.camera = camera;
    this.flag = { shop: false, stairs: false, apt: false, incense: 0, incenseDone: false, bathroom: false, mirror: false, bedroom: false, ended: false };
    this.busy = false;
    this._mirrorTimer = 0;
    this._makeGhosts();
  }
  _makeGhosts() {
    const mk = (op = 0.95) => {
      const g = new Group();
      const m = new MeshBasicMaterial({ color: 263431, transparent: true, opacity: op });
      const body = new Mesh(new CapsuleGeometry(0.2, 1, 6, 12), m);
      body.position.y = 1.02;
      g.add(body);
      const head = new Mesh(new SphereGeometry(0.115, 16, 12), m);
      head.position.y = 1.79;
      g.add(head);
      const hair = new Mesh(new SphereGeometry(0.13, 16, 12), m);
      hair.scale.set(1, 1.4, 0.9);
      hair.position.y = 1.78;
      g.add(hair);
      const armL = new Mesh(new CapsuleGeometry(0.05, 0.7, 4, 8), m);
      armL.position.set(-0.24, 1.05, 0);
      armL.rotation.z = 0.08;
      g.add(armL);
      const armR = new Mesh(new CapsuleGeometry(0.05, 0.7, 4, 8), m);
      armR.position.set(0.24, 1.05, 0);
      armR.rotation.z = -0.08;
      g.add(armR);
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
    this.ui.objective("\u8FD4\u5230\u4E09\u6A13\u3002\u963F\u5A46\u7B49\u7DCA\u4F60\u3002");
    setTimeout(() => this.ui.subtitle("\u96E8\u843D\u5497\u6210\u665A\uFF0C\u689D\u5DF7\u597D\u4F3C\u6BD4\u5E73\u65E5\u66F4\u9577\u3002", 6200), 2600);
    setTimeout(() => this.ui.subtitle("\u300C\u963F\u5A46\u8A71\uFF0C\u5348\u591C\u4E4B\u5F8C\uFF0C\u5514\u597D\u671B\u584A\u93E1\u3002\u300D", 5600), 11e3);
  }
  onRoom(id) {
    if (id === "shop" && !this.flag.shop) {
      this.flag.shop = true;
      this.ui.objective("\u7A7F\u904E\u85E5\u884C\uFF0C\u884C\u5F8C\u6A13\u68AF\u3002");
      setTimeout(() => this.ui.subtitle("\u85E5\u6750\u5473\uFF0C\u90FD\u84CB\u5514\u4F4F\u7246\u8EAB\u6EF2\u51FA\u569F\u5605\u9709\u5473\u3002", 5200), 1800);
      setTimeout(() => this.audio.creak(0.25, 0.4), 2600);
    }
    if (id === "stairs" && !this.flag.stairs) {
      this.flag.stairs = true;
      this.ui.objective("\u4E0A\u4E09\u6A13\u3002");
      setTimeout(() => this.ui.subtitle("\u6A13\u68AF\u597D\u4F3C\u6BD4\u8A18\u61B6\u4E2D\u591A\u5497\u5E7E\u7D1A\u3002", 4800), 2200);
      this._stairsBeat();
    }
    if (id === "apt" && !this.flag.apt) {
      this.flag.apt = true;
      this.ui.objective("\u9EDE\u4E09\u70B7\u9999\uFF0C\u540C\u963F\u5A46\u8B1B\u8072\u3002");
      setTimeout(() => this.ui.subtitle("\u963F\u5A46\uFF0C\u6211\u8FD4\u569F\u5587\u3002", 5200), 1400);
      setTimeout(() => this.audio.creak(0.35, 0.2), 800);
    }
    if (id === "bath") {
      if (!this.flag.bathroom) {
        this.flag.bathroom = true;
        setTimeout(() => this.ui.subtitle("\u6C34\u5589\u4E00\u76F4\u6EF4\u3002\u5C4B\u4F01\u5187\u4EBA\uFF0C\u908A\u500B\u958B\u904E\uFF1F", 5200), 1200);
      }
    }
    if (id === "apt" && this.flag.mirror && !this.flag.bedroom) {
      this._toBedroom();
    }
    if (id === "apt" && this.flag.bedroom && !this.flag.ended) {
      const p = this.player.pos;
      if (p.z > 3.5) this._ending();
    }
  }
  async _stairsBeat() {
    await wait(4200);
    if (this.w.currentRoom !== "stairs") return;
    if (this.gentle) {
      // 溫和模式：遠處一道背影，停留數秒，不嚇人
      this.stairGhost.position.set(0.35, 3.6, -5.55);
      this.stairGhost.visible = true;
      this.audio.drip(0.9);
      await wait(2600);
      this.stairGhost.visible = false;
      this.ui.subtitle("\u6A13\u4E0A\u597D\u50CF\u6709\u4EBA\u8D70\u904E\u3002", 3600);
      return;
    }
    this.stairGhost.visible = true;
    this.audio.buzzBurst(1.2);
    this.audio.sting();
    this.player.shake = 0.02;
    await wait(420);
    this.stairGhost.visible = false;
    this.audio.drip(0.8);
    await wait(2600);
    this.ui.subtitle("\u6A13\u4E0A\u6709\u4EBA\u3002", 3600);
  }
  lightIncense() {
    if (this.flag.incenseDone) {
      this.ui.subtitle("\u9999\u5DF2\u7D93\u9EDE\u6652\u3002", 2200);
      return;
    }
    this.flag.incense++;
    this.audio.matchStrike();
    const lines = ["\u7B2C\u4E00\u70B7\uFF0C\u4FDD\u5E73\u5B89\u3002", "\u7B2C\u4E8C\u70B7\uFF0C\u4FDD\u5718\u5713\u3002", "\u7B2C\u4E09\u70B7\u2026\u2026\u4FDD\u4F60\u8FD4\u5514\u5230\u53BB\u3002"];
    this.ui.subtitle(lines[Math.min(2, this.flag.incense - 1)], 3600);
    if (this.flag.incense >= 3) {
      this.flag.incenseDone = true;
      this._afterIncense();
    }
  }
  async _afterIncense() {
    await wait(2200);
    if (!this.gentle) this.audio.whisper();
    this.ui.objective("\u53BB\u6D74\u5BA4\u6D17\u628A\u9762\u3002");
    this.ui.subtitle("\u5EF3\u5605\u71C8\uFF0C\u5FFD\u7136\u6697\u5497\u4E00\u534A\u3002", 4200);
    this.player.shake = 6e-3;
    await wait(2600);
    this.ui.subtitle("\u300C\u5514\u597D\u671B\u584A\u93E1\u3002\u300D", 4200);
  }
  useTap() {
    if (this._tapOn) {
      this.audio.water(false);
      this._tapOn = false;
      return;
    }
    this._tapOn = true;
    this.audio.water(true);
    this.ui.subtitle("\u6C34\u4FC2\u6696\u5605\u3002", 2600);
    setTimeout(() => {
      if (this.w.currentRoom === "bath" && !this.flag.mirror) {
        this.audio.whisper();
      }
    }, 2400);
  }
  lookMirror() {
    if (this.flag.mirror || this.busy) return;
    this.flag.mirror = true;
    this.busy = true;
    if (this.gentle) {
      this.ui.subtitle("鏡裡面……只有你自己。", 4200);
      setTimeout(() => {
        this.busy = false;
        this.ui.objective("返出廳。");
        this.ui.subtitle("水聲停咗。", 2600);
        this.audio.water(false);
      }, 3600);
      return;
    }
    const bath = this.w.bathRoom;
    bath.ghost.visible = true;
    this.audio.heartbeat(3);
    this.ui.subtitle("\u93E1\u88E1\u9762\u2026\u2026\u4F01\u5497\u500B\u4EBA\u3002", 4200);
    this.player.shake = 0.01;
    setTimeout(() => {
      this.audio.screech();
      this.player.shake = 0.05;
    }, 2600);
    setTimeout(async () => {
      bath.ghost.visible = false;
      this.busy = false;
      this.ui.objective("\u8FD4\u51FA\u5EF3\u3002");
      this.ui.subtitle("\u6C34\u8072\u505C\u5497\u3002", 2600);
      this.audio.water(false);
    }, 5200);
  }
  async _toBedroom() {
    this.flag.bedroom = true;
    this.ui.objective("\u5165\u623F\u7747\u4E0B\u3002");
    this.ui.subtitle("\u7761\u623F\u9580\uFF0C\u81EA\u5DF1\u958B\u5497\u3002", 4200);
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
    if (this.gentle) {
      this.audio.creak(0.7, 0.5);
      this.ui.subtitle("房門慢慢關上。", 4200);
      await wait(2600);
      await this.ui.fade(1, 1400);
      this.ui.hudOn(false);
      await wait(700);
      this.ui.endcardOn(true);
      this.audio.setAmbience("bath", 3);
      this.onEnd?.();
      return;
    }
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
    this.audio.setAmbience("bath", 3);
    this.onEnd?.();
  }
  update(dt) {
    const inBath = this.w.currentRoom === "bath";
    if (inBath && this.flag.incenseDone && !this.flag.mirror) {
      const mesh2 = this.w.bathRoom?.mirror?.mesh;
      if (mesh2) {
        const wp = new Vector3();
        mesh2.getWorldPosition(wp);
        const to = wp.clone().sub(this.camera.position);
        const dist = to.length();
        const fwd = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        if (dist < 2.7 && fwd.dot(to.normalize()) > 0.955) {
          this._mirrorTimer += dt;
          if (this._mirrorTimer > 1) this.lookMirror();
        } else {
          this._mirrorTimer = Math.max(0, this._mirrorTimer - dt * 0.6);
        }
      }
    }
    if (this.flag.bedroom && !this.flag.ended && this.w.currentRoom === "apt" && this.player.pos.z > 3.55) {
      this._ending();
    }
  }
};
