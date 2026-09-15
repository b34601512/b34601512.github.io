(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $$ = (s) => [...document.querySelectorAll(s)];
  const box = (el) => el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  await sleep(400);
  const lines = [];
  lines.push(`视口宽 ${vw}，页面 scrollWidth ${document.documentElement.scrollWidth}（溢出 ${document.documentElement.scrollWidth - vw}px）`);
  const wide = $$("body *").filter((n) => box(n).right > vw + 1 && box(n).width > 0 && getComputedStyle(n).position !== "fixed" && !n.closest(".attached-results"));
  lines.push("越界元素：" + (wide.length ? wide.slice(0, 6).map((n) => `${(n.className || n.tagName).toString().slice(0, 24)}→${Math.round(box(n).right)}`).join(" / ") : "无"));
  const chat = box(document.querySelector(".chat")), app = box(document.querySelector(".app")), bar = box(document.querySelector(".attached"));
  lines.push(`聊天窗 ${Math.round(chat.width)} / 面板 ${Math.round(app.width)} / 吸附栏 ${Math.round(bar.width)}，贴底边 ${Math.abs(bar.top - chat.bottom) <= 1}`);
  const pre = document.createElement("pre"); pre.id = "probe"; pre.textContent = lines.join("\n"); document.body.appendChild(pre);
})();
