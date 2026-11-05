import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const ready = page => expect(page.locator('#preview')).toHaveAttribute('data-ready', 'true');
const snapshot = async page => createHash('sha256').update(await page.locator('#preview').evaluate(canvas => canvas.toDataURL())).digest('hex');
// Only one parameter is visible at a time: pick its chip, then set the value.
async function slider(page, id, value) {
  await page.locator(`[data-param=${id}]`).click();
  const before = await page.locator('#preview').getAttribute('data-frame');
  await page.locator(`#control-${id}`).fill(String(value));
  await expect.poll(() => page.locator('#preview').getAttribute('data-frame')).not.toBe(before);
}
async function neutral(page) {
  for (const key of ['scan','glow','mask','curve','vignette','grain','shift','warmth']) await slider(page, key, 0);
  await slider(page, 'brightness', 100); await slider(page, 'saturation', 100);
}
async function fixture(page, width = 640, height = 480) {
  const image = await page.evaluate(({width,height}) => {
    const c = document.createElement('canvas'); c.width=width; c.height=height;
    const x=c.getContext('2d'); x.fillStyle='#e2472d';x.fillRect(0,0,width/2,height/2);
    x.fillStyle='#42b5dd';x.fillRect(width/2,0,width/2,height/2);
    x.fillStyle='#67b85a';x.fillRect(0,height/2,width/2,height/2);
    x.fillStyle='#e9c565';x.fillRect(width/2,height/2,width/2,height/2);
    return c.toDataURL().split(',')[1];
  }, {width,height});
  return Buffer.from(image,'base64');
}
async function exported(page, size) {
  await page.locator('#export').click(); await expect(page.locator('#export-dialog')).toBeVisible();
  if (size) await page.locator('#size-options label', { hasText: size }).click();
  const wait = page.waitForEvent('download'); await page.locator('#export-confirm').click();
  const download = await wait; const data = await readFile(await download.path());
  expect(data.subarray(1,4).toString()).toBe('PNG');
  return { data, width:data.readUInt32BE(16), height:data.readUInt32BE(20), name:download.suggestedFilename() };
}
const pixels = (page, data, points) => page.evaluate(async ({ base64, points }) => {
  const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
  const c = document.createElement('canvas'); c.width = image.width; c.height = image.height; const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0);
  return points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
}, { base64: data.toString('base64'), points });
const sizeLabels = page => page.locator('#size-options label').allInnerTexts();

test('presets, single-parameter controls, comparison and reset change the rendered pixels', async ({page}) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');await ready(page);
  await expect.poll(() => page.locator('#preview').evaluate(c => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    return c.width === Math.round(c.clientWidth * ratio) && c.height === Math.round(c.clientHeight * ratio);
  })).toBe(true);
  const original=await snapshot(page);const hashes=new Set([original]);
  for(const name of ['街机时刻','旧日电视','绿色终端']) {
    await page.getByRole('button',{name}).click();
    await expect.poll(()=>snapshot(page)).not.toBe([...hashes].at(-1));hashes.add(await snapshot(page));
  }
  expect(hashes.size).toBe(4);
  await page.getByRole('button',{name:'掌机微光'}).click();await expect.poll(()=>snapshot(page)).toBe(original);
  await expect(page.locator('#reset')).toBeDisabled();
  await slider(page,'scan',85);expect(await snapshot(page)).not.toBe(original);
  await expect(page.locator('#control-scan')).toBeVisible();await expect(page.locator('#control-glow')).toBeHidden();
  await expect(page.locator('[data-param=scan]')).toHaveClass(/changed/);await expect(page.locator('#reset')).toBeEnabled();
  await page.getByRole('button',{name:'对比原图'}).click();
  await page.getByRole('slider',{name:'原图与效果分界'}).fill('25');
  await expect(page.locator('#screen')).toHaveCSS('--split','25%');
  await page.getByRole('button',{name:'还原预设'}).click();await expect.poll(()=>snapshot(page)).toBe(original);
  await expect(page.locator('[data-param=scan]')).not.toHaveClass(/changed/);
  await page.getByRole('button',{name:'对比原图'}).click();
  await mkdir('test-results/visual',{recursive:true});
  await expect(page.locator('#toast')).toHaveCSS('opacity', '0');
  await page.screenshot({path:'test-results/visual/desktop.png',fullPage:true});
  expect(errors).toEqual([]);await expect(page.locator('#error')).toBeHidden();
});

test('uploaded pixels keep orientation and PNG export includes the effect even during comparison',async({page})=>{
  const requests=[];page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await page.goto('./');await ready(page);
  const data=await fixture(page);await page.locator('#file-input').setInputFiles({name:'four-colors.png',mimeType:'image/png',buffer:data});
  await expect(page.locator('#file-name')).toHaveText('four-colors.png');
  await neutral(page);
  await page.locator('#export').click();
  expect(await sizeLabels(page)).toEqual([expect.stringMatching(/原尺寸\s*640 × 480/)]);
  await page.getByRole('button',{name:'取消'}).click();await expect(page.locator('#export-dialog')).toBeHidden();
  const plain=await exported(page);expect([plain.width,plain.height]).toEqual([640,480]);
  const samples=await pixels(page,plain.data,[[100,100],[500,100],[100,350],[500,350]]);
  for(const [i,expected] of [[226,71,45,255],[66,181,221,255],[103,184,90,255],[233,197,101,255]].entries())
    for(let channel=0;channel<4;channel++) expect(Math.abs(samples[i][channel]-expected[channel])).toBeLessThanOrEqual(2);
  await page.getByRole('button',{name:'绿色终端'}).click();await page.getByRole('button',{name:'对比原图'}).click();
  await page.getByRole('slider',{name:'原图与效果分界'}).fill('100');
  const crt=await exported(page);expect(crt.data.equals(plain.data)).toBe(false);expect(crt.name).toBe('four-colors-crt-terminal.png');
  const [center]=await pixels(page,crt.data,[[120,120]]);
  expect(center[1]).toBeGreaterThan(center[0]*1.5);
  expect(requests.filter(r=>r.method!=='GET')).toEqual([]);
  expect(requests.filter(r=>/^https?:/.test(r.url)&&!r.url.startsWith(new URL(page.url()).origin))).toEqual([]);
});

test('mobile keeps the preview pinned, exports a smaller size and recovers from errors',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');await ready(page);
  const data=await fixture(page,900,1600);
  await page.evaluate(base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();
    transfer.items.add(new File([bytes],'portrait.png',{type:'image/png'}));
    window.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,cancelable:true}));
  },data.toString('base64'));
  await expect(page.locator('#file-name')).toHaveText('portrait.png');
  const result=await exported(page,'长边 720');expect([result.width,result.height]).toEqual([405,720]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  // Scrolled to the bottom, the whole preview stays on screen.
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  expect(await page.locator('.preview-panel').evaluate(el=>{const r=el.getBoundingClientRect();return getComputedStyle(el).position==='sticky'&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  await page.locator('#file-input').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
  await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#file-name')).toHaveText('portrait.png');
  await expect(page.locator('#export')).toBeEnabled();
  const landscape=await fixture(page,640,480);
  await page.evaluate(base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();
    transfer.items.add(new File([bytes],'pasted.png',{type:'image/png'}));
    window.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,cancelable:true}));
  },landscape.toString('base64'));
  await expect(page.locator('#file-name')).toHaveText('pasted.png');await expect(page.locator('#error')).toBeHidden();
  await page.getByRole('button',{name:'回到示例图'}).click();await expect(page.locator('#file-name')).toContainText('示例图');
  await page.getByRole('button',{name:'旧日电视',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));
  await expect(page.locator('#toast')).toHaveCSS('opacity', '0');
  await mkdir('test-results/visual',{recursive:true});
  await page.screenshot({path:'test-results/visual/mobile.png',fullPage:true});
});

test('context restoration keeps the image and settings',async({page})=>{
  await page.goto('./');await ready(page);await slider(page,'scan',77);
  const before=await snapshot(page);
  await page.evaluate(()=>{window.testLoss=document.querySelector('#preview').getContext('webgl').getExtension('WEBGL_lose_context');window.testLoss.loseContext();});
  await expect(page.locator('#error')).toContainText('暂停');await expect(page.locator('#export')).toBeDisabled();
  await page.evaluate(()=>window.testLoss.restoreContext());
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#export')).toBeEnabled();
  await expect.poll(()=>snapshot(page)).toBe(before);
});

test('retro presets render distinct pixels and mark the parameters they use',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');await ready(page);
  const hashes=new Set([await snapshot(page)]);
  for(const name of ['琥珀监视器','录像带']) {
    await page.getByRole('button',{name,exact:true}).click();
    await expect.poll(()=>snapshot(page)).not.toBe([...hashes].at(-1));hashes.add(await snapshot(page));
  }
  await page.getByRole('button',{name:'纸与像素'}).click();
  await expect(page.getByRole('button',{name:'掌机微光'})).toBeHidden();
  for(const name of ['褪色拍立得','老相册','旧报纸','漫画网点','口袋四色','八位像素']) {
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
    await expect.poll(()=>snapshot(page)).not.toBe([...hashes].at(-1));hashes.add(await snapshot(page));
  }
  expect(hashes.size).toBe(9);
  await expect(page.locator('#control-dither')).toHaveValue('45');
  await expect(page.locator('[data-param=dither]')).toHaveClass(/used/);
  await expect(page.locator('[data-param=vhs]')).not.toHaveClass(/used/);
  const before=await snapshot(page);
  await page.locator('[data-param=palette]').click();await page.locator('#control-palette').selectOption('4');
  await expect.poll(()=>snapshot(page)).not.toBe(before);
  await expect(page.locator('#reset')).toBeEnabled();
  await page.getByRole('button',{name:'旧报纸',exact:true}).click();
  const news=await exported(page);expect(news.name).toMatch(/-crt-newsprint\.png$/);
  expect(errors).toEqual([]);await expect(page.locator('#error')).toBeHidden();
});

test('framing pads with the chosen colour, covers without padding and returns to the style view',async({page})=>{
  await page.goto('./');await ready(page);
  const data=await fixture(page);await page.locator('#file-input').setInputFiles({name:'four-colors.png',mimeType:'image/png',buffer:data});
  await expect(page.locator('#file-name')).toHaveText('four-colors.png');
  await neutral(page);
  await page.locator('#frame-toggle').click();
  await expect(page.locator('#frame-view')).toBeVisible();await expect(page.locator('#style-view')).toBeHidden();
  await expect(page.locator('#fit-row')).toBeHidden();
  await page.getByRole('button',{name:'1:1',exact:true}).click();
  await expect(page.locator('#frame-current')).toHaveText('1:1');await expect(page.locator('#fit-row')).toBeVisible();
  await page.getByRole('button',{name:'纯色',exact:true}).click();
  await page.locator('#frame-color').fill('#336699');
  const padded=await exported(page);expect([padded.width,padded.height]).toEqual([762,762]);
  expect(padded.name).toBe('four-colors-crt-handheld-1x1.png');
  const px=await pixels(page,padded.data,[[4,4],[200,250]]);
  for(const [channel,value] of [51,102,153].entries()) expect(Math.abs(px[0][channel]-value)).toBeLessThanOrEqual(3);
  expect(px[1][0]).toBeGreaterThan(200);expect(px[1][2]).toBeLessThan(80);
  await page.getByRole('button',{name:'铺满',exact:true}).click();
  await expect(page.locator('#backdrop-row')).toBeHidden();await expect(page.locator('#preview-hint')).toContainText('拖动');
  const covered=await exported(page);expect([covered.width,covered.height]).toEqual([480,480]);
  await page.getByRole('button',{name:'9:16',exact:true}).click();await page.getByRole('button',{name:'留边',exact:true}).click();
  await page.getByRole('button',{name:'取色',exact:true}).click();
  const box=await page.locator('#screen').boundingBox();
  await page.mouse.click(box.x+box.width*.3,box.y+box.height*.45);
  await expect(page.locator('#frame-color')).not.toHaveValue('#336699');
  await page.getByRole('button',{name:'纸纹',exact:true}).click();
  await mkdir('test-results/visual',{recursive:true});
  await page.screenshot({path:'test-results/visual/framing.png',fullPage:true});
  await page.getByRole('button',{name:'原图',exact:true}).click();
  await page.locator('#export').click();
  expect(await sizeLabels(page)).toEqual([expect.stringMatching(/原尺寸\s*640 × 480/)]);
  await page.getByRole('button',{name:'取消'}).click();
  await page.getByRole('button',{name:'完成'}).click();
  await expect(page.locator('#style-view')).toBeVisible();await expect(page.locator('#frame-toggle')).toBeFocused();
});

test('extra palettes: invert flips the pixels and every palette renders differently',async({page})=>{
  await page.goto('./');await ready(page);
  const data=await fixture(page);await page.locator('#file-input').setInputFiles({name:'four-colors.png',mimeType:'image/png',buffer:data});
  await expect(page.locator('#file-name')).toHaveText('four-colors.png');
  await neutral(page);
  await page.locator('[data-param=palette]').click();
  const options=await page.locator('#control-palette option').allTextContents();
  expect(options.slice(6)).toEqual(['反色','蓝晒','双色','热成像','青品四色']);
  const hashes=new Set([await snapshot(page)]);
  for(let i=6;i<options.length;i++){
    await page.locator('#control-palette').selectOption(String(i));
    await expect.poll(()=>snapshot(page)).not.toBe([...hashes].at(-1));hashes.add(await snapshot(page));
  }
  expect(hashes.size).toBe(6);
  await page.locator('#control-palette').selectOption('6');
  const inverted=await exported(page);
  const samples=await pixels(page,inverted.data,[[100,100],[500,100],[100,350],[500,350]]);
  for(const [i,expected] of [[226,71,45],[66,181,221],[103,184,90],[233,197,101]].entries())
    for(let channel=0;channel<3;channel++) expect(Math.abs(samples[i][channel]-(255-expected[channel]))).toBeLessThanOrEqual(2);
});
