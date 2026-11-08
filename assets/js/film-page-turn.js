// 翻页过渡（issue #18）：三部竖屏短片换到不相干的画面时，照早期 iOS 推入新页那样翻过去——新画面从右边整页推进来，
// 旧画面往左退、退得比新画面慢（只退 PARALLAX 那么多，有前后层次），旧画面同时压暗，两页交界处一道阴影；不转、不缩放、不淡。
// 不改 film-engine.js（引擎一帧只画一个 u）：这里自己把同一部片子画两遍（旧页定格在切之前的最后一帧，新页照常往下走），
// 各自平移、各自走自己的镜头与镜头外那一层，再画交界的阴影。片子把 compose 的结果当 render 交给引擎，不再另给 camera / overlay。
//
//   FilmPageTurn.compose({ width, height, render(ctx, u), camera(u)?, overlay(ctx, u, cam)?, turns: [{ from, to }] })
//     → { render(ctx, u), pages(u), turns, DUR }
//   turns：每一次翻页。from = 旧画面最后一帧干净的时刻（片子原来的快切从这里开始），to = 新画面第一帧干净的时刻（快切到这里结束）；
//     翻页从 from 开始、走 DUR 秒，片长不变。新页的时间从 to 起步、在 from + DUR 追上真实时间（中间按比例放慢一点），所以翻完那一刻无缝接回单页。
//   pages(u) → { turn, list: [{ at, dx, dim, cam, live }] }：这一帧画哪几页（先旧后新）、各画第几秒、往右移多少、压多暗、什么取景框；
//     live 是时间在走的那一页。测试按它分清「翻页」与「镜头推拉」。
(() => {
  const DUR = 0.42; // 翻一页的秒数
  const PARALLAX = 0.3; // 新页推满一屏时，旧页只往左退这么多（屏宽的比例）
  const DIM = 0.32; // 旧页最后压到多暗
  const SHADOW = 48; // 交界阴影的宽度（画面像素）
  const SHADOW_A = 0.55; // 阴影最深处
  const EPS = 1e-3; // 旧页定格在 from 之前这么一点，那一帧还没开始快切
  const ease = (t) => 1 - Math.pow(1 - t, 3); // 起手快、收得稳

  function compose(o) {
    const W = o.width;
    const H = o.height;
    const turns = [...o.turns].sort((a, b) => a.from - b.from);
    turns.forEach((t, i) => {
      if (!(t.to >= t.from && t.to - t.from < DUR)) throw new Error(`翻页 ${i}：to 必须在 from 之后 ${DUR} 秒以内`);
      if (i && turns[i - 1].from + DUR > t.from) throw new Error(`翻页 ${i}：和上一次翻页叠在一起`);
    });
    const cam = (u) => (o.camera ? o.camera(u) : null);

    function pages(u) {
      const i = turns.findIndex((t) => u >= t.from && u < t.from + DUR);
      if (i < 0) return { turn: -1, list: [{ at: u, dx: 0, dim: 0, cam: cam(u), live: true }] };
      const t = turns[i];
      const k = (u - t.from) / DUR;
      const p = ease(k);
      const old = t.from - EPS;
      const at = t.to + (u - t.from) * ((t.from + DUR - t.to) / DUR);
      return {
        turn: i,
        list: [
          { at: old, dx: -W * PARALLAX * p, dim: DIM * p, cam: cam(old), live: false },
          { at, dx: W * (1 - p), dim: 0, cam: cam(at), live: true },
        ],
      };
    }

    // 一页：和引擎 paint 同一套——镜头取景框放大铺满，画 render，再按画面坐标画 overlay
    function page(ctx, pg) {
      ctx.save();
      if (pg.dx) {
        ctx.translate(pg.dx, 0);
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();
      }
      ctx.save();
      if (pg.cam) {
        const z = W / pg.cam.w;
        ctx.transform(z, 0, 0, z, -pg.cam.x * z, -pg.cam.y * z);
      }
      o.render(ctx, pg.at);
      ctx.restore();
      if (o.overlay) o.overlay(ctx, pg.at, pg.cam);
      if (pg.dim > 0) {
        ctx.fillStyle = `rgba(0,0,0,${pg.dim})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    function render(ctx, u) {
      const { list } = pages(u);
      page(ctx, list[0]);
      if (list.length < 2) return;
      const edge = list[1].dx;
      ctx.save();
      const g = ctx.createLinearGradient(edge - SHADOW, 0, edge, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${SHADOW_A})`);
      ctx.fillStyle = g;
      ctx.fillRect(edge - SHADOW, 0, SHADOW, H);
      ctx.restore();
      page(ctx, list[1]);
    }

    return { render, pages, turns, DUR };
  }

  globalThis.FilmPageTurn = { compose, DUR };
})();
