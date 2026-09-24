// 全站页面清单：顺序就是导航顺序与 sitemap 优先级顺序。构建与自检都只从这里取。
import { contactPage } from "./pages/contact.mjs";
import { guidePage } from "./pages/guide.mjs";
import { indexPage } from "./pages/index.mjs";
import { notFoundPage } from "./pages/not-found.mjs";
import { pricingPage } from "./pages/pricing.mjs";
import { whyPage } from "./pages/why.mjs";

export const sitePages = [indexPage, guidePage, whyPage, pricingPage, contactPage];

// 要生成但不进导航、不进 sitemap 的页面。
export const extraPages = [notFoundPage];
