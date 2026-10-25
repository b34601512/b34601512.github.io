// experience.html：「客服经验分享」系列的列表页，内容全部来自 src/site/experience.mjs 的 episodes（新的一期排在最前）。
import { breadcrumb, seoHead } from "../seo.mjs";
import { episodeNo, episodes, experienceListing, formatDuration } from "../experience.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl(experienceListing.outputFile);
const title = "客服经验分享_客服话术实战案例 - 话术精灵";
const share =
  "分享客服工作中遇到的真实问题，以及我是如何解决这些问题的：每一期一个案例、一段短片，讲清楚问题出在哪、话术怎么写、怎么用话术精灵把回复变快。";

const newestFirst = [...episodes].sort((a, b) => b.no - a.no);

function renderEpisode(episode) {
  return `<li>
        <a class="episode" href="${episode.href}">
          <img class="episode-still" src="${episode.cover}" width="360" height="640" alt="${episode.title}短片封面" loading="lazy" />
          <span class="episode-text">
            <span class="episode-meta"><span class="eyebrow">${episodeNo(episode.no)}</span><span>${formatDuration(episode.duration)}</span></span>
            <span class="episode-title">${episode.title}</span>
            <span class="episode-summary">${episode.summary}</span>
          </span>
        </a>
      </li>`;
}

export const experiencePage = {
  outputFile: experienceListing.outputFile,
  navLabel: experienceListing.name,
  navGroup: "上手",
  head: seoHead({
    title,
    description: share,
    url,
    jsonLd: [
      {
        "@type": "CollectionPage",
        name: title,
        url,
        inLanguage: "zh-CN",
        description: share,
        isPartOf: { "@type": "WebSite", name: siteData.siteName, url: siteData.siteUrl },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: newestFirst.map((episode, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${episodeNo(episode.no)}：${episode.title}`,
            url: pageUrl(episode.href),
          })),
        },
      },
      breadcrumb(experienceListing.name, url),
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">客服经验分享</p>
    <h1>客服经验<span class="hl">分享</span></h1>
    <p class="lead">分享客服工作中遇到的问题，我是如何解决这些问题的。</p>
  </section>

  <section class="section">
    <ol class="episodes">
      ${newestFirst.map(renderEpisode).join("\n      ")}
    </ol>
  </section>
</div>`,
};
