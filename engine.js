// Retro texture keys default to 0, which leaves the original CRT shader path untouched.
const RETRO = { paper: 0, halftone: 0, dither: 0, bead: 0, fade: 0, vhs: 0, leak: 0, palette: 0 };
const preset = (label, values) => ({ label, ...RETRO, ...values });
export const PRESETS = {
  handheld: preset('掌机微光', { scan: 22, glow: 15, mask: 10, curve: 4, vignette: 16, grain: 5, lines: 160, shift: 3, brightness: 104, saturation: 105, warmth: 0 }),
  arcade: preset('街机时刻', { scan: 45, glow: 34, mask: 40, curve: 30, vignette: 35, grain: 10, lines: 240, shift: 24, brightness: 111, saturation: 120, warmth: -12 }),
  warm: preset('旧日电视', { scan: 32, glow: 38, mask: 15, curve: 24, vignette: 38, grain: 19, lines: 200, shift: 13, brightness: 106, saturation: 87, warmth: 40 }),
  terminal: preset('绿色终端', { scan: 42, glow: 32, mask: 12, curve: 18, vignette: 38, grain: 12, lines: 220, shift: 0, brightness: 113, saturation: 100, warmth: 0, palette: 1 }),
  amber: preset('琥珀监视器', { scan: 48, glow: 40, mask: 8, curve: 20, vignette: 42, grain: 10, lines: 240, shift: 0, brightness: 112, saturation: 100, warmth: 0, palette: 2 }),
  vhs: preset('录像带', { scan: 18, glow: 30, mask: 0, curve: 10, vignette: 30, grain: 24, lines: 240, shift: 30, brightness: 104, saturation: 92, warmth: 14, vhs: 62, fade: 18 }),
  polaroid: preset('褪色拍立得', { scan: 0, glow: 22, mask: 0, curve: 0, vignette: 34, grain: 22, lines: 200, shift: 4, brightness: 106, saturation: 82, warmth: 26, fade: 55, leak: 48, paper: 20 }),
  sepia: preset('老相册', { scan: 0, glow: 12, mask: 0, curve: 0, vignette: 52, grain: 30, lines: 200, shift: 0, brightness: 102, saturation: 100, warmth: 0, palette: 3, fade: 30, paper: 72 }),
  newsprint: preset('旧报纸', { scan: 0, glow: 0, mask: 0, curve: 0, vignette: 14, grain: 12, lines: 200, shift: 0, brightness: 106, saturation: 100, warmth: 0, palette: 5, halftone: 100, paper: 85 }),
  comic: preset('漫画网点', { scan: 0, glow: 6, mask: 0, curve: 0, vignette: 8, grain: 6, lines: 160, shift: 0, brightness: 108, saturation: 135, warmth: 6, halftone: 88, paper: 40 }),
  pocket: preset('口袋四色', { scan: 14, glow: 8, mask: 22, curve: 0, vignette: 10, grain: 0, lines: 180, shift: 0, brightness: 104, saturation: 100, warmth: 0, palette: 4, dither: 70 }),
  eightbit: preset('八位像素', { scan: 20, glow: 14, mask: 12, curve: 6, vignette: 14, grain: 0, lines: 240, shift: 0, brightness: 106, saturation: 125, warmth: 0, dither: 45 }),
};
// Optional styles inside a preset; each overrides a few of the preset's values.
export const VARIANTS = {
  eightbit: [
    { key: 'square', label: '方格', values: {} },
    { key: 'bead', label: '拼豆', values: { bead: 55, dither: 0, lines: 120, scan: 0, mask: 0, glow: 0, curve: 0, vignette: 10, grain: 6, saturation: 115, brightness: 104 } },
  ],
};
export const PRESET_GROUPS = [
  { key: 'crt', label: '显像管', presets: ['handheld', 'arcade', 'warm', 'terminal', 'amber', 'vhs'] },
  { key: 'print', label: '纸与像素', presets: ['polaroid', 'sepia', 'newsprint', 'comic', 'pocket', 'eightbit'] },
];
// Indices are stored in presets; append new palettes, never reorder.
export const PALETTES = ['原色', '绿屏', '琥珀', '棕褐', '四色', '黑白', '反色', '蓝晒', '双色', '热成像', '青品四色'];
// One fixed order for the parameter chips; the panel shows a single control at a time.
export const CONTROLS = [
  { key: 'scan', label: '扫描线', min: 0, max: 100 },
  { key: 'glow', label: '荧光', min: 0, max: 100 },
  { key: 'mask', label: '点阵', min: 0, max: 100 },
  { key: 'curve', label: '弧度', min: 0, max: 100 },
  { key: 'vignette', label: '暗角', min: 0, max: 100 },
  { key: 'grain', label: '颗粒', min: 0, max: 100 },
  { key: 'palette', label: '色调', type: 'select' },
  { key: 'paper', label: '纸纹', min: 0, max: 100 },
  { key: 'halftone', label: '网点', min: 0, max: 100 },
  { key: 'dither', label: '抖动', min: 0, max: 100 },
  { key: 'bead', label: '拼豆', min: 0, max: 100, hint: '0 为关闭，越大烫得越平' },
  { key: 'fade', label: '褪色', min: 0, max: 100 },
  { key: 'leak', label: '漏光', min: 0, max: 100 },
  { key: 'vhs', label: '干扰', min: 0, max: 100 },
  { key: 'lines', label: '密度', min: 80, max: 480, step: 10 },
  { key: 'shift', label: '错位', min: 0, max: 100 },
  { key: 'brightness', label: '亮度', min: 70, max: 140 },
  { key: 'saturation', label: '饱和度', min: 0, max: 150 },
  { key: 'warmth', label: '冷暖', min: -100, max: 100 },
];
export function fitSize(width, height, limit) {
  const scale = Math.min(1, limit / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const BEADS = [
  '#f4f2ec', '#c9c7c0', '#8a8b8c', '#4a4c50', '#1c1c1e', '#f6e3c6', '#e7b98e', '#b9784d', '#7a4a2e', '#4a2d20',
  '#fbe25b', '#f6b331', '#f07c2a', '#e24c2f', '#c8282e', '#8f1f2d', '#f6a6b8', '#e5579b', '#a33b8a', '#6b3f9e',
  '#b6a6dd', '#2f4fa8', '#3c8fd6', '#9fd3f0', '#2aa5a0', '#8ed1a4', '#3f9a4b', '#1f5a3a',
].flatMap(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255));
const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
`;
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_aspect;
uniform vec4 u_fx1;
uniform vec4 u_fx2;
uniform vec4 u_tone;
uniform float u_warmth;
uniform vec4 u_retro1; // paper, halftone, dither, fade
uniform vec4 u_retro2; // vhs, leak, bead, unused
uniform vec3 u_beads[28];
float noise(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(noise(i), noise(i + vec2(1., 0.)), f.x), mix(noise(i + vec2(0., 1.)), noise(i + 1.), f.x), f.y);
}
float fbm(vec2 p) { return valueNoise(p) * .5 + valueNoise(p * 2.03) * .3 + valueNoise(p * 4.1) * .2; }
float bayer2(vec2 a) { a = floor(mod(a, 2.0)); return mod(a.x * 2.0 + a.y * 3.0, 4.0) / 4.0; }
float bayer4(vec2 a) { return bayer2(a) * .25 + bayer2(floor(a * .5)); }
// Ink coverage of one rotated halftone screen; resolution-aware to avoid moire on small renders.
float dotScreen(vec2 uv, float ink, float angle, float cells) {
  float c = cos(angle), s = sin(angle);
  vec2 g = mat2(c, -s, s, c) * vec2(uv.x * u_aspect, uv.y) * cells;
  float d = length(fract(g) - .5);
  float r = sqrt(clamp(ink, 0.0, 1.0)) * .72;
  float aa = cells / u_resolution.y * 1.4;
  float m = ink <= 0.0 ? 0.0 : 1.0 - smoothstep(r - aa, r + aa, d);
  return mix(clamp(ink, 0.0, 1.0), m, smoothstep(.5, .28, cells / u_resolution.y));
}
vec3 nearestBead(vec3 c) {
  vec3 best = u_beads[0]; float bestD = 100.0;
  for (int i = 0; i < 28; i++) {
    vec3 d = (c - u_beads[i]) * vec3(.9, 1.2, .7); float dd = dot(d, d);
    if (dd < bestD) { bestD = dd; best = u_beads[i]; }
  }
  return best;
}
vec3 thermal(float x) {
  x = clamp(x, 0.0, 1.0) * 4.0;
  vec3 a = vec3(.05, .03, .2), b = vec3(.45, .1, .6), c = vec3(.92, .2, .2), d = vec3(1.0, .7, .1), e = vec3(1.0, .97, .8);
  return x < 1.0 ? mix(a, b, x) : x < 2.0 ? mix(b, c, x - 1.0) : x < 3.0 ? mix(c, d, x - 2.0) : mix(d, e, x - 3.0);
}
vec3 cgaShade(float i) {
  return i < .5 ? vec3(.04, .04, .07) : i < 1.5 ? vec3(.85, .22, .72) : i < 2.5 ? vec3(.32, .85, .9) : vec3(.97, .96, .92);
}
vec3 pocketShade(float x) {
  return x < .5 ? mix(vec3(.10, .17, .13), vec3(.30, .44, .27), x * 2.0) : mix(vec3(.30, .44, .27), vec3(.72, .79, .52), x * 2.0 - 1.0);
}
void main() {
  vec2 p = v_uv * 2.0 - 1.0;
  vec2 q = (p * (1.0 + u_fx1.w * .12 * p.yx * p.yx)) * .5 + .5;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) {
    gl_FragColor = vec4(.025, .045, .06, 1.0); return;
  }
  const vec3 W = vec3(.2126,.7152,.0722);
  float vhs = u_retro2.x, dither = u_retro1.z, bead = u_retro2.z, mode = floor(u_tone.w + .5);
  // s is where the source is sampled; q stays the screen position for scanlines and masks.
  vec2 s = q;
  if (vhs > 0.0) {
    s.x += (noise(vec2(floor(q.y * 90.0), 3.7)) - .5) * .006 * vhs;
    s.x += smoothstep(.08, 0.0, q.y) * (noise(vec2(floor(q.y * 240.0), 9.1)) - .3) * .04 * vhs;
  }
  vec2 cell = vec2(u_tone.z * u_aspect, u_tone.z) * .5, cellId = floor(q * cell);
  if (dither > 0.0 || bead > 0.0) s = (cellId + .5) / cell;
  vec4 sampleColor = texture2D(u_image, s);
  vec3 color = sampleColor.rgb;
  float aberration = u_fx2.z * .0025;
  color.r = texture2D(u_image, s + vec2(aberration, 0.0)).r;
  color.b = texture2D(u_image, s - vec2(aberration, 0.0)).b;
  vec2 radius = vec2(1.0 / u_aspect, 1.0) * .004;
  vec3 halo = texture2D(u_image, s + vec2(radius.x, 0.)).rgb;
  halo += texture2D(u_image, s - vec2(radius.x, 0.)).rgb;
  halo += texture2D(u_image, s + vec2(0., radius.y)).rgb;
  halo += texture2D(u_image, s - vec2(0., radius.y)).rgb;
  halo += texture2D(u_image, s + radius).rgb;
  halo += texture2D(u_image, s - radius).rgb;
  halo += texture2D(u_image, s + vec2(radius.x, -radius.y)).rgb;
  halo += texture2D(u_image, s + vec2(-radius.x, radius.y)).rgb;
  color += max(halo / 8.0 - .18, vec3(0.)) * u_fx1.y * .55;
  if (bead > 0.0) {
    // One bead takes the average colour of its square, not a single noisy texel.
    vec2 o = .25 / cell;
    vec3 avg = texture2D(u_image, s + vec2(o.x, o.y)).rgb + texture2D(u_image, s - vec2(o.x, o.y)).rgb
      + texture2D(u_image, s + vec2(o.x, -o.y)).rgb + texture2D(u_image, s + vec2(-o.x, o.y)).rgb;
    color = mix(color, avg / 4.0, .6);
  }
  if (vhs > 0.0) {
    // Tape keeps sharp brightness but smears colour to the right.
    vec3 smear = vec3(0.);
    for (int i = 1; i <= 4; i++) smear += texture2D(u_image, s - vec2(float(i) * .004 * vhs, 0.)).rgb;
    vec3 bled = mix(color, smear / 4.0, .85);
    color = vec3(dot(color, W)) + (bled - dot(bled, W));
    float row = floor(q.y * u_tone.z);
    float streak = step(.988 - .018 * vhs, noise(vec2(row, 21.0)));
    color += streak * noise(vec2(floor(q.x * 140.0), row)) * .45 * vhs;
  }
  float luma = dot(color, W);
  color = mix(vec3(luma), color, u_tone.y);
  color *= vec3(1.0 + u_warmth * .15, 1.0 + u_warmth * .02, 1.0 - u_warmth * .15);
  float bayer = bayer4(cellId);
  if (mode == 1.0) color = vec3(.33, 1.0, .52) * luma * 1.08;
  else if (mode == 2.0) color = vec3(1.0, .64, .2) * luma * 1.12;
  else if (mode == 3.0) color = vec3(luma) * vec3(1.06, .93, .74) + vec3(.045, .025, 0.);
  else if (mode == 4.0) color = pocketShade(clamp(floor(luma * 3.0 + mix(.5, bayer, dither)) / 3.0, 0.0, 1.0));
  else if (mode == 5.0) color = vec3(luma);
  else if (mode == 6.0) color = 1.0 - clamp(color, 0.0, 1.0);
  else if (mode == 7.0) color = mix(vec3(.04, .16, .36), vec3(.93, .95, .9), pow(luma, .9));
  else if (mode == 8.0) color = mix(vec3(.16, .2, .45), vec3(1.0, .62, .5), smoothstep(0.0, 1.0, luma));
  else if (mode == 9.0) color = thermal(luma);
  else if (mode == 10.0) color = cgaShade(clamp(floor(luma * 3.0 + mix(.5, bayer, dither)), 0.0, 3.0));
  float fade = u_retro1.w, leak = u_retro2.y;
  if (fade > 0.0) color = mix(color, color * .8 + vec3(.14, .12, .1), fade * .85);
  if (leak > 0.0) {
    vec2 lp = vec2(q.x * u_aspect, q.y);
    float a = smoothstep(1.15, 0.0, length((q - vec2(0.0, 1.0)) * vec2(u_aspect, 1.0)));
    a += .7 * smoothstep(.45, 0.0, 1.0 - q.x) * smoothstep(.0, .5, q.y);
    a *= .55 + .7 * fbm(lp * 2.2 + 3.0);
    color = 1.0 - (1.0 - color) * (1.0 - vec3(1.0, .46, .2) * clamp(a, 0.0, 1.0) * leak);
  }
  if (dither > 0.0 && mode != 4.0 && mode != 10.0) {
    float levels = mix(12.0, 3.0, dither);
    color = floor(clamp(color, 0.0, 1.0) * (levels - 1.0) + mix(.5, bayer, dither)) / (levels - 1.0);
  }
  float ht = u_retro1.y;
  if (ht > 0.0) {
    float cells = u_tone.z * .5;
    vec3 printed;
    if (mode == 0.0 || mode == 6.0) {
      vec3 ink = 1.0 - clamp(color, 0.0, 1.0);
      printed = 1.0 - vec3(dotScreen(q, ink.r, .262, cells), dotScreen(q, ink.g, 1.309, cells), dotScreen(q, ink.b, 0.0, cells));
    } else {
      float L = dot(color, W), top = max(max(color.r, color.g), max(color.b, .05));
      printed = (mode == 5.0 ? vec3(1.0) : color / top) * (1.0 - dotScreen(q, 1.0 - clamp(mode == 5.0 ? L : top, 0.0, 1.0), .785, cells));
    }
    color = mix(color, printed, ht);
  }
  if (bead > 0.0) {
    // Ironed fuse beads: rounder with a big hole when barely ironed, flat squares when melted.
    vec3 bc = nearestBead(clamp(color, 0.0, 1.0));
    vec2 f = fract(q * cell) - .5;
    float px = cell.y / u_resolution.y, aa = 1.2 * px, t = clamp(bead, 0.0, 1.0);
    float hs = mix(.44, .5, t * t), rad = mix(.3, .1, t), hole = mix(.22, .07, t);
    vec2 d = abs(f) - (hs - rad);
    float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - rad;
    float body = 1.0 - smoothstep(-aa, aa, sdf);
    float r = length(f), inHole = 1.0 - smoothstep(hole - aa, hole + aa, r);
    vec2 n = f / hs * (1.0 - t * .6);
    float shade = .82 + .22 * dot(normalize(vec3(n, 1.0)), normalize(vec3(-.45, .55, .7)));
    float spec = pow(max(0.0, 1.0 - length(f - vec2(-.16, .16)) / .22), 3.0) * (.35 - .2 * t);
    float rim = smoothstep(hole, hole + .04, r) * (1.0 - smoothstep(hole + .04, hole + .12, r));
    vec3 surface = (bc * shade + spec) * (1.0 - .12 * rim);
    vec3 board = vec3(.93, .91, .87) * (1.0 - .18 * (1.0 - smoothstep(0.0, .08, sdf)));
    vec3 beads = mix(board, mix(surface, bc * .45, inHole), body);
    // Below about three pixels per bead the shapes only alias, so fall back to flat colour squares.
    color = mix(bc, beads, smoothstep(3.0, 6.0, 1.0 / px));
  }
  // A fixed virtual tube, independent of preview or export pixel dimensions.
  float line = .5 + .5 * cos(q.y * u_tone.z * 6.2831853);
  float scanAmount = u_fx1.x * min(1.0, u_resolution.y / (u_tone.z * 2.0));
  color *= (1.0 - scanAmount * pow(line, 3.0) * .65) * (1.0 + scanAmount * .12);
  float phase = mod(floor(q.x * u_tone.z * u_aspect * 3.0), 3.0);
  vec3 phosphor = phase < 1.0 ? vec3(1.13,.84,.84) : (phase < 2.0 ? vec3(.84,1.13,.84) : vec3(.84,.84,1.13));
  float maskAmount = u_fx1.z * min(1.0, u_resolution.x / (u_tone.z * u_aspect * 3.0));
  color *= mix(vec3(1.), phosphor, maskAmount);
  float vignette = pow(max(0.0, 1.0 - dot(p * .65, p * .65)), .65);
  color *= mix(1.0, vignette, u_fx2.x);
  float paper = u_retro1.x;
  if (paper > 0.0) {
    // Fixed to image coordinates so preview and export share the same fibres and stains.
    vec2 pp = vec2(q.x * u_aspect, q.y);
    float fibre = fbm(pp * vec2(260.0, 70.0)) * .6 + fbm(pp * vec2(60.0, 300.0)) * .4;
    float tooth = valueNoise(pp * 520.0);
    float stain = smoothstep(.55, .85, fbm(pp * 3.2 + 7.0));
    float edge = smoothstep(.75, 1.25, length(p * vec2(1.0, 1.0 / max(u_aspect, .5)) * .9));
    vec3 stock = vec3(.97, .93, .83) * (1.0 - stain * .1 - edge * .2) - vec3(0., .02, .06) * (stain + edge);
    vec3 surface = stock * (.9 + .1 * fibre) * (.96 + .08 * tooth);
    color = mix(color, color * surface + vec3(.035, .03, .02) * (1.0 - color), paper);
  }
  float grain = noise(floor(q * vec2(900.0 * u_aspect, 900.0))) - .5;
  color += grain * u_fx2.y * .16;
  color *= u_tone.x;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
export class CRTRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) throw new Error('这个浏览器暂时无法启用图像处理。请打开硬件加速，或换用新版 Chrome、Safari、Firefox。');
    this.gl = gl;
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    this.maxEdge = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), viewport[0], viewport[1]);
    const compile = (kind, source) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(`绘制程序初始化失败：${message}`);
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX), fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertex); gl.attachShader(this.program, fragment); gl.linkProgram(this.program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('这个浏览器无法创建图片效果，请尝试更新浏览器。');
    gl.useProgram(this.program);
    this.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.uniforms = Object.fromEntries(['u_image','u_resolution','u_aspect','u_fx1','u_fx2','u_tone','u_warmth','u_retro1','u_retro2','u_beads'].map(name => [name, gl.getUniformLocation(this.program, name)]));
    this.texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.uniforms.u_image, 0);
    gl.uniform3fv(this.uniforms.u_beads, BEADS);
  }
  setSource(image) {
    const gl = this.gl;
    this.aspect = image.width / image.height;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('图片尺寸超出当前设备的绘制能力，请换一张较小的图片。');
  }
  render(settings, width, height) {
    const gl = this.gl, u = this.uniforms, s = settings;
    if (gl.isContextLost()) throw new Error('绘制暂时中断，正在等待浏览器恢复。');
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    gl.viewport(0, 0, width, height); gl.useProgram(this.program);
    gl.uniform2f(u.u_resolution, width, height); gl.uniform1f(u.u_aspect, this.aspect);
    gl.uniform4f(u.u_fx1, s.scan / 100, s.glow / 100, s.mask / 100, s.curve / 100);
    gl.uniform4f(u.u_fx2, s.vignette / 100, s.grain / 100, s.shift / 100, 0);
    gl.uniform4f(u.u_tone, s.brightness / 100, s.saturation / 100, s.lines, s.palette || 0);
    gl.uniform1f(u.u_warmth, s.warmth / 100);
    gl.uniform4f(u.u_retro1, (s.paper || 0) / 100, (s.halftone || 0) / 100, (s.dither || 0) / 100, (s.fade || 0) / 100);
    gl.uniform4f(u.u_retro2, (s.vhs || 0) / 100, (s.leak || 0) / 100, (s.bead || 0) / 100, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('绘制没有完成，请减小导出尺寸后重试。');
  }
  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture); gl.deleteBuffer(this.buffer); gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
