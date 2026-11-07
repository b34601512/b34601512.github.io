// 补运费短片的镜头（issue #5）：取景框永远在画布里、比例 9:16（issue #9 起竖屏），推拉连续不跳，每一拍都包住它对准的东西；
// issue #16 起没有片头：第一帧镜头已经推近聊天窗，顾客第一句马上进来，钩子标题条从第 0 秒挂起。
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
for (const f of ["platform-chat.js", "freight-film.js"]) vm.runInNewContext(readFileSync(resolve(import.meta.dirname, `../assets/js/${f}`), "utf8"), sandbox);
const film = sandbox.__freightFilm();
const track = film.cameraTrack();

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

test("逐帧（60 帧/秒）取景框都在画布里、比例 9:16，推拉每帧不超过 2%，中心每帧不超过 50 画面像素", () => {
  let prev = film.camera(0);
  for (let u = 1 / 60; u <= film.TL.base; u += 1 / 60) {
    const c = film.camera(u);
    assert.ok(c.x >= -1e-6 && c.y >= -1e-6 && c.x + c.w <= W + 1e-6 && c.y + c.h <= H + 1e-6, `第 ${u.toFixed(2)} 秒出了画布`);
    assert.ok(Math.abs((c.h * W) / H - c.w) < 1e-6, `第 ${u.toFixed(2)} 秒比例不对`);
    assert.ok(Math.abs(c.w / prev.w - 1) < 0.02, `第 ${u.toFixed(2)} 秒推拉太快`);
    const z = W / c.w;
    const pan = Math.hypot(c.x + c.w / 2 - prev.x - prev.w / 2, c.y + c.h / 2 - prev.y - prev.h / 2) * z;
    assert.ok(pan < 50, `第 ${u.toFixed(2)} 秒摇得太快（${pan.toFixed(1)}px）`);
    prev = c;
  }
});

test("每一拍停住时都包住它对准的东西", () => {
  for (const b of track) {
    if (!b.aim) continue;
    const f = b.focus;
    const a = b.aim;
    assert.ok(a.x >= f.x - 0.5 && a.y >= f.y - 0.5 && a.x + a.w <= f.x + f.w + 0.5 && a.y + a.h <= f.y + f.h + 0.5, `${b.target}@${b.at.toFixed(2)} 切掉了目标`);
  }
});
