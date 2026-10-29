// MP4 体检（issue #15）：把导出的文件按盒子拆开，核对样本表自洽，给自检用。
// Node 里的测试（tests/mp4-mux.test.mjs）和浏览器里的自检页（check-export.html）用的是同一份，
// 所以「Node 里测过的封装」和「浏览器里真导出来的文件」走的是同一套核对。正式页面不加载它。
//
//   Mp4Inspect.inspect(bytes: Uint8Array) → { brands, duration, tracks: [...], problems: [字符串] }
//   problems 为空 = 盒子长度、样本数、时长、偏移量都对得上
(() => {
  const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf"]);
  const dec = new TextDecoder();

  function reader(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      u8: (o) => view.getUint8(o),
      u16: (o) => view.getUint16(o),
      u32: (o) => view.getUint32(o),
      u64: (o) => view.getUint32(o) * 2 ** 32 + view.getUint32(o + 4),
      type: (o) => dec.decode(bytes.subarray(o, o + 4)),
    };
  }

  // 拆一层盒子；长度 1 = 后面跟 64 位长度，长度 0 = 一直到文件尾
  function children(r, bytes, start, end, problems, path) {
    const out = [];
    let at = start;
    while (at + 8 <= end) {
      let size = r.u32(at);
      const type = r.type(at + 4);
      let head = 8;
      if (size === 1) {
        size = r.u64(at + 8);
        head = 16;
      } else if (size === 0) size = end - at;
      if (size < head || at + size > end) {
        problems.push(`${path}/${type} 长度 ${size} 超出了外层盒子`);
        break;
      }
      const b = { type, start: at, body: at + head, end: at + size };
      if (CONTAINERS.has(type)) b.kids = children(r, bytes, b.body, b.end, problems, `${path}/${type}`);
      out.push(b);
      at += size;
    }
    if (at !== end) problems.push(`${path} 末尾有 ${end - at} 字节对不上盒子`);
    return out;
  }

  const find = (list, type) => list?.find((b) => b.type === type);

  function table(r, b, wide) {
    if (!b) return null;
    const n = r.u32(b.body + 4);
    const rows = [];
    for (let i = 0; i < n; i++) rows.push(wide(b.body + 8, i));
    return rows;
  }

  function track(r, bytes, trak, mdat, problems) {
    const tkhd = find(trak.kids, "tkhd");
    const mdia = find(trak.kids, "mdia");
    const mdhd = find(mdia?.kids, "mdhd");
    const hdlr = find(mdia?.kids, "hdlr");
    const stbl = find(find(mdia?.kids, "minf")?.kids, "stbl");
    if (!tkhd || !mdhd || !hdlr || !stbl) {
      problems.push("trak 缺 tkhd / mdhd / hdlr / stbl");
      return null;
    }
    const id = r.u32(tkhd.body + 12);
    const timescale = r.u32(mdhd.body + 12);
    const mediaDuration = r.u32(mdhd.body + 16);
    const handler = r.type(hdlr.body + 8);
    const t = { id, handler, timescale, mediaDuration: mediaDuration / timescale, tkhdDuration: r.u32(tkhd.body + 20) };
    const p = (msg) => problems.push(`轨道 ${id}（${handler}）：${msg}`);

    const stsd = find(stbl.kids, "stsd");
    const entry = stsd && children(r, bytes, stsd.body + 8, stsd.end, problems, "stsd")[0];
    if (!entry) p("没有样本描述");
    else {
      t.codec = entry.type;
      if (handler === "vide") {
        t.width = r.u16(entry.body + 24);
        t.height = r.u16(entry.body + 26);
        const avcC = children(r, bytes, entry.body + 78, entry.end, problems, entry.type).find((b) => b.type === "avcC");
        if (!avcC) p("avc1 里没有 avcC");
        else {
          t.config = bytes.slice(avcC.body, avcC.end);
          t.profile = `avc1.${[...t.config.subarray(1, 4)].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
        }
      } else {
        t.channels = r.u16(entry.body + 16);
        t.sampleRate = r.u32(entry.body + 24) / 0x10000;
        const kids = children(r, bytes, entry.body + 28, entry.end, problems, entry.type);
        const cfg = find(kids, "esds") || find(kids, "dOps");
        if (!cfg) p(`${entry.type} 里没有 esds / dOps`);
        else {
          t.config = bytes.slice(cfg.body, cfg.end);
          if (cfg.type === "dOps") t.preSkip = r.u16(cfg.body + 2);
        }
      }
    }

    const stts = table(r, find(stbl.kids, "stts"), (o, i) => [r.u32(o + i * 8), r.u32(o + i * 8 + 4)]);
    const ctts = table(r, find(stbl.kids, "ctts"), (o, i) => [r.u32(o + i * 8), r.u32(o + i * 8 + 4)]);
    const stss = table(r, find(stbl.kids, "stss"), (o, i) => r.u32(o + i * 4));
    const stsc = table(r, find(stbl.kids, "stsc"), (o, i) => [r.u32(o + i * 12), r.u32(o + i * 12 + 4)]);
    const stszBox = find(stbl.kids, "stsz");
    const co = find(stbl.kids, "stco") || find(stbl.kids, "co64");
    const chunkOffsets = co && table(r, co, co.type === "co64" ? (o, i) => r.u64(o + i * 8) : (o, i) => r.u32(o + i * 4));
    if (!stts || !stsc || !stszBox || !chunkOffsets) {
      p("样本表不全（stts / stsc / stsz / stco）");
      return t;
    }
    const fixed = r.u32(stszBox.body + 4);
    const count = r.u32(stszBox.body + 8);
    const sizes = Array.from({ length: count }, (_, i) => fixed || r.u32(stszBox.body + 12 + i * 4));

    // 解码时间、显示时间
    const dts = [];
    let clock = 0;
    for (const [n, d] of stts) for (let i = 0; i < n; i++) dts.push((clock += d) - d);
    const cts = ctts ? ctts.flatMap(([n, o]) => Array(n).fill(o)) : [];
    if (dts.length !== count) p(`stts 记了 ${dts.length} 个样本，stsz 是 ${count} 个`);
    if (ctts && cts.length !== count) p(`ctts 记了 ${cts.length} 个样本，stsz 是 ${count} 个`);
    if (clock !== mediaDuration) p(`stts 加起来 ${clock}，mdhd 写的是 ${mediaDuration}`);

    // 每个样本在文件里的位置：stsc 把样本分到块里，块从 stco 的偏移开始依次排
    const offsets = [];
    let s = 0;
    chunkOffsets.forEach((base, ci) => {
      const run = [...stsc].reverse().find(([first]) => first <= ci + 1);
      let at = base;
      for (let i = 0; i < (run ? run[1] : 0) && s < count; i++, s++) {
        offsets.push(at);
        at += sizes[s];
      }
    });
    if (offsets.length !== count) p(`stsc + stco 只定位到 ${offsets.length} 个样本，应有 ${count} 个`);
    offsets.forEach((o, i) => {
      if (!mdat || o < mdat.body || o + sizes[i] > mdat.end) p(`第 ${i + 1} 个样本落在 mdat 外面`);
    });

    const edts = find(trak.kids, "edts");
    const elst = edts && find(edts.kids, "elst");
    t.edits = elst ? table(r, elst, (o, i) => ({ duration: r.u32(o + i * 12), mediaTime: r.u32(o + i * 12 + 4) | 0 })) : [];

    t.samples = count;
    t.keyframes = stss ? stss.length : count;
    if (handler === "vide" && stss && stss[0] !== 1) p("第一帧不是关键帧");
    t.bytes = sizes.reduce((a, b) => a + b, 0);
    t.chunks = chunkOffsets.length;
    t.table = { sizes, offsets, dts, pts: dts.map((d, i) => d + (cts[i] || 0)), keys: stss ? new Set(stss.map((k) => k - 1)) : null };
    return t;
  }

  function inspect(bytes) {
    const r = reader(bytes);
    const problems = [];
    const top = children(r, bytes, 0, bytes.byteLength, problems, "");
    const ftyp = find(top, "ftyp");
    const moov = find(top, "moov");
    const mdat = find(top, "mdat");
    if (!ftyp || !moov || !mdat) problems.push("缺 ftyp / moov / mdat");
    if (top[0]?.type !== "ftyp") problems.push("文件不是以 ftyp 开头");
    // ftyp：主品牌、次版本号，后面是兼容品牌
    const brands = ftyp ? [r.type(ftyp.body), ...Array.from({ length: (ftyp.end - ftyp.body - 8) / 4 }, (_, i) => r.type(ftyp.body + 8 + i * 4))] : [];
    const mvhd = find(moov?.kids, "mvhd");
    const out = { brands, duration: mvhd ? r.u32(mvhd.body + 16) / r.u32(mvhd.body + 12) : 0, faststart: Boolean(moov && mdat && moov.start < mdat.start), tracks: [], problems };
    for (const trak of moov?.kids.filter((b) => b.type === "trak") || []) {
      const t = track(r, bytes, trak, mdat, problems);
      if (t) out.tracks.push(t);
    }
    // 两条轨的样本不能在 mdat 里互相压着
    const spans = out.tracks.flatMap((t) => (t.table ? t.table.offsets.map((o, i) => [o, o + t.table.sizes[i]]) : [])).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++) if (spans[i][0] < spans[i - 1][1]) problems.push(`样本在 mdat 里重叠（偏移 ${spans[i][0]}）`);
    return out;
  }

  // 给人看的一行行摘要（自检页打到控制台的就是这个）
  function summary(info) {
    return {
      brands: info.brands.join(","),
      duration: Number(info.duration.toFixed(3)),
      faststart: info.faststart,
      tracks: info.tracks.map((t) => ({
        id: t.id,
        handler: t.handler,
        codec: t.profile || t.codec,
        ...(t.width ? { size: `${t.width}×${t.height}` } : { sampleRate: t.sampleRate, channels: t.channels }),
        ...(t.preSkip !== undefined ? { preSkip: t.preSkip } : {}),
        samples: t.samples,
        keyframes: t.keyframes,
        chunks: t.chunks,
        seconds: Number(t.mediaDuration.toFixed(3)),
        edits: t.edits,
        bytes: t.bytes,
      })),
      problems: info.problems,
    };
  }

  globalThis.Mp4Inspect = { inspect, summary };
})();
