// 联系页：点击整行复制微信或邮箱。非安全上下文（http、file）下剪贴板不可用，只提示手动选中。
(() => {
  const toast = (message) => {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };

  document.querySelectorAll(".copy-row").forEach((row) => {
    row.addEventListener("click", async () => {
      const value = row.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        toast("已复制 " + value);
      } catch {
        toast("复制失败，请手动选中");
      }
    });
  });
})();
