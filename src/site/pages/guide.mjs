// guide.html：45 秒操作演示短片（带合成音效与特效，「声音」「特效」两个开关和宣传片一样在进度条那一行）+ 同样五步的文字版。文字步骤也是动画的章节按钮，点哪步就跳到哪段。
import { breadcrumb, seoHead } from "../seo.mjs";
import { pageUrl, siteData } from "../site-data.mjs";

const url = pageUrl("guide.html");
const title = "话术精灵怎么用_客服话术软件动画教程 - 话术精灵";
const share =
  "45 秒手绘动画教你用话术精灵：团队、个人、离线话术分类，双击贴进聊天输入框，点纸飞机直接发送，Alt+Q 搜索后按 Tab 再按数字发送，吸附搜索栏贴在聊天窗口下面。";

// 演示短片里聊天窗的真实截图：放进 assets/img/ 后把路径填在这里（例如 "assets/img/film-chat.png"），
// 短片就用截图当聊天窗的底，气泡和输入框里的字照常叠在上面；留空就是代码画的（样式见 guide-film.css）。
const filmShots = { chat: "" };

// 「点一下打开声音」提示的喇叭图标（没开 JS 时提示与两个开关都 hidden）。
const speaker = `<svg class="film-icon film-icon--sound" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2Z" /><path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12 3.8a6 6 0 0 1 0 8.4" /></svg>`;
// 控制条上的按钮和宣传片同一套（site.css 的 .ctl-btn），图标也一样（同 assets/js/promo-film.js 的 ICON.sound / ICON.mute，`ctl-btn__wave` 是描边的那几笔），
// 特效是同样 1.5px 描边的一大一小两颗星。
const ctlSound = `<svg class="film-icon--sound" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2Z" /><path class="ctl-btn__wave" d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12 3.8a6 6 0 0 1 0 8.4" /></svg>`;
const ctlMute = `<svg class="film-icon--mute" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2Z" /><path class="ctl-btn__wave" d="M10.5 6l4 4M14.5 6l-4 4" /></svg>`;
const ctlSparkle = `<svg viewBox="0 0 16 16" aria-hidden="true"><path class="ctl-btn__wave" d="M7 1.8 8.4 6 12.6 7.4 8.4 8.8 7 13 5.6 8.8 1.4 7.4 5.6 6Z" /><path class="ctl-btn__wave" d="M12.6 10.6v3.6M10.8 12.4h3.6" /></svg>`;

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
  styles: ["assets/css/guide.css", "assets/css/guide-film.css"],
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
    <p class="lead">一段自动播放的操作演示：分类、双击贴入、纸飞机直发、搜索加数字、吸附搜索栏。看完想自己动手，首页有能直接点的演示。</p>
  </section>

  <section class="section">
    <figure class="film">
      <div class="film-stage" id="guide-film"${filmShots.chat ? ` data-chat-shot="${filmShots.chat}"` : ""} role="img" aria-label="操作演示：鼠标在话术精灵主界面切换团队、个人、离线话术和套号，双击一条话术贴进聊天输入框再回车发送，点话术左侧纸飞机直接发送，按 Alt+Q 搜索后按 Tab 再按数字发送，最后用吸附在聊天窗口下面的搜索栏搜索并发送"></div>
      <figcaption class="film-bar">
        <button class="ctl-btn ctl-btn--solid film-play" id="guide-play" type="button" aria-label="播放" data-playing="false">
          <svg class="film-icon--play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8Z" /></svg>
          <svg class="film-icon--pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" /></svg>
        </button>
        <div class="film-track" id="guide-track" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0" aria-valuemax="45" aria-valuenow="0">
          <span class="film-fill" id="guide-fill"></span>
        </div>
        <span class="film-time" id="guide-time">0:00 / 0:45</span>
        <button class="film-hint" id="guide-hint" type="button" data-film-ctl hidden>${speaker}点一下打开声音</button>
        <button class="ctl-btn film-toggle" id="guide-sound" type="button" aria-label="声音：关，点一下打开" title="声音：关，点一下打开" aria-pressed="false" data-sound="locked" data-film-ctl hidden>${ctlSound}${ctlMute}</button>
        <button class="ctl-btn" id="guide-fx" type="button" aria-label="特效：关" title="特效：关" aria-pressed="false" data-film-ctl hidden>${ctlSparkle}</button>
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
    <p class="note">设置、导入导出、云同步等更多功能，见 <a class="text-link" href="${siteData.tutorialUrl}" target="_blank" rel="noopener">使用帮助文档</a>。</p>
  </section>
</div>`,
  bodyEnd: `<script src="assets/js/film-engine.js" defer></script>
<script src="assets/js/guide-film.js" defer></script>`,
};
