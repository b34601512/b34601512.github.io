// 「客服经验分享」系列的唯一数据源：列表页（pages/experience.mjs）按这个数组渲染，页面清单（pages.mjs）也从这里取每一期的页面。
// 新增一期 = 这里加一条 + 写一个页面模块（参照 pages/freight.mjs），不用改列表页和页面清单。
//   no        期号（数字，显示成「知识分享 01」）
//   title     标题（与该期页面的 H1 一致）
//   summary   列表页的一句话简介
//   duration  片长（秒，按 Chrome 播放器上显示的总长写；tests/experience.test.mjs 对着片子的时间线核对，允许差 1 秒）
//   href      该期页面地址（= page.outputFile）
//   cover     列表页的静帧：片子封面那一帧导出的图（scripts/build-episode-covers.mjs）
//   page      该期的页面模块
import { freightPage } from "./pages/freight.mjs";

import { experienceListing } from "./experience-series.mjs";

export { episodeNo, experienceListing, formatDuration } from "./experience-series.mjs";

export const episodes = [
  {
    no: 1,
    title: "补运费登记案例",
    summary: "顾客要退运费，客服问一句、顾客等一阵才回；一条话术一次问齐，再把顾客的追问一条条补进话术。",
    duration: 227,
    href: freightPage.outputFile,
    cover: "assets/img/experience-01.jpg",
    page: freightPage,
  },
];

// 每一期都是公开页面（进 sitemap、被索引），但不各自占一个导航项：期数会一直加，导航放不下（740px 宽时多一项就挤成竖排）。
// 导航里由「客服经验分享」代表整个系列，打开某一期时它显示为当前项（navUnder，见 layout.mjs）。
export const episodePages = episodes.map((episode) => ({ ...episode.page, navUnder: experienceListing.outputFile }));
