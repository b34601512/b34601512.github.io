// 博客文章用的 Markdown 子集解析器，零依赖。只认 content/blog/README.md 里列出的写法：
// ## / ### 标题、段落、单层 - 与 1. 列表、> 引用、管道表格、**粗体** `代码` [链接](地址) *强调* ![图](地址)。
// 单独一行的 --- / *** 是原稿里的分节线，跳过不输出。正文里的 # 一级标题直接报错（每页只能有模板那一个 H1）。
// 所有原文文字都经过 escapeHtml，不会有原样拼进 HTML 的源文本。

export function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const RULE = /^(?:-{3,}|\*{3,})\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^-\s+(.*)$/;
const ORDERED = /^(\d+)\.\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const TABLE_ALIGN = /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

const isTableStart = (lines, i) => lines[i].trimStart().startsWith("|") && i + 1 < lines.length && TABLE_ALIGN.test(lines[i + 1].trim());

// 这些行会结束当前段落（与 CommonMark 一致：列表、引用、标题、表格可以紧贴段落开始）。
function startsBlock(lines, i) {
  const line = lines[i];
  return (
    line.trim() === "" ||
    RULE.test(line.trim()) ||
    HEADING.test(line) ||
    BULLET.test(line) ||
    ORDERED.test(line) ||
    QUOTE.test(line) ||
    isTableStart(lines, i)
  );
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

function alignOf(spec) {
  const left = spec.startsWith(":");
  const right = spec.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

// 表格单元格里的 > 起不了引用，开头的「> 」是原稿笔误：去掉一次并提示，其余照旧。
function stripCellQuote(cells, where, line) {
  return cells.map((cell) => {
    if (!cell.startsWith("> ")) return cell;
    console.warn(`[blog] ${where.split("/").pop()}:${line} 表格单元格开头的「> 」已忽略`);
    return cell.slice(2);
  });
}

// 把文本切成块：{ type: "heading" | "paragraph" | "list" | "quote" | "table", ... }。
// firstLine 是 source 第一行在原文件里的行号，报错和提示用它换算成原文件行号。
export function parseBlocks(source, where = "markdown", firstLine = 1) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "" || RULE.test(trimmed)) {
      i += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) throw new Error(`${where} 第 ${firstLine + i} 行：正文里不能再有「# 」一级标题（标题只能写在第一行）`);
      if (level > 3) throw new Error(`${where} 第 ${firstLine + i} 行：只支持 ## 和 ### 两级小标题`);
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = stripCellQuote(splitRow(lines[i]), where, firstLine + i);
      const aligns = splitRow(lines[i + 1]).map(alignOf);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        rows.push(stripCellQuote(splitRow(lines[i]), where, firstLine + i));
        i += 1;
      }
      blocks.push({ type: "table", head, aligns, rows });
      continue;
    }

    if (QUOTE.test(line)) {
      const quoteLine = firstLine + i;
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        inner.push(lines[i].match(QUOTE)[1]);
        i += 1;
      }
      blocks.push({ type: "quote", blocks: parseBlocks(inner.join("\n"), where, quoteLine) });
      continue;
    }

    const listKind = BULLET.test(line) ? "ul" : ORDERED.test(line) ? "ol" : null;
    if (listKind) {
      const pattern = listKind === "ul" ? BULLET : ORDERED;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) {
        const match = lines[i].match(pattern);
        items.push(listKind === "ul" ? { text: match[1] } : { value: Number(match[1]), text: match[2] });
        i += 1;
        // 列表项的续行（不以新块开头的非空行）接在本项后面，算软换行。
        while (i < lines.length && !startsBlock(lines, i)) {
          items[items.length - 1].text += `\n${lines[i].trim()}`;
          i += 1;
        }
      }
      blocks.push({ type: "list", kind: listKind, items });
      continue;
    }

    const text = [trimmed];
    i += 1;
    while (i < lines.length && !startsBlock(lines, i)) {
      text.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: text.join("\n") });
  }

  return blocks;
}

// 行内：`代码`、![图](地址)、[文字](地址)、**粗体**、*强调*；其余字符逐个转义。软换行输出为空格。
export function renderInline(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m;
    if ((m = rest.match(/^`([^`]+)`/))) {
      out += `<code>${escapeHtml(m[1])}</code>`;
    } else if ((m = rest.match(/^!\[([^\]]*)\]\(([^)\s]+)\)/))) {
      out += `<img src="${escapeHtml(m[2])}" alt="${escapeHtml(m[1])}" loading="lazy" />`;
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      out += `<a href="${escapeHtml(m[2])}">${renderInline(m[1])}</a>`;
    } else if ((m = rest.match(/^\*\*(\S(?:[\s\S]*?\S)?)\*\*/))) {
      out += `<strong>${renderInline(m[1])}</strong>`;
    } else if ((m = rest.match(/^\*([^*\s](?:[^*]*?[^*\s])?)\*/))) {
      out += `<em>${renderInline(m[1])}</em>`;
    } else {
      out += text[i] === "\n" ? " " : escapeHtml(text[i]);
      i += 1;
      continue;
    }
    i += m[0].length;
  }
  return out;
}

// 去掉行内标记只留文字（用于摘要、description）。
export function plainInline(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, "$1")
    .replace(/\*([^*\s](?:[^*]*?[^*\s])?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function renderTable(block) {
  const cell = (tag, text, index) => {
    const align = block.aligns[index];
    return `<${tag}${align ? ` style="text-align:${align}"` : ""}>${renderInline(text)}</${tag}>`;
  };
  const head = block.head.map((text, index) => cell("th", text, index)).join("");
  const body = block.rows
    .map((row) => `<tr>${block.head.map((_, index) => cell("td", row[index] ?? "", index)).join("")}</tr>`)
    .join("\n");
  return `<div class="post-table"><table>
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table></div>`;
}

export function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
        case "paragraph":
          return `<p>${renderInline(block.text)}</p>`;
        case "list":
          return `<${block.kind}>
${block.items
  .map((item) => `<li${item.value === undefined ? "" : ` value="${item.value}"`}>${renderInline(item.text)}</li>`)
  .join("\n")}
</${block.kind}>`;
        case "quote":
          return `<blockquote>
${renderBlocks(block.blocks)}
</blockquote>`;
        case "table":
          return renderTable(block);
        default:
          throw new Error(`未知的块类型：${block.type}`);
      }
    })
    .join("\n");
}

export function renderMarkdown(source, where) {
  return renderBlocks(parseBlocks(source, where));
}
