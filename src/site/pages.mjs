// 全站页面清单：顺序就是导航顺序与 sitemap 优先级顺序。构建与自检都只从这里取。
import { blogPage, blogPostPages } from "./pages/blog.mjs";
import { contactPage } from "./pages/contact.mjs";
import { faqPage } from "./pages/faq.mjs";
import { guidePage } from "./pages/guide.mjs";
import { indexPage } from "./pages/index.mjs";
import { notFoundPage } from "./pages/not-found.mjs";
import { pricingPage } from "./pages/pricing.mjs";
import { whyPage } from "./pages/why.mjs";

export const sitePages = [indexPage, guidePage, whyPage, pricingPage, faqPage, blogPage, contactPage];

// 博客文章：由 content/blog/ 生成，进 sitemap，不进导航。
export const blogPages = blogPostPages;

// 要生成但不进导航、不进 sitemap 的页面。
export const extraPages = [notFoundPage];

// 构建与自检遍历的全部页面；sitemap 由 sitemapPages 生成、也按它核对。
export const allPages = [...sitePages, ...blogPages, ...extraPages];
export const sitemapPages = [...sitePages, ...blogPages];
