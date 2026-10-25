// 补运费短片的镜头（issue #5）：取景框永远在画布里、比例 9:16（issue #9 起竖屏），推拉连续不跳，每一拍都包住它对准的东西，开场第一帧是全景（钩子问话完整在画面里）。
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
vm.runInNewContext(readFileSync(resolve(import.meta.dirname, "../assets/js/freight-film.js"), "utf8"), sandbox);
const film = sandbox.__freightFilm();
const track = film.cameraTrack();

test("每一拍剧本镜头都进了镜头表，按时间排好", () => {
  const targets = new Set(track.map((b) => b.target));
  for (const s of film.TL.shots) assert.ok(targets.has(s.target), s.target);
  for (let i = 1; i < track.length; i++) assert.ok(track[i].at >= track[i - 1].at);
});

test("开场第一帧是全景，钩子问话不被镜头切掉", () => {
  assert.deepEqual({ ...film.camera(0) }, { x: 0, y: 0, w: W, h: H });
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
