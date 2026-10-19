import { CRTRenderer, PRESETS, CONTROLS, fitSize } from './engine.js';
const $ = id => document.getElementById(id);
const canvas = $('preview'), screen = $('screen'), monitor = $('monitor'), area = $('stage-area');
let renderer, source, currentURL = null, sourceName = 'after-hours', preset = 'handheld';
let settings = { ...PRESETS[preset] }, loadingId = 0, renderingFrame = 0, exportBusy = false, comparing = false, toastTimer;
let originalSize = { width: 1600, height: 1200 }, contextLost = false;
const controls = new Map();
const toast = message => {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
};
function showError(message) { $('error').textContent = message; $('error').hidden = false; }
function clearError() { $('error').hidden = true; $('error').textContent = ''; }
function updateControl(control) {
  const { input, output, definition } = control;
  input.value = settings[definition.key]; output.value = input.value;
  input.style.setProperty('--fill', `${(Number(input.value) - definition.min) / (definition.max - definition.min) * 100}%`);
}
for (const definition of CONTROLS) {
  const wrapper = document.createElement('div'); wrapper.className = 'slider';
  const heading = document.createElement('div'); heading.className = 'slider-heading';
  const label = document.createElement('label'); label.htmlFor = `control-${definition.key}`; label.textContent = definition.label;
  const output = document.createElement('output'); output.setAttribute('for', label.htmlFor);
  const input = document.createElement('input'); input.type = 'range'; input.id = label.htmlFor;
  input.min = definition.min; input.max = definition.max; input.step = definition.step || 1;
  heading.append(label, output); wrapper.append(heading, input);
  $(definition.advanced ? 'advanced-controls' : 'main-controls').append(wrapper);
  const control = { input, output, definition }; controls.set(definition.key, control); updateControl(control);
  input.addEventListener('input', () => {
    settings[definition.key] = Number(input.value); updateControl(control);
    $('adjust-state').textContent = `${PRESETS[preset].label} · 已微调`; scheduleRender();
  });
}
function selectPreset(name) {
  preset = name; settings = { ...PRESETS[name] };
  document.querySelectorAll('[data-preset]').forEach(button => {
    const selected = button.dataset.preset === name;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  controls.forEach(updateControl); $('adjust-state').textContent = PRESETS[name].label; scheduleRender();
}
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => selectPreset(button.dataset.preset)));
$('reset').addEventListener('click', () => { selectPreset(preset); toast('已还原当前预设'); });

function updateExportDimensions() {
  if (!source || !renderer) return;
  const size = fitSize(source.width, source.height, Math.min(renderer.maxEdge, Number($('export-size').value)));
  $('export-dimensions').textContent = `${size.width} × ${size.height}`;
}
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
    } catch (error) { showError(error.message); }
  });
}
new ResizeObserver(scheduleRender).observe(area);
$('export-size').addEventListener('change', updateExportDimensions);
function setCompare(value) {
  comparing = value; $('compare').setAttribute('aria-pressed', String(value));
  $('original-layer').hidden = !value; $('comparison-ui').hidden = !value;
}
$('compare').addEventListener('click', () => {
  if (!source) return;
  setCompare(!comparing);
  if (comparing) toast('拖动分界线，看看原图和 CRT 的区别');
});
$('split').addEventListener('input', event => screen.style.setProperty('--split', `${event.target.value}%`));

async function loadImage(url, name, ownedURL = false) {
  const id = ++loadingId;
  $('loading').hidden = false; $('loading').textContent = '正在打开图片…'; $('export').disabled = true; clearError();
  let committed = false;
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (id !== loadingId) return;
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('没有读到图片内容，请换一张图片试试。');
    if (image.naturalWidth * image.naturalHeight > 64_000_000) throw new Error('这张图片超过 6400 万像素，请先缩小后再打开。');
    if (!renderer || contextLost) throw new Error('当前浏览器的绘制功能尚未就绪，请刷新页面后重试。');
    const dimensions = fitSize(image.naturalWidth, image.naturalHeight, renderer.maxEdge);
    const next = document.createElement('canvas'); next.width = dimensions.width; next.height = dimensions.height;
    const context = next.getContext('2d');
    context.fillStyle = '#0d1720'; context.fillRect(0, 0, next.width, next.height);
    context.drawImage(image, 0, 0, next.width, next.height);
    renderer.setSource(next);
    const oldURL = currentURL;
    source = next; originalSize = { width: image.naturalWidth, height: image.naturalHeight };
    sourceName = name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'image';
    currentURL = ownedURL ? url : null; $('original').src = url;
    if (oldURL) URL.revokeObjectURL(oldURL);
    $('file-name').textContent = name;
    $('image-info').textContent = `${originalSize.width} × ${originalSize.height} px · 本地预览`;
    $('export-size').options[0].textContent = `原尺寸，最长边 ${renderer.maxEdge} px`;
    setCompare(false); $('split').value = '50'; screen.style.setProperty('--split', '50%');
    updateExportDimensions(); scheduleRender(); committed = true;
  } catch (error) {
    if (id === loadingId) showError(error.message.includes('source image') ? '这张图片无法解码，请使用有效的 JPG、PNG、WebP 或 AVIF。' : error.message);
  } finally {
    if (ownedURL && !committed) URL.revokeObjectURL(url);
    if (id === loadingId) { $('loading').hidden = true; $('export').disabled = !source || exportBusy || contextLost; }
  }
}
function openFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    showError('暂时支持 JPG、PNG、WebP 和 AVIF，请选择其中一种图片。'); return;
  }
  if (file.size > 32 * 1024 * 1024) { showError('这张图片大于 32 MB，请压缩或缩小后再打开。'); return; }
  return loadImage(URL.createObjectURL(file), file.name, true);
}
$('open-file').addEventListener('click', () => $('file-input').click());
$('drop-button').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', event => { openFile(event.target.files[0]); event.target.value = ''; });
$('load-demo').addEventListener('click', () => loadImage(new URL('./assets/demo.svg', import.meta.url).href, '暮色海岸 · 示例图'));
let dragDepth = 0;
window.addEventListener('dragenter', event => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault(); dragDepth++; $('drop-overlay').hidden = false;
});
window.addEventListener('dragover', event => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', event => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('drop-overlay').hidden = true;
});
window.addEventListener('drop', event => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true;
  const files = Array.from(event.dataTransfer.files);
  openFile(files[0]); if (files.length > 1) toast('一次处理一张图片，已打开第一张');
});
window.addEventListener('blur', () => { dragDepth = 0; $('drop-overlay').hidden = true; });
window.addEventListener('paste', event => {
  const item = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith('image/'));
  if (item) { event.preventDefault(); openFile(item.getAsFile()); }
});

$('export').addEventListener('click', async () => {
  if (!source || exportBusy || contextLost) return;
  exportBusy = true; $('export').disabled = true; $('export').querySelector('span').textContent = '正在显像…'; clearError();
  const snapshot = { ...settings }, image = source, name = `${sourceName}-crt-${preset}.png`;
  const dimensions = fitSize(image.width, image.height, Math.min(renderer.maxEdge, Number($('export-size').value)));
  let exporter;
  try {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const output = document.createElement('canvas'); exporter = new CRTRenderer(output); exporter.setSource(image);
    exporter.render(snapshot, dimensions.width, dimensions.height);
    const blob = await new Promise((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片导出失败，请减小尺寸再试。')), 'image/png'));
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast(`已导出 ${dimensions.width} × ${dimensions.height} PNG`);
  } catch (error) { showError(error.message); }
  finally {
    exporter?.dispose(); exportBusy = false; $('export').disabled = !source || contextLost;
    $('export').querySelector('span').textContent = '导出图片';
  }
});
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); contextLost = true; $('export').disabled = true;
  showError('浏览器暂时暂停了图像处理，正在等待恢复；你的图片和调节值仍在。');
});
canvas.addEventListener('webglcontextrestored', () => {
  try {
    renderer = new CRTRenderer(canvas); if (source) renderer.setSource(source);
    contextLost = false; clearError(); $('export').disabled = !source || exportBusy; scheduleRender();
  } catch (error) { showError(error.message); }
});
try {
  renderer = new CRTRenderer(canvas);
  loadImage(new URL('./assets/demo.svg', import.meta.url).href, '暮色海岸 · 示例图');
} catch (error) { $('loading').hidden = true; showError(error.message); }
