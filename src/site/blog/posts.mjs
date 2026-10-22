// 读取 content/blog/：slugs.json 登记的 md 才会发布。构建与自检都在模块加载时走这同一段代码，
// 所以两边拿到的文章、顺序、正文完全一致。
// 文章头格式（见 content/blog/README.md）：第一行「# 标题」；标题到第一条单独的 --- 之间是内部备注，
// 一个字都不发布，只从里面取日期（第一条「> YYYY-MM-DD」）和可选的「> 摘要：…」；--- 之后才是正文。
import { readdirSync, readFileSync } from "node:fs";
import { parseBlocks, plainInline, renderBlocks } from "./markdown.mjs";

const BLOG_DIR = new URL("../../../content/blog/", import.meta.url);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUMMARY_LIMIT = 80;

// JSON.parse 遇到重复键会静默留下后一个，所以先从原文里把键挑出来查重。
function readSlugs() {
  const raw = readFileSync(new URL("slugs.json", BLOG_DIR), "utf8");
  const keys = [...raw.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map((m) => JSON.parse(`"${m[1]}"`).normalize("NFC"));
  const seenKeys = new Set();
  for (const key of keys) {
    if (seenKeys.has(key)) throw new Error(`content/blog/slugs.json：文件「${key}」登记了两次`);
    seenKeys.add(key);
  }

  const table = JSON.parse(raw);
  const seenSlugs = new Map();
  for (const [file, slug] of Object.entries(table)) {
    if (typeof slug !== "string" || !SLUG.test(slug)) {
      throw new Error(`content/blog/slugs.json：「${file}」的 slug「${slug}」不合法，只能用小写英文、数字和连字符，如 phrase-library-setup`);
    }
    if (seenSlugs.has(slug)) {
      throw new Error(`content/blog/slugs.json：slug「${slug}」同时给了「${seenSlugs.get(slug)}」和「${file}」`);
    }
    seenSlugs.set(slug, file);
  }
  return new Map(Object.entries(table).map(([file, slug]) => [file.normalize("NFC"), slug]));
}

// 摘要截到 80 字以内最后一个句读处；真的截了才补省略号。
function truncate(text) {
  const chars = [...text];
  if (chars.length <= SUMMARY_LIMIT) return text;
  const head = chars.slice(0, SUMMARY_LIMIT);
  let cut = -1;
  head.forEach((char, index) => {
    if ("。！？；，：".includes(char)) cut = index;
  });
  return `${head.slice(0, cut >= 0 ? cut + 1 : SUMMARY_LIMIT).join("")}…`;
}

function firstParagraph(blocks) {
  return blocks.find((block) => block.type === "paragraph")?.text;
}

export function parsePost(file, source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim() !== "");
  const titleMatch = lines[titleIndex]?.match(/^#\s+(.+)$/);
  if (!titleMatch) throw new Error(`content/blog/${file}：第一行必须是「# 文章标题」`);
  const title = titleMatch[1].trim();

  const ruleIndex = lines.findIndex((line, index) => index > titleIndex && /^-{3,}\s*$/.test(line.trim()));
  if (ruleIndex < 0) throw new Error(`content/blog/${file}：标题下面的备注区要用一行单独的 --- 结束，没找到`);
  const meta = lines.slice(titleIndex + 1, ruleIndex);

  const dateLine = meta.find((line) => /^>\s*\d{4}-\d{2}-\d{2}/.test(line));
  if (!dateLine) throw new Error(`content/blog/${file}：备注区里没有「> YYYY-MM-DD …」日期行`);
  const date = dateLine.match(/\d{4}-\d{2}-\d{2}/)[0];
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error(`content/blog/${file}：日期「${date}」不是有效日期`);
  }

  const where = `content/blog/${file}`;
  const blocks = parseBlocks(lines.slice(ruleIndex + 1).join("\n"), where);
  const summaryLine = meta.find((line) => /^>\s*摘要[：:]/.test(line));
  const summarySource = summaryLine ? summaryLine.replace(/^>\s*摘要[：:]\s*/, "") : firstParagraph(blocks);
  if (!summarySource) throw new Error(`${where}：正文里没有段落，没法生成摘要（可在备注区写「> 摘要：…」）`);

  return { title, date, summary: truncate(plainInline(summarySource)), bodyHtml: renderBlocks(blocks) };
}

function loadPosts() {
  const slugs = readSlugs();
  // 文件名统一按 NFC 比对（macOS 拷来的文件名可能是 NFD），读文件仍用磁盘上的原名。
  const files = new Map(
    readdirSync(BLOG_DIR)
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .map((name) => [name.normalize("NFC"), name]),
  );

  for (const file of files.keys()) {
    if (!slugs.has(file)) console.warn(`[blog] content/blog/${file} 没有在 slugs.json 里登记，跳过`);
  }

  const posts = [];
  for (const [file, slug] of slugs) {
    if (!files.has(file)) {
      console.warn(`[blog] slugs.json 登记了 ${file}，但 content/blog/ 里没有这个文件，跳过`);
      continue;
    }
    posts.push({ file, slug, ...parsePost(file, readFileSync(new URL(files.get(file), BLOG_DIR), "utf8")) });
  }

  // 新的在前；同一天按文件名升序。
  return posts.sort((a, b) => (a.date === b.date ? (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) : a.date < b.date ? 1 : -1));
}

export const posts = loadPosts();
