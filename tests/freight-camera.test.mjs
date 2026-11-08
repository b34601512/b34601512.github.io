// 补运费短片的镜头（issue #5）：取景框永远在画布里、比例 9:16（issue #9 起竖屏），推拉连续不跳，每一拍都包住它对准的东西；
// issue #16 起没有片头：第一帧镜头已经推近聊天窗，顾客第一句马上进来，钩子标题条从第 0 秒挂起。
// issue #16 起整屏板子（时间线、话术卡片、对比条、六问对照）都砍了，翻页只剩换顾客的三处和片尾。
// issue #18 起换到不相干的画面用翻页（assets/js/film-page-turn.js）：一帧里可能有两页，逐帧检查按「实际画出来的每一页」走——
// 同一页上镜头必须连续；只有翻页进来的新页可以和上一帧不连续，而且它必须从屏幕右边外面进来、只出现在登记过的画面交界上。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const W = 1080;
const H = 1920;
const sandbox = {};
sandbox.globalThis = sandbox;
// 工作台外壳的尺寸由 platform-chat.js 量（页面上也是它先加载）
for (const f of ["platform-chat.js", "film-page-turn.js", "freight-film.js"]) vm.runInNewContext(readFileSync(resolve(import.meta.dirname, `../assets/js/${f}`), "utf8"), sandbox);
const film = sandbox.__freightFilm();
const track = film.cameraTrack();
const view = sandbox.FilmPageTurn.compose({ width: W, height: H, render: film.render, camera: film.camera, overlay: film.overlay, turns: film.turns() });

test("每一拍剧本镜头都进了镜头表，按时间排好", () => {
  const targets = new Set(track.map((b) => b.target));
  for (const s of film.TL.shots) assert.ok(targets.has(s.target), s.target);
  for (let i = 1; i < track.length; i++) assert.ok(track[i].at >= track[i - 1].at);
});

test("开场不放片头：第一帧就推近聊天窗，顾客第一句 0.3 秒内进来并在取景框里，钩子标题条从第 0 秒挂起", () => {
  const first = film.TL.msgs.find((x) => x.side === "in");
  assert.ok(first.at <= 0.3, `顾客第一句在第 ${first.at} 秒才来`);
  const beat = track[0];
  assert.equal(beat.at, 0);
  assert.equal(beat.target, "chat");
  const c = film.camera(0);
  assert.deepEqual({ ...c }, { ...beat.focus }, "第一帧镜头已经到位，不是从全景推过去");
  assert.ok(c.w < W / 1.5, `第一帧推近不够（${(W / c.w).toFixed(2)} 倍）`);
  const a = beat.aim;
  assert.ok(a.y >= c.y && a.y + a.h <= c.y + c.h, "顾客第一句不在取景框里");
  assert.equal(film.TL.m.hook[0], 0);
});

const inCanvas = (c, u) => {
  assert.ok(c.x >= -1e-6 && c.y >= -1e-6 && c.x + c.w <= W + 1e-6 && c.y + c.h <= H + 1e-6, `第 ${u.toFixed(2)} 秒出了画布`);
  assert.ok(Math.abs((c.h * W) / H - c.w) < 1e-6, `第 ${u.toFixed(2)} 秒比例不对`);
};
const smooth = (prev, c, u) => {
  assert.ok(Math.abs(c.w / prev.w - 1) < 0.02, `第 ${u.toFixed(2)} 秒推拉太快`);
  const z = W / c.w;
  const pan = Math.hypot(c.x + c.w / 2 - prev.x - prev.w / 2, c.y + c.h / 2 - prev.y - prev.h / 2) * z;
  assert.ok(pan < 50, `第 ${u.toFixed(2)} 秒摇得太快（${pan.toFixed(1)}px）`);
};

// 翻页盖住的那一下（from–to，原来的快切）从来不画出来：换顾客时镜头在这里直接对准新聊天窗，不算跳
const hidden = (a, b) => view.turns.some((t) => a < t.to + 1e-9 && b > t.from - 1e-9);

test("片子自己的镜头逐帧（60 帧/秒）都在画布里、比例 9:16，推拉每帧不超过 2%，中心每帧不超过 50 画面像素（翻页盖住的快切除外）", () => {
  let prev = film.camera(0);
  for (let u = 1 / 60; u <= film.TL.base; u += 1 / 60) {
    const c = film.camera(u);
    inCanvas(c, u);
    if (!hidden(u - 1 / 60, u)) smooth(prev, c, u);
    prev = c;
  }
});

test("翻页只在不相干的画面交界上：换了一位顾客（一家平台）的三处、片尾；时长 0.35–0.5 秒、互不重叠", () => {
  assert.ok(view.DUR >= 0.35 && view.DUR <= 0.5, `翻页 ${view.DUR} 秒`);
  const m = film.TL.m;
  // 换顾客：新的一段聊天（session）从翻页的 to 开始
  const switches = ["B", "C", "D"].map((id) => film.TL.sessions.find((x) => x.id === id).at);
  const edges = [...switches, m.end[0]];
  assert.equal(view.turns.length, edges.length, "翻页次数不对");
  view.turns.forEach((t, i) => {
    assert.ok(edges.some((e) => Math.abs(t.from - e) <= 0.121 || Math.abs(t.to - e) < 1e-6), `第 ${i + 1} 次翻页（${t.from.toFixed(2)} 秒）不在画面交界上`);
    assert.ok(t.to >= t.from && t.to - t.from <= 0.25, `第 ${i + 1} 次翻页 from/to 不对`);
    if (i) assert.ok(view.turns[i - 1].from + view.DUR <= t.from, `第 ${i + 1} 次翻页和上一次叠在一起`);
    // 镜头推拉不翻页：同一段操作（话术精灵滑进滑出、聊天里的推近）里没有翻页
    for (const s of film.TL.scenes) assert.ok(Math.abs(s.at - t.from) > 1e-6 || s.mode === "end", `第 ${i + 1} 次翻页落在场景模式切换（${s.mode}）上`);
  });
  assert.ok(view.turns.at(-1).from + view.DUR < film.TL.base);
});

test("实际画出来的每一页逐帧（60 帧/秒）：取景框在画布里、比例 9:16；同一页镜头连续；不连续只发生在新页从右边外面翻进来的那一帧", () => {
  let prev = view.pages(0);
  let turns = 0;
  for (let u = 1 / 60; u <= film.TL.base; u += 1 / 60) {
    const now = view.pages(u);
    for (const p of now.list) inCanvas(p.cam, u);
    const live = now.list.find((p) => p.live);
    const prevLive = prev.list.find((p) => p.live);
    assert.equal(now.list.filter((p) => p.live).length, 1);
    if (now.turn >= 0 && now.turn !== prev.turn) {
      turns++;
      // 翻页的第一帧：旧页就是上一帧那一页（定格），新页整页还在屏幕右边外面附近，没有缩放和压暗
      const [old, neu] = now.list;
      smooth(prevLive.cam, old.cam, u);
      assert.ok(neu.dx >= W * 0.85, `第 ${u.toFixed(2)} 秒新页不是从右边推进来（dx=${neu.dx.toFixed(0)}）`);
      assert.equal(neu.dim, 0);
    } else {
      smooth(prevLive.cam, live.cam, u);
    }
    if (now.turn >= 0) {
      const [old, neu] = now.list;
      // 旧页定格、往左退、退得比新页慢；两页之间不留缝；新页时间单调往前、翻完那一刻追上真实时间
      assert.ok(old.dx <= 0 && neu.dx >= 0 && old.dx + W >= neu.dx, `第 ${u.toFixed(2)} 秒两页之间露了缝`);
      assert.ok(-old.dx < W - neu.dx + 1e-6, `第 ${u.toFixed(2)} 秒旧页退得不比新页慢`);
      assert.ok(neu.at <= view.turns[now.turn].from + view.DUR && neu.at >= view.turns[now.turn].to, `第 ${u.toFixed(2)} 秒新页时间不对`);
      if (prev.turn === now.turn) {
        assert.equal(old.at, prev.list[0].at, "旧页没定格");
        assert.ok(neu.dx <= prev.list[1].dx && old.dx <= prev.list[0].dx, `第 ${u.toFixed(2)} 秒翻页往回走了`);
        assert.ok(neu.at > prev.list[1].at, "新页时间没往前走");
      }
    } else {
      assert.equal(now.list.length, 1);
      assert.equal(live.at, u);
      assert.equal(live.dx, 0);
    }
    prev = now;
  }
  assert.equal(turns, view.turns.length, "有翻页没翻到");
});

test("每一拍停住时都包住它对准的东西", () => {
  for (const b of track) {
    if (!b.aim) continue;
    const f = b.focus;
    const a = b.aim;
    assert.ok(a.x >= f.x - 0.5 && a.y >= f.y - 0.5 && a.x + a.w <= f.x + f.w + 0.5 && a.y + a.h <= f.y + f.h + 0.5, `${b.target}@${b.at.toFixed(2)} 切掉了目标`);
  }
});
