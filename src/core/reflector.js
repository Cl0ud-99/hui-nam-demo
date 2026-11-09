import * as THREE from 'three';

/**
 * Planar reflection probe. Adapted from three's Reflector: renders the scene from a
 * mirrored camera into an HDR target, exposes the texture + projection matrix so any
 * number of custom materials (wet floors, puddles, mirrors) can sample it.
 */
export const WET_MATERIALS = [];
const DUMMY = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
DUMMY.needsUpdate = true;

export class PlanarReflector {
  constructor(renderer, scene, planeObject, {
    width = 1024, height = 640, clipBias = 0.003, extraLayers = [], hide = [],
  } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.plane = planeObject;
    this.clipBias = clipBias;
    this.extraLayers = extraLayers;
    this.hide = hide;
    this.textureMatrix = new THREE.Matrix4();
    this.enabled = true;
    this.rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      generateMipmaps: false,
    });
    this.rt.texture.colorSpace = THREE.NoColorSpace;
    this.virtualCamera = new THREE.PerspectiveCamera();
    this._normal = new THREE.Vector3();
    this._plane = new THREE.Plane();
    this._clip = new THREE.Vector4();
    this._q = new THREE.Vector4();
    this._view = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._rot = new THREE.Matrix4();
    this._camPos = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    this._size = new THREE.Vector2(width, height);
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    this._size.set(w, h);
  }

  update(camera) {
    if (!this.enabled) return;
    const scope = this.plane;
    const renderer = this.renderer;
    scope.updateMatrixWorld();
    const normal = this._normal.set(0, 0, 1).applyMatrix4(this._rot.extractRotation(scope.matrixWorld)).normalize();
    const worldPos = this._pos.setFromMatrixPosition(scope.matrixWorld);
    const camPos = this._camPos.setFromMatrixPosition(camera.matrixWorld);

    const view = this._view.subVectors(worldPos, camPos);
    if (view.dot(normal) > 0) return;
    view.reflect(normal).negate().add(worldPos);

    const rot = this._rot.extractRotation(camera.matrixWorld);
    const look = this._look.set(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = this._target.subVectors(worldPos, look);
    target.reflect(normal).negate().add(worldPos);

    const vc = this.virtualCamera;
    vc.position.copy(view);
    vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal).normalize();
    vc.lookAt(target);
    vc.far = camera.far;
    vc.near = camera.near;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);

    // world -> reflection screen uv
    this.textureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    this.textureMatrix.multiply(vc.projectionMatrix);
    this.textureMatrix.multiply(vc.matrixWorldInverse);

    // oblique near plane so geometry behind the mirror never leaks in
    const plane = this._plane.setFromNormalAndCoplanarPoint(normal, worldPos);
    plane.applyMatrix4(vc.matrixWorldInverse);
    const clip = this._clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = vc.projectionMatrix;
    const q = this._q;
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1.0 - this.clipBias;
    pm.elements[14] = clip.w;

    // camera layers: default + reflector extras (mirror-only actors)
    vc.layers.mask = camera.layers.mask;
    for (const l of this.extraLayers) vc.layers.enable(l);

    const prevRT = renderer.getRenderTarget();
    // prevent a reflection target being sampled while it is being rendered into
    const savedAmounts = [];
    for (const m of WET_MATERIALS) {
      const u = m.userData.wet;
      if (u) {
        savedAmounts.push([u.uReflAmount, u.uReflAmount.value, u.tReflect, u.tReflect.value]);
        u.uReflAmount.value = 0;
        u.tReflect.value = DUMMY;
      }
    }
    for (const mat of (this.selfMaterials || [])) {
      const u = mat.uniforms?.tReflect;
      if (u) { savedAmounts.push([null, null, u, u.value]); u.value = DUMMY; }
    }
    const hidden = [];
    for (const o of this.hide) {
      if (!o) continue;
      if (o.visible) { o.visible = false; hidden.push(o); }
    }
    renderer.setRenderTarget(this.rt);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(this.scene, vc);
    renderer.setRenderTarget(prevRT);
    for (const [u, v, texU, texV] of savedAmounts) {
      if (u) u.value = v;
      if (texU) texU.value = texV;
    }
    for (const o of hidden) o.visible = true;
  }
}

/**
 * Inject planar reflection + wetness into a MeshStandardMaterial.
 * UVs/world positions are in metres; puddle mask is sampled in world XZ.
 */
export function wetify(material, {
  reflector, amount = 1.0, distortion = 0.045, puddleMap = null, puddleScale = 0.12,
  puddleDarken = 0.5, tint = 0xffffff, falloff = 3.0, blur = 0.0,
  grout = 0, groutWidth = 0.022, groutDark = 0.55,
} = {}) {
  const uniforms = {
    tReflect: { value: reflector.rt.texture },
    uReflMatrix: { value: reflector.textureMatrix },
    // procedural panel joints: 0 = off. World-space so the seam never depends on texture
    // resolution and stays crisp at grazing angles (the old baked grout vanished in mipmaps).
    uGroutGrid: { value: grout },
    uGroutWidth: { value: groutWidth },
    uGroutDark: { value: groutDark },
    uReflAmount: { value: amount },
    uReflDistort: { value: distortion },
    uPuddleMap: { value: puddleMap },
    uPuddleScale: { value: puddleScale },
    uPuddleDarken: { value: puddleDarken },
    uReflTint: { value: new THREE.Color(tint) },
    uReflFalloff: { value: falloff },
    uReflBlur: { value: blur },
    uReflDebug: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  };
  material.userData.wet = uniforms;
  if (!WET_MATERIALS.includes(material)) WET_MATERIALS.push(material);
  material.userData.reflector = reflector;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        uniform sampler2D tReflect;
        uniform mat4 uReflMatrix;
        uniform float uGroutGrid, uGroutWidth, uGroutDark;
        uniform float uReflAmount;
        uniform float uReflDistort;
        uniform sampler2D uPuddleMap;
        uniform float uPuddleScale;
        uniform float uPuddleDarken;
        uniform vec3 uReflTint;
        uniform float uReflFalloff;
        uniform float uReflBlur;
        uniform float uReflDebug;
        uniform vec2 uResolution;
        float WetPuddle(vec2 p){ ${puddleMap ? 'return texture2D(uPuddleMap, p * uPuddleScale).r;' : 'return 1.0;'} }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float wetMask = WetPuddle(vWPos.xz) * uReflAmount;
        ${puddleMap ? 'diffuseColor.rgb *= mix(1.0, 1.0 - uPuddleDarken, wetMask);' : ''}
        if (uGroutGrid > 0.0001) {
          vec2 gd = abs(fract(vWPos.xz / uGroutGrid + 0.5) - 0.5) * uGroutGrid;
          float gdist = min(gd.x, gd.y);
          float seam = 1.0 - smoothstep(uGroutWidth * 0.5, uGroutWidth * 0.5 + 0.009, gdist);
          float bevel = 1.0 - smoothstep(uGroutWidth * 0.5 + 0.009, uGroutWidth * 1.1 + 0.02, gdist);
          diffuseColor.rgb *= mix(1.0, 1.0 - uGroutDark, seam);
          diffuseColor.rgb *= mix(1.0, 0.86, bevel * 0.5);
        }`)
      .replace('#include <opaque_fragment>', `{
          float puddle = WetPuddle(vWPos.xz);
          vec3 vn = normalize(vNormal);
          // projected planar reflection (same matrix the mirrors use). The old screen-space
          // lookup smeared every highlight along the view ray, which read as brushed streaks.
          vec4 rp = uReflMatrix * vec4(vWPos, 1.0);
          vec2 ruv = rp.xy / max(rp.w, 0.0001);
          ruv += vn.xy * uReflDistort * (0.35 + puddle * 0.9);
          // multi-tap blur: a matte, damp floor should smear the reflection, not mirror it.
          // gated on uReflAmount so the reflector's own pass (which zeroes it) never samples
          // the target it is currently rendering into — that feedback loop killed the context
          vec3 refl = vec3(0.0);
          if (uReflAmount > 0.0005 && uReflBlur > 0.0001) {
            vec2 b = vec2(uReflBlur, uReflBlur * 0.75);
            refl = texture2D(tReflect, clamp(ruv, 0.001, 0.999)).rgb * 0.36
                 + texture2D(tReflect, clamp(ruv + vec2( b.x, 0.0), 0.001, 0.999)).rgb * 0.16
                 + texture2D(tReflect, clamp(ruv + vec2(-b.x, 0.0), 0.001, 0.999)).rgb * 0.16
                 + texture2D(tReflect, clamp(ruv + vec2(0.0,  b.y), 0.001, 0.999)).rgb * 0.16
                 + texture2D(tReflect, clamp(ruv + vec2(0.0, -b.y), 0.001, 0.999)).rgb * 0.16;
          } else if (uReflAmount > 0.0005) {
            refl = texture2D(tReflect, clamp(ruv, 0.001, 0.999)).rgb;
          }
          refl *= uReflTint;
          float ndv = clamp(dot(normalize(vViewPosition), vn), 0.0, 1.0);
          float fres = pow(1.0 - ndv, 4.0);
          float amt = uReflAmount * (0.16 + 0.46 * puddle) * (0.30 + 0.70 * fres);
          amt = clamp(amt, 0.0, 0.62);
          outgoingLight += refl * amt;
          if (uReflDebug > 0.5) outgoingLight = refl;
        }
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'wet' + (puddleMap ? 'P' : 'C');
  return material;
}
