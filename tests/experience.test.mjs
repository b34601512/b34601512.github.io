// 「客服经验分享」数据和每一期的片子对得上：片长与片子时间线一致、地址就是页面模块的输出文件、静帧文件存在。
// 运行：node --test tests/
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { episodes } from "../src/site/experience.mjs";

const repo = resolve(import.meta.dirname, "..");

// 片子脚本在没有 document 的环境里把 makeFilm 挂到全局（测试钩子），时间线 TL.base 就是片长（秒）。
const FILMS = { "freight.html": ["assets/js/freight-film.js", "__freightFilm"] };

test("每一期的期号唯一、地址等于页面模块的输出文件、静帧存在", () => {
  assert.equal(new Set(episodes.map((e) => e.no)).size, episodes.length);
  for (const episode of episodes) {
    assert.equal(episode.href, episode.page.outputFile);
    assert.ok(existsSync(resolve(repo, episode.cover)), episode.cover);
    for (const key of ["title", "summary"]) assert.ok(episode[key], `${episode.href} 缺 ${key}`);
  }
});

// 允许差 1 秒：片子里逐字打字的间隔用 rnd(i * 5 + t)（Math.sin 的小数部分），不同 JS 引擎的 Math.sin 末位不同，
// 一路累加下来片尾会差零点一几秒，再被 Math.ceil 取整就可能差 1 秒（补运费：Node 算出 199，Chrome 里是 200）。
test("片长与片子的时间线一致（差不超过 1 秒）", () => {
  for (const episode of episodes) {
    const film = FILMS[episode.href];
    assert.ok(film, `${episode.href} 没登记片子脚本`);
    const sandbox = {};
    sandbox.globalThis = sandbox;
    vm.runInNewContext(readFileSync(resolve(repo, film[0]), "utf8"), sandbox);
    const base = sandbox[film[1]]().TL.base;
    assert.ok(Math.abs(base - episode.duration) <= 1, `${episode.href}：数据写 ${episode.duration} 秒，片子时间线 ${base} 秒`);
  }
});
