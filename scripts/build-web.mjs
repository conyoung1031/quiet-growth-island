/* 把 PWA 站点文件拷进 dist/，供 Capacitor 打包使用。
   只拷运行必需的文件：预览截图 previews/、README、Android 工程都不进包。 */
import { cpSync, rmSync, mkdirSync, existsSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/* 运行时需要的站点文件清单 */
const ITEMS = [
  'index.html',
  'css',
  'js',
  'icons',
  'manifest.webmanifest',
  'sw.js'
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

let files = 0;
let bytes = 0;

function count(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) count(join(p, e));
  } else {
    files += 1;
    bytes += st.size;
  }
}

for (const item of ITEMS) {
  const src = join(root, item);
  if (!existsSync(src)) {
    console.warn('  ! 跳过缺失项：' + item);
    continue;
  }
  cpSync(src, join(dist, item), { recursive: true });
  count(join(dist, item));
}

console.log('dist/ 构建完成：' + files + ' 个文件，' + (bytes / 1024).toFixed(0) + ' KB');

/* 版本号只有一个真源：package.json。
   index.html 里的 #appVer 只是给 PWA（直接吃仓库里的 index.html）用的默认值，
   打包 APK 时按 package.json 覆盖，避免两边对不上。 */
try {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const indexPath = join(dist, 'index.html');
  const html = readFileSync(indexPath, 'utf8');
  const re = /(<span id="appVer">)[^<]*(<\/span>)/;
  if (re.test(html)) {
    writeFileSync(indexPath, html.replace(re, '$1' + pkg.version + '$2'));
    console.log('版本号：v' + pkg.version);
  } else {
    console.warn('  ! index.html 里没有找到 <span id="appVer">，版本号未写入');
  }
} catch (e) {
  console.warn('  ! 写入版本号失败：' + e.message);
}
