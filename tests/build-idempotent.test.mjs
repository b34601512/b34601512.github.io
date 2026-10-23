// 构建幂等测试：连续构建两次、提交后再构建、换时区再构建，生成物都不能变。
// 在临时克隆里跑（工作区里的 scripts/ 与 src/ 会覆盖进去，所以测的是当前改动），不碰本工作区。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const repo = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "build-idempotent-"));

const gitEnv = {
  GIT_AUTHOR_NAME: "build-test",
  GIT_AUTHOR_EMAIL: "build-test@example.invalid",
  GIT_COMMITTER_NAME: "build-test",
  GIT_COMMITTER_EMAIL: "build-test@example.invalid",
};

function run(cmd, args, env = {}) {
  return execFileSync(cmd, args, {
    cwd: work,
    env: { ...process.env, ...gitEnv, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

const git = (args, env) => run("git", args, env);
const build = (env) => run(process.execPath, ["scripts/build-site.mjs"], env);
const status = () => git(["status", "--short"]);
const diffStat = () => git(["diff", "--stat"]);

// 选一个「本地日期 ≠ UTC 日期」的时区偏移：UTC 下午用 +14:00（本地已是明天），上午用 -12:00（本地还是昨天）。
// 用它做提交时间，旧实现（%cs 取提交者本地日期）必然和 UTC 的「今天」差一天。
function skewedNow() {
  const now = new Date();
  const hours = now.getUTCHours() >= 12 ? 14 : -12;
  const local = new Date(now.getTime() + hours * 3600 * 1000).toISOString().slice(0, 19);
  const sign = hours > 0 ? "+" : "-";
  return `${local}${sign}${String(Math.abs(hours)).padStart(2, "0")}:00`;
}

before(() => {
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", repo, work]);
  for (const dir of ["scripts", "src"]) {
    cpSync(join(repo, dir), join(work, dir), { recursive: true, force: true });
  }
  build();
  git(["add", "-A"]);
  git(["commit", "--quiet", "--allow-empty", "-m", "test: 工作区快照"]);
});

after(() => rmSync(work, { recursive: true, force: true }));

test("连续构建两次，生成物不变", () => {
  build();
  assert.equal(status(), "", "第一次构建后工作区不干净");
  assert.equal(diffStat(), "");
  build();
  assert.equal(status(), "", "第二次构建后工作区不干净");
  assert.equal(diffStat(), "");
});

test("换时区构建，sitemap.xml 不变", () => {
  for (const TZ of ["Pacific/Kiritimati", "America/Los_Angeles", "Asia/Shanghai", "UTC"]) {
    build({ TZ });
    assert.equal(status(), "", `TZ=${TZ} 构建后工作区不干净`);
  }
});

test("内容变了→构建→以跨日时区提交→再构建，sitemap.xml 不变（本 bug 的回归）", () => {
  // 让已发布的 index.html 与构建结果不同，迫使构建给它写「今天」。
  appendFileSync(join(work, "index.html"), "<!-- stale -->\n");
  git(["commit", "--quiet", "-am", "test: 已发布的 index.html 过期"]);

  build();
  const sitemap = () => readFileSync(join(work, "sitemap.xml"), "utf8");
  const firstSitemap = sitemap();
  const date = skewedNow();
  git(["add", "-A"]);
  git(["commit", "--quiet", "-m", "test: 提交新生成物"], { GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date });

  for (const TZ of [undefined, "Pacific/Kiritimati", "America/Los_Angeles"]) {
    build(TZ ? { TZ } : {});
    assert.equal(status(), "", `提交时间 ${date}，TZ=${TZ ?? "默认"} 再构建后工作区不干净`);
    assert.equal(sitemap(), firstSitemap);
  }
});
