// CSS/JS 引用统一加内容指纹（?v=哈希）：文件内容一变，URL 就变，浏览器不会再拿旧缓存。
// 图片不参与指纹：og:image、截图这些 URL 要保持稳定，避免搜索引擎与分享缓存重复抓取。
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const VERSIONED_ASSETS = [
  "assets/css/site.css",
  "assets/css/demo.css",
  "assets/js/demo-data.js",
  "assets/js/demo.js",
];

const versioned = new Map();
for (const path of VERSIONED_ASSETS) {
  const digest = createHash("sha256").update(await readFile(path)).digest("hex").slice(0, 8);
  versioned.set(path, `${path}?v=${digest}`);
}

export function withAssetVersions(html) {
  let out = html;
  for (const [path, url] of versioned) out = out.split(path).join(url);
  return out;
}
