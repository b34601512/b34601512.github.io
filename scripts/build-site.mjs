// 该脚本用于从模块化源文件生成 GitHub Pages 可直接托管的静态 HTML。
import { writeFile } from "node:fs/promises";
import { renderPage } from "../src/site/layout.mjs";
import { contactPage } from "../src/site/pages/contact.mjs";
import { indexPage } from "../src/site/pages/index.mjs";
import { pricingPage } from "../src/site/pages/pricing.mjs";

const pages = [indexPage, pricingPage, contactPage];

for (const pageDefinition of pages) {
  console.log(`[${new Date().toISOString()}][scripts/build-site.mjs:9][主线:生成][静态页面][${pageDefinition.outputFile}]`);
  await writeFile(pageDefinition.outputFile, renderPage(pageDefinition), "utf8");
}
