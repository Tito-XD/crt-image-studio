import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const ready = page => expect(page.locator('#preview')).toHaveAttribute('data-ready', 'true');
const snapshot = async page => createHash('sha256').update(await page.locator('#preview').evaluate(canvas => canvas.toDataURL())).digest('hex');
async function slider(page, id, value) {
  const before = await page.locator('#preview').getAttribute('data-frame');
  await page.locator(`#control-${id}`).fill(String(value));
  await expect.poll(() => page.locator('#preview').getAttribute('data-frame')).not.toBe(before);
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
async function exported(page) {
  const wait = page.waitForEvent('download'); await page.getByRole('button',{name:/导出图片/}).click();
  const download = await wait; const data = await readFile(await download.path());
  expect(data.subarray(1,4).toString()).toBe('PNG');
  return { data, width:data.readUInt32BE(16), height:data.readUInt32BE(20), name:download.suggestedFilename() };
}

test('presets, controls, comparison and reset change the rendered pixels', async ({page}) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./');await ready(page);
  await expect.poll(() => page.locator('#preview').evaluate(c => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    return c.width === Math.round(c.clientWidth * ratio) && c.height === Math.round(c.clientHeight * ratio);
  })).toBe(true);
  const original=await snapshot(page);const hashes=new Set([original]);
  for(const name of ['街机时刻','旧日电视','绿色终端']) {
    await page.getByRole('button',{name:new RegExp(name)}).click();
    await expect.poll(()=>snapshot(page)).not.toBe([...hashes].at(-1));hashes.add(await snapshot(page));
  }
  expect(hashes.size).toBe(4);
  await page.getByRole('button',{name:/掌机微光/}).click();await expect.poll(()=>snapshot(page)).toBe(original);
  await slider(page,'scan',85);expect(await snapshot(page)).not.toBe(original);
  await page.getByRole('button',{name:'对比原图'}).click();
  await page.getByRole('slider',{name:'原图与效果分界'}).fill('25');
  await expect(page.locator('#screen')).toHaveCSS('--split','25%');
  await page.getByRole('button',{name:'还原预设'}).click();await expect.poll(()=>snapshot(page)).toBe(original);
  await page.getByRole('button',{name:'对比原图'}).click();
  await mkdir('test-results/visual',{recursive:true});
  await expect(page.locator('#toast')).toHaveCSS('opacity', '0');
  await page.screenshot({path:'test-results/visual/desktop.png',fullPage:true});
  await page.getByRole('button',{name:/街机时刻/}).click();
  await expect(page.getByRole('button',{name:/街机时刻/})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'test-results/visual/arcade.png',fullPage:true});
  expect(errors).toEqual([]);await expect(page.locator('#error')).toBeHidden();
});

test('uploaded pixels keep orientation and PNG export includes the effect even during comparison',async({page})=>{
  const requests=[];page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await page.goto('./');await ready(page);
  const data=await fixture(page);await page.locator('#file-input').setInputFiles({name:'four-colors.png',mimeType:'image/png',buffer:data});
  await expect(page.locator('#file-name')).toHaveText('four-colors.png');
  await expect(page.locator('#export-dimensions')).toHaveText('640 × 480');
  await page.locator('summary').click();
  for(const key of ['scan','glow','mask','curve','vignette','grain','shift','warmth']) await slider(page,key,0);
  await slider(page,'brightness',100);await slider(page,'saturation',100);
  const plain=await exported(page);expect([plain.width,plain.height]).toEqual([640,480]);
  const samples=await page.evaluate(async base64=>{
    const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    return [[100,100],[500,100],[100,350],[500,350]].map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data));
  },plain.data.toString('base64'));
  for(const [i,expected] of [[226,71,45,255],[66,181,221,255],[103,184,90,255],[233,197,101,255]].entries())
    for(let channel=0;channel<4;channel++) expect(Math.abs(samples[i][channel]-expected[channel])).toBeLessThanOrEqual(2);
  await page.getByRole('button',{name:/绿色终端/}).click();await page.getByRole('button',{name:'对比原图'}).click();
  await page.getByRole('slider',{name:'原图与效果分界'}).fill('100');
  const crt=await exported(page);expect(crt.data.equals(plain.data)).toBe(false);expect(crt.name).toBe('four-colors-crt-terminal.png');
  const center=await page.evaluate(async base64=>{
    const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    return Array.from(ctx.getImageData(120,120,1,1).data);
  },crt.data.toString('base64'));
  expect(center[1]).toBeGreaterThan(center[0]*1.5);
  expect(requests.filter(r=>r.method!=='GET')).toEqual([]);
  expect(requests.filter(r=>/^https?:/.test(r.url)&&!r.url.startsWith(new URL(page.url()).origin))).toEqual([]);
});

test('mobile portrait upload, paste/drop and errors preserve usable layout and export dimensions',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');await ready(page);
  const data=await fixture(page,900,1600);
  await page.evaluate(base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();
    transfer.items.add(new File([bytes],'portrait.png',{type:'image/png'}));
    window.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,cancelable:true}));
  },data.toString('base64'));
  await expect(page.locator('#file-name')).toHaveText('portrait.png');
  await page.locator('#export-size').selectOption('720');
  const result=await exported(page);expect([result.width,result.height]).toEqual([405,720]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#file-input').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
  await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#file-name')).toHaveText('portrait.png');
  await expect(page.getByRole('button',{name:/导出图片/})).toBeEnabled();
  const landscape=await fixture(page,640,480);
  await page.evaluate(base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();
    transfer.items.add(new File([bytes],'pasted.png',{type:'image/png'}));
    window.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,cancelable:true}));
  },landscape.toString('base64'));
  await expect(page.locator('#file-name')).toHaveText('pasted.png');await expect(page.locator('#error')).toBeHidden();
  await page.getByRole('button',{name:'回到示例图'}).click();await expect(page.locator('#file-name')).toContainText('示例图');
  await page.getByRole('button',{name:/旧日电视/}).click();await page.evaluate(()=>scrollTo(0,0));
  await expect(page.locator('#toast')).toHaveCSS('opacity', '0');
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
