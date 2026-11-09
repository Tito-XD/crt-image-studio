# CRT 显像工坊

把图片调成老显示器、录像带和旧印刷的样子，也能裁成壁纸比例导出。

**在线使用：[crt.tito.cafe](https://crt.tito.cafe/)**

<p align="center"><img src="demo/readme/preview.gif" width="360" alt="切换预设和调节参数的演示"></p>

## 能做什么

- **12 个预设**，分「显像管」和「纸与像素」两组：掌机微光、街机时刻、旧日电视、绿色终端、琥珀监视器、录像带、褪色拍立得、老相册、旧报纸、漫画网点、口袋四色、八位像素。八位像素可以切换成烫过的拼豆。
- **19 个参数**，一次调一个：扫描线、荧光、点阵、弧度、暗角、颗粒、纸纹、网点、抖动、拼豆、褪色、漏光、干扰等。
- **11 种色调**：原色、绿屏、琥珀、棕褐、四色、黑白、反色、蓝晒、双色、热成像、青品四色。
- **画幅**：1:1、4:3、3:4、3:2、16:9、9:16、9:19.5。可以留边，背景选模糊、纯色、纸纹、方格、圆点，颜色可从图上取；也可以铺满，拖动调整位置。
- **导出 PNG**：原尺寸或更小的长边，显示器外壳不会导出。

![同一张图的四种效果](demo/readme/compare.jpg)

图片只在浏览器里处理，不上传。支持 JPG、PNG、WebP、AVIF，单张最大 256 MB。不再限制原图总像素；大图会等比缩小用于处理，导出最长边最多 4096 px（设备能力不足时会更小）。能否读取超大原图仍取决于浏览器和设备内存。

## 本地运行

```sh
npm run dev      # http://127.0.0.1:4173
npm ci && npm test
```

---

# CRT Studio

Apply CRT monitor, VHS tape and old-print effects to any image, then crop it to a wallpaper ratio and export.

**Live at [crt.tito.cafe](https://crt.tito.cafe/)**

## What it does

- **12 presets** in two groups — CRT: Handheld, Arcade, Old TV, Terminal, Amber, VHS; Print & Pixel: Polaroid, Sepia, Newsprint, Comic, Pocket, Pixel. The Pixel preset has an optional ironed-beads style.
- **19 parameters**, one at a time: scanlines, glow, mask, curve, vignette, grain, paper, halftone, dither, beads, fade, leak, VHS glitch, density, shift, brightness, saturation, warmth, palette.
- **11 colour palettes**: Colour, Green screen, Amber, Sepia tone, Four-colour, B&W, Invert, Cyanotype, Duotone, Thermal, CMYK.
- **Framing**: 1:1, 4:3, 3:4, 3:2, 16:9, 9:16, 9:19.5. Contain mode lets you pick a background (blur, solid, paper, grid, dots) and eyedrop a colour from the image. Cover mode lets you pan to reframe.
- **Export as PNG**: original size or a smaller long-edge cap. The monitor bezel is never included.

Everything is processed locally in the browser — nothing is uploaded. Supports JPG, PNG, WebP and AVIF up to 256 MB. No megapixel limit; large images are scaled down for processing. Maximum export long edge is 4096 px (may be lower depending on device).

## Run locally

```sh
npm run dev      # http://127.0.0.1:4173
npm ci && npm test
```
