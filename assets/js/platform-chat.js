// 短片里的「真实客服工作台」（GitHub issue #11）：京东咚咚、千牛（天猫）、拼多多商家版、抖店飞鸽、微信电脑版的聊天窗，Canvas 现画。
// 照作者给的实机截图（issue #10）画结构与配色：顶部店铺页签 / 左侧导航栏 / 会话列表 / 聊天头 / 消息区 / 工具栏 / 输入框 / 发送键 / 右侧面板，
// 以及贴在窗口底边的话术精灵吸附搜索栏。截图本身不进仓库（别家的界面截图，仓库是公开的），这里全是代码画的。
// 平台名、平台标志一律不画：客服一眼认出「这是我天天用的那个窗口」就够了（issue #11：暗示，不用文字说）。
// 店铺名、顾客昵称这类真实信息照截图的样子打码（灰条）。
//
// 用法：PlatformChat.draw(ctx, key, chat, o) —— 一切按「原生像素」（≈ 实机 1:1）画，调用方自己 ctx.scale 放大。
//   chat：聊天栏（消息区 + 输入区）的矩形；窗口其余部分（导航栏、会话列表、顶栏、右侧面板、吸附栏）围着它往外画。
//   返回各块的矩形：win（整个窗口）、head（聊天头）、msgs（消息区）、input（输入区）、text（输入文字的起点）、send（发送键）、
//   side（右侧面板正文）、shops（每家店铺的页签）、bar（吸附栏），调用方在 msgs 里画自己的气泡、在 text 处画输入的字。
(() => {
  const SANS = '"MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
  const BLUR = "rgba(150,156,166,0.55)";

  // 颜色：截图取样（区域众数），与 CLAUDE.md「平台皮肤的真值来源」一致
  const SKINS = {
    jd: {
      top: 30, rail: 36, list: 150, railBg: "#eceef2", railFg: "#4b5563", railOn: "#d9dde4", railOnFg: "#1f2937",
      msgBg: "#ffffff", headBg: "#ffffff", line: "#e6e8eb", in: "#ffffff", inLine: "#e3e5e8", own: "#d9e8ff", ownFg: "#1f2329",
      send: "#4960f4", sendOff: "#4960f4", sendFg: "#ffffff", accent: "#4960f4", avatar: "round", read: true, sideTabs: ["首页", "服务单", "商品", "优惠券", "智能服务"],
      quickTabs: ["个人", "团队", "卡片"], quickTitle: "搜索短语", placeholder: "按住Shift+Space可快速选中输入框",
    },
    tm: {
      top: 0, rail: 40, list: 150, railBg: "#3d7fff", railFg: "#ffffff", railOn: "#2f6ae6", railOnFg: "#ffffff",
      msgBg: "#f0f2f5", headBg: "#f5f6f7", line: "#e4e7ec", in: "#ffffff", inLine: "#ffffff", own: "#d8e4ff", ownFg: "#1f2329",
      send: "#3d7fff", sendOff: "#3d7fff", sendFg: "#ffffff", accent: "#3d7fff", avatar: "round", read: true, sideTabs: ["客服", "足迹", "推荐", "知识库"],
      quickTabs: ["个人短语", "团队短语"], quickTitle: "快捷短语", placeholder: "",
    },
    pdd: {
      top: 30, rail: 34, list: 150, railBg: "#f7f8fa", railFg: "#9aa0aa", railOn: "#eceffe", railOnFg: "#5864e8",
      msgBg: "#ffffff", headBg: "#ffffff", line: "#eceef1", in: "#f2f3f5", inLine: "#f2f3f5", own: "#d4e9fe", ownFg: "#1f2329",
      send: "#ffffff", sendOff: "#ffffff", sendFg: "#333333", sendLine: "#c9ccd2", accent: "#3d6cf0", avatar: "round", read: true, sideTabs: ["买家订单", "商品推荐", "快捷回复", "待办详情"],
      quickTabs: ["个人", "团队"], quickTitle: "快捷回复", placeholder: "",
    },
    dy: {
      top: 32, rail: 40, list: 150, railBg: "#f3f5fa", railFg: "#6b7280", railOn: "#ffffff", railOnFg: "#2f6df9",
      msgBg: "#ffffff", headBg: "#ffffff", line: "#eceef2", in: "#f5f6fa", inLine: "#f5f6fa", own: "#e3effe", ownFg: "#1f2329",
      send: "#2f6df9", sendOff: "#2f6df9", sendFg: "#ffffff", accent: "#2f6df9", avatar: "round", read: true, sideTabs: ["订单", "会话搜索", "商品", "快捷短语"],
      quickTabs: ["个人", "团队"], quickTitle: "快捷短语", placeholder: "发送给 顾客，使用Enter 发送消息，使用Ctrl+Enter 换行",
    },
    wx: {
      top: 0, rail: 34, list: 150, railBg: "#2e2e2e", railFg: "#9b9b9b", railOn: "#2e2e2e", railOnFg: "#07c160",
      msgBg: "#f5f5f5", headBg: "#f5f5f5", line: "#e7e7e7", in: "#ffffff", inLine: "#ffffff", own: "#95ec69", ownFg: "#1a1a1a",
      send: "#e9e9e9", sendOff: "#e9e9e9", sendFg: "#07c160", accent: "#07c160", avatar: "square", read: false, sideTabs: [],
      quickTabs: [], quickTitle: "", placeholder: "",
    },
  };

  // ---------- 画笔 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function box(ctx, x, y, w, h, r, fill, line, lw = 1) {
    rr(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (line) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = line;
      ctx.stroke();
    }
  }
  function txt(ctx, s, x, y, size, color, { weight = 400, align = "left", maxW } = {}) {
    ctx.font = `${weight} ${size}px ${SANS}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(s, x, y, maxW);
    return ctx.measureText(s).width;
  }
  const tw = (ctx, s, size, weight = 400) => {
    ctx.font = `${weight} ${size}px ${SANS}`;
    return ctx.measureText(s).width;
  };
  // 打码：实机截图里店铺名、昵称都是糊掉的
  function blur(ctx, x, y, w, h = 8) {
    box(ctx, x, y - h / 2, w, h, h / 2, BLUR);
  }
  function hline(ctx, x, y, w, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, 1);
  }
  function vline(ctx, x, y, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, h);
  }
  function dot(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  // 头像：灰底圆（或圆角方）里一个浅色剪影
  function face(ctx, x, y, s, { shape = "round", bg = "#cfd3da", fg = "#ffffff" } = {}) {
    ctx.save();
    if (shape === "round") {
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    } else rr(ctx, x, y, s, s, s * 0.12);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.clip();
    dot(ctx, x + s / 2, y + s * 0.4, s * 0.19, fg);
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s * 0.98, s * 0.36, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 线条小图标（通用笔画，不是哪家的标志）
  function icon(ctx, kind, cx, cy, s, color, lw = 1.3) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const h = s / 2;
    ctx.beginPath();
    switch (kind) {
      case "chat":
        rr(ctx, cx - h, cy - h * 0.8, s, s * 0.7, s * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - h * 0.3, cy + h * 0.6);
        ctx.lineTo(cx - h * 0.55, cy + h);
        ctx.lineTo(cx + h * 0.05, cy + h * 0.6);
        ctx.stroke();
        break;
      case "user":
        ctx.arc(cx, cy - h * 0.35, h * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + h * 1.05, h * 0.85, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        break;
      case "grid":
        [-1, 1].forEach((a) => [-1, 1].forEach((b) => {
          rr(ctx, cx + a * h * 0.5 - h * 0.38, cy + b * h * 0.5 - h * 0.38, h * 0.76, h * 0.76, 1.5);
          ctx.stroke();
        }));
        break;
      case "chart":
        rr(ctx, cx - h, cy - h, s, s, 2);
        ctx.stroke();
        ctx.beginPath();
        [-0.45, 0, 0.45].forEach((a, i) => {
          ctx.moveTo(cx + a * h, cy + h * 0.55);
          ctx.lineTo(cx + a * h, cy + h * (0.1 - i * 0.25));
        });
        ctx.stroke();
        break;
      case "clock":
        ctx.arc(cx, cy, h, 0, Math.PI * 2);
        ctx.moveTo(cx, cy - h * 0.55);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + h * 0.4, cy + h * 0.25);
        ctx.stroke();
        break;
      case "doc":
        rr(ctx, cx - h * 0.75, cy - h, s * 0.75, s, 2);
        ctx.moveTo(cx - h * 0.4, cy - h * 0.35);
        ctx.lineTo(cx + h * 0.4, cy - h * 0.35);
        ctx.moveTo(cx - h * 0.4, cy + h * 0.05);
        ctx.lineTo(cx + h * 0.4, cy + h * 0.05);
        ctx.moveTo(cx - h * 0.4, cy + h * 0.45);
        ctx.lineTo(cx + h * 0.1, cy + h * 0.45);
        ctx.stroke();
        break;
      case "bell":
        ctx.moveTo(cx - h * 0.8, cy + h * 0.5);
        ctx.quadraticCurveTo(cx - h * 0.6, cy - h, cx, cy - h);
        ctx.quadraticCurveTo(cx + h * 0.6, cy - h, cx + h * 0.8, cy + h * 0.5);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + h * 0.75, h * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "smile":
        ctx.arc(cx, cy, h, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + h * 0.1, h * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        dot(ctx, cx - h * 0.35, cy - h * 0.25, s * 0.06, color);
        dot(ctx, cx + h * 0.35, cy - h * 0.25, s * 0.06, color);
        break;
      case "image":
        rr(ctx, cx - h, cy - h * 0.8, s, s * 0.8, 2);
        ctx.moveTo(cx - h * 0.8, cy + h * 0.4);
        ctx.lineTo(cx - h * 0.2, cy - h * 0.2);
        ctx.lineTo(cx + h * 0.2, cy + h * 0.15);
        ctx.lineTo(cx + h * 0.45, cy - h * 0.05);
        ctx.lineTo(cx + h * 0.85, cy + h * 0.4);
        ctx.stroke();
        break;
      case "folder":
        ctx.moveTo(cx - h, cy + h * 0.75);
        ctx.lineTo(cx - h, cy - h * 0.75);
        ctx.lineTo(cx - h * 0.2, cy - h * 0.75);
        ctx.lineTo(cx, cy - h * 0.45);
        ctx.lineTo(cx + h, cy - h * 0.45);
        ctx.lineTo(cx + h, cy + h * 0.75);
        ctx.closePath();
        ctx.stroke();
        break;
      case "scissors":
        ctx.arc(cx - h * 0.5, cy + h * 0.55, h * 0.3, 0, Math.PI * 2);
        ctx.moveTo(cx + h * 0.8, cy + h * 0.55);
        ctx.arc(cx + h * 0.5, cy + h * 0.55, h * 0.3, 0, Math.PI * 2);
        ctx.moveTo(cx - h * 0.3, cy + h * 0.3);
        ctx.lineTo(cx + h * 0.6, cy - h);
        ctx.moveTo(cx + h * 0.3, cy + h * 0.3);
        ctx.lineTo(cx - h * 0.6, cy - h);
        ctx.stroke();
        break;
      case "star":
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
          ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * h, cy + Math.sin(a) * h);
        }
        ctx.closePath();
        ctx.stroke();
        break;
      case "gear":
        ctx.arc(cx, cy, h * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, h * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "box":
        rr(ctx, cx - h, cy - h * 0.7, s, s * 0.85, 2);
        ctx.moveTo(cx - h, cy - h * 0.2);
        ctx.lineTo(cx + h, cy - h * 0.2);
        ctx.stroke();
        break;
      case "more":
        [-1, 0, 1].forEach((k) => dot(ctx, cx + k * h * 0.6, cy, s * 0.08, color));
        break;
      case "search":
        ctx.arc(cx - h * 0.15, cy - h * 0.15, h * 0.6, 0, Math.PI * 2);
        ctx.moveTo(cx + h * 0.3, cy + h * 0.3);
        ctx.lineTo(cx + h * 0.8, cy + h * 0.8);
        ctx.stroke();
        break;
      case "phone":
        rr(ctx, cx - h * 0.5, cy - h, s * 0.5, s, 2);
        ctx.stroke();
        break;
      case "refresh":
        ctx.arc(cx, cy, h * 0.75, -0.3 * Math.PI, 1.4 * Math.PI);
        ctx.stroke();
        break;
      case "send":
        ctx.moveTo(cx - h, cy);
        ctx.lineTo(cx + h, cy - h * 0.8);
        ctx.lineTo(cx + h * 0.2, cy + h);
        ctx.lineTo(cx - h * 0.1, cy + h * 0.2);
        ctx.closePath();
        ctx.stroke();
        break;
      case "plus":
        ctx.moveTo(cx - h * 0.7, cy);
        ctx.lineTo(cx + h * 0.7, cy);
        ctx.moveTo(cx, cy - h * 0.7);
        ctx.lineTo(cx, cy + h * 0.7);
        ctx.stroke();
        break;
      default:
        ctx.arc(cx, cy, h * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
  }
  // 窗口右上角：最小化 / 最大化 / 关闭
  function winCtl(ctx, right, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(right - 78, cy);
    ctx.lineTo(right - 70, cy);
    ctx.rect(right - 50, cy - 4, 8, 8);
    ctx.moveTo(right - 22, cy - 4);
    ctx.lineTo(right - 14, cy + 4);
    ctx.moveTo(right - 14, cy - 4);
    ctx.lineTo(right - 22, cy + 4);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 顶栏：店铺页签（京东浅灰条、拼多多紫条、抖店淡蓝渐变条） ----------
  function topTabs(ctx, key, x, y, w, h, o) {
    const shops = o.shops || [{}];
    const out = [];
    const room = x + w - 120; // 右边留给窗口按钮；放不下的页签就不画（窗口太窄时只露出前一两家）
    if (key === "jd") {
      box(ctx, x, y, w, h, 0, "#e3e5ea");
      let tx = x + 8;
      shops.forEach((s, i) => {
        const on = i === (o.active ?? 0);
        const sw = o.tabW ?? 112;
        if (tx + sw > room && i > 0) return;
        if (on) box(ctx, tx, y + 4, sw, h - 4, 4, "#ffffff");
        else if (i) vline(ctx, tx, y + 10, h - 18, "#c9ccd2");
        dot(ctx, tx + 10, y + h / 2 + 2, 2.6, s.done ? "#22a06b" : "#e1251b");
        blur(ctx, tx + 18, y + h / 2 + 2, Math.min(46, sw - 26));
        if (sw >= 100) txt(ctx, "--小黛", tx + 68, y + h / 2 + 2, 10.5, on ? "#1f2329" : "#5b616b");
        out.push({ x: tx, y: y + 4, w: sw, h: h - 4 });
        tx += sw + 2;
      });
      if (tx + 20 < room) txt(ctx, "+", tx + 10, y + h / 2 + 1, 16, "#5b616b");
      if (tx + 30 < room) icon(ctx, "gear", x + w - 104, y + h / 2, 12, "#5b616b");
      winCtl(ctx, x + w, y + h / 2, "#5b616b");
    } else if (key === "pdd") {
      box(ctx, x, y, w, h, 0, "#615b8a");
      let tx = x + 4;
      shops.forEach((s, i) => {
        const on = i === (o.active ?? 0);
        const sw = o.tabW ?? 118;
        if (tx + sw > room && i > 0) return;
        if (on) box(ctx, tx, y + 3, sw, h - 3, 3, "#ffffff");
        else if (i) vline(ctx, tx, y + 9, h - 16, "rgba(255,255,255,.35)");
        box(ctx, tx + 8, y + h / 2 - 4, 12, 12, 2, on ? "#e5e6ef" : "rgba(255,255,255,.3)");
        blur(ctx, tx + 25, y + h / 2 + 2, Math.min(52, sw - 36));
        if (sw >= 100) txt(ctx, "旗舰店", tx + 80, y + h / 2 + 2, 10.5, on ? "#1f2329" : "#ffffff");
        if (s.done) dot(ctx, tx + sw - 10, y + h / 2 + 2, 3, "#22c55e");
        out.push({ x: tx, y: y + 3, w: sw, h: h - 3 });
        tx += sw + 2;
      });
      if (tx + 20 < room) txt(ctx, "+", tx + 10, y + h / 2 + 1, 16, "#ffffff");
      winCtl(ctx, x + w, y + h / 2, "#ffffff");
    } else if (key === "dy") {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, "#dfe6fb");
      g.addColorStop(1, "#e9e3f8");
      box(ctx, x, y, w, h, 0, g);
      let tx = x + 30;
      shops.forEach((s, i) => {
        const on = i === (o.active ?? 0);
        const sw = o.tabW ?? 104;
        if (tx + sw > room && i > 0) return;
        box(ctx, tx, y + 5, sw, h - 10, (h - 10) / 2, on ? "#ffffff" : "rgba(255,255,255,0)");
        dot(ctx, tx + 13, y + h / 2, 6, on ? "#2e8b57" : "#7aa58c");
        blur(ctx, tx + 23, y + h / 2, Math.min(44, sw - 34));
        if (sw >= 100) txt(ctx, "旗舰店", tx + 70, y + h / 2, 10, on ? "#1f2329" : "#5b616b");
        if (s.done) dot(ctx, tx + sw - 8, y + 9, 3, "#22c55e");
        out.push({ x: tx, y: y + 5, w: sw, h: h - 10 });
        tx += sw + 6;
      });
      if (tx + 20 < room) {
        dot(ctx, tx + 10, y + h / 2, 8, "#ffffff");
        txt(ctx, "+", tx + 10, y + h / 2, 12, "#5b616b", { align: "center" });
      }
      if (w - (tx - x) > 260) {
        box(ctx, x + w - 250, y + 6, 150, h - 12, (h - 12) / 2, "#ffffff");
        icon(ctx, "search", x + w - 236, y + h / 2, 10, "#2f6df9");
        txt(ctx, "智能客服回复错误如何…", x + w - 226, y + h / 2, 9.5, "#5b616b");
      }
      winCtl(ctx, x + w, y + h / 2, "#3b3f46");
    }
    return out;
  }

  // ---------- 左侧导航栏 ----------
  const RAIL = {
    jd: [["search", "搜索"], ["chat", "接待"], ["user", "官方"], ["user", "联系人"], ["grid", "工具"], ["chart", "数据"], ["doc", "待办"]],
    tm: [["grid", "工作台"], ["chat", "消息"], ["box", "进店"], ["doc", "工单"], ["chat", "离线消息"], ["doc", "打单工具"]],
    pdd: [["chat", ""], ["doc", ""], ["box", ""], ["chart", ""], ["send", ""], ["bell", ""], ["grid", ""], ["star", ""]],
    dy: [["chat", "会话"], ["user", "智能客服"], ["doc", "留言"], ["doc", "服务工单"], ["clock", ""], ["gear", ""]],
    wx: [["chat", ""], ["user", ""], ["box", ""], ["folder", ""], ["star", ""]],
  };
  const RAIL_ON = { jd: 1, tm: 1, pdd: 0, dy: 0, wx: 0 };
  function rail(ctx, key, x, y, w, h, o) {
    const sk = SKINS[key];
    box(ctx, x, y, w, h, 0, sk.railBg);
    const out = [];
    let iy = y + 10;
    if (key === "tm") {
      // 千牛：顶上是店铺头像，一家一个（多店铺同时在线）
      (o.shops || [{}]).forEach((s, i) => {
        const on = i === (o.active ?? 0);
        box(ctx, x + w / 2 - 12, iy, 24, 24, 5, "#ffffff", on ? "#ffd666" : null, 2);
        blur(ctx, x + w / 2 - 8, iy + 12, 16, 5);
        if (s.done) dot(ctx, x + w / 2 + 11, iy + 2, 3.5, "#22c55e");
        out.push({ x: x + w / 2 - 12, y: iy, w: 24, h: 24 });
        iy += 30;
      });
      iy += 10;
    } else if (key === "dy") {
      dot(ctx, x + w / 2, iy + 13, 13, "#2e8b57");
      blur(ctx, x + w / 2 - 8, iy + 13, 16, 6);
      iy += 36;
    } else if (key === "wx") {
      face(ctx, x + w / 2 - 12, iy, 24, { shape: "square", bg: "#8a9bb0" });
      iy += 38;
    }
    const items = RAIL[key];
    const step = key === "pdd" ? 30 : key === "wx" ? 32 : 40;
    items.forEach(([kind, label], i) => {
      if (iy + step > y + h - 6) return;
      const on = i === RAIL_ON[key];
      if (on && key !== "wx") box(ctx, x + 3, iy - 2, w - 6, step - 2, 6, sk.railOn);
      const cy = label ? iy + 11 : iy + step / 2 - 1;
      const col = on ? sk.railOnFg : sk.railFg;
      if (key === "jd" && kind === "search") {
        box(ctx, x + 4, iy + 3, w - 8, 18, 9, "#ffffff", "#d5d8de");
        txt(ctx, "搜索", x + w / 2, iy + 12, 8.5, "#4b5563", { align: "center" });
      } else {
        icon(ctx, kind, x + w / 2, cy, label ? 12 : 13, col, on ? 1.6 : 1.2);
        if (label) txt(ctx, label, x + w / 2, iy + 28, 8, col, { align: "center", weight: on ? 600 : 400 });
      }
      if (key === "tm" && kind === "chat" && i === 1) {
        box(ctx, x + w / 2 + 2, iy - 2, 18, 10, 5, "#ff3b30");
        txt(ctx, "99+", x + w / 2 + 11, iy + 3, 7, "#fff", { align: "center", weight: 700 });
      }
      iy += step;
    });
    return out;
  }

  // ---------- 会话列表 ----------
  function convList(ctx, key, x, y, w, h, o) {
    const sk = SKINS[key];
    const bg = key === "wx" ? "#e9e9e9" : "#ffffff";
    box(ctx, x, y, w, h, 0, bg);
    vline(ctx, x + w - 1, y, h, sk.line);
    let ly = y + 8;
    const row = (sel, n) => {
      if (sel) box(ctx, x, ly, w - 1, 44, 0, key === "wx" ? "#c9c9c9" : key === "tm" ? "#e3e6eb" : "#e8eaee");
      face(ctx, x + 10, ly + 7, 30, { shape: sk.avatar, bg: ["#b9c3cf", "#c9b8a8", "#a9b8a3", "#cbb3c6"][n % 4] });
      blur(ctx, x + 48, ly + 16, 50 + (n % 3) * 12);
      txt(ctx, ["10-22", "10-19", "10-16", "10-13"][n % 4], x + w - 8, ly + 15, 8.5, "#9aa0a8", { align: "right" });
      blur(ctx, x + 48, ly + 31, 70 - (n % 2) * 16, 6);
      ly += 46;
    };
    if (key === "jd") {
      [["今日接待量", "0"], ["平均响应", "0.00"]].forEach(([a, b], i) => {
        txt(ctx, a, x + 10 + i * 72, ly + 4, 8.5, "#5b616b");
        txt(ctx, b, x + 10 + i * 72, ly + 18, 10, "#1f2329");
      });
      ly += 30;
      hline(ctx, x, ly, w, sk.line);
      ly += 6;
      ["最近标记 [36]", "咨询未下单 [0]", "下单待付款 [0]"].forEach((s) => {
        txt(ctx, `›  ${s}`, x + 10, ly + 8, 10, "#1f2329");
        ly += 22;
      });
      txt(ctx, "⌄  最近联系人 [135]", x + 10, ly + 8, 10, "#1f2329");
      ly += 22;
    } else if (key === "tm") {
      box(ctx, x, ly - 8, w - 1, 44, 0, "#fff4ec");
      txt(ctx, "您当前账号未参与客服接待分流，", x + 8, ly + 4, 8.5, "#f2701e");
      txt(ctx, "无法接收到消费者消息 去设置", x + 8, ly + 18, 8.5, "#f2701e");
      ly += 42;
      box(ctx, x + 8, ly, w - 17, 20, 10, "#f5f6f7");
      icon(ctx, "search", x + 18, ly + 10, 8, "#9aa0a8");
      txt(ctx, "联系人、订单号、聊天记录", x + 26, ly + 10, 8.5, "#9aa0a8");
      ly += 28;
      ["正在接待", "全部买家", "其他消息", "联系人"].forEach((s, i) => {
        const cx = x + 8 + (i + 0.5) * ((w - 16) / 4);
        icon(ctx, i === 3 ? "user" : "chat", cx, ly + 8, 10, i ? "#6b7280" : "#3d7fff");
        txt(ctx, s, cx, ly + 22, 8, i ? "#6b7280" : "#3d7fff", { align: "center" });
      });
      ly += 34;
      txt(ctx, "正在接待 1", x + 10, ly + 8, 10, "#1f2329", { weight: 700 });
      ly += 20;
      txt(ctx, "▾ 最近跟单", x + 10, ly + 8, 9.5, "#1f2329");
      ly += 20;
    } else if (key === "pdd") {
      box(ctx, x + 8, ly, w - 40, 22, 3, "#ffffff", "#d5d8de");
      icon(ctx, "search", x + 18, ly + 11, 9, "#9aa0a8");
      txt(ctx, "查询消费者或聊天记录", x + 27, ly + 11, 8.5, "#9aa0a8");
      box(ctx, x + w - 28, ly, 20, 22, 3, "#ffffff", "#3d6cf0");
      icon(ctx, "plus", x + w - 18, ly + 11, 10, "#3d6cf0");
      ly += 30;
      const seg = (w - 16) / 3;
      ["今日接待", "全部会话", "待办"].forEach((s, i) => {
        box(ctx, x + 8 + i * seg, ly, seg, 22, 0, "#ffffff", i === 1 ? "#3d6cf0" : "#d5d8de");
        txt(ctx, s, x + 8 + (i + 0.5) * seg, ly + 11, 9, i === 1 ? "#3d6cf0" : "#1f2329", { align: "center" });
      });
      ly += 30;
      ["▾ 收藏会话 · 1", "▸ 咨询未下单 · 0", "▸ 咨询下单未付款 · 0", "▾ 全部会话 · 2"].forEach((s) => {
        txt(ctx, s, x + 10, ly + 8, 9.5, "#1f2329");
        ly += 20;
      });
    } else if (key === "dy") {
      box(ctx, x + 8, ly, w - 16, 26, 4, "#f5f6fa");
      txt(ctx, "您今日暂无接待数据", x + 16, ly + 13, 8.5, "#6b7280");
      ly += 32;
      box(ctx, x + 8, ly, w - 16, 20, 3, "#ffffff", "#d5d8de");
      icon(ctx, "search", x + 17, ly + 10, 8, "#9aa0a8");
      txt(ctx, "用户昵称/订单号/会话记录", x + 25, ly + 10, 8.5, "#9aa0a8");
      ly += 28;
      ["当前会话", "最近联系", "平台消息"].forEach((s, i) => {
        txt(ctx, s, x + 10 + i * 46, ly + 8, 9.5, i ? "#1f2329" : "#2f6df9", { weight: i ? 400 : 600 });
      });
      box(ctx, x + 10, ly + 17, 38, 2, 1, "#2f6df9");
      ly += 26;
    } else if (key === "wx") {
      box(ctx, x + 8, ly + 2, w - 40, 20, 3, "#dcdcdc");
      icon(ctx, "search", x + 17, ly + 12, 8, "#7a7a7a");
      txt(ctx, "搜索", x + 26, ly + 12, 9, "#7a7a7a");
      box(ctx, x + w - 28, ly + 2, 20, 20, 3, "#dcdcdc");
      icon(ctx, "plus", x + w - 18, ly + 12, 9, "#555");
      ly += 30;
    }
    for (let n = 0; ly + 44 < y + h; n++) row(n === 0, n);
  }

  // ---------- 聊天头：顾客昵称（打码）＋各家自己的小标签 ----------
  function chatHead(ctx, key, x, y, w, h, o) {
    const sk = SKINS[key];
    box(ctx, x, y, w, h, 0, sk.headBg);
    hline(ctx, x, y + h - 1, w, sk.line);
    const cy = y + h / 2;
    const name = o.customer || "";
    if (key === "wx") {
      txt(ctx, name, x + 16, cy, 12.5, "#1a1a1a", { weight: 500 });
      icon(ctx, "more", x + w - 20, cy, 14, "#333");
      return;
    }
    face(ctx, x + 10, cy - 12, 24, { bg: key === "dy" ? "#7b5cf0" : key === "pdd" ? "#a58f86" : "#b9c3cf" });
    const nx = x + 42;
    const nw = txt(ctx, name, nx, key === "dy" ? cy - 6 : cy, 12, "#1f2329", { weight: 600 });
    if (key === "pdd") {
      box(ctx, nx + nw + 6, cy - 7, 14, 14, 2, "#ff5c8a");
      txt(ctx, "女", nx + nw + 13, cy, 8.5, "#fff", { align: "center" });
      box(ctx, nx + nw + 24, cy - 7, 54, 14, 2, "#3d6cf0");
      txt(ctx, "下单数(1)", nx + nw + 51, cy, 8.5, "#fff", { align: "center" });
      icon(ctx, "star", x + w - 18, cy, 12, "#3d6cf0");
      icon(ctx, "send", x + w - 42, cy, 11, "#3d6cf0");
    } else if (key === "dy") {
      txt(ctx, "添加备注", nx + nw + 8, cy - 6, 9, "#6b7280");
      box(ctx, nx, cy + 4, 76, 13, 2, "#ff7a2f");
      txt(ctx, "V1普通会员VIP1", nx + 38, cy + 10.5, 8, "#fff", { align: "center" });
      box(ctx, nx + 80, cy + 4, 62, 13, 2, "#ffffff", "#c9ccd2");
      txt(ctx, "头条-订单详情页", nx + 111, cy + 10.5, 7.5, "#5b616b", { align: "center" });
      icon(ctx, "star", x + w - 18, cy, 12, "#4b5563");
      icon(ctx, "doc", x + w - 42, cy, 12, "#4b5563");
    } else if (key === "jd" && w > 300) {
      blur(ctx, x + w - 96, cy - 6, 48, 7);
      txt(ctx, "旗舰店", x + w - 44, cy - 6, 9, "#1f2329");
      icon(ctx, "phone", nx + nw + 14, cy, 10, "#6b7280");
      icon(ctx, "chat", nx + nw + 32, cy, 10, "#6b7280");
    } else if (key === "tm" && w > 260) {
      icon(ctx, "send", x + w - 64, cy, 12, "#4b5563");
      icon(ctx, "refresh", x + w - 40, cy, 12, "#4b5563");
      icon(ctx, "more", x + w - 16, cy, 12, "#4b5563");
    }
  }

  // ---------- 输入区：工具栏 + 输入框 + 发送键 ----------
  const TOOLS = {
    jd: ["smile", "image", "box", "folder", "scissors", "doc", "chart", "gear"],
    tm: ["smile", "scissors", "send", "doc", "box", "star", "doc", "smile", "more"],
    pdd: ["smile", "scissors", "send", "image", "box", "doc", "star", "folder"],
    dy: ["smile", "image", "doc", "folder", "box", "scissors"],
    wx: ["smile", "folder", "scissors", "chat"],
  };
  function inputArea(ctx, key, x, y, w, h, o) {
    const sk = SKINS[key];
    const bg = key === "wx" ? "#f5f5f5" : "#ffffff";
    box(ctx, x, y, w, h, 0, bg);
    hline(ctx, x, y, w, key === "tm" ? "#e4e7ec" : sk.line);
    TOOLS[key].forEach((k, i) => {
      // 输入区很矮时发送键和工具栏在同一行，工具栏让出右边
      const limit = h < 60 ? w - 100 : w >= 260 && key !== "tm" && key !== "wx" ? w - (key === "pdd" ? 110 : 60) : w - 20;
      if (16 + i * 22 < limit) icon(ctx, k, x + 16 + i * 22, y + 15, 11, "#5b616b", 1.15);
    });
    if (w < 260) {
      // 窄窗口：右边不放东西
    } else if (key === "pdd") {
      txt(ctx, "小额打款  小额收款", x + w - 12, y + 15, 9, "#3d6cf0", { align: "right" });
    } else if (key === "dy" || key === "jd") {
      icon(ctx, "clock", x + w - 16, y + 15, 11, "#5b616b");
      icon(ctx, "chat", x + w - 38, y + 15, 11, "#5b616b");
    }
    let ty = y + 30;
    if (key === "pdd") {
      // 拼多多：输入框上面一条红框的服务用语提醒，底下一条黄色的隐私号提示
      box(ctx, x + 8, ty, w - 16, 18, 2, "#fff5f5", "#f5a3a3");
      dot(ctx, x + 17, ty + 9, 4.5, "#e02e24");
      txt(ctx, "服务用语须严格遵守：尊重原则、耐心准则、同理心准则  了解更多", x + 25, ty + 9, 8.5, "#e02e24", { maxW: w - 40 });
      ty += 22;
    }
    const empty = !o.typing;
    if (empty && sk.placeholder) txt(ctx, sk.placeholder, x + 14, ty + 10, 10, "#a0a6ae", { maxW: w - 28 });
    // 发送键
    const press = o.press || 0;
    let send;
    const by = y + h - 30 + press * 1.5;
    if (key === "jd") {
      send = { x: x + w - 84, y: by, w: 72, h: 22 };
      box(ctx, send.x, send.y, send.w, send.h, 3, sk.send);
      txt(ctx, "发送", send.x + 26, send.y + 11, 10.5, "#fff", { align: "center" });
      vline(ctx, send.x + 52, send.y + 4, 14, "rgba(255,255,255,.5)");
      txt(ctx, "▾", send.x + 62, send.y + 11, 9, "#fff", { align: "center" });
    } else if (key === "tm") {
      send = { x: x + w - 76, y: by, w: 64, h: 22 };
      box(ctx, send.x - 64, by, 56, 22, 11, "#ffffff", "#d5d8de");
      txt(ctx, "关闭", send.x - 36, by + 11, 10, "#1f2329", { align: "center" });
      box(ctx, send.x, send.y, send.w, send.h, 11, sk.send);
      txt(ctx, "发送", send.x + 24, send.y + 11, 10, "#fff", { align: "center" });
      vline(ctx, send.x + 44, send.y + 5, 12, "rgba(255,255,255,.55)");
      txt(ctx, "▾", send.x + 53, send.y + 11, 8.5, "#fff", { align: "center" });
    } else if (key === "pdd") {
      box(ctx, x + 8, y + h - 32, w - 92, 26, 2, "#fff3c2", "#f5c860");
      txt(ctx, "/隐私号沟通中，严禁与消费者交换手机号、座机号", x + 14, y + h - 19, 8.5, "#7a5b00", { maxW: w - 108 });
      send = { x: x + w - 76, y: by - 1, w: 64, h: 24 };
      box(ctx, send.x, send.y, send.w, send.h, 2, "#ffffff", sk.sendLine);
      txt(ctx, "发送", send.x + 25, send.y + 12, 10, "#1f2329", { align: "center" });
      vline(ctx, send.x + 46, send.y + 5, 14, "#d5d8de");
      txt(ctx, "▾", send.x + 55, send.y + 12, 8, "#5b616b", { align: "center" });
    } else if (key === "dy") {
      send = { x: x + w - 82, y: by - 2, w: 70, h: 26 };
      txt(ctx, "0/800", send.x - 10, send.y + 13, 9, "#9aa0a8", { align: "right" });
      box(ctx, send.x, send.y, send.w, send.h, 4, sk.send);
      txt(ctx, "发 送", send.x + send.w / 2, send.y + 13, 10.5, "#fff", { align: "center", weight: 600 });
    } else {
      send = { x: x + w - 82, y: by - 2, w: 70, h: 26 };
      box(ctx, send.x, send.y, send.w, send.h, 3, "#e9e9e9");
      txt(ctx, "发送(S)", send.x + send.w / 2, send.y + 13, 10, o.typing ? "#07c160" : "#a8a8a8", { align: "center" });
    }
    if (o.sendGlow > 0) box(ctx, send.x - 2, send.y - 2, send.w + 4, send.h + 4, 6, null, `rgba(255,107,44,${o.sendGlow})`, 2.5);
    return { send, text: { x: x + 14, y: ty } };
  }

  // ---------- 右侧面板：各家自己的页签；side === "quick" 时切到平台自带的快捷短语 ----------
  function sidePanel(ctx, key, x, y, w, h, o) {
    const sk = SKINS[key];
    box(ctx, x, y, w, h, 0, key === "tm" ? "#f5f6f7" : "#ffffff");
    vline(ctx, x, y, h, sk.line);
    const tabs = sk.sideTabs;
    let ty = y + 8;
    const quick = o.side === "quick";
    const compact = quick && o.compact; // 矮窗口：只留页签，不画搜索框和个人/团队
    if (key === "tm" && !compact) {
      box(ctx, x + 6, ty - 2, 74, 20, 0, "#3d7fff");
      txt(ctx, "客服 ✦", x + 14, ty + 8, 10, "#fff");
      ty += 26;
      box(ctx, x + 6, ty, w - 12, 20, 3, "#eaf1ff");
      dot(ctx, x + 15, ty + 10, 4.5, "#3d7fff");
      txt(ctx, "智能客服全新升级，助力商家高效接待！", x + 24, ty + 10, 8.5, "#3b4250", { maxW: w - 34 });
      ty += 28;
    }
    let bodyY;
    if (key === "tm" && quick) {
      txt(ctx, sk.quickTitle, x + 12, ty + 8, 12, "#1f2329", { weight: 700 });
      box(ctx, x + 12, ty + 18, 48, 2, 1, sk.accent);
      ty += 28;
    } else if (key !== "tm") {
      let tx = x + 12;
      // 京东的快捷短语是单独一栏「搜索短语」，页签是 个人 / 团队 / 卡片
      (compact && key === "jd" ? sk.quickTabs : tabs).forEach((t, i) => {
        const on = compact && key === "jd" ? i === 0 : quick ? t === sk.quickTitle : t === tabs[0];
        const tw0 = txt(ctx, t, tx, ty + 8, 10.5, on ? sk.accent : "#1f2329", { weight: on ? 600 : 400 });
        if (on) box(ctx, tx, ty + 18, tw0, 2, 1, sk.accent);
        tx += tw0 + 14;
      });
      ty += 26;
      hline(ctx, x, ty, w, sk.line);
      ty += 6;
    } else {
      ["足迹", "推荐", "知识库"].forEach((t, i) => {
        const tw0 = txt(ctx, t, x + 12 + i * 46, ty + 8, 11, i ? "#6b7280" : "#1f2329", { weight: i ? 400 : 700 });
        if (!i) box(ctx, x + 12, ty + 18, tw0, 2, 1, "#1f2329");
      });
      ty += 28;
    }
    if (compact) {
      bodyY = ty;
    } else if (quick) {
      // 平台自带的快捷短语：搜索框 + 个人/团队页签 + 一条条短语（调用方在 side 里画短语）
      box(ctx, x + 10, ty, w - 20, 20, 3, "#ffffff", "#d5d8de");
      icon(ctx, "search", x + 20, ty + 10, 8, "#9aa0a8");
      txt(ctx, key === "jd" ? sk.quickTitle : "搜索短语", x + 28, ty + 10, 8.5, "#9aa0a8");
      ty += 26;
      sk.quickTabs.forEach((t, i) => {
        txt(ctx, t, x + 12 + i * 48, ty + 8, 10, i ? "#1f2329" : sk.accent, { weight: i ? 400 : 600 });
        if (!i) box(ctx, x + 12, ty + 17, tw(ctx, t, 10, 600), 2, 1, sk.accent);
      });
      ty += 24;
      bodyY = ty;
    } else {
      // 订单 / 顾客信息：一律打码
      bodyY = ty;
      for (let k = 0; ty + 30 < y + h; k++) {
        if (k % 3 === 0) {
          box(ctx, x + 10, ty, w - 20, 54, 4, key === "tm" ? "#ffffff" : "#f7f8fa");
          box(ctx, x + 18, ty + 8, 38, 38, 3, "#e6e9ee");
          blur(ctx, x + 64, ty + 16, w - 110);
          blur(ctx, x + 64, ty + 32, w - 140, 6);
          txt(ctx, "¥15.00", x + w - 18, ty + 44, 10, "#f33b50", { align: "right", weight: 700 });
          ty += 62;
        } else {
          txt(ctx, ["收货信息", "实付金额", "物流"][k % 3], x + 12, ty + 8, 9, "#6b7280");
          blur(ctx, x + 64, ty + 8, w - 100, 7);
          ty += 20;
        }
      }
    }
    return { x: x + 8, y: bodyY, w: w - 16, h: y + h - bodyY - 6 };
  }

  // ---------- 横幅：千牛的「辅助接待」、京东的「挂起」提示、抖店的活动横幅 ----------
  function notice(ctx, key, x, y, w, h) {
    if (key === "jd") {
      box(ctx, x, y, w, h, 0, "#fff6ec");
      dot(ctx, x + 14, y + h / 2, 5.5, "#f2701e");
      txt(ctx, "!", x + 14, y + h / 2 + 0.5, 8, "#fff", { align: "center", weight: 700 });
      const a = txt(ctx, "挂起时无新顾客进线，可继续接待当前顾客", x + 26, y + h / 2, 9.5, "#1f2329");
      txt(ctx, "详细规则", x + 32 + a, y + h / 2, 9.5, "#3d6cf0");
    } else if (key === "dy") {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, "#ffe6cc");
      g.addColorStop(0.5, "#fff3e3");
      g.addColorStop(1, "#ffe9d6");
      box(ctx, x, y, w, h, 0, g);
      dot(ctx, x + 40, y + h / 2, h * 0.32, "#f6b13d");
      txt(ctx, "客服优秀商家&训练师评选结果公示", x + 66, y + h / 2, 12, "#3b2a1a", { weight: 800 });
      box(ctx, x + w - 150, y + h / 2 - 10, 92, 20, 10, "#ff7a2f");
      txt(ctx, "查看获奖名单", x + w - 104, y + h / 2, 9, "#fff", { align: "center", weight: 700 });
    }
  }

  // 千牛 / 拼多多：会话列表与聊天栏上面横贯一条客服状态栏（头像、在线状态、今日数据）
  function agentBar(ctx, key, x, y, w, h) {
    box(ctx, x, y, w, h, 0, "#ffffff");
    hline(ctx, x, y + h - 1, w, SKINS[key].line);
    const cy = y + h / 2;
    if (key === "tm") {
      dot(ctx, x + 20, cy - 8, 8, "#f5a623");
      txt(ctx, "小黛", x + 32, cy - 8, 13, "#1f2329", { weight: 700 });
      dot(ctx, x + 18, cy + 11, 3.5, "#e02e24");
      txt(ctx, "挂起 ▾   ◐ 辅助中 ▾   ▯ 离线", x + 25, cy + 11, 9, "#1f2329");
      ["今日接待", "未下单", "未付款", "已付款"].forEach((s, i) => {
        const sx = x + 220 + i * 70;
        if (sx + 50 > x + w) return;
        txt(ctx, "-", sx + 18, cy - 8, 12, "#1f2329", { align: "center", weight: 700 });
        txt(ctx, s, sx + 18, cy + 11, 9, "#9aa0a8", { align: "center" });
      });
      icon(ctx, "send", x + w - 110, cy - 6, 12, "#4b5563");
      winCtl(ctx, x + w, cy - 6, "#3b3f46");
    } else if (key === "pdd") {
      box(ctx, x + 12, cy - 15, 30, 30, 3, "#18a058");
      txt(ctx, "小黛", x + 50, cy - 7, 13, "#1f2329", { weight: 700 });
      box(ctx, x + 50, cy + 5, 40, 13, 2, "#e02e24");
      txt(ctx, "忙碌 ▾", x + 70, cy + 11.5, 8, "#fff", { align: "center" });
      blur(ctx, x + 96, cy + 11, 50, 6);
      [["3分钟人工回复率", "-- %"], ["今日咨询人数", "0 人"], ["今日客服成团金额", "0.00 元"]].forEach(([a, b], i) => {
        const sx = x + 220 + i * 110;
        if (sx + 80 > x + w) return;
        txt(ctx, a, sx, cy - 7, 9, "#5b616b");
        txt(ctx, b, sx, cy + 9, 12, "#1f2329", { weight: 700 });
      });
    }
  }

  // 话术精灵的吸附搜索栏：贴在平台窗口底边，和窗口一样宽（客户端 attached_search_bar）
  function attachedBar(ctx, x, y, w, h, o) {
    box(ctx, x, y, w, h, 0, "#ffffff");
    ctx.fillStyle = "#f0a46a";
    ctx.fillRect(x, y, w, 1.4);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    txt(ctx, o.barText || "输入关键词搜索", x + 12, y + h / 2, 10, o.barText ? "#1f2329" : "#9aa0a8");
    vline(ctx, x + w - 64, y + 4, h - 8, "#e6e0d8");
    txt(ctx, "全部", x + w - 54, y + h / 2, 9.5, "#1f2329");
    box(ctx, x + w - 24, y + h / 2 - 8, 16, 16, 8, "#ffffff", "#d6cabb");
    txt(ctx, "›", x + w - 16, y + h / 2, 10, "#5b616b", { align: "center" });
  }

  // ---------- 主入口 ----------
  // o：customer 顾客昵称；shops [{done}] 与 active 第几家店；list / side（"order" | "quick" | null）是否画会话列表、右侧面板；
  //    listW / sideW 宽度；inputH 输入区高度；typing 输入框里有没有字（控制占位提示）；press 发送键按下 0–1；sendGlow 发送键描边；
  //    bar 底下画不画话术精灵吸附栏（barH 高度）；notice 画不画横幅；frame 窗口外框颜色
  // 聊天栏四周的外壳有多宽多高（调用方据此把聊天栏摆进一块给定大小的窗口里）
  function dims(key, o = {}) {
    const sk = SKINS[key];
    const railW = o.rail === false ? 0 : sk.rail;
    const listW = o.list === false ? 0 : o.listW ?? sk.list;
    const sideW = o.side ? o.sideW ?? 220 : 0;
    const topH = o.top === false ? 0 : sk.top;
    const noticeH = o.notice !== false && (key === "jd" || key === "dy") ? (key === "dy" ? 34 : 24) : 0;
    const agentH = o.top !== false && o.agent !== false && (key === "tm" || key === "pdd") ? 46 : 0;
    return { railW, listW, sideW, topH, noticeH, agentH, left: railW + listW, top: topH + noticeH + agentH, barH: o.bar ? o.barH ?? 24 : 0 };
  }
  function draw(ctx, key, chat, o = {}) {
    const sk = SKINS[key];
    const { railW, listW, sideW, topH, noticeH, agentH } = dims(key, o);
    const barH = o.bar ? o.barH ?? 24 : 0;
    const left = chat.x - listW - railW;
    const top = chat.y - topH - noticeH - agentH;
    const win = { x: left, y: top, w: railW + listW + chat.w + sideW, h: chat.y + chat.h - top };
    ctx.save();
    // 外框阴影 + 底色
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    box(ctx, win.x, win.y, win.w, win.h + barH, 4, "#ffffff");
    ctx.restore();
    ctx.save();
    rr(ctx, win.x, win.y, win.w, win.h + barH, 4);
    ctx.clip();
    const out = { win, shops: [] };
    if (topH) out.shops = topTabs(ctx, key, win.x, win.y, win.w, topH, o);
    // 京东、抖店：导航栏在顶栏下面通到底；千牛、拼多多、微信：导航栏从窗口顶上通到底
    const railTop = key === "tm" || key === "wx" ? win.y : win.y + topH;
    if (railW) {
      const r = rail(ctx, key, win.x, railTop, railW, win.y + win.h - railTop, o);
      if (r.length) out.shops = r;
    }
    const innerX = win.x + railW;
    const innerW = win.w - railW;
    let y = win.y + topH;
    if (noticeH) notice(ctx, key, innerX, y, innerW, noticeH);
    y += noticeH;
    if (agentH) agentBar(ctx, key, innerX, y, innerW, agentH);
    y += agentH;
    if (listW) convList(ctx, key, innerX, y, listW, win.y + win.h - y, o);
    // 聊天栏
    box(ctx, chat.x, chat.y, chat.w, chat.h, 0, sk.msgBg);
    const headH = o.headH ?? 40;
    chatHead(ctx, key, chat.x, chat.y, chat.w, headH, o);
    out.head = { x: chat.x, y: chat.y, w: chat.w, h: headH };
    let msgTop = chat.y + headH;
    if (key === "pdd" && o.pddAlert !== false) {
      box(ctx, chat.x, msgTop, chat.w, 30, 0, "#fff1f0");
      dot(ctx, chat.x + 12, msgTop + 10, 4.5, "#e02e24");
      txt(ctx, "商家在售后服务过程中，必须履行争议澄清义务、纠纷主导义务、", chat.x + 20, msgTop + 10, 8.5, "#3b2a2a", { maxW: chat.w - 30 });
      txt(ctx, "最终解决义务，若未履行义务，商家将承担消费者损失。", chat.x + 20, msgTop + 22, 8.5, "#3b2a2a", { maxW: chat.w - 30 });
      msgTop += 30;
    }
    const inputH = o.inputH ?? 110;
    const iy = chat.y + chat.h - inputH;
    out.msgs = { x: chat.x, y: msgTop, w: chat.w, h: iy - msgTop };
    const ia = inputArea(ctx, key, chat.x, iy, chat.w, inputH, o);
    out.input = { x: chat.x, y: iy, w: chat.w, h: inputH };
    out.send = ia.send;
    out.text = ia.text;
    if (sideW) out.side = sidePanel(ctx, key, chat.x + chat.w, win.y + topH + noticeH + (key === "tm" ? agentH : agentH), sideW, win.y + win.h - (win.y + topH + noticeH + agentH), o);
    vline(ctx, chat.x, chat.y, chat.h, sk.line);
    if (barH) {
      out.bar = { x: win.x, y: win.y + win.h, w: win.w, h: barH };
      attachedBar(ctx, win.x, win.y + win.h, win.w, barH, o);
    }
    ctx.restore();
    box(ctx, win.x, win.y, win.w, win.h + barH, 4, null, o.frame || "rgba(0,0,0,0.25)", 1);
    return out;
  }

  // 消息旁的小字：已读（四家商家工作台都有）
  function readMark(ctx, x, y, size = 9) {
    txt(ctx, "已读", x, y, size, "#a0a6ae", { align: "right" });
  }

  const api = { SKINS, draw, dims, face, icon, blur, readMark, KEYS: ["jd", "tm", "pdd", "dy", "wx"] };
  (typeof globalThis !== "undefined" ? globalThis : window).PlatformChat = api;
})();
