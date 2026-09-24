// guide.html：45 秒手绘动画教程 + 同样五步的文字版。文字步骤也是动画的章节按钮，点哪步就跳到哪段。
import { breadcrumb, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("guide.html");
const title = "话术精灵怎么用_客服话术软件动画教程 - 话术精灵";
const share =
  "45 秒手绘动画教你用话术精灵：团队、个人、离线话术分类，双击贴进聊天输入框，点纸飞机直接发送，Alt+Q 搜索后按 Tab 再按数字发送，吸附搜索栏贴在聊天窗口下面。";

// 顺序与 assets/js/guide-film.js 的 SCENES 第 1–5 段一一对应（data-chapter 就是段号）。
const steps = [
  {
    name: "分好类",
    text: "团队话术、个人话术、离线话术三个页签，每个页签有 0–9 十套话术，套里再分一级、二级分类。",
  },
  {
    name: "双击贴入",
    text: "双击一条话术，它会贴进当前聊天窗口的输入框，只贴不发，改几个字再发也行。",
  },
  {
    name: "纸飞机直发",
    text: "点话术行左侧的纸飞机，话术贴进去并回车，一步发出。",
  },
  {
    name: "搜索 + 数字",
    text: "按 Alt+Q 定位搜索栏，输入关键词后按 Tab，再按数字键 1–9、0 直接发送对应那一条。",
  },
  {
    name: "吸附搜索栏",
    text: "搜索栏可以吸附在聊天窗口下面，不用切回主界面，也能搜、能发。",
  },
];

export const guidePage = {
  outputFile: "guide.html",
  navLabel: "怎么用",
  styles: ["assets/css/guide.css"],
  head: seoHead({
    title,
    description: share,
    url,
    ogType: "article",
    jsonLd: [
      {
        "@type": "HowTo",
        name: "话术精灵怎么用",
        description: share,
        inLanguage: "zh-CN",
        totalTime: "PT1M",
        tool: { "@type": "HowToTool", name: siteData.siteName },
        step: steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${url}#step-${index + 1}`,
        })),
      },
      breadcrumb("怎么用", url),
    ],
  }),
  main: `<div class="wrap">
  <section class="hero">
    <p class="eyebrow">怎么用</p>
    <h1>45 秒看懂<span class="hl">话术精灵</span>怎么用</h1>
    <p class="lead">一段自动播放的手绘动画：分类、双击贴入、纸飞机直发、搜索加数字、吸附搜索栏。看完想自己动手，首页有能直接点的演示。</p>
  </section>

  <section class="section">
    <figure class="film">
      <canvas class="film-canvas" id="guide-film" width="960" height="540" role="img" aria-label="手绘动画：演示话术精灵的分类、双击贴入、纸飞机发送、搜索加数字发送和吸附搜索栏"></canvas>
      <figcaption class="film-bar">
        <button class="film-play" id="guide-play" type="button" aria-label="播放" data-playing="false">
          <svg class="film-icon film-icon--play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8Z" /></svg>
          <svg class="film-icon film-icon--pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" /></svg>
        </button>
        <div class="film-track" id="guide-track" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0" aria-valuemax="45" aria-valuenow="0">
          <span class="film-fill" id="guide-fill"></span>
        </div>
        <span class="film-time" id="guide-time">0:00 / 0:45</span>
      </figcaption>
    </figure>
    <noscript><p class="note">动画需要浏览器执行 JavaScript，下面是同样的五个步骤。</p></noscript>

    <ol class="steps">
      ${steps
        .map(
          (step, index) => `<li class="step" id="step-${index + 1}">
        <button class="step-jump" type="button" data-chapter="${index + 1}" aria-current="false">
          <span class="step-no">${index + 1}</span>
          <span class="step-body"><strong class="step-name">${step.name}</strong><span class="step-text">${step.text}</span></span>
        </button>
      </li>`,
        )
        .join("\n      ")}
    </ol>
    <p class="section-more"><a class="text-link" href="index.html#demo">看完去首页演示里自己点一遍 →</a></p>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/guide-film.js" defer></script>`,
};
