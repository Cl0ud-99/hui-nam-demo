import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { GradeShader } from './gradeShader.js';
import { WET_MATERIALS } from './reflector.js';

export const QUALITY = {
  high:   { label: '高',   ao: true,  bloom: true, refl: 1.0,  pixelRatio: 1.0, shadow: 2048, smaa: true },
  medium: { label: '中',   ao: false, bloom: true, refl: 0.55, pixelRatio: 0.9, shadow: 1024, smaa: true },
  low:    { label: '低',   ao: false, bloom: true, refl: 0.0,  pixelRatio: 0.7, shadow: 512,  smaa: false },
};

export class Engine {
  constructor(container) {
    const renderer = new THREE.WebGLRenderer({
      antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.info.autoReset = false;
    container.appendChild(renderer.domElement);

    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.045, 90);
    this.quality = 'high';
    this.clock = new THREE.Clock();
    this._size = new THREE.Vector2(window.innerWidth, window.innerHeight);

    this._buildComposer();

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildComposer() {
    const { renderer, scene, camera } = this;
    const w = window.innerWidth, h = window.innerHeight;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    rt.texture.colorSpace = THREE.NoColorSpace;
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));

    this.gtao = new GTAOPass(scene, camera, w, h);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 1.0;
    this.gtao.updateGtaoMaterial({
      radius: 0.42, distanceExponent: 1.4, thickness: 1.0, scale: 1.0,
      samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false,
    });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    this.composer.addPass(this.gtao);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.34, 0.8, 1.25);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uExposure.value = 1.07;
    this.grade.uniforms.uRes.value = [w, h];
    this.composer.addPass(this.grade);

    this.smaa = new SMAAPass(w, h);
    this.composer.addPass(this.smaa);
  }

  setQuality(name) {
    const q = QUALITY[name] || QUALITY.high;
    this.quality = name;
    this.q = q;
    this.gtao.enabled = q.ao;
    this.smaa.enabled = q.smaa;
    this.bloom.enabled = q.bloom;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio));
    this.resize();
    return q;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this._size.set(w, h);
    const pr = this.renderer.getPixelRatio();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.grade.uniforms.uRes.value = [w * pr, h * pr];
    for (const m of WET_MATERIALS) {
      const u = m.userData.wet?.uResolution;
      if (u) u.value.set(w * pr, h * pr);
    }
    this.resizeCbs && this.resizeCbs.forEach(f => f(w, h));
  }

  onResize(fn) { (this.resizeCbs ||= []).push(fn); }

  render(dt) {
    this.grade.uniforms.uTime.value += dt;
    this.renderer.info.reset();
    this.composer.render(dt);
  }
}
