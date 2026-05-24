// 该文件用于维护 contact.html 的页面专属元信息和主体内容，公共结构由 layout 生成。
export const contactPage = {
  outputFile: "contact.html",
  brand: String.raw`<img class="brand-logo" src="assets/logo.png" alt="话术精灵logo" />话术精灵SoftTalk · 联系我们`,
  head: String.raw`<title>联系我们｜话术精灵SoftTalk｜客服话术软件｜客户话术软件</title>
    <meta name="description" content="话术精灵SoftTalk 客服话术软件 / 客户话术软件联系方式页面。咨询使用、账号、续费等问题，可联系作者微信 {{authorWechat}} 或客服微信 {{customerWechat}}。" />
    <meta name="keywords" content="客服话术软件联系方式,客户话术软件联系方式,话术精灵联系方式,SoftTalk 联系我们,作者微信,客服微信,{{authorWechat}},{{customerWechat}}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="{{siteUrl}}contact.html" />
    <link rel="alternate" hreflang="zh-CN" href="{{siteUrl}}contact.html" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:site_name" content="话术精灵SoftTalk" />
    <meta property="og:title" content="联系我们｜话术精灵SoftTalk｜客服话术软件｜客户话术软件" />
    <meta property="og:description" content="客服话术软件 / 客户话术软件联系方式页面。作者微信号：{{authorWechat}}；客服微信号：{{customerWechat}}。" />
    <meta property="og:url" content="{{siteUrl}}contact.html" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="联系我们｜话术精灵SoftTalk｜客服话术软件｜客户话术软件" />
    <meta name="twitter:description" content="客服话术软件 / 客户话术软件联系方式页面。作者微信号：{{authorWechat}}；客服微信号：{{customerWechat}}。" />
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
              "name": "联系我们",
              "item": "{{siteUrl}}contact.html"
            }
          ]
        },
        {
          "@type": "ContactPage",
          "name": "联系我们｜话术精灵SoftTalk",
          "url": "{{siteUrl}}contact.html",
          "description": "话术精灵SoftTalk 联系方式页面。",
          "inLanguage": "zh-CN",
          "isPartOf": {
            "@type": "WebSite",
            "name": "话术精灵SoftTalk",
            "url": "{{siteUrl}}"
          }
        }
      ]
    }
    </script>`,
  main: String.raw`<main class="download-wrap">
        <section class="download-card">
            <p class="hero-eyebrow">官方联系方式</p>
            <h1>联系我们</h1>
            <p>如需咨询使用、账号、续费等问题，请添加以下微信。</p>

            <div class="contact-grid">
                <article class="contact-item contact-item--copy" data-wechat="{{authorWechat}}">
                    <h3>作者微信号</h3>
                    <p class="contact-wechat-id">{{authorWechat}}</p>
                    <span class="contact-copy-hint">点击复制</span>
                </article>
                <article class="contact-item contact-item--copy" data-wechat="{{customerWechat}}">
                    <h3>客服微信号</h3>
                    <p class="contact-wechat-id">{{customerWechat}}</p>
                    <span class="contact-copy-hint">点击复制</span>
                </article>
            </div>
        </section>
    </main>`,
  bodyEnd: String.raw`<script>
(function () {
  function showToast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1a1918;color:#fff;padding:9px 22px;border-radius:999px;font-size:14px;font-weight:600;z-index:9999;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.28);';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2000);
  }

  document.querySelectorAll('.contact-item--copy').forEach(function (card) {
    card.addEventListener('click', function () {
      var id = card.getAttribute('data-wechat');
      navigator.clipboard.writeText(id).then(function () {
        showToast('已复制：' + id);
      });
    });
  });
}());
</script>`,
};
