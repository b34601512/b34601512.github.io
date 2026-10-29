// MP4 封装自检（issue #15）：喂一批假样本给 mp4-mux.js，再用 mp4-inspect.js 拆回来，
// 核对盒子、样本数、时长、关键帧、编码配置、每个样本的字节都原样落在算出来的偏移上。
// 离线出片工具（tools/export-films.mjs）出的真文件走的也是这两份代码，出完用同一个 inspect 体检。
// 运行：node --test tools/film-export/*.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";

// 跑在本 realm 里（不另开 vm 上下文），数组、TypedArray 才能直接 deepEqual
for (const file of ["mp4-mux.js", "mp4-inspect.js"]) {
  vm.runInThisContext(readFileSync(resolve(import.meta.dirname, file), "utf8"), { filename: file });
}
const { Mp4Mux, Mp4Inspect } = globalThis;

// 每个样本的内容带上轨道号与序号，拆回来能认出是谁
function payload(track, i, size) {
  const d = new Uint8Array(size);
  for (let k = 0; k < size; k++) d[k] = (track * 31 + i * 7 + k) & 0xff;
  d[0] = track;
  d[1] = i & 0xff;
  d[2] = (i >> 8) & 0xff;
  return d;
}

// 和真 avcC 一样的头：版本 1、High 档、4.2 级
const AVCC = new Uint8Array([1, 0x64, 0x00, 0x2a, 0xff, 0xe1, 0, 4, 0x67, 0x64, 0, 0x2a, 1, 0, 4, 0x68, 0xee, 0x3c, 0x80]);
const ASC = new Uint8Array([0x11, 0x90]); // AAC-LC、48 kHz、立体声

function videoTrack({ seconds = 3, fps = 60, gop = 60, order } = {}) {
  const n = seconds * fps;
  const pts = order ? order(n) : Array.from({ length: n }, (_, i) => i);
  return {
    kind: "video",
    codec: "avc1",
    width: 1080,
    height: 1920,
    timescale: fps * 1000,
    config: AVCC,
    samples: pts.map((p, i) => ({ data: payload(1, i, i % gop === 0 ? 900 : 120 + (i % 13)), pts: p * 1000, key: i % gop === 0 })),
  };
}

function aacTrack({ seconds = 3, start = 0 } = {}) {
  const n = Math.ceil((seconds * 48000) / 1024);
  return {
    kind: "audio",
    codec: "mp4a",
    channels: 2,
    sampleRate: 48000,
    timescale: 48000,
    bitrate: 192000,
    config: ASC,
    samples: Array.from({ length: n }, (_, i) => ({ data: payload(2, i, 300 + (i % 7)), pts: start + i * 1024, key: true })),
  };
}

function build(tracks) {
  const { parts, size } = Mp4Mux.mux({ tracks });
  const file = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    file.set(p, at);
    at += p.byteLength;
  }
  assert.equal(at, size, "parts 加起来就是 size");
  return { file, info: Mp4Inspect.inspect(file) };
}

// 拆回来的每个样本都和喂进去的逐字节一样
function sameSamples(file, t, input) {
  assert.equal(t.samples, input.samples.length);
  input.samples.forEach((s, i) => {
    const o = t.table.offsets[i];
    assert.deepEqual(file.subarray(o, o + s.data.byteLength), s.data, `轨道 ${t.id} 第 ${i} 个样本`);
  });
}

test("画面 + AAC：盒子、时长、样本数、关键帧、配置都对", () => {
  const v = videoTrack();
  const a = aacTrack();
  const { file, info } = build([v, a]);
  assert.deepEqual(info.problems, []);
  assert.deepEqual(info.brands, ["isom", "isom", "iso2", "avc1", "mp41"]);
  assert.ok(info.faststart, "moov 在 mdat 前面");
  assert.equal(info.duration, 3.008, "总时长取较长的那条轨（AAC 最后一包补齐到 1024 样本）");
  const [tv, ta] = info.tracks;
  assert.equal(tv.handler, "vide");
  assert.equal(tv.profile, "avc1.64002A");
  assert.equal(`${tv.width}×${tv.height}`, "1080×1920");
  assert.deepEqual(tv.config, AVCC);
  assert.equal(tv.mediaDuration, 3);
  assert.equal(tv.samples, 180);
  assert.equal(tv.keyframes, 3);
  assert.deepEqual([...tv.table.keys], [0, 60, 120]);
  assert.deepEqual(tv.edits, [], "没有 B 帧、从 0 开始：不写编辑表");
  assert.ok(tv.table.dts.every((d, i) => d === i * 1000), "每帧 1/60 秒");
  assert.equal(ta.handler, "soun");
  assert.equal(ta.codec, "mp4a");
  assert.equal(ta.sampleRate, 48000);
  assert.equal(ta.channels, 2);
  assert.equal(ta.keyframes, ta.samples, "声音每包都能单独解");
  // esds 里能找到原样的 AudioSpecificConfig（DecSpecificInfo 标签 0x05 + 4 字节长度）
  const esds = [...ta.config];
  const at = esds.findIndex((b, i) => b === 0x05 && esds[i + 4] === ASC.length);
  assert.ok(at > 0, "esds 里有 DecSpecificInfo");
  assert.deepEqual(esds.slice(at + 5, at + 5 + ASC.length), [...ASC]);
  sameSamples(file, tv, v);
  sameSamples(file, ta, a);
});

test("画面与声音按半秒交错存放，不是一整段画面后面接一整段声音", () => {
  const { info } = build([videoTrack(), aacTrack()]);
  const [tv, ta] = info.tracks;
  assert.equal(tv.chunks, 6);
  assert.equal(ta.chunks, 6);
  // 块的边界：和上一个样本不首尾相接的地方。按文件位置排好以后，每块的开始时间必须一路不减，
  // 即两条轨按时间穿插写进 mdat
  const starts = (t) =>
    t.table.offsets
      .map((o, i) => [o, t.table.dts[i] / t.timescale, i])
      .filter(([o, , i]) => i === 0 || o !== t.table.offsets[i - 1] + t.table.sizes[i - 1]);
  const laid = [...starts(tv).map((c) => [...c, "v"]), ...starts(ta).map((c) => [...c, "a"])].sort((x, y) => x[0] - y[0]);
  assert.equal(laid.length, 12);
  laid.forEach((c, i) => assert.ok(i === 0 || c[1] >= laid[i - 1][1], `第 ${i} 块（${c[3]}）比前一块早`));
  assert.ok(!/vv|aa/.test(laid.map((c) => c[3]).join("")), "同一条轨不连着放两块");
});

test("B 帧（解码顺序 ≠ 显示顺序）：写 ctts 与编辑表，拆回来显示时间与原来一致", () => {
  // I0 P3 B1 B2 P6 B4 B5 …：显示序号按解码顺序排列
  const order = (n) => {
    const out = [0];
    for (let g = 1; g < n; g += 3) out.push(...[g + 2, g, g + 1].filter((x) => x < n));
    return out;
  };
  const v = videoTrack({ order });
  const { file, info } = build([v]);
  assert.deepEqual(info.problems, []);
  const [tv] = info.tracks;
  assert.equal(tv.edits.length, 1);
  const shift = tv.edits[0].mediaTime;
  assert.ok(shift > 0, "挪过 delay 就要用编辑表补回来");
  assert.equal(tv.edits[0].duration, 3000, "编辑段长度 = 3 秒");
  assert.deepEqual(
    tv.table.pts.map((p) => p - shift),
    v.samples.map((s) => s.pts),
  );
  assert.ok(tv.table.dts.every((d, i) => i === 0 || d > tv.table.dts[i - 1]), "解码时间严格递增");
  assert.ok(tv.table.pts.every((p, i) => p >= tv.table.dts[i]), "每一帧都是先解码再显示");
  assert.equal(info.duration, 3);
  sameSamples(file, tv, v);
});

test("Opus：dOps 带 pre-skip，编辑表跳过预滚样本，时长不算预滚", () => {
  const n = 150; // 150 × 960 = 3 秒
  const opus = {
    kind: "audio",
    codec: "Opus",
    channels: 2,
    sampleRate: 48000,
    timescale: 48000,
    preSkip: 312,
    samples: Array.from({ length: n }, (_, i) => ({ data: payload(2, i, 200), pts: i * 960, key: true })),
  };
  const { file, info } = build([videoTrack(), opus]);
  assert.deepEqual(info.problems, []);
  const ta = info.tracks[1];
  assert.equal(ta.codec, "Opus");
  assert.equal(ta.preSkip, 312);
  assert.deepEqual(ta.edits, [{ duration: Math.round(((n * 960 - 312) * 1000) / 48000), mediaTime: 312 }]);
  assert.equal(ta.tkhdDuration, 2994);
  sameSamples(file, ta, opus);
});

test("轨道晚于 0 秒开始：先垫一段空编辑", () => {
  const { info } = build([videoTrack(), aacTrack({ start: 4800 })]); // 声音晚 0.1 秒
  assert.deepEqual(info.problems, []);
  assert.deepEqual(info.tracks[1].edits, [
    { duration: 100, mediaTime: -1 },
    { duration: 3008, mediaTime: 0 },
  ]);
});

test("样本表的规模和真片子一样大（3 分 20 秒、60 帧）也拼得出来", () => {
  const v = videoTrack({ seconds: 200, gop: 120 });
  const a = aacTrack({ seconds: 200 });
  const t0 = performance.now();
  const { file, info } = build([v, a]);
  const ms = performance.now() - t0;
  assert.deepEqual(info.problems, []);
  assert.equal(info.tracks[0].samples, 12000);
  assert.equal(info.tracks[0].keyframes, 100);
  assert.equal(info.tracks[0].mediaDuration, 200);
  sameSamples(file, info.tracks[0], v);
  assert.ok(ms < 5000, `拼一次 ${ms.toFixed(0)}ms`);
});

test("体检能抓出坏文件：改坏一个盒子长度就报错", () => {
  const { file } = build([videoTrack({ seconds: 1 })]);
  const bad = file.slice();
  // moov 紧跟在 ftyp 后面；把它的长度改大 1 字节，后面就对不上了
  const ftypLen = new DataView(bad.buffer).getUint32(0);
  const view = new DataView(bad.buffer);
  view.setUint32(ftypLen, view.getUint32(ftypLen) + 1);
  assert.notDeepEqual(Mp4Inspect.inspect(bad).problems, []);
});

test("空轨道直接报错，不生成坏文件", () => {
  assert.throws(() => Mp4Mux.mux({ tracks: [{ ...videoTrack(), samples: [] }] }), /没有样本/);
});
