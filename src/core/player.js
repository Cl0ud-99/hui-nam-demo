import { Raycaster, SpotLight, Vector2, Vector3 } from 'three';
import { clamp2, damp2 } from './util.js';
export { Player };

var Player = class {
  constructor(camera, world, audio) {
    this.camera = camera;
    this.world = world;
    this.audio = audio;
    this.pos = new Vector3(4.8, 0, 11.6);
    this.vel = new Vector3();
    this.yaw = 0.72;
    this.pitch = 0.02;
    this.eye = 1.62;
    this.radius = 0.3;
    this.speed = 2.5;
    this.runSpeed = 3.9;
    this.enabled = false;
    this.keys = {};
    this.hover = null;
    this.bob = 0;
    this.stepDist = 0;
    this.groundY = 0;
    this.eyeOffset = 0;
    this.shake = 0;
    this.flashOn = false;
    this.ray = new Raycaster();
    this.ray.far = 2.6;
    this._tmp = new Vector3();
    this._dir = new Vector3();
    this._lastInteract = 0;
    this.flash = new SpotLight(16773336, 0, 14, 0.42, 0.55, 1.2);
    this.flash.castShadow = false;
    this.flash.position.set(0.18, -0.1, 0);
    this.flash.target.position.set(0, -0.05, -1);
    camera.add(this.flash);
    camera.add(this.flash.target);
    this._bind();
    this.applyCamera(0);
  }
  _bind() {
    addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "KeyE") this.tryInteract();
      if (e.code === "KeyF" && this.enabled) this.toggleFlash();
    });
    addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
    addEventListener("mousemove", (e) => {
      if (!this.enabled || document.pointerLockElement == null) return;
      this.yaw -= e.movementX * 17e-4;
      this.pitch = clamp2(this.pitch - e.movementY * 15e-4, -1.25, 1.25);
    });
  }
  toggleFlash() {
    this.flashOn = !this.flashOn;
    this.flash.intensity = this.flashOn ? 22 : 0;
    this.audio?.click(0.5);
  }
  setView(yaw, pitch) {
    this.yaw = yaw;
    this.pitch = pitch;
  }
  update(dt) {
    if (!this.enabled) {
      this.applyCamera(dt);
      return;
    }
    const k = this.keys;
    let fx = 0, fz = 0;
    if (k.KeyW || k.ArrowUp) fz -= 1;
    if (k.KeyS || k.ArrowDown) fz += 1;
    if (k.KeyA || k.ArrowLeft) fx -= 1;
    if (k.KeyD || k.ArrowRight) fx += 1;
    const len = Math.hypot(fx, fz) || 1;
    fx /= len;
    fz /= len;
    const run = k.ShiftLeft || k.ShiftRight ? 1 : 0;
    const targetSpeed = run ? this.runSpeed : this.speed;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const wx = fx * cy + fz * sy;
    const wz = fx * -sy + fz * cy;
    const accel = k.KeyW || k.KeyS || k.KeyA || k.KeyD ? 10 : 14;
    this.vel.x = damp2(this.vel.x, wx * targetSpeed, accel, dt);
    this.vel.z = damp2(this.vel.z, wz * targetSpeed, accel, dt);
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    const gy = this.groundY;
    if (!this.world.blocked(nx, this.pos.z, this.radius, gy + 0.2)) this.pos.x = nx;
    else this.vel.x *= 0.2;
    if (!this.world.blocked(this.pos.x, nz, this.radius, gy + 0.2)) this.pos.z = nz;
    else this.vel.z *= 0.2;
    const g = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + this.eye);
    this.groundY = damp2(this.groundY, g, 18, dt);
    this.pos.y = this.groundY;
    const moving = Math.hypot(this.vel.x, this.vel.z);
    this.bob += dt * moving * 2.2;
    this.stepDist += moving * dt;
    if (this.stepDist > (run ? 0.85 : 0.72)) {
      this.stepDist = 0;
      this.audio?.step(this.world.currentRoom, run);
    }
    this.applyCamera(dt, moving, run);
    this._lastInteract += dt;
    if (this._lastInteract > 0.09) {
      this._lastInteract = 0;
      this.probe();
    }
  }
  probe() {
    this.ray.setFromCamera(new Vector2(0, 0), this.camera);
    const meshes = this.world.interactables.map((i) => i.mesh).filter((m) => m.visible);
    const hits = this.ray.intersectObjects(meshes, false);
    let found = null;
    for (const h of hits) {
      const it = h.object.userData.interact;
      if (it && it.enabled && h.distance < it.range) {
        found = it;
        break;
      }
    }
    if (found !== this.hover) this.hover = found;
  }
  tryInteract() {
    if (!this.enabled) return;
    if (this.hover) {
      this.audio?.click(0.35);
      this.hover.use();
    }
  }
  applyCamera(dt, moving = 0, run = 0) {
    const bobAmp = Math.min(0.028, moving * 0.012);
    const bobY = Math.sin(this.bob * 2) * bobAmp * (run ? 1.25 : 1);
    const bobX = Math.cos(this.bob) * bobAmp * 0.6;
    const c = this.camera;
    c.position.set(
      this.pos.x + bobX * 0.4,
      this.pos.y + this.eye + bobY + this.eyeOffset,
      this.pos.z
    );
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    this.shake = damp2(this.shake, 0, 8, dt || 0.016);
    c.rotation.set(this.pitch + shakeY, this.yaw + shakeX, Math.sin(this.bob) * 6e-3 * (moving > 0.1 ? 1 : 0), "YXZ");
    if (this.flash) {
      this.flash.intensity = this.flashOn ? 20 + Math.sin(performance.now() * 0.02) * 0.8 : 0;
    }
  }
};
