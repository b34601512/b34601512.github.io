// pricing.html 的页面专属内容。公共结构由 layout 生成，公共信息由 site-data 提供。
import { breadcrumb, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("pricing.html");
const title = "客服话术软件多少钱_话术软件价格 - 话术精灵";
const share =
  "本地使用永久免费；云端按「工号」付费：1 年 48 元、2 年 78 元、3 年 98 元、100 年 168 元，含云同步、工号协作与云附件，注册团队账号赠送 1 个月会员。";

const plans = [
  { term: "1 年", years: 1, price: "48" },
  { term: "2 年", years: 2, price: "78" },
  { term: "3 年", years: 3, price: "98" },
  { term: "100 年", years: 100, price: "168", pick: true },
];

// 小字只放算得出来的事实：折合每月多少钱，由价格和年限现算，改价时不会对不上。
function monthlyNote(plan) {
  const text = String(Number((Number(plan.price) / (plan.years * 12)).toFixed(2)));
  return plan.years >= 100 ? `一次开通不再续费，折合每月约 ${text} 元。` : `折合每月约 ${text} 元。`;
}

const cloud = [
  { name: "云同步", text: "团队话术与个人话术在多台电脑之间同步，一处修改，其他电脑自动更新。" },
  { name: "工号协作", text: "一个账号就是一个团队：可创建多个工号，分超级管理员和只读工号，团队话术与个人话术两栏权限分开设置。" },
  { name: "云附件", text: "一条话术最多 10 段文字、9 张图片、9 个附件（PDF、表格等），按顺序排好；附件存云端，多台电脑都能下载（含共享空间与下载流量）。" },
];

export const pricingPage = {
  outputFile: "pricing.html",
  navLabel: "定价",
  head: seoHead({
    title,
    description: share,
    url,
    jsonLd: [
      breadcrumb("定价", url),
      {
        "@type": "SoftwareApplication",
        name: siteData.siteName,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "客服话术软件",
        operatingSystem: "Windows",
        inLanguage: "zh-CN",
        url: siteData.siteUrl,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "CNY",
          lowPrice: plans[0].price,
          highPrice: plans.at(-1).price,
          offerCount: String(plans.length),
        },
      },
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">定价</p>
    <h1>本地永久免费<br />云端按工号付费</h1>
    <p class="lead">本地知识库可以长期免费用。需要云同步、工号协作和云附件时，按「工号」购买；注册团队账号赠送 1 个月会员，之后可用礼品卡充值。</p>
    <div class="actions">
      <a class="btn btn--primary" href="${siteData.downloadUrl}" target="_blank" rel="noopener">下载体验</a>
      <a class="btn btn--ghost" href="contact.html">咨询购买</a>
    </div>
  </section>

  <section class="section">
    <h2>云端协作价格</h2>
    <div class="plans">
      ${plans
        .map(
          (plan) => `<article class="plan${plan.pick ? " plan--pick" : ""}">
        <div class="plan-head">
          <h3 class="plan-term">${plan.term}</h3>
          ${plan.pick ? '<span class="plan-flag">推荐</span>' : ""}
        </div>
        <p class="plan-price">${plan.price}<span> 元 / 工号</span></p>
        <p class="plan-note">${monthlyNote(plan)}</p>
      </article>`,
        )
        .join("\n      ")}
    </div>
    <p class="note">收费单位是「工号」，有效期内可使用云同步、工号协作与云附件。为什么需要单独一个话术管理软件，可以看 <a class="text-link" href="why.html">解决什么问题</a>。</p>
  </section>

  <section class="section">
    <h2>云端包含</h2>
    <div class="grid-3">
      ${cloud
        .map(
          (item) => `<article class="feature">
        <h3>${item.name}</h3>
        <p>${item.text}</p>
      </article>`,
        )
        .join("\n      ")}
    </div>
  </section>
</div>`,
};
