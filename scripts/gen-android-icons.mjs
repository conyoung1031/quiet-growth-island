/* 用 icons/icon-512.png 生成 Android 全套图标与启动图。
   图标底色是均匀的 #f5efe6，因此：
   · 自适应图标背景色取同一色 —— 方形图标边缘与背景无缝，遮罩裁不掉内容
   · 启动图也用同一底色 —— 中间的图标方块不会出现可见的方形边界
   只改 android/ 下的资源，不动网页端 icon-180/192/512.png。 */
import { createRequire } from 'node:module';
import { writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'icons', 'icon-512.png');
const RES = join(root, 'android', 'app', 'src', 'main', 'res');
const BG = '#f5efe6';

/* 密度 → 图标尺寸 */
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

async function make(size, { artRatio, background }) {
  const artSize = Math.round(size * artRatio);
  const art = await sharp(SRC).resize(artSize, artSize).png().toBuffer();

  const base = sharp({
    create: { width: size, height: size, channels: 4, background: background || BG }
  });

  return base.composite([{ input: art, gravity: 'centre' }]).png().toBuffer();
}

/* 1) 传统图标 ic_launcher / ic_launcher_round */
for (const [density, size] of Object.entries(LEGACY)) {
  const dir = join(RES, `mipmap-${density}`);
  const png = await make(size, { artRatio: 0.86 });
  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);
  console.log(`  ic_launcher @${density} ${size}px`);
}

/* 2) 自适应图标前景：底色与 adaptive 背景色完全相同 → 遮罩裁不掉内容、边缘无缝 */
for (const [density, size] of Object.entries(FOREGROUND)) {
  const dir = join(RES, `mipmap-${density}`);
  const png = await make(size, { artRatio: 0.72, background: { r: 0xf5, g: 0xef, b: 0xe6, alpha: 1 } });
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), png);
  console.log(`  ic_launcher_foreground @${density} ${size}px`);
}

/* 3) 自适应图标背景色改成图标底色 */
const bgXml = join(RES, 'values', 'ic_launcher_background.xml');
writeFileSync(bgXml, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F5EFE6</color>\n</resources>\n');
console.log('  adaptive background -> #F5EFE6');

/* 4) 启动图：同底色 + 居中图标（图标占短边 20%） */
const drawables = readdirSync(RES).filter((d) => d.startsWith('drawable'));
let splashCount = 0;
for (const d of drawables) {
  const dir = join(RES, d);
  const files = readdirSync(dir).filter((f) => f === 'splash.png');
  for (const f of files) {
    const p = join(dir, f);
    const meta = await sharp(p).metadata();
    const w = meta.width, h = meta.height;
    const art = Math.round(Math.min(w, h) * 0.2);
    const png = await sharp({
      create: { width: w, height: h, channels: 4, background: BG }
    }).composite([{ input: await sharp(SRC).resize(art, art).png().toBuffer(), gravity: 'centre' }]).png().toBuffer();
    writeFileSync(p, png);
    splashCount += 1;
  }
}
console.log(`  splash 重绘 ${splashCount} 张`);

console.log('Android 图标与启动图已生成。');
