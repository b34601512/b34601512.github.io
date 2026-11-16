// issue #24：补运费短片砍掉 2:01 之后的「第二天早上」——最后一位顾客「好的谢谢」之后 0.7 秒窗口开始滑走，0.15 秒后翻页进片尾。
// 120.5 秒之前的一切（台词、节拍、镜头、声音）对着 4193adf 时拍下的快照（tests/fixtures/freight-before-120_5.json）逐项比较。
// 快照用 4193adf 的 assets/js 拍：snapshot(<放着那三个 js 的目录>)（见 tests/freight-snapshot.mjs）。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { snapshot } from "./freight-snapshot.mjs";

const sandbox = {};
sandbox.globalThis = sandbox;
for (const f of ["platform-chat.js", "film-page-turn.js", "freight-film.js"]) vm.runInNewContext(readFileSync(resolve(import.meta.dirname, `../assets/js/${f}`), "utf8"), sandbox);
const film = sandbox.__freightFilm();
const TL = film.TL;

test("120.5 秒之前和砍片尾以前一模一样", () => {
  const before = JSON.parse(readFileSync(resolve(import.meta.dirname, "fixtures/freight-before-120_5.json"), "utf8"));
  const now = snapshot();
  for (const k of Object.keys(before)) assert.deepEqual(now[k], before[k], k);
});

test("片尾：最后一句还是「好的谢谢」，之后没有新窗口；0.85 秒后翻页进片尾，片尾 4.5 秒，全片 126 秒", () => {
  assert.equal(TL.base, 126);
  const lastMsg = TL.msgs.filter((x) => x.side !== "time").at(-1);
  assert.equal(lastMsg.text, "好的谢谢");
  assert.ok(Math.abs(lastMsg.at - 120.61) < 0.02, `「好的谢谢」在 ${lastMsg.at}`);
  assert.ok(!TL.sessions.some((s) => s.at > lastMsg.at), "道谢之后又来了新的聊天");
  assert.ok(!TL.rush.wins.some((w) => w.enter > lastMsg.at), "道谢之后又落下新窗口");
  assert.ok(!TL.score.some((s) => s.u > lastMsg.at && ["whoosh", "drop", "hiss"].includes(s.type)), "第二天早上的音效还在");
  assert.ok(Math.abs(TL.m.end[0] - (lastMsg.at + 0.85)) < 1e-6, `片尾从 ${TL.m.end[0]} 开始`);
  assert.equal(TL.m.end[1] - TL.m.end[0], 4.5);
  const endTurn = film.turns().at(-1);
  assert.ok(Math.abs(endTurn.to - TL.m.end[0]) < 1e-6 || Math.abs(endTurn.from - TL.m.end[0]) < 1e-6, `片尾翻页 ${JSON.stringify(endTurn)}`);
});
