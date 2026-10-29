// 离线出片（issue #15）：官网不提供导出，片子由这条命令在本机出成 MP4 文件。
//   node tools/export-films.mjs <输出目录> [--only=宣传片,对比] [--webm]
// 起一个本地静态服务指向仓库根目录（构建产物），用 headless Chromium 打开每条片子的页面，
// 页面加载前挂钩子截下片子交给 window.mountFilm 的选项，再把 tools/film-export/ 里的离线编码注进去：
// WebCodecs 逐帧编 H.264 + OfflineAudioContext 合成声音 + 自拼 MP4，60fps，带声音。
// 浏览器编不了 H.264 或声音时退到实时录 WebM，再用 ffmpeg 转成 MP4（H.264 + AAC）；--webm 强制走这条退路（测退路用）。
// 出完逐条体检：时长与片子一致、有声音轨且解得出来、尺寸是 1920×1080 / 1080×1920。任何一条不过就以非 0 退出。
//
// Playwright 用本机已有的那份（Python 包里自带的 playwright-core）；另放的话用环境变量 PLAYWRIGHT_CORE 指过去。
// ffmpeg 依次试 FFMPEG、PATH 里的 ffmpeg、Playwright 自带的那个，挑第一个能编 libx264 + aac 的。
import { execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const FILMS = [
  { name: "宣传片", page: "promo.html" },
  { name: "补运费", page: "freight.html" },
  { name: "为什么", page: "why.html" },
  { name: "对比", page: "diff.html" },
];
const FPS = 60;
const BITRATE = 12_000_000;
const TOOL_SCRIPTS = ["mp4-mux.js", "mp4-inspect.js", "film-export.js", "run.js"];
const PLAYWRIGHT_CORE = process.env.PLAYWRIGHT_CORE || "/root/work/libs/pwlib/playwright/driver/package/index.mjs";
const PLAYWRIGHT_FFMPEG = "/root/.cache/ms-playwright/ffmpeg-1013/ffmpeg-linux";

const repo = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const outArg = args.find((a) => !a.startsWith("--"));
if (!outArg) {
  console.error("用法：node tools/export-films.mjs <输出目录> [--only=宣传片,对比] [--webm]");
  process.exit(2);
}
const outDir = resolve(outArg);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const forceWebm = args.includes("--webm");
const films = only ? FILMS.filter((f) => only.includes(f.name)) : FILMS;
if (!films.length) {
  console.error(`没有这些片子：${only.join("，")}（可选：${FILMS.map((f) => f.name).join("，")}）`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

vm.runInThisContext(readFileSync(join(repo, "tools/film-export/mp4-inspect.js"), "utf8"), { filename: "mp4-inspect.js" });
const { Mp4Inspect } = globalThis;

// ---------- 本地静态服务：GET 读仓库根目录，POST /__save 把页面交回来的文件写进输出目录 ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "POST" && url.pathname === "/__save") {
      const name = url.searchParams.get("name") || "";
      if (!/^[^/\\]+\.(mp4|webm)$/.test(name)) return res.writeHead(400).end();
      await pipeline(req, createWriteStream(join(outDir, name)));
      return res.writeHead(204).end();
    }
    const path = resolve(repo, decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html");
    if (!path.startsWith(repo)) return res.writeHead(403).end();
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

// 页面脚本跑之前挂上：film-engine.js 一赋值 window.mountFilm，就包一层，把片子交进来的选项记下来
const CAPTURE = `(() => {
  let wrapped;
  Object.defineProperty(window, "mountFilm", {
    configurable: true,
    get: () => wrapped,
    set(fn) {
      wrapped = function (root, o) { window.__filmOptions = o; return fn(root, o); };
      wrapped.paint = fn.paint;
    },
  });
})();`;

// ---------- ffmpeg 退路 ----------
function findFfmpeg() {
  const candidates = [process.env.FFMPEG, "ffmpeg", PLAYWRIGHT_FFMPEG].filter(Boolean);
  for (const bin of candidates) {
    try {
      const encoders = execFileSync(bin, ["-hide_banner", "-encoders"], { stdio: ["ignore", "pipe", "ignore"] }).toString();
      if (/\blibx264\b/.test(encoders) && /\baac\b/.test(encoders)) return bin;
    } catch {
      /* 没有这个，或者跑不起来：试下一个 */
    }
  }
  return null;
}

function toMp4(webm, mp4) {
  const bin = findFfmpeg();
  if (!bin) throw new Error(`找不到能编 H.264 + AAC 的 ffmpeg（Playwright 自带的那个只编得了 VP9/WebM），WebM 留在 ${webm}；装一个完整的 ffmpeg 或用 FFMPEG=… 指过去再跑`);
  execFileSync(bin, ["-hide_banner", "-loglevel", "error", "-y", "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", mp4], { stdio: "inherit" });
}

// ---------- 体检 ----------
function checkFile(path, page) {
  const bytes = new Uint8Array(readFileSync(path));
  const info = Mp4Inspect.inspect(bytes);
  const video = info.tracks.find((t) => t.handler === "vide");
  const audio = info.tracks.find((t) => t.handler === "soun");
  const problems = [...info.problems];
  const expectSize = page.width > page.height ? "1920×1080" : "1080×1920";
  const size = video ? `${video.width}×${video.height}` : "—";
  if (!video) problems.push("没有画面轨");
  else if (size !== expectSize) problems.push(`尺寸 ${size}，应为 ${expectSize}`);
  if (!audio || !audio.samples) problems.push("没有声音轨");
  if (Math.abs(info.duration - page.filmSeconds) > 2 / FPS) problems.push(`时长 ${info.duration.toFixed(3)} 秒，片子是 ${page.filmSeconds} 秒`);
  if (video && page.plan && video.samples !== Math.round(page.filmSeconds * FPS)) problems.push(`画面 ${video.samples} 帧，应为 ${Math.round(page.filmSeconds * FPS)} 帧`);
  const fps = video ? video.samples / video.mediaDuration : 0;
  const dv = page.decode?.video;
  const da = page.decode?.audio;
  if (page.decode) {
    if (!dv || dv.frames !== video?.samples || dv.errors) problems.push(`画面没整条解出来：${JSON.stringify(dv)}`);
    if (!da || !da.sampleFrames || da.errors) problems.push(`声音没解出来：${JSON.stringify(da)}`);
  }
  return {
    file: path,
    seconds: Number(info.duration.toFixed(3)),
    filmSeconds: page.filmSeconds,
    size,
    fps: Number(fps.toFixed(2)),
    megabytes: Number((bytes.byteLength / 1048576).toFixed(1)),
    video: video?.profile || video?.codec,
    audio: audio ? `${audio.codec} ${audio.sampleRate} Hz ×${audio.channels}` : "—",
    decoded: page.decode ? `画面 ${dv?.frames} 帧、声音 ${da?.seconds} 秒` : "（ffmpeg 转出，没在浏览器里解码）",
    problems,
  };
}

// ---------- 出片 ----------
const { chromium } = await import(pathToFileURL(PLAYWRIGHT_CORE).href);
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const results = [];
try {
  for (const film of films) {
    const began = Date.now();
    console.log(`\n▶ ${film.name}（${film.page}）`);
    const page = await browser.newPage();
    page.on("console", (m) => m.text().startsWith("[film]") && console.log(`  ${m.text().slice(7)}`));
    page.on("pageerror", (e) => console.log(`  页面报错：${e.message}`));
    await page.addInitScript(CAPTURE);
    await page.goto(`${origin}/${film.page}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__filmOptions, null, { timeout: 15000 });
    for (const file of TOOL_SCRIPTS) await page.addScriptTag({ url: `/tools/film-export/${file}` });
    const got = await page.evaluate((job) => window.filmRun.go(job), { file: film.name, fps: FPS, bitrate: BITRATE, webm: forceWebm });
    await page.close();
    let path = join(outDir, got.file);
    if (!got.plan) {
      const mp4 = join(outDir, `${film.name}.mp4`);
      console.log(`  浏览器走的是 WebM 退路（${got.type}），用 ffmpeg 转 MP4……`);
      toMp4(path, mp4);
      path = mp4;
    }
    const r = { ...checkFile(path, got), codecs: got.plan ? `${got.plan.video} + ${got.plan.audio}（WebCodecs 离线编码）` : "WebM → ffmpeg", wallSeconds: Math.round((Date.now() - began) / 1000) };
    results.push(r);
    console.log(`  ${r.problems.length ? "✗" : "✓"} ${r.file}：${r.seconds} 秒、${r.size}、${r.fps} fps、${r.megabytes} MB、${r.video} / ${r.audio}；${r.decoded}；用时 ${r.wallSeconds} 秒`);
    for (const p of r.problems) console.log(`    · ${p}`);
  }
} catch (e) {
  console.error(`\n出片失败：${e?.message || e}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}

if (results.length) {
  console.log("\n片子\t时长(秒)\t片长(秒)\t分辨率\t帧率\t大小(MB)\t编码");
  for (const r of results) console.log(`${r.file.split("/").pop()}\t${r.seconds}\t${r.filmSeconds}\t${r.size}\t${r.fps}\t${r.megabytes}\t${r.codecs}`);
}
if (results.some((r) => r.problems.length) || results.length !== films.length) process.exitCode = 1;
if (results.length && !process.exitCode) console.log(`\n全部通过，文件在 ${outDir}`);
