// 补运费短片时间线在某一秒之前的快照（issue #24：砍片尾那 3 秒时，120.5 秒之前的一切都不许变）。
// 时间字段 ≥ CUTOFF 的数组元素整条去掉；对象里时间字段 ≥ CUTOFF 的值记成 "late"；另按 0.1 秒采样镜头。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

export const CUTOFF = 120.5;
const TIME = new Set(["at", "u", "from", "to", "enter", "rest", "leave", "gone", "send", "hit", "flash"]);
const r6 = (x) => (Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : String(x));
const late = (o) => o && typeof o === "object" && !Array.isArray(o) && ["at", "u", "from", "enter"].some((k) => typeof o[k] === "number" && o[k] >= CUTOFF);

function walk(v) {
  if (typeof v === "number") return r6(v);
  if (Array.isArray(v)) return v.filter((x) => !late(x)).map(walk);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      const x = v[k];
      if (typeof x === "function") continue;
      if (Array.isArray(x) && x.length && x.every(late)) continue; // 整条都在 CUTOFF 之后（比如后来才出现的窗口的输入框）
      out[k] = TIME.has(k) && typeof x === "number" && x >= CUTOFF ? "late" : walk(x);
    }
    return out;
  }
  return v;
}

export function snapshot(dir = resolve(import.meta.dirname, "../assets/js")) {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  for (const f of ["platform-chat.js", "film-page-turn.js", "freight-film.js"]) vm.runInNewContext(readFileSync(resolve(dir, f), "utf8"), sandbox);
  const film = sandbox.__freightFilm();
  const { base, m, rush, ...rest } = film.TL;
  const { dawn, ...rushRest } = rush;
  const marks = {};
  for (const [k, x] of Object.entries(m)) if (!["end", "rush"].includes(k)) marks[k] = x;
  const camera = [];
  for (let i = 0; i * 0.1 < CUTOFF; i++) {
    const c = film.camera(i * 0.1);
    camera.push([c.x, c.y, c.w, c.h].map(r6));
  }
  return JSON.parse(JSON.stringify({ tl: walk(rest), rush: walk(rushRest), marks: walk(marks), rushStart: r6(m.rush[0]), camera, track: walk(film.cameraTrack()), turns: walk(film.turns()) }));
}
