// 「客服经验分享」列表页的静帧：每一期的片子在播放器封面上停的那一帧（剧本里的 still），原样导出成 JPG。
// 画面就是片子自己的 render 画出来的，不另画插图；片子改了画面后重跑一次即可：
//   CHROME=/path/to/chrome node scripts/build-episode-covers.mjs
// 只用 Node 自带模块：起一个本地静态服务，用 Chrome 的远程调试协议打开每一期页面，读画布、缩成 360×640（竖屏，issue #9）写进 cover 路径。
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { episodes } from "../src/site/experience.mjs";

const CHROME = process.env.CHROME;
if (!CHROME) {
  console.error("请用环境变量 CHROME 指定 Chrome / Chromium 的可执行文件路径");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, "--window-size=1440,1000", `--user-data-dir=${mkdtempSync(join(tmpdir(), "covers-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let targets;
  for (let i = 0; i < 80 && !targets; i++) {
    targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => sleep(250));
  }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  };
  const send = (method, params = {}) => new Promise((resolve) => { pending.set(++id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.result.value;

  for (const episode of episodes) {
    await send("Page.navigate", { url: `${origin}/${episode.href}` });
    // 等字体与小精灵图加载完、播放器按 still 画好封面那一帧
    const dataUrl = await evaluate(`(async () => {
      for (let i = 0; i < 100 && !document.querySelector("canvas"); i++) await new Promise((r) => setTimeout(r, 100));
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 1500));
      const src = document.querySelector("canvas");
      const out = Object.assign(document.createElement("canvas"), { width: 360, height: 640 });
      const ctx = out.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", 0.86);
    })()`);
    const jpg = Buffer.from(dataUrl.split(",")[1], "base64");
    await writeFile(episode.cover, jpg);
    console.log(`[covers] ${episode.cover}（${(jpg.length / 1024).toFixed(1)} KB）`);
  }
  ws.close();
} finally {
  chrome.kill();
  server.close();
}
