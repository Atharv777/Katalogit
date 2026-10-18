export const noiseChunk = /* glsl */ `
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.62, 1.18, -1.18, 1.62);
  for (int i = 0; i < 5; i++){
    v += a * vnoise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}
`;

export const inkFieldVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const inkFieldFragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uEnergy;
uniform float uScroll;
uniform vec3  uDeep;
uniform vec3  uWarm;
uniform vec3  uHot;
varying vec2 vUv;
${noiseChunk}

void main(){
  vec2 p = (vUv - 0.5) * vec2(15.0, 9.5);
  float t = uTime * 0.05;

  vec2 q = vec2(
    fbm(p * 0.9 + vec2(t, -t * 0.7)),
    fbm(p * 0.9 + vec2(5.2, 1.3) - t * 0.9)
  );
  float f = fbm(p * 1.15 + 1.7 * q + vec2(0.0, uScroll * 2.2));

  float filament = 1.0 - smoothstep(0.0, 0.05, abs(f - 0.5));
  float band = smoothstep(0.26, 0.8, f);

  vec3 col = mix(uDeep, uWarm, band);
  col += uHot * filament * (0.3 + uEnergy * 0.5);

  float sweep = 1.0 - smoothstep(0.0, 0.42, abs(vUv.x - (0.5 + sin(uTime * 0.18) * 0.2)));
  col += uWarm * sweep * 0.1 * uEnergy;

  vec2 c = vUv - 0.5;
  float vig = 1.0 - smoothstep(0.02, 0.2, dot(c, c));
  col *= 0.18 + 1.0 * vig;

  float a = clamp(0.42 + band * 0.45 + filament * 0.35, 0.0, 1.0) * vig;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const scanVertex = /* glsl */ `
uniform float uTime;
uniform float uBulge;
uniform vec2  uPointer;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vPos;
varying vec2 vUv;

void main(){
  vUv = uv;
  vec3 p = position;
  vec3 n = normal;

  float d = distance(p.xy, uPointer);
  float bulge = (1.0 - smoothstep(0.0, 1.35, d)) * uBulge;
  p += n * bulge * 0.16;

  p += n * sin(uTime * 1.05 + p.y * 1.7) * 0.0055;

  vPos = p;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormalW = normalize(normalMatrix * n);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const scanFragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uGlint;
uniform float uBulge;
uniform vec2  uPointer;
uniform vec3  uInkDeep;
uniform vec3  uInkWarm;
uniform vec3  uAccent;
uniform vec3  uRim;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vPos;
varying vec2 vUv;
${noiseChunk}

void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);

  float film = fract(fres * 1.25 + uTime * 0.045);
  vec3 iri = 0.5 + 0.5 * cos(6.28318 * (film + vec3(0.0, 0.34, 0.68)));

  float h = clamp(vPos.y * 0.42 + 0.5, 0.0, 1.0);
  vec3 base = mix(uInkDeep, uInkWarm, smoothstep(0.05, 0.98, h));
  base = mix(base, base * iri * 2.2, 0.28 + fres * 0.5);

  float grain = hash21(floor(vUv * 150.0));
  base += (grain - 0.5) * 0.022;

  float dots = smoothstep(0.33, 0.47, length(fract(vUv * 52.0) - 0.5));
  base -= dots * 0.018 * (1.0 - fres);

  vec3 L = normalize(vec3(0.55, 0.8, 0.7));
  float lam = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 46.0);

  vec3 col = base * (0.34 + 0.92 * lam);
  col += uAccent * spec * 1.05;
  col += uRim * fres * 0.5;

  float glintY = fract(uGlint) * 3.8 - 1.9;
  float d = abs(vPos.y - glintY);
  float band = 1.0 - smoothstep(0.0, 0.15, d);
  float hot = 1.0 - smoothstep(0.0, 0.018, d);
  col += uAccent * band * 0.45;
  col += mix(uAccent, vec3(1.0), 0.55) * hot * 1.25;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
