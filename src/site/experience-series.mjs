// 「客服经验分享」系列的公共部分：列表页地址与名称、期号与片长的写法、每一期顶上的返回链接。
// 单独成文件是为了不和 experience.mjs 循环引用（那边要 import 每一期的页面模块，每一期的页面又要用这里的返回链接）。
export const experienceListing = { outputFile: "experience.html", name: "客服经验分享" };

export function episodeNo(no) {
  return `知识分享 ${String(no).padStart(2, "0")}`;
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

// 每一期页面顶上的「← 客服经验分享」。
export const backToListing = `<a class="crumb" href="${experienceListing.outputFile}">← ${experienceListing.name}</a>`;
