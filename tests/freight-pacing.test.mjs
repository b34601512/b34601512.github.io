// 补运费短片的节奏（issue #16）：时长跟信息量匹配——没有「整屏只有字」的板子，灯泡只是提示、不停下来等，
// 任何时候连续 2 秒以上都得有新东西出现（新消息、输入框里的字、鼠标动作、镜头推拉、等待时转的钟、一窗接一窗）。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const sandbox = {};
sandbox.globalThis = sandbox;
for (const f of ["platform-chat.js", "film-page-turn.js", "freight-film.js"]) vm.runInNewContext(readFileSync(resolve(import.meta.dirname, `../assets/js/${f}`), "utf8"), sandbox);
const film = sandbox.__freightFilm();
const TL = film.TL;

// 画面上出现新东西的时刻
function events() {
  const ev = [];
  TL.msgs.forEach((x) => ev.push(x.at));
  TL.msgs.filter((x) => x.answers).forEach((x) => ev.push(x.at + 0.7)); // 老王那个气泡里六句话亮起来（气泡出来后 0.35–0.75 秒）
  Object.values(TL.inputs).forEach((list) => list.forEach((x) => ev.push(x.at)));
  TL.appKeys.forEach((x) => ev.push(x.at));
  TL.cur.forEach((x) => ev.push(x.at - x.dur, x.at));
  TL.clicks.forEach((x) => ev.push(x.at));
  film.cameraTrack().forEach((x) => ev.push(x.at, x.at + x.dur));
  TL.bulbs.forEach((x) => ev.push(x.at));
  TL.heads.forEach((x) => ev.push(x.at));
  TL.caps.forEach((x) => ev.push(x.from));
  TL.turns.forEach((x) => ev.push(x.from));
  TL.waits.forEach((w) => {
    for (let u = w.from; u < w.to; u += 0.5) ev.push(u);
  });
  for (let u = TL.m.rush[0]; u < TL.m.rush[1]; u += 0.5) ev.push(u);
  return ev.sort((a, b) => a - b);
}

test("没有整屏板子：时间线、话术卡片、对比条、六问对照、换平台再演一遍双击都砍掉了", () => {
  for (const k of ["timeline", "card", "compare", "reveal", "daily"]) assert.equal(TL.m[k], undefined, k);
  assert.ok(TL.m.end[1] - TL.m.end[0] <= 5, "片尾太长");
});

test("灯泡不占进度：每次亮起来 0.8 秒内就有下一个动作", () => {
  const ev = events();
  for (const b of TL.bulbs) assert.ok(ev.some((u) => u > b.at + 1e-6 && u <= b.at + 0.8), `第 ${b.at.toFixed(1)} 秒的灯泡后面停住了`);
});

test("片尾以前，连续 2 秒以上没有新东西出现的地方一处都没有", () => {
  const ev = events().filter((u) => u <= TL.m.end[0]);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i] - ev[i - 1] < 2, `${ev[i - 1].toFixed(1)}–${ev[i].toFixed(1)} 秒停了 ${(ev[i] - ev[i - 1]).toFixed(1)} 秒`);
});
