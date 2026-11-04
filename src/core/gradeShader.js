export const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uTime: { value: 0 },
    uVignette: { value: 1.0 },
    uGrain: { value: 0.026 },
    uCA: { value: 0.0016 },
    uSat: { value: 0.9 },
    uFade: { value: 0.0 },
    uShadowTint: { value: [0.035, 0.055, 0.055] },
    uHighTint: { value: [0.035, 0.018, -0.012] },
    uRes: { value: [1920, 1080] },
    uPulse: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uExposure, uTime, uVignette, uGrain, uCA, uSat, uFade, uPulse;
    uniform vec3 uShadowTint, uHighTint;
    uniform vec2 uRes;
    varying vec2 vUv;

    vec3 RRTAndODTFit(vec3 v){
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }
    vec3 ACESFilmic(vec3 color){
      const mat3 ACESInputMat = mat3(
        vec3(0.59719, 0.07600, 0.02840),
        vec3(0.35458, 0.90834, 0.13383),
        vec3(0.04823, 0.01566, 0.83777));
      const mat3 ACESOutputMat = mat3(
        vec3( 1.60475, -0.10208, -0.00327),
        vec3(-0.53108,  1.10813, -0.07276),
        vec3(-0.07367, -0.00605,  1.07602));
      color = ACESInputMat * color;
      color = RRTAndODTFit(color);
      color = ACESOutputMat * color;
      return clamp(color, 0.0, 1.0);
    }
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);

      // chromatic aberration scaled to the frame edge
      float ca = uCA * (0.35 + r2 * 2.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * ca).b;

      col *= uExposure * (1.0 + uPulse);

      // grade in linear-ish space before the tonemap
      col = max(col, vec3(0.0));
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSat);
      col += uShadowTint * (1.0 - smoothstep(0.0, 0.22, luma)) * 0.9;
      col += uHighTint * smoothstep(0.55, 2.2, luma);

      col = ACESFilmic(col);

      // gentle contrast S-curve + lifted blacks (film print feel)
      col = pow(col, vec3(1.02));
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
      col = col * 0.955 + 0.012;

      float vig = smoothstep(0.92, 0.18, length(d) * (1.0 / uVignette));
      col *= mix(0.55, 1.0, vig);

      // grain, stronger in the shadows like real film
      float g = hash(uv * uRes + fract(uTime) * 133.7) - 0.5;
      col += g * uGrain * (1.0 - smoothstep(0.0, 0.6, dot(col, vec3(0.33))));
      col += (hash(uv * 1.7 + uTime) - 0.5) * 0.004;

      // linear -> sRGB
      col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
      col *= (1.0 - uFade);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
