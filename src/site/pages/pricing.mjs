// 该文件用于维护 pricing.html 的页面专属元信息和主体内容，公共结构由 layout 生成。
export const pricingPage = {
  outputFile: "pricing.html",
  brand: String.raw`<img class="brand-logo" src="assets/logo.png" alt="话术精灵logo" />话术精灵SoftTalk · 官方定价`,
  head: String.raw`<title>定价｜话术精灵SoftTalk｜客服话术软件｜客户话术软件</title>
    <meta name="description" content="话术精灵SoftTalk 客服话术软件 / 客户话术软件定价页面：本地离线知识库永久免费；新用户注册首月可免费体验云同步、团队共享、云端备份等增值功能；收费标准为 1年48元/工号、2年78元/工号、3年98元/工号、100年168元/工号。" />
    <meta name="keywords" content="客服话术软件价格,客户话术软件价格,话术精灵定价,SoftTalk 定价,知识库定价,离线永久免费,云同步收费,团队共享收费,云端备份收费" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="{{siteUrl}}pricing.html" />
    <link rel="alternate" hreflang="zh-CN" href="{{siteUrl}}pricing.html" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:site_name" content="话术精灵SoftTalk" />
    <meta property="og:title" content="定价｜话术精灵SoftTalk｜客服话术软件｜客户话术软件" />
    <meta property="og:description" content="客服话术软件 / 客户话术软件定价页面，离线知识库永久免费，云端协作功能首月可体验。" />
    <meta property="og:url" content="{{siteUrl}}pricing.html" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="定价｜话术精灵SoftTalk｜客服话术软件｜客户话术软件" />
    <meta name="twitter:description" content="客服话术软件 / 客户话术软件定价页面，离线知识库永久免费，云端协作功能首月可体验。" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "首页",
              "item": "{{siteUrl}}"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "定价",
              "item": "{{siteUrl}}pricing.html"
            }
          ]
        },
        {
          "@type": "WebPage",
          "name": "定价｜话术精灵SoftTalk",
          "url": "{{siteUrl}}pricing.html",
          "description": "话术精灵SoftTalk 客服话术软件 / 客户话术软件定价页面。",
          "inLanguage": "zh-CN",
          "isPartOf": {
            "@type": "WebSite",
            "name": "话术精灵SoftTalk",
            "url": "{{siteUrl}}"
          }
        },
        {
          "@type": "SoftwareApplication",
          "name": "话术精灵SoftTalk",
          "applicationCategory": "BusinessApplication",
          "applicationSubCategory": "客服话术软件",
          "operatingSystem": "Windows",
          "url": "{{siteUrl}}",
          "inLanguage": "zh-CN",
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "CNY",
            "lowPrice": "48",
            "highPrice": "168",
            "offerCount": "4"
          }
        }
      ]
    }
    </script>`,
  main: String.raw`<main class="page pricing-page-layout">
        <section class="pricing-showcase">
            <div class="pricing-showcase-copy">
                <p class="hero-eyebrow">客服话术软件定价</p>
                <h1>离线知识库永久免费<br />云端协作首月免费体验</h1>
                <p>本地知识库可长期免费使用；需要「云同步」「团队共享」「云端备份」时，新用户首月可免费体验。</p>
                <p>体验满意后，再按「工号」购买对应时长。</p>
                <div class="hero-tags">
                    <span>单机先用</span>
                    <span>多人协作</span>
                    <span>按工号计费</span>
                    <span>长期版可选</span>
                </div>
                <div class="btn-row">
                    <a class="btn-download" href="{{downloadUrl}}" target="_blank" rel="noopener">立即下载并体验</a>
                    <a class="btn-secondary" href="contact.html">咨询购买与续费</a>
                </div>
            </div>

            <article class="pricing-summary-card">
                <p class="pricing-summary-label">云端协作收费标准</p>
                <h2>48元起 / 工号</h2>
                <p class="pricing-summary-note">按工号购买，对应账号在有效期内可使用云端协作功能。</p>
                <div class="pricing-summary-list">
                    <div class="pricing-summary-item">本地版：永久免费。</div>
                    <div class="pricing-summary-item">云端协作：首月免费体验。</div>
                    <div class="pricing-summary-item">计费方式：按「工号」购买时长。</div>
                    <div class="pricing-summary-item">长期方案：100年 168元 / 工号。</div>
                </div>
            </article>
        </section>

        <section class="section" style="--delay:0.10s;">
            <h2>价格表</h2>
            <div class="pricing-grid pricing-grid--plans" aria-label="云端功能收费标准">
                <article class="pricing-card pricing-card--starter">
                    <span class="pricing-policy-tag">入门版</span>
                    <h3>1年</h3>
                    <p class="pricing-plan-price">48元/工号</p>
                    <p class="pricing-plan-note">适合先试一年，成本低，决策门槛最小。</p>
                </article>
                <article class="pricing-card">
                    <span class="pricing-policy-tag">常规版</span>
                    <h3>2年</h3>
                    <p class="pricing-plan-price">78元/工号</p>
                    <p class="pricing-plan-note">适合已经确认要持续使用的团队，省去频繁续费。</p>
                </article>
                <article class="pricing-card">
                    <span class="pricing-policy-tag">进阶版</span>
                    <h3>3年</h3>
                    <p class="pricing-plan-price">98元/工号</p>
                    <p class="pricing-plan-note">适合稳定团队长期部署，价格更平滑，周期更长。</p>
                </article>
                <article class="pricing-card pricing-card--featured">
                    <span class="pricing-badge">推荐</span>
                    <span class="pricing-policy-tag">长期版</span>
                    <h3>100年</h3>
                    <p class="pricing-plan-price">168元/工号</p>
                    <p class="pricing-plan-note">一次开通，长期稳定使用，最适合不想反复续费的团队。</p>
                </article>
            </div>
            <p class="pricing-footnote">说明：收费单位为「工号」，有效期内可使用云同步、团队共享、云端备份。</p>
        </section>

        <section class="section" style="--delay:0.18s;">
            <h2>云端功能包含什么</h2>
            <div class="pricing-feature-grid">
                <article class="pricing-feature-item">
                    <h3>云同步</h3>
                    <p>支持多端同步知识库内容，避免资料只停留在单台电脑里，适合团队多人协作和持续沉淀。</p>
                </article>
                <article class="pricing-feature-item">
                    <h3>团队共享</h3>
                    <p>让团队成员围绕同一套知识库协作，减少版本分散、口径不一致和重复整理带来的损耗。</p>
                </article>
                <article class="pricing-feature-item">
                    <h3>云端备份</h3>
                    <p>在本地备份之外增加一层云端保护，让团队知识资产更稳妥，设备更换或多人协作时更省心。</p>
                </article>
            </div>
        </section>

        <section class="section" style="--delay:0.26s;">
            <h2>怎么选更合适</h2>
            <div class="pricing-scene-grid">
                <article class="pricing-scene-item">
                    <h3>如果你想先把知识库用起来</h3>
                    <p>先用离线版整理内容，后续需要多人协作时再开通云端功能即可。</p>
                </article>
                <article class="pricing-scene-item">
                    <h3>如果你已经确定长期使用</h3>
                    <p>建议直接选择长期版，续费管理更少，整体更省心。</p>
                </article>
            </div>
        </section>
    </main>`,
  bodyEnd: String.raw``,
};
