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
        case "getTransform":
          return () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] });
        case "measureText":
          return (s) => ({ width: Array.from(s).length * parseFloat(String(state.font).match(/([\d.]+)px/)[1]) });
        case "fillText":
          return (s, x, y) => {
            const [px, py] = apply(x, y);
            texts.push({ s, x: px, y: py, size: parseFloat(String(state.font).match(/([\d.]+)px/)[1]) * Math.abs(m[3]), alpha: state.globalAlpha, align: state.textAlign });
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
        // 量字宽：中文一个字宽、ASCII 与空格半个字宽；按对齐方式算左右边
        const w = Array.from(t.s).reduce((a, c) => a + (c.charCodeAt(0) < 128 ? 0.55 : 1), 0) * t.size;
        const x0 = t.align === "left" || t.align === "start" ? t.x : t.align === "right" || t.align === "end" ? t.x - w : t.x - w / 2;
        assert.ok(x0 > -t.size && x0 + w < width + t.size && t.y > 0 && t.y < height, `${width}×${height} 第 ${u.toFixed(2)} 秒「${t.s}」出了画布（${t.x.toFixed(0)}, ${t.y.toFixed(0)}）`);
      }
      for (const i of images) assert.ok(i.x0 >= 0 && i.y0 >= 0 && i.x1 <= width && i.y1 <= height, `第 ${u.toFixed(2)} 秒小精灵出了画布`);
    }
  }
});

// 片头模块自己写的字（不含 PlatformChat 画的平台外壳：导航栏、工作台、发送键……）
function ownTexts(u, o = { width: 1080, height: 1920, logo }) {
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
  const ctx = new Proxy(s.ctx, {
    get: (t, k) => (k === "fillText" ? (str, ...r) => (inShell || texts.push({ s: str, alpha: t.globalAlpha }), orig(str, ...r)) : t[k]),
    set: (t, k, v) => ((t[k] = v), true),
  });
  try {
    Intro.draw(ctx, u, o);
  } finally {
    PC.draw = draw;
  }
  return texts;
}
const PLATFORM_LABELS = new Set(["已读"]); // 平台自带的小标签（正片的气泡旁也画），不算文案
const WORDMARK = "话术精灵";

test("真字不打码：聊天里是真句子（不超过 24 个汉字），没有问号占位、没有英文；片尾卡只有小精灵 + 「话术精灵」", () => {
  const lines = new Set();
  for (let u = 0; u <= INTRO + 1e-9; u += 0.02) ownTexts(u).forEach((x) => lines.add(x.s));
  // 打字到一半的输入框（「截」「截图」）是整句的前缀，不另算
  const copy = [...lines].filter((x) => /\p{Script=Han}/u.test(x) && !PLATFORM_LABELS.has(x) && !Array.from(WORDMARK).includes(x) && ![...lines].some((y) => y !== x && y.startsWith(x)));
  const han = copy.join("").match(/\p{Script=Han}/gu) || [];
  assert.ok(han.length <= 24, `聊天文案 ${han.length} 个汉字：${copy.join(" | ")}`);
  // 以前、现在两边都是真句子：顾客的问话、客服一样一样地问、顾客「等下」；现在一整句话术 + 顾客满意
  for (const must of ["运费怎么退？", "截图？", "姓名？", "等下", "截图、姓名、账号发我", "太省心了"]) assert.ok(lines.has(must), `少了「${must}」：${[...lines].join(" | ")}`);
  assert.ok(![...lines].some((x) => /^[?？]+$/.test(x)), "还有只写问号的占位");
  assert.ok(![...lines].some((x) => /[A-Za-z]/.test(x)), `片头里有英文：${[...lines].join(" | ")}`);
  // 不再画打码条：片头源码里没有 rows/bars 那套
  assert.ok(!/\bBAR\s*=\s*10\b|rows:\s*\[\[/.test(js("film-brand-intro.js")), "片头里还有打码条");
  const end = frame(INTRO, { width: 1080, height: 1920, logo });
  assert.deepEqual(end.texts.filter((t) => t.alpha > 0).map((t) => t.s).join(""), WORDMARK);
  assert.equal(end.images.length, 1, "片尾卡没有小精灵");
});

// 平台窗口在画布上的外框（量 PlatformChat.draw 被调用时的变换）
function windowBox(u, o = { width: 1080, height: 1920 }) {
  const s = stubCtx();
  const PC = full.PlatformChat;
  const draw = PC.draw;
  let box = null;
  PC.draw = (ctx, key, chat, opt) => {
    const out = draw(ctx, key, chat, opt);
    const t = ctx.getTransform();
    const w = out.win;
    const h = w.h + (out.bar ? out.bar.h : 0);
    box = { x0: t.a * w.x + t.e, y0: t.d * w.y + t.f, x1: t.a * (w.x + w.w) + t.e, y1: t.d * (w.y + h) + t.f, alpha: ctx.globalAlpha };
    return out;
  };
  try {
    Intro.draw(s.ctx, u, { ...o, logo });
  } finally {
    PC.draw = draw;
  }
  return box;
}

test("竖屏满屏：聊天窗和正片第一帧一样宽、上下几乎顶满，没有 16:9 的黑边舞台", () => {
  for (const u of [0.1, 0.9, 1.3, 1.5, 2.2]) {
    const b = windowBox(u);
    assert.ok(b, `第 ${u} 秒没画窗口`);
    assert.ok(b.x0 <= 30 && b.x1 >= 1050, `第 ${u} 秒窗口左右 ${b.x0.toFixed(0)}–${b.x1.toFixed(0)}`);
    assert.ok(b.y0 <= 100, `第 ${u} 秒窗口顶边 ${b.y0.toFixed(0)}`);
    assert.ok(b.y1 >= 1740, `第 ${u} 秒窗口底边 ${b.y1.toFixed(0)}`);
    assert.ok(b.y1 - b.y0 >= 0.85 * 1920, `第 ${u} 秒窗口只有 ${(b.y1 - b.y0).toFixed(0)} 高`);
  }
});

test("第一帧就进画面：0–0.08 秒窗口已经整块在（不淡入、没有黑场），0.1 秒问话和时间戳都看得清", () => {
  for (const u of [0, 0.04, 0.08]) {
    const b = windowBox(u);
    assert.ok(b && b.alpha >= 0.99, `第 ${u} 秒窗口还没出来`);
    // 这一段除了窗口和问话，别的什么都没有（没有鼠标、话术卡、片尾卡）
    const extra = ownTexts(u).filter((x) => x.alpha > 0 && !["运费怎么退？", "10:02"].includes(x.s));
    assert.deepEqual(extra.map((x) => x.s), [], `第 ${u} 秒多画了东西`);
    assert.equal(frame(u, { width: 1080, height: 1920, logo }).images.length, 0, `第 ${u} 秒画了小精灵`);
  }
  const t = ownTexts(0.1);
  const ask = t.find((x) => x.s === "运费怎么退？");
  assert.ok(ask && ask.alpha >= 0.9, "0.1 秒顾客的问话还看不清");
  assert.ok(t.some((x) => x.s === "10:02" && x.alpha >= 0.9), "0.1 秒时间戳还看不清");
});

test("一键发送：点纸飞机以后不再按发送键，话术直接变成气泡发出去", () => {
  const presses = [];
  const PC = full.PlatformChat;
  const draw = PC.draw;
  PC.draw = (ctx, key, chat, opt) => (presses.push([cur, opt.press || 0]), draw(ctx, key, chat, opt));
  let cur = 0;
  try {
    for (cur = 1.4; cur <= 2.4; cur += 0.01) Intro.draw(stubCtx().ctx, cur, { width: 1080, height: 1920, logo });
  } finally {
    PC.draw = draw;
  }
  assert.ok(presses.length > 50 && presses.every(([, p]) => p === 0), "「现在」里发送键被按了");
  // 「以前」还是手动按发送
  const before = [];
  PC.draw = (ctx, key, chat, opt) => (before.push(opt.press || 0), draw(ctx, key, chat, opt));
  try {
    for (let u = 0.3; u <= 0.5; u += 0.01) Intro.draw(stubCtx().ctx, u, { width: 1080, height: 1920, logo });
  } finally {
    PC.draw = draw;
  }
  assert.ok(before.some((p) => p > 0.5), "「以前」没按发送键");
  // 话术先进输入框、再成为气泡；气泡出来时输入框已经空了
  const big = (u) => ownTexts(u).filter((x) => x.s === "截图、姓名、账号发我" && x.alpha > 0.5).length;
  assert.ok(big(1.5) >= 1, "结果里看不到那条话术");
  assert.ok(big(2.2) === 1, "发出去以后不是正好一个气泡");
});

test("片尾卡有分量：小精灵 200 像素以上宽，2.55–2.8 秒「话术精灵」四个字和小精灵同时完整在画面上", () => {
  for (const u of [2.55, 2.65, 2.75, 2.79, INTRO]) {
    const f = frame(u, { width: 1080, height: 1920, logo });
    assert.equal(f.images.length, 1, `第 ${u} 秒没有小精灵`);
    const img = f.images[0];
    const w = img.x1 - img.x0;
    assert.ok(w >= 200 && w <= 320, `第 ${u} 秒小精灵 ${w.toFixed(0)} 宽`);
    assert.ok((img.y0 + img.y1) / 2 < 960, "小精灵不在画面中线以上");
    const marks = f.texts.filter((t) => Array.from(WORDMARK).includes(t.s) && t.alpha >= 0.99);
    assert.equal(marks.map((t) => t.s).join(""), WORDMARK, `第 ${u} 秒「话术精灵」不完整`);
    assert.ok(marks.every((t) => t.size >= 120 && t.y > img.y1), "「话术精灵」不在小精灵下面或字太小");
    // 窗口已经退干净
    assert.equal(windowBox(u), null, `第 ${u} 秒还画着聊天窗`);
  }
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
  const filmScore = film.TL.score.filter((e) => e.u >= INTRO);
  assert.equal(filmScore.length, plain.TL.score.length, "声音事件数");
  filmScore.forEach((x, i) => near(x.u, plain.TL.score[i].u, `声音 ${x.type}`));
});

test("片头只有两声（0.05 起手、1.4 切点），都是 Synth 已有的音色、在正片之前响完；镜头整幅、第一拍镜头在 INTRO 以后", () => {
  const cues = film.TL.score.filter((e) => e.u < INTRO);
  assert.equal(JSON.stringify(cues.map((e) => e.u)), "[0.05,1.4]");
  const src = js("freight-film.js");
  const types = [...src.matchAll(/case "(\w+)":/g)].map((x) => x[1]);
  for (const e of cues) {
    assert.ok(types.includes(e.type), `片头用了 Synth 没有的音色 ${e.type}`);
    assert.ok(!e.dur && e.u + 0.5 < INTRO, `片头的 ${e.type} 拖进了正片`);
  }
  assert.ok(!plain.TL.score.some((e) => e.type === "msgIn" && e.u === 0.05), "没引片头时也响了片头的声音");
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
