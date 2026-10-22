// 博客：列表页 blog/index.html 与每篇文章 blog/<slug>/index.html。文章来自 content/blog/（见 ../blog/posts.mjs）。
// 这两层目录下相对路径会失效，所以页面带 root: "/"，layout 给所有站内地址加上根前缀；本文件里的链接也都写根路径。
import { posts } from "../blog/posts.mjs";
import { escapeHtml } from "../blog/markdown.mjs";
import { breadcrumb, ogImageUrl, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const listUrl = pageUrl("blog/index.html");
const listTitle = "话术精灵博客_客服话术库与平台考核实操 - 话术精灵";
const listDescription =
  "话术精灵 SoftTalk 官方博客：话术库怎么建、淘宝客服响应时长怎么考核、品牌同名怎么分辨。每篇都给结论和官方原文对照，都是能直接照着做的操作步骤。";

const postPath = (post) => `/blog/${post.slug}/`;
const postUrl = (post) => pageUrl(`blog/${post.slug}/index.html`);

// 2026-10-18 → 2026 年 10 月 18 日（不补零）。
function chineseDate(date) {
  const [y, m, d] = date.split("-").map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}

const timeTag = (date) => `<time datetime="${date}">${chineseDate(date)}</time>`;

export const blogPage = {
  outputFile: "blog/index.html",
  navHref: "blog/",
  navLabel: "博客",
  root: "/",
  sitemap: { priority: "0.6", changefreq: "weekly" },
  head: seoHead({
    title: listTitle,
    description: listDescription,
    url: listUrl,
    jsonLd: [
      {
        "@type": "Blog",
        name: "话术精灵博客",
        url: listUrl,
        inLanguage: "zh-CN",
        publisher: { "@type": "Organization", name: siteData.siteName },
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: postUrl(post),
          datePublished: post.date,
        })),
      },
      {
        "@type": "ItemList",
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: postUrl(post),
          name: post.title,
        })),
      },
      breadcrumb("博客", listUrl),
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">博客</p>
    <h1>话术精灵博客</h1>
    <p class="lead">客服话术库怎么建、平台考核怎么盯，每篇先给结论，再给能照着做的步骤。规则类文章附官方原文对照。</p>
  </section>

  <section class="section">
    <div class="blog-list">
      ${posts
        .map(
          (post) => `<a class="post-card" href="${postPath(post)}">
        <h2>${escapeHtml(post.title)}</h2>
        <p class="post-meta">${timeTag(post.date)}</p>
        <p>${escapeHtml(post.summary)}</p>
      </a>`,
        )
        .join("\n      ")}
    </div>
  </section>
</div>`,
};

function postNav(newer, older) {
  const links = [
    newer && `<a class="post-nav-prev" href="${postPath(newer)}">← 上一篇：${escapeHtml(newer.title)}</a>`,
    older && `<a class="post-nav-next" href="${postPath(older)}">下一篇：${escapeHtml(older.title)} →</a>`,
  ].filter(Boolean);
  return links.length ? `\n  <nav class="post-nav" aria-label="上一篇与下一篇">\n    ${links.join("\n    ")}\n  </nav>` : "";
}

function postPage(post, index) {
  const url = postUrl(post);
  const title = post.title.includes("话术精灵") ? post.title : `${post.title} - 话术精灵`;
  return {
    outputFile: `blog/${post.slug}/index.html`,
    navLabel: post.title,
    root: "/",
    sitemap: { priority: "0.5", changefreq: "monthly" },
    head: seoHead({
      title: escapeHtml(title),
      description: escapeHtml(post.summary),
      url,
      ogType: "article",
      robots: "index,follow",
      jsonLd: [
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          // 原稿只有一个日期，先让修改日期等于发布日期。
          dateModified: post.date,
          inLanguage: "zh-CN",
          author: { "@type": "Person", name: siteData.authorName },
          publisher: {
            "@type": "Organization",
            name: siteData.siteName,
            logo: { "@type": "ImageObject", url: ogImageUrl },
          },
          image: ogImageUrl,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          url,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "首页", item: siteData.siteUrl },
            { "@type": "ListItem", position: 2, name: "博客", item: listUrl },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        },
      ],
    }),
    main: `<div class="wrap post">
  <nav class="crumbs" aria-label="面包屑">
    <a href="/index.html">首页</a> / <a href="/blog/">博客</a> / <span aria-current="page">${escapeHtml(post.title)}</span>
  </nav>
  <h1>${escapeHtml(post.title)}</h1>
  <p class="post-meta">${timeTag(post.date)}</p>
  <article class="post-body">
${post.bodyHtml}
  </article>${postNav(posts[index - 1], posts[index + 1])}
  <p class="post-back"><a href="/blog/">← 回到博客列表</a></p>
</div>`,
  };
}

export const blogPostPages = posts.map(postPage);
