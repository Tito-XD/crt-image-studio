export const PRESETS = {
  handheld: { label: '掌机微光', scan: 22, glow: 15, mask: 10, curve: 4, vignette: 16, grain: 5, lines: 160, shift: 3, brightness: 104, saturation: 105, warmth: 0, monochrome: 0 },
  arcade: { label: '街机时刻', scan: 45, glow: 34, mask: 40, curve: 30, vignette: 35, grain: 10, lines: 240, shift: 24, brightness: 111, saturation: 120, warmth: -12, monochrome: 0 },
  warm: { label: '旧日电视', scan: 32, glow: 38, mask: 15, curve: 24, vignette: 38, grain: 19, lines: 200, shift: 13, brightness: 106, saturation: 87, warmth: 40, monochrome: 0 },
  terminal: { label: '绿色终端', scan: 42, glow: 32, mask: 12, curve: 18, vignette: 38, grain: 12, lines: 220, shift: 0, brightness: 113, saturation: 100, warmth: 0, monochrome: 1 },
};
export const CONTROLS = [
  { key: 'scan', label: '扫描线', min: 0, max: 100 },
  { key: 'glow', label: '荧光晕', min: 0, max: 100 },
  { key: 'mask', label: '荧光点阵', min: 0, max: 100 },
  { key: 'curve', label: '屏幕弧度', min: 0, max: 100 },
  { key: 'vignette', label: '边缘暗角', min: 0, max: 100 },
  { key: 'grain', label: '细微颗粒', min: 0, max: 100 },
  { key: 'lines', label: '扫描线密度', min: 80, max: 480, step: 10, advanced: true },
  { key: 'shift', label: '色彩错位', min: 0, max: 100, advanced: true },
  { key: 'brightness', label: '亮度', min: 70, max: 140, advanced: true },
  { key: 'saturation', label: '饱和度', min: 0, max: 150, advanced: true },
  { key: 'warmth', label: '冷暖色调', min: -100, max: 100, advanced: true },
];
export function fitSize(width, height, limit) {
  const scale = Math.min(1, limit / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

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
float noise(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 p = v_uv * 2.0 - 1.0;
  vec2 q = (p * (1.0 + u_fx1.w * .12 * p.yx * p.yx)) * .5 + .5;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) {
    gl_FragColor = vec4(.025, .045, .06, 1.0); return;
  }
  vec4 sampleColor = texture2D(u_image, q);
  vec3 color = sampleColor.rgb;
  float aberration = u_fx2.z * .0025;
  color.r = texture2D(u_image, q + vec2(aberration, 0.0)).r;
  color.b = texture2D(u_image, q - vec2(aberration, 0.0)).b;
  vec2 radius = vec2(1.0 / u_aspect, 1.0) * .004;
  vec3 halo = texture2D(u_image, q + vec2(radius.x, 0.)).rgb;
  halo += texture2D(u_image, q - vec2(radius.x, 0.)).rgb;
  halo += texture2D(u_image, q + vec2(0., radius.y)).rgb;
  halo += texture2D(u_image, q - vec2(0., radius.y)).rgb;
  halo += texture2D(u_image, q + radius).rgb;
  halo += texture2D(u_image, q - radius).rgb;
  halo += texture2D(u_image, q + vec2(radius.x, -radius.y)).rgb;
  halo += texture2D(u_image, q + vec2(-radius.x, radius.y)).rgb;
  color += max(halo / 8.0 - .18, vec3(0.)) * u_fx1.y * .55;
  float luma = dot(color, vec3(.2126,.7152,.0722));
  color = mix(vec3(luma), color, u_tone.y);
  color *= vec3(1.0 + u_warmth * .15, 1.0 + u_warmth * .02, 1.0 - u_warmth * .15);
  if (u_tone.w > .5) color = vec3(.33, 1.0, .52) * luma * 1.08;
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
    this.uniforms = Object.fromEntries(['u_image','u_resolution','u_aspect','u_fx1','u_fx2','u_tone','u_warmth'].map(name => [name, gl.getUniformLocation(this.program, name)]));
    this.texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.uniforms.u_image, 0);
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
    gl.uniform4f(u.u_tone, s.brightness / 100, s.saturation / 100, s.lines, s.monochrome);
    gl.uniform1f(u.u_warmth, s.warmth / 100);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('绘制没有完成，请减小导出尺寸后重试。');
  }
  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture); gl.deleteBuffer(this.buffer); gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
