// Browser language detection: zh-* stays Chinese (the default); everything else gets English.
const zh = /^zh/i.test(navigator.language);
export const lang = zh ? 'zh' : 'en';

// English translations keyed by their Chinese source string.
const EN = {
  // Page
  '返回咖啡主站': 'Back to tito.cafe',
  'CRT 显像工坊首页': 'CRT Studio home',
  '图片不上传': 'Processed locally',
  // Header buttons (wide-only span gets a leading space)
  '打开': 'Open',
  '图片': ' image',
  '导出': 'Export',
  // Stage bar
  '画幅': 'Frame',
  '对比原图': 'Compare',
  '效果预览': 'Effect preview',
  '原图': 'Original',
  '效果': 'After',
  '原图与效果分界': 'Comparison slider',
  '加载中…': 'Loading…',
  '读取中…': 'Reading…',
  // Control panel
  '预览': 'Preview',
  '调整': 'Controls',
  '预设分类': 'Preset groups',
  '显像管': 'CRT',
  '纸与像素': 'Print & Pixel',
  '显像管预设': 'CRT presets',
  '纸与像素预设': 'Print & Pixel presets',
  '样式': 'Style',
  '预设样式': 'Preset style',
  '参数': 'Parameters',
  '还原预设': 'Reset',
  // Frame view
  '完成': 'Done',
  '比例': 'Ratio',
  '画面比例': 'Aspect ratio',
  '放置方式': 'Fit',
  '留边': 'Contain',
  '铺满': 'Cover',
  '边距': 'Margin',
  '背景': 'Background',
  '背景样式': 'Background style',
  '颜色': 'Colour',
  '背景颜色': 'Background colour',
  '自选颜色': 'Custom colour',
  '自选背景颜色': 'Custom background colour',
  '取色': 'Pick',
  // Footer
  '回到示例图': 'Reset to demo',
  "返回 Tito's Cafe": "Tito's Cafe",
  '源代码 ↗': 'Source ↗',
  // Export dialog
  '导出 PNG': 'Export PNG',
  '尺寸': 'Size',
  '取消': 'Cancel',
  // Drop overlay
  '松手打开': 'Drop to open',
  // Noscript
  '需要开启 JavaScript。': 'JavaScript is required.',
  // Toasts
  '已还原': 'Reset',
  '左右拖动分界线': 'Drag the divider',
  '只打开了第一张': 'Only the first image was opened',
  // Hint labels (constructed in app.js)
  '点画面取色': 'Click to pick a colour',
  '拖动调整位置，双击居中': 'Drag to pan · double-click to centre',
  // Toast prefixes with trailing space (value appended by app.js)
  '已取色 ': 'Picked ',
  '已导出 ': 'Exported ',
  // Export info label prefixes
  '原图 ': 'Original ',
  // Error messages
  '这张图片打不开，请换一张 JPG、PNG、WebP 或 AVIF。': "Can't open this image. Try a JPG, PNG, WebP or AVIF.",
  '目前支持 JPG、PNG、WebP 和 AVIF。': 'Supported formats: JPG, PNG, WebP, AVIF.',
  '图片超过 32 MB，压缩一下再打开。': 'Image exceeds 32 MB. Please compress it first.',
  '没读到图片内容，换一张试试。': "Couldn't read image content. Try another file.",
  '图片超过 6400 万像素，先缩小一些再打开。': 'Image exceeds 64 MP. Please resize it first.',
  '浏览器的绘图功能还没准备好，刷新页面再试一次。': "WebGL isn't ready yet. Reload the page.",
  '浏览器暂停了绘图，恢复后会继续，设置不会丢。': 'WebGL was paused. It will resume automatically.',
  '导出失败，换个小一点的尺寸再试。': 'Export failed. Try a smaller size.',
  '图片读取失败，可能是文件损坏或设备内存不足。请转成 JPG 或缩小后重试。': "Couldn't read this image. It may be corrupted or too large for device memory. Convert it to JPG or resize it first.",
  // Demo image name
  '暮色海岸 · 示例图': 'Demo image',
  // Export size option labels
  '原尺寸': 'Original size',
  '最大': 'Maximum',
  '长边': 'Long edge',
  // Background colour aria-label prefix (hex value appended)
  '背景色 ': 'BG colour ',
  // Preset labels
  '掌机微光': 'Handheld',
  '街机时刻': 'Arcade',
  '旧日电视': 'Old TV',
  '绿色终端': 'Terminal',
  '琥珀监视器': 'Amber',
  '录像带': 'VHS',
  '褪色拍立得': 'Polaroid',
  '老相册': 'Sepia',
  '旧报纸': 'Newsprint',
  '漫画网点': 'Comic',
  '口袋四色': 'Pocket',
  '八位像素': 'Pixel',
  // Variant labels
  '方格': 'Square',
  '拼豆': 'Beads',
  // Control labels
  '扫描线': 'Scanlines',
  '荧光': 'Glow',
  '点阵': 'Mask',
  '弧度': 'Curve',
  '暗角': 'Vignette',
  '颗粒': 'Grain',
  '色调': 'Palette',
  '纸纹': 'Paper',
  '网点': 'Halftone',
  '抖动': 'Dither',
  '褪色': 'Fade',
  '漏光': 'Leak',
  '干扰': 'VHS glitch',
  '密度': 'Density',
  '错位': 'Shift',
  '亮度': 'Brightness',
  '饱和度': 'Saturation',
  '冷暖': 'Warmth',
  '0 为关闭，越大烫得越平': '0 = off; higher = flatter finish',
  // Palette options
  '原色': 'Colour',
  '绿屏': 'Green screen',
  '琥珀': 'Amber',
  '棕褐': 'Sepia tone',
  '四色': 'Four-colour',
  '黑白': 'B&W',
  '反色': 'Invert',
  '蓝晒': 'Cyanotype',
  '双色': 'Duotone',
  '热成像': 'Thermal',
  '青品四色': 'CMYK',
  // Backdrop labels
  '模糊': 'Blur',
  '纯色': 'Solid',
  '圆点': 'Dots',
};

/** Return the English string for `s`, or `s` unchanged when the UI language is Chinese. */
export const t = zh ? s => s : s => EN[s] ?? s;

/**
 * Apply English translations to elements carrying data-i18n attributes.
 * Call once at startup (before dynamic content is built).
 */
export function applyDOM() {
  if (zh) return;
  document.documentElement.lang = 'en';
  document.title = "CRT Studio · Tito's Cafe";
  const desc = document.querySelector('meta[name=description]');
  if (desc) desc.content = 'CRT, VHS and print effects for your images. Crop to wallpaper ratios, export as PNG. Processed locally in the browser.';
  // textContent — data-i18n-en overrides the lookup for context-specific translations
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = el.dataset.i18nEn ?? t(el.dataset.i18n);
  }
  // title + aria-label pairs (e.g. the home link)
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const text = t(el.dataset.i18nTitle);
    el.title = text; el.setAttribute('aria-label', text);
  }
  // aria-label only
  for (const el of document.querySelectorAll('[data-i18n-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  }
}
