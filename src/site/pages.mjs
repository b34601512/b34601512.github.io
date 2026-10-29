// 全站页面清单：顺序就是导航顺序与 sitemap 优先级顺序。构建与自检都只从这里取。
import { checkExportPage } from "./pages/check-export.mjs";
import { contactPage } from "./pages/contact.mjs";
import { diffPage } from "./pages/diff.mjs";
import { episodePages } from "./experience.mjs";
import { experiencePage } from "./pages/experience.mjs";
import { guidePage } from "./pages/guide.mjs";
import { indexPage } from "./pages/index.mjs";
import { notFoundPage } from "./pages/not-found.mjs";
import { pricingPage } from "./pages/pricing.mjs";
import { promoPage } from "./pages/promo.mjs";
import { whyPage } from "./pages/why.mjs";

// 「客服经验分享」：列表页排在「怎么用」后面，每一期（episodePages，来自 experience.mjs）排在最后：进 sitemap，不单独进导航。
export const sitePages = [indexPage, promoPage, guidePage, experiencePage, whyPage, diffPage, pricingPage, contactPage, ...episodePages];

// 要生成但不进导航、不进 sitemap 的页面。
export const extraPages = [notFoundPage, checkExportPage];
