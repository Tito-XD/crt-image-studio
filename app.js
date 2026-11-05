import { CRTRenderer, PRESETS, PRESET_GROUPS, PALETTES, CONTROLS, fitSize } from './engine.js';
import { RATIOS, BACKDROPS, NEUTRALS, composeFrame, extractPalette, toHex } from './frame.js';
const $ = id => document.getElementById(id);
const canvas = $('preview'), screen = $('screen'), monitor = $('monitor'), area = $('stage-area');
const DEMO = '暮色海岸 · 示例图';
let renderer, source, image, box, currentURL = null, sourceName = 'image', preset = 'handheld', activeParam = 'scan';
let settings = { ...PRESETS[preset] }, loadingId = 0, renderingFrame = 0, exportBusy = false, comparing = false, toastTimer;
let originalSize = { width: 1600, height: 1200 }, contextLost = false, picking = false, palette = [], exportLimit = 'full';
const frame = { ratio: 'source', fit: 'contain', margin: 8, backdrop: 'blur', color: NEUTRALS[0], autoColor: true, panX: 0, panY: 0 };
const controls = new Map();
const toast = message => {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
};
function showError(message) { $('error').textContent = message; $('error').hidden = false; }
function clearError() { $('error').hidden = true; $('error').textContent = ''; }
const fill = (input, min, max) => input.style.setProperty('--fill', `${(Number(input.value) - min) / (max - min) * 100}%`);

// One parameter at a time: chips pick which control is shown.
const NEUTRAL = { brightness: 100, saturation: 100 };
const isUsed = key => key === 'lines' ? ['scan', 'mask', 'halftone', 'dither'].some(k => settings[k]) : settings[key] !== (NEUTRAL[key] ?? 0);
function updateControl(control) {
  const { input, output, definition, chip } = control, value = settings[definition.key];
  input.value = String(value);
  if (output) { output.value = input.value; fill(input, definition.min, definition.max); }
  chip.classList.toggle('used', isUsed(definition.key));
  chip.classList.toggle('changed', value !== PRESETS[preset][definition.key]);
}
function refreshParams() {
  controls.forEach(updateControl);
  $('reset').disabled = !CONTROLS.some(c => settings[c.key] !== PRESETS[preset][c.key]);
}
function showParam(key) {
  activeParam = key;
  controls.forEach((c, k) => { c.block.hidden = k !== key; c.chip.setAttribute('aria-pressed', String(k === key)); });
}
for (const definition of CONTROLS) {
  const id = `control-${definition.key}`;
  const chip = document.createElement('button'); chip.className = 'param-chip'; chip.textContent = definition.label;
  chip.dataset.param = definition.key; chip.setAttribute('aria-controls', `param-${definition.key}`);
  const block = document.createElement('div'); block.className = 'slider'; block.id = `param-${definition.key}`;
  const heading = document.createElement('div'); heading.className = 'slider-heading';
  const label = document.createElement('label'); label.htmlFor = id; label.textContent = definition.label; heading.append(label);
  let input, output;
  if (definition.type === 'select') {
    input = document.createElement('select'); input.className = 'field';
    PALETTES.forEach((name, index) => input.add(new Option(name, String(index))));
  } else {
    input = document.createElement('input'); input.type = 'range';
    input.min = definition.min; input.max = definition.max; input.step = definition.step || 1;
    output = document.createElement('output'); output.setAttribute('for', id); heading.append(output);
  }
  input.id = id; block.append(heading, input); $('param-chips').append(chip); $('param-body').append(block);
  controls.set(definition.key, { input, output, definition, chip, block });
  chip.addEventListener('click', () => showParam(definition.key));
  input.addEventListener(definition.type === 'select' ? 'change' : 'input', () => { settings[definition.key] = Number(input.value); refreshParams(); scheduleRender(); });
}
showParam(activeParam);
for (const group of PRESET_GROUPS) {
  const holder = document.querySelector(`.presets[data-group=${group.key}]`);
  for (const key of group.presets) {
    const button = document.createElement('button'); button.className = 'preset'; button.dataset.preset = key;
    button.innerHTML = `<span class="preset-swatch ${key}" aria-hidden="true"></span><strong></strong>`;
    button.querySelector('strong').textContent = PRESETS[key].label; holder.append(button);
  }
}
function showGroup(key) {
  document.querySelectorAll('[data-group]').forEach(element => {
    if (element.classList.contains('preset-tab')) element.setAttribute('aria-pressed', String(element.dataset.group === key));
    else element.hidden = element.dataset.group !== key;
  });
}
document.querySelectorAll('.preset-tab').forEach(tab => tab.addEventListener('click', () => showGroup(tab.dataset.group)));
function selectPreset(name) {
  preset = name; settings = { ...PRESETS[name] };
  document.querySelectorAll('[data-preset]').forEach(button => {
    const selected = button.dataset.preset === name;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  refreshParams(); scheduleRender();
}
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => selectPreset(button.dataset.preset)));
selectPreset(preset);
$('reset').addEventListener('click', () => { selectPreset(preset); toast('已还原'); });

// The frame view temporarily replaces the style view so the preview stays visible.
function setFrameView(open) {
  $('frame-view').hidden = !open; $('style-view').hidden = open;
  $('frame-toggle').setAttribute('aria-expanded', String(open));
  if (!open && picking) setPicking(false);
  (open ? $('frame-done') : $('frame-toggle')).focus({ preventScroll: true });
}
$('frame-toggle').addEventListener('click', () => setFrameView($('frame-view').hidden));
$('frame-done').addEventListener('click', () => setFrameView(false));

// Framing controls.
for (const ratio of RATIOS) {
  const chip = document.createElement('button'); chip.className = 'chip'; chip.dataset.ratio = ratio.key; chip.textContent = ratio.label;
  chip.setAttribute('aria-pressed', String(ratio.key === frame.ratio)); $('ratio-chips').append(chip);
  chip.addEventListener('click', () => { frame.ratio = ratio.key; frame.panX = frame.panY = 0; frameChanged(); });
}
for (const backdrop of BACKDROPS) {
  const button = document.createElement('button'); button.dataset.backdrop = backdrop.key; button.textContent = backdrop.label;
  $('backdrop-chips').append(button);
  button.addEventListener('click', () => { frame.backdrop = backdrop.key; frameChanged(); });
}
document.querySelectorAll('[data-fit]').forEach(button => button.addEventListener('click', () => { frame.fit = button.dataset.fit; frame.panX = frame.panY = 0; frameChanged(); }));
$('frame-margin').addEventListener('input', event => { frame.margin = Number(event.target.value); frameChanged(); });
const setColor = (hex, auto = false) => { frame.color = hex; frame.autoColor = auto; frameChanged(); };
$('frame-color').addEventListener('input', event => setColor(event.target.value));
function setPicking(value) {
  picking = value; $('pick-color').setAttribute('aria-pressed', String(value)); screen.classList.toggle('picking', value);
  syncHint();
}
$('pick-color').addEventListener('click', () => { if (comparing) setCompare(false); setPicking(!picking); });
function renderSwatches() {
  const holder = $('swatches'); holder.replaceChildren();
  for (const hex of [...new Set([...palette, ...NEUTRALS])]) {
    const button = document.createElement('button'); button.className = 'swatch'; button.style.setProperty('--swatch', hex);
    button.setAttribute('aria-label', `背景色 ${hex}`); button.setAttribute('aria-pressed', String(hex === frame.color));
    button.addEventListener('click', () => setColor(hex)); holder.append(button);
  }
}
function syncHint() {
  const cover = frame.ratio !== 'source' && frame.fit === 'cover' && box?.overflow && (box.overflow.x > 1 || box.overflow.y > 1);
  screen.classList.toggle('pannable', Boolean(cover) && !picking);
  const hint = picking ? '点画面取色' : cover ? '拖动调整位置，双击居中' : '';
  $('preview-hint').textContent = hint; $('preview-hint').hidden = !hint;
}
function syncFrameUI() {
  const framed = frame.ratio !== 'source', contain = frame.fit === 'contain';
  document.querySelectorAll('[data-ratio]').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.ratio === frame.ratio)));
  document.querySelectorAll('[data-fit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fit === frame.fit)));
  document.querySelectorAll('[data-backdrop]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.backdrop === frame.backdrop)));
  $('fit-row').hidden = !framed; $('margin-row').hidden = !contain;
  $('backdrop-row').hidden = !framed || !contain; $('color-row').hidden = !framed || !contain || frame.backdrop === 'blur';
  $('frame-current').textContent = RATIOS.find(r => r.key === frame.ratio).label;
  const margin = $('frame-margin'); margin.value = frame.margin; $('frame-margin-value').value = frame.margin; fill(margin, 0, 30);
  $('frame-color').value = frame.color; renderSwatches();
  if (!framed || !contain || frame.backdrop === 'blur') { if (picking) setPicking(false); }
  syncHint();
}
let composeFrameId = 0;
function frameChanged() {
  syncFrameUI();
  if (!image || composeFrameId) return;
  // Coalesce slider drags into one compose per frame.
  composeFrameId = requestAnimationFrame(() => { composeFrameId = 0; recompose(); });
}
function recompose() {
  if (!image || !renderer || contextLost) return;
  try {
    const next = composeFrame(image, frame, renderer.maxEdge);
    renderer.setSource(next.canvas); source = next.canvas; box = next.box;
    syncHint(); drawOriginal(); scheduleRender();
  } catch (error) { showError(error.message); }
}
function drawOriginal() {
  if (!comparing || !source) return;
  const target = $('original'), ratio = Math.min(window.devicePixelRatio || 1, 2);
  target.width = Math.max(1, Math.round(screen.clientWidth * ratio)); target.height = Math.max(1, Math.round(screen.clientHeight * ratio));
  const ctx = target.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(source, 0, 0, target.width, target.height);
}
function pickAt(event) {
  const rect = screen.getBoundingClientRect();
  const x = Math.min(source.width - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * source.width)));
  const y = Math.min(source.height - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * source.height)));
  const [r, g, b] = source.getContext('2d').getImageData(x, y, 1, 1).data;
  setPicking(false); setColor(toHex(r, g, b)); toast(`已取色 ${toHex(r, g, b)}`);
}
let drag = null;
screen.addEventListener('pointerdown', event => {
  if (!source || comparing) return;
  if (picking) { event.preventDefault(); pickAt(event); return; }
  if (!screen.classList.contains('pannable')) return;
  event.preventDefault(); screen.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: frame.panX, panY: frame.panY };
});
screen.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  // Pan is -1…1 across the overflow; convert pointer travel from screen pixels to frame pixels.
  const k = box.width / screen.clientWidth, span = v => v > 1 ? 2 / v : 0;
  frame.panX = Math.max(-1, Math.min(1, drag.panX - (event.clientX - drag.x) * k * span(box.overflow.x)));
  frame.panY = Math.max(-1, Math.min(1, drag.panY - (event.clientY - drag.y) * k * span(box.overflow.y)));
  frameChanged();
});
const endDrag = event => { if (drag && event.pointerId === drag.id) drag = null; };
screen.addEventListener('pointerup', endDrag); screen.addEventListener('pointercancel', endDrag);
screen.addEventListener('dblclick', () => { if (screen.classList.contains('pannable')) { frame.panX = frame.panY = 0; frameChanged(); } });
syncFrameUI();

function layoutPreview() {
  if (!source) return;
  const aspect = source.width / source.height;
  screen.style.aspectRatio = `${source.width} / ${source.height}`;
  const styles = getComputedStyle(area), casing = getComputedStyle(monitor);
  const availW = area.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const availH = area.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
  const inset = parseFloat(casing.paddingLeft) + parseFloat(casing.paddingRight) + 2;
  const chin = monitor.querySelector('.monitor-chin').offsetHeight + parseFloat(casing.paddingTop) + 2;
  monitor.style.width = `${Math.max(50, Math.min(availW, (availH - chin) * aspect + inset))}px`;
}
function scheduleRender() {
  if (renderingFrame) return;
  renderingFrame = requestAnimationFrame(() => {
    renderingFrame = 0;
    if (!source || !renderer || contextLost) return;
    layoutPreview();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const size = fitSize(Math.max(1, Math.round(screen.clientWidth * pixelRatio)), Math.max(1, Math.round(screen.clientHeight * pixelRatio)), 1600);
    try {
      renderer.render(settings, size.width, size.height);
      canvas.dataset.frame = String(Number(canvas.dataset.frame || 0) + 1);
      canvas.dataset.ready = 'true';
      drawOriginal();
    } catch (error) { showError(error.message); }
  });
}
const previewObserver = new ResizeObserver(scheduleRender);
previewObserver.observe(area);
previewObserver.observe(screen);
function setCompare(value) {
  comparing = value; $('compare').setAttribute('aria-pressed', String(value));
  $('original-layer').hidden = !value; $('comparison-ui').hidden = !value;
  if (value) { if (picking) setPicking(false); drawOriginal(); }
}
$('compare').addEventListener('click', () => {
  if (!source) return;
  setCompare(!comparing);
  if (comparing) toast('左右拖动分界线');
});
$('split').addEventListener('input', event => screen.style.setProperty('--split', `${event.target.value}%`));

async function loadImage(url, name, ownedURL = false) {
  const id = ++loadingId;
  $('loading').hidden = false; $('loading').textContent = '读取中…'; $('export').disabled = true; clearError();
  let committed = false;
  try {
    const next = new Image(); next.src = url; await next.decode();
    if (id !== loadingId) return;
    if (!next.naturalWidth || !next.naturalHeight) throw new Error('没读到图片内容，换一张试试。');
    if (next.naturalWidth * next.naturalHeight > 64_000_000) throw new Error('图片超过 6400 万像素，先缩小一些再打开。');
    if (!renderer || contextLost) throw new Error('浏览器的绘图功能还没准备好，刷新页面再试一次。');
    const nextPalette = extractPalette(next);
    frame.panX = frame.panY = 0;
    const nextColor = frame.autoColor && nextPalette[0] ? nextPalette[0] : frame.color;
    const composed = composeFrame(next, { ...frame, color: nextColor }, renderer.maxEdge);
    renderer.setSource(composed.canvas);
    const oldURL = currentURL;
    image = next; source = composed.canvas; box = composed.box; palette = nextPalette; frame.color = nextColor;
    originalSize = { width: next.naturalWidth, height: next.naturalHeight };
    sourceName = name.replace(/\.[^.]+$/, '').replace(/[\/:*?"<>|]/g, '-').slice(0, 80) || 'image';
    currentURL = ownedURL ? url : null;
    if (oldURL) URL.revokeObjectURL(oldURL);
    $('file-name').textContent = name;
    setCompare(false); $('split').value = '50'; screen.style.setProperty('--split', '50%');
    syncFrameUI(); scheduleRender(); committed = true;
  } catch (error) {
    if (id === loadingId) showError(error.message.includes('source image') ? '这张图片打不开，请换一张 JPG、PNG、WebP 或 AVIF。' : error.message);
  } finally {
    if (ownedURL && !committed) URL.revokeObjectURL(url);
    if (id === loadingId) { $('loading').hidden = true; $('export').disabled = !source || exportBusy || contextLost; }
  }
}
function openFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    showError('目前支持 JPG、PNG、WebP 和 AVIF。'); return;
  }
  if (file.size > 32 * 1024 * 1024) { showError('图片超过 32 MB，压缩一下再打开。'); return; }
  return loadImage(URL.createObjectURL(file), file.name, true);
}
$('open-file').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', event => { openFile(event.target.files[0]); event.target.value = ''; });
$('load-demo').addEventListener('click', () => loadImage(new URL('./assets/demo.svg', import.meta.url).href, DEMO));
let dragDepth = 0;
const hasFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
window.addEventListener('dragenter', event => { if (!hasFiles(event)) return; event.preventDefault(); dragDepth++; $('drop-overlay').hidden = false; });
window.addEventListener('dragover', event => { if (!hasFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
window.addEventListener('dragleave', event => { if (!hasFiles(event)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('drop-overlay').hidden = true; });
window.addEventListener('drop', event => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true;
  const files = Array.from(event.dataTransfer.files);
  openFile(files[0]); if (files.length > 1) toast('只打开了第一张');
});
window.addEventListener('blur', () => { dragDepth = 0; $('drop-overlay').hidden = true; });
window.addEventListener('paste', event => {
  const item = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith('image/'));
  if (item) { event.preventDefault(); openFile(item.getAsFile()); }
});
window.addEventListener('keydown', event => { if (event.key === 'Escape' && picking) setPicking(false); });

// Export dialog: only sizes that actually differ from the full size are offered.
function sizeOptions() {
  const full = fitSize(source.width, source.height, renderer.maxEdge), long = Math.max(full.width, full.height);
  const options = [{ key: 'full', label: box.capped ? '最大' : '原尺寸', size: full }];
  for (const edge of [2048, 1080, 720]) if (edge < long) options.push({ key: String(edge), label: `长边 ${edge}`, size: fitSize(source.width, source.height, edge) });
  return options;
}
function openExport() {
  if (!source || exportBusy || contextLost) return;
  const options = sizeOptions(), holder = $('size-options');
  if (!options.some(o => o.key === exportLimit)) exportLimit = 'full';
  holder.querySelectorAll('label').forEach(label => label.remove());
  for (const option of options) {
    const label = document.createElement('label'); label.className = 'size-option';
    label.innerHTML = '<input type="radio" name="export-size"><span></span><span class="mono"></span>';
    const input = label.querySelector('input'); input.value = option.key; input.checked = option.key === exportLimit;
    label.children[1].textContent = option.label; label.children[2].textContent = `${option.size.width} × ${option.size.height}`;
    holder.append(label);
  }
  const framed = frame.ratio !== 'source' ? ` · 画幅 ${RATIOS.find(r => r.key === frame.ratio).label}` : '';
  $('export-info').textContent = `原图 ${originalSize.width} × ${originalSize.height}${framed}`;
  $('export-note').hidden = !box.capped;
  $('export-note').textContent = `长边超过 ${renderer.maxEdge} px，会等比缩到 ${renderer.maxEdge}（显卡上限）。`;
  $('export-dialog').showModal();
}
$('export').addEventListener('click', openExport);
$('export-cancel').addEventListener('click', () => $('export-dialog').close());
$('export-dialog').addEventListener('click', event => { if (event.target === $('export-dialog')) $('export-dialog').close(); });
$('export-confirm').addEventListener('click', () => {
  exportLimit = $('size-options').querySelector('input:checked')?.value || 'full';
  $('export-dialog').close(); runExport(exportLimit === 'full' ? renderer.maxEdge : Math.min(renderer.maxEdge, Number(exportLimit)));
});
async function runExport(limit) {
  if (!source || exportBusy || contextLost) return;
  exportBusy = true; $('export').disabled = true; clearError();
  const ratio = frame.ratio === 'source' ? '' : `-${frame.ratio.replace(':', 'x').replace('.', '-')}`;
  const snapshot = { ...settings }, composed = source, name = `${sourceName}-crt-${preset}${ratio}.png`;
  const dimensions = fitSize(composed.width, composed.height, limit);
  let exporter;
  try {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const output = document.createElement('canvas'); exporter = new CRTRenderer(output); exporter.setSource(composed);
    exporter.render(snapshot, dimensions.width, dimensions.height);
    const blob = await new Promise((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('导出失败，换个小一点的尺寸再试。')), 'image/png'));
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast(`已导出 ${dimensions.width} × ${dimensions.height}`);
  } catch (error) { showError(error.message); }
  finally { exporter?.dispose(); exportBusy = false; $('export').disabled = !source || contextLost; }
}
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); contextLost = true; $('export').disabled = true;
  showError('浏览器暂停了绘图，恢复后会继续，设置不会丢。');
});
canvas.addEventListener('webglcontextrestored', () => {
  try {
    renderer = new CRTRenderer(canvas); if (source) renderer.setSource(source);
    contextLost = false; clearError(); $('export').disabled = !source || exportBusy; scheduleRender();
  } catch (error) { showError(error.message); }
});
try {
  renderer = new CRTRenderer(canvas);
  loadImage(new URL('./assets/demo.svg', import.meta.url).href, DEMO);
} catch (error) { $('loading').hidden = true; showError(error.message); }
