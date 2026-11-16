// 片头（issue #23）：可复用模块 film-brand-intro.js 的契约，以及补运费短片接上片头以后整条时间线一起往后挪。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const js = (f) => readFileSync(resolve(import.meta.dirname, `../assets/js/${f}`), "utf8");
function load(files) {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  for (const f of files) vm.runInNewContext(js(f), sandbox);
  return sandbox;
}
const full = load(["film-palette.js", "platform-chat.js", "film-brand-intro.js", "film-page-turn.js", "freight-film.js"]);
const Intro = full.SoftTalkBrandIntro;
const INTRO = Intro.DURATION;

// 记录式假画布：跟踪变换矩阵，把每次写字、贴图换算成画布坐标记下来；整条调用记录用来比对「同一个 u 同一帧」
function stubCtx() {
  const log = [];
  const texts = [];
  const images = [];
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const apply = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mul = (a, b, c, d, e, f) => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  };
  const grad = () => ({ addColorStop: (...a) => log.push(["stop", ...a]) });
  const state = { font: "10px sans", fillStyle: "#000", strokeStyle: "#000", globalAlpha: 1, lineWidth: 1, textAlign: "left", textBaseline: "alphabetic" };
  const ctx = new Proxy(state, {
    get(target, k) {
      if (k in target) return target[k];
      switch (k) {
        case "save":
          return () => (stack.push([m, { ...state }]), log.push(["save"]));
        case "restore":
          return () => {
            const s = stack.pop();
            if (s) [m] = s, Object.assign(state, s[1]);
            log.push(["restore"]);
          };
        case "translate":
          return (x, y) => (mul(1, 0, 0, 1, x, y), log.push(["t", x, y]));
        case "scale":
          return (x, y) => (mul(x, 0, 0, y, 0, 0), log.push(["s", x, y]));
        case "transform":
          return (...a) => (mul(...a), log.push(["tf", ...a]));
        case "measureText":
          return (s) => ({ width: Array.from(s).length * parseFloat(String(state.font).match(/([\d.]+)px/)[1]) });
        case "fillText":
          return (s, x, y) => {
            const [px, py] = apply(x, y);
            texts.push({ s, x: px, y: py, size: parseFloat(String(state.font).match(/([\d.]+)px/)[1]) * Math.abs(m[3]), alpha: state.globalAlpha });
            log.push(["text", s, px, py, state.fillStyle, state.font, state.globalAlpha]);
          };
        case "drawImage":
          return (img, x, y, w, h) => {
            const a = apply(x, y);
            const b = apply(x + w, y + h);
            images.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
            log.push(["img", ...a, ...b]);
          };
        case "createLinearGradient":
        case "createRadialGradient":
          return (...a) => (log.push([k, ...a]), grad());
        default:
          return (...a) => log.push([k, ...a.map((v) => (typeof v === "number" ? apply(v, v) : v))]);
      }
    },
    set(target, k, v) {
      target[k] = v;
      log.push(["=", k, typeof v === "object" ? "grad" : v]);
      return true;
    },
  });
  return { ctx, log, texts, images };
}
const frame = (u, o = { width: 1080, height: 1920 }) => {
  const s = stubCtx();
  Intro.draw(s.ctx, u, o);
  return s;
};
const logo = { complete: true, naturalWidth: 112 };

test("片头模块：时长不超过 3 秒，接口只有 DURATION 和 draw", () => {
  assert.ok(INTRO > 0 && INTRO <= 3, `片头 ${INTRO} 秒`);
  assert.equal(typeof Intro.draw, "function");
  assert.deepEqual(Object.keys(Intro).sort(), ["DURATION", "draw"]);
  // 不读时钟、不用随机数、不碰 DOM
  const src = js("film-brand-intro.js");
  for (const bad of ["Date", "Math.random", "performance.now", "document", "new Image"]) assert.ok(!src.includes(bad), `片头里用了 ${bad}`);
});

test("片头是 u 的纯函数：同一个 u 画出同一帧（倒着、乱序 seek 也一样）", () => {
  const us = [0, 0.3, 0.9, 1.4, 1.55, 1.9, 2.25, 2.5, INTRO];
  const first = us.map((u) => JSON.stringify(frame(u, { width: 1080, height: 1920, logo }).log));
  [...us].reverse().forEach((u) => assert.equal(JSON.stringify(frame(u, { width: 1080, height: 1920, logo }).log), first[us.indexOf(u)], `第 ${u} 秒两次画得不一样`));
  assert.notEqual(first[1], first[5], "片头没动");
});

test("每一帧的字和图都在画布里；别的比例（横屏、方形）也不报错、不出界", () => {
  for (const [width, height] of [[1080, 1920], [1920, 1080], [800, 800]]) {
    for (let u = 0; u <= INTRO + 1e-9; u += 0.05) {
      const { texts, images } = frame(u, { width, height, logo });
      for (const t of texts) {
        if (t.alpha <= 0) continue;
        const half = (Array.from(t.s).length * t.size) / 2;
        assert.ok(t.x - half > -t.size && t.x + half < width + t.size && t.y > 0 && t.y < height, `${width}×${height} 第 ${u.toFixed(2)} 秒「${t.s}」出了画布（${t.x.toFixed(0)}, ${t.y.toFixed(0)}）`);
      }
      for (const i of images) assert.ok(i.x0 >= 0 && i.y0 >= 0 && i.x1 <= width && i.y1 <= height, `第 ${u.toFixed(2)} 秒小精灵出了画布`);
    }
  }
});

test("字数预算：整段片头自己写的字不超过 10 个汉字，没有英文；片尾卡只有小精灵 + 「话术精灵」", () => {
  const own = new Set();
  for (let u = 0; u <= INTRO + 1e-9; u += 0.02) {
    // 平台窗口外壳（导航栏、发送键）是 PlatformChat 画的界面，不算片头文案；这里只看片头模块自己写的字
    const s = stubCtx();
    const PC = full.PlatformChat;
    const draw = PC.draw;
    let inShell = false;
    PC.draw = (...a) => {
      inShell = true;
      try {
        return draw(...a);
      } finally {
        inShell = false;
      }
    };
    const orig = s.ctx.fillText;
    const texts = [];
    const ctx = new Proxy(s.ctx, { get: (t, k) => (k === "fillText" ? (str, ...r) => (inShell || texts.push(str), orig(str, ...r)) : t[k]), set: (t, k, v) => ((t[k] = v), true) });
    Intro.draw(ctx, u, { width: 1080, height: 1920, logo });
    PC.draw = draw;
    texts.forEach((x) => own.add(x));
  }
  const han = [...own].join("").match(/\p{Script=Han}/gu) || [];
  assert.ok(new Set(han).size <= 10 && [...own].filter((x) => /\p{Script=Han}/u.test(x)).join("").length <= 10, `片头的字：${[...own].join(" | ")}`);
  assert.ok(![...own].some((x) => /[A-Za-z]/.test(x)), `片头里有英文：${[...own].join(" | ")}`);
  const end = frame(INTRO, { width: 1080, height: 1920, logo });
  assert.deepEqual(end.texts.filter((t) => t.alpha > 0).map((t) => t.s).join(""), "话术精灵");
  assert.equal(end.images.length, 1, "片尾卡没有小精灵");
});

const film = full.__freightFilm();
const plain = load(["film-palette.js", "platform-chat.js", "film-page-turn.js", "freight-film.js"]).__freightFilm(); // 页面没引片头：和原来一样

test("接上片头：整条时间线往后挪 INTRO 秒，片长多 INTRO 秒；没引片头时和原来一样", () => {
  assert.ok(Math.abs(film.TL.base - plain.TL.base - INTRO) < 1e-9, `${plain.TL.base} → ${film.TL.base}`);
  const near = (a, b, what) => assert.ok(Math.abs(a - b - INTRO) < 1e-6, `${what}：${b} → ${a}`);
  film.TL.msgs.forEach((x, i) => near(x.at, plain.TL.msgs[i].at, "消息"));
  film.TL.shots.forEach((x, i) => near(x.at, plain.TL.shots[i].at, "镜头"));
  film.TL.turns.forEach((x, i) => near(x.from, plain.TL.turns[i].from, "翻页"));
  near(film.TL.m.end[0], plain.TL.m.end[0], "片尾");
  near(film.TL.m.hook[0], plain.TL.m.hook[0], "钩子标题条");
  assert.equal(film.TL.score.length, plain.TL.score.length, "声音事件数");
  film.TL.score.forEach((x, i) => near(x.u, plain.TL.score[i].u, `声音 ${x.type}`));
});

test("片头里没有正片的东西：没有声音事件、镜头整幅、第一拍镜头在 INTRO 以后", () => {
  assert.ok(film.TL.score.every((e) => e.u >= INTRO), "片头里有声音事件");
  assert.ok(film.TL.shots[0].at >= INTRO);
  assert.ok(film.cameraTrack()[0].at >= INTRO);
  assert.deepEqual({ ...film.camera(0.5) }, { x: 0, y: 0, w: 1080, h: 1920 });
  // overlay 在片头里什么都不画；render 画的就是片头那一帧
  const s = stubCtx();
  film.overlay(s.ctx, 1, film.camera(1));
  assert.equal(s.log.length, 0, "片头里画了正片的标题条 / 字幕");
  const a = stubCtx();
  film.render(a.ctx, 1.9);
  assert.equal(JSON.stringify(a.log), JSON.stringify(frame(1.9, { width: 1080, height: 1920, logo: { complete: false } }).log));
});

test("播放器封面与音乐起点跟着挪：封面停在正片第 2.6 秒，音乐从 INTRO + 0.2 秒开始", () => {
  const src = js("freight-film.js");
  assert.match(src, /still: INTRO \+ 2\.6/);
  const firstMusic = film.TL.score.filter((e) => e.type === "bass").map((e) => e.u).sort((a, b) => a - b)[0];
  assert.ok(Math.abs(firstMusic - (INTRO + 0.2)) < 1e-9, `音乐从 ${firstMusic} 秒开始`);
});

test("配色只有一份：freight-film.js 不再自带 P 表，值从 film-palette.js 取且原样未改", () => {
  const src = js("freight-film.js");
  assert.ok(!/const P = \{/.test(src), "freight-film.js 里还有一份 P");
  const P = full.FilmPalette.P;
  assert.equal(P.frame, "#fbf6ec");
  assert.equal(P.hot, "#c2410c");
  assert.equal(P.title, "#e53935");
  assert.equal(Object.keys(P).length, 19);
  assert.equal(full.FilmPalette.ACCENT, "#ff6b2c");
});
