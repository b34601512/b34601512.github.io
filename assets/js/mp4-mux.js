// MP4 封装（issue #15）：把 WebCodecs 编出来的 H.264 画面与 AAC / Opus 声音拼成一个普通的 MP4 文件。
// 离线导出时所有样本都已在内存里，所以写的是「moov 在前、mdat 在后」的普通 MP4（不是分片 MP4）：
// 播放器与上传网站拿到文件头就知道总时长、每一帧在哪，边下边播、拖进度条都不用先读到文件尾。
// 不依赖浏览器：只用 TypedArray，Node 里的自检（tests/mp4-mux.test.mjs）跑的就是这一份。
//
//   Mp4Mux.mux({ tracks }) → { parts: Uint8Array[], size }   // parts 按顺序拼起来就是整个文件（浏览器里直接 new Blob(parts)）
//   track（视频）{ kind: "video", codec: "avc1", width, height, timescale, config: avcC, samples }
//   track（声音）{ kind: "audio", codec: "mp4a" | "Opus", channels, sampleRate, timescale, config: AudioSpecificConfig | OpusHead, preSkip?, samples }
//   sample { data: Uint8Array, pts, duration?, key }          // 按解码顺序给；pts 用这条轨自己的 timescale
(() => {
  const MOVIE_TIMESCALE = 1000;
  const CHUNK_SECONDS = 0.5; // 画面与声音每半秒交错一块：边下边播时两条轨都不用等对方
  const UNITY = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000]; // 不旋转不缩放

  // ---------- 写字节 ----------
  const enc = new TextEncoder();
  function u8(n) {
    return [n & 0xff];
  }
  function u16(n) {
    return [(n >>> 8) & 0xff, n & 0xff];
  }
  function u32(n) {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  }
  function u64(n) {
    return [...u32(Math.floor(n / 2 ** 32)), ...u32(n % 2 ** 32)];
  }
  const fourcc = (s) => [...enc.encode(s)];
  const zeros = (n) => new Array(n).fill(0);

  // 盒子：4 字节长度 + 4 字节类型 + 内容；内容是数字数组或别的盒子
  function box(type, ...content) {
    const body = content.flat(Infinity);
    return [...u32(body.length + 8), ...fourcc(type), ...body];
  }
  const full = (type, version, flags, ...content) => box(type, u8(version), u8(flags >> 16), u16(flags & 0xffff), ...content);

  // 32 位放不下就报错，不悄悄截断（几十分钟的片子才会碰到，到时候再上 64 位版本）
  function fits32(n, what) {
    if (n > 0xffffffff) throw new RangeError(`${what} 超出 32 位：${n}`);
    return n;
  }

  // ---------- 样本表 ----------
  // 解码时间：B 帧会让解码顺序与显示顺序不同。按惯例把显示时间排好序依次当解码时间，
  // 再整体往前挪 delay，保证每一帧「显示 − 解码」≥ 0（ctts 版本 0 只能存非负数），挪掉的 delay 用编辑表（elst）补回来。
  function timing(samples) {
    const pts = samples.map((s) => s.pts);
    const sorted = [...pts].sort((a, b) => a - b);
    let delay = 0;
    pts.forEach((p, i) => (delay = Math.max(delay, sorted[i] - p)));
    const dts = sorted.map((t) => t - delay);
    const last = samples[samples.length - 1];
    const tail = last.duration ?? (samples.length > 1 ? dts[dts.length - 1] - dts[dts.length - 2] : 0);
    const durations = dts.map((t, i) => (i + 1 < dts.length ? dts[i + 1] - t : tail));
    const offsets = pts.map((p, i) => p - dts[i]);
    // 均匀帧率下，显示时长 = 最后显示的那一帧 + 一帧 − 第一帧，正好等于解码时长
    return { durations, offsets, delay, start: sorted[0], length: dts[dts.length - 1] + tail - dts[0] };
  }

  // 游程编码：相同的值连成一段 [次数, 值]
  function runs(values) {
    const out = [];
    for (const v of values) {
      const tail = out[out.length - 1];
      if (tail && tail[1] === v) tail[0]++;
      else out.push([1, v]);
    }
    return out;
  }

  // 按解码时间把样本切成半秒一块；返回 [{ track, first, count, start（秒） }]
  function chunksOf(track, ti, t) {
    const out = [];
    let dts = 0;
    let cur = null;
    track.samples.forEach((s, i) => {
      const sec = dts / track.timescale;
      if (!cur || sec - cur.start >= CHUNK_SECONDS) {
        cur = { track: ti, first: i, count: 0, start: sec };
        out.push(cur);
      }
      cur.count++;
      dts += t.durations[i];
    });
    return out;
  }

  // ---------- 样本描述（stsd 里那一条） ----------
  function videoEntry(tr) {
    return box(
      tr.codec,
      zeros(6),
      u16(1), // data_reference_index
      zeros(16),
      u16(tr.width),
      u16(tr.height),
      u32(0x00480000), // 72 dpi
      u32(0x00480000),
      u32(0),
      u16(1), // frame_count
      zeros(32), // compressorname
      u16(0x0018),
      u16(0xffff),
      box("avcC", [...tr.config]),
      box("pasp", u32(1), u32(1)),
    );
  }

  // MPEG-4 描述符长度用 4 字节的扩展写法，不用管 127 字节的分界
  const descriptor = (tag, ...content) => {
    const body = content.flat(Infinity);
    return [tag, 0x80 | ((body.length >> 21) & 0x7f), 0x80 | ((body.length >> 14) & 0x7f), 0x80 | ((body.length >> 7) & 0x7f), body.length & 0x7f, ...body];
  };

  function audioEntry(tr) {
    const head = [zeros(6), u16(1), zeros(8), u16(tr.channels), u16(16), u16(0), u16(0), u32(tr.sampleRate * 0x10000)];
    if (tr.codec === "mp4a") {
      const esds = full(
        "esds",
        0,
        0,
        descriptor(
          0x03,
          u16(0), // ES_ID
          u8(0),
          descriptor(0x04, u8(0x40), u8(0x15), [0, 0, 0], u32(tr.bitrate || 0), u32(tr.bitrate || 0), descriptor(0x05, [...tr.config])),
          descriptor(0x06, u8(0x02)),
        ),
      );
      return box("mp4a", head, esds);
    }
    // Opus in ISOBMFF：dOps 是 OpusHead 去掉魔数、改成大端；单声道 / 立体声用映射族 0
    const dOps = box("dOps", u8(0), u8(tr.channels), u16(tr.preSkip), u32(tr.inputSampleRate || tr.sampleRate), u16(0), u8(0));
    return box("Opus", head, dOps);
  }

  // ---------- 整个文件 ----------
  function mux({ tracks }) {
    if (!tracks.length) throw new Error("没有轨道");
    const times = tracks.map((tr) => {
      if (!tr.samples.length) throw new Error(`${tr.kind} 轨没有样本`);
      return timing(tr.samples);
    });
    const order = tracks
      .flatMap((tr, ti) => chunksOf(tr, ti, times[ti]))
      .sort((a, b) => a.start - b.start || a.track - b.track);

    // 先按 32 位偏移排一次 moov 算大小；文件超过 4 GB 时改成 co64 再排一次
    const build = (wide, base) => {
      const offsets = tracks.map(() => []);
      let at = base;
      for (const ch of order) {
        offsets[ch.track].push(at);
        const s = tracks[ch.track].samples;
        for (let i = ch.first; i < ch.first + ch.count; i++) at += s[i].data.byteLength;
      }
      return { moov: moovBox(tracks, times, order, offsets, wide), end: at };
    };
    const ftyp = box("ftyp", fourcc("isom"), u32(0x200), fourcc("isom"), fourcc("iso2"), fourcc("avc1"), fourcc("mp41"));
    const payload = tracks.reduce((n, tr) => n + tr.samples.reduce((m, s) => m + s.data.byteLength, 0), 0);
    const largeMdat = payload + 8 > 0xffffffff;
    const mdatHead = largeMdat ? [...u32(1), ...fourcc("mdat"), ...u64(payload + 16)] : [...u32(payload + 8), ...fourcc("mdat")];
    // moov 的大小与偏移量互相依赖，但偏移只影响数值不影响长度，所以先用 0 当基准量出长度，再按真基准重排
    let wide = false;
    let moovLen = build(false, 0).moov.length;
    let laid = build(false, ftyp.length + moovLen + mdatHead.length);
    if (laid.end > 0xffffffff) {
      wide = true;
      moovLen = build(true, 0).moov.length;
      laid = build(true, ftyp.length + moovLen + mdatHead.length);
    }
    const head = new Uint8Array([...ftyp, ...laid.moov, ...mdatHead]);
    const parts = [head];
    for (const ch of order) {
      const s = tracks[ch.track].samples;
      for (let i = ch.first; i < ch.first + ch.count; i++) parts.push(s[i].data);
    }
    return { parts, size: head.length + payload, wide };
  }

  function moovBox(tracks, times, order, offsets, wide) {
    const toMovie = (tr, n) => Math.round((n * MOVIE_TIMESCALE) / tr.timescale);
    // 每条轨实际放出来的长度：Opus 开头 pre-skip 个样本是编码器预滚，解码后要丢掉，不算时长
    const shown = tracks.map((tr, i) => times[i].length - (tr.codec === "Opus" ? tr.preSkip : 0));
    const duration = Math.max(...tracks.map((tr, i) => toMovie(tr, times[i].start + shown[i])));
    const mvhd = full("mvhd", 0, 0, u32(0), u32(0), u32(MOVIE_TIMESCALE), u32(fits32(duration, "总时长")), u32(0x10000), u16(0x100), zeros(10), UNITY.map(u32), zeros(24), u32(tracks.length + 1));
    const traks = tracks.map((tr, ti) => {
      const t = times[ti];
      const id = ti + 1;
      const video = tr.kind === "video";
      const lead = toMovie(tr, t.start);
      const segment = toMovie(tr, shown[ti]);
      const tkhd = full("tkhd", 0, 3, u32(0), u32(0), u32(id), u32(0), u32(lead + segment), zeros(8), u16(0), u16(0), u16(video ? 0 : 0x100), u16(0), UNITY.map(u32), u32(video ? tr.width * 0x10000 : 0), u32(video ? tr.height * 0x10000 : 0));
      // 编辑表：轨道晚于 0 秒开始就先垫一段空白；媒体时间从 delay（B 帧挪掉的）+ pre-skip（Opus 预滚）开始放。
      // 都是 0 就不写，播放器默认从头放。
      const mediaTime = t.delay + (tr.codec === "Opus" ? tr.preSkip : 0);
      const edits = [...(lead ? [[lead, 0xffffffff]] : []), ...(lead || mediaTime ? [[segment, mediaTime]] : [])];
      const edts = edits.length ? box("edts", full("elst", 0, 0, u32(edits.length), edits.map(([d, m]) => [u32(d), u32(m), u32(0x10000)]))) : [];
      const mdhd = full("mdhd", 0, 0, u32(0), u32(0), u32(tr.timescale), u32(fits32(t.length, "轨道时长")), u16(0x55c4), u16(0));
      const hdlr = full("hdlr", 0, 0, u32(0), fourcc(video ? "vide" : "soun"), zeros(12), [...enc.encode(video ? "VideoHandler" : "SoundHandler"), 0]);
      const mhd = video ? full("vmhd", 0, 1, zeros(8)) : full("smhd", 0, 0, u16(0), u16(0));
      const dinf = box("dinf", full("dref", 0, 0, u32(1), full("url ", 0, 1)));
      const stts = full("stts", 0, 0, ...(() => {
        const r = runs(t.durations);
        return [u32(r.length), r.map(([n, d]) => [u32(n), u32(d)])];
      })());
      const ctts = t.offsets.some((o) => o) ? (() => {
        const r = runs(t.offsets);
        return full("ctts", 0, 0, u32(r.length), r.map(([n, o]) => [u32(n), u32(o)]));
      })() : [];
      const keys = tr.samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
      // 全是关键帧（声音）就不写 stss：规范里「没有 stss = 每个样本都是同步样本」
      const stss = keys.length === tr.samples.length ? [] : full("stss", 0, 0, u32(keys.length), keys.map(u32));
      const mine = order.filter((ch) => ch.track === ti);
      const stscRuns = [];
      mine.forEach((ch, i) => {
        const tail = stscRuns[stscRuns.length - 1];
        if (!tail || tail.count !== ch.count) stscRuns.push({ first: i + 1, count: ch.count });
      });
      const stsc = full("stsc", 0, 0, u32(stscRuns.length), stscRuns.map((r) => [u32(r.first), u32(r.count), u32(1)]));
      const stsz = full("stsz", 0, 0, u32(0), u32(tr.samples.length), tr.samples.map((s) => u32(s.data.byteLength)));
      const stco = wide ? full("co64", 0, 0, u32(offsets[ti].length), offsets[ti].map(u64)) : full("stco", 0, 0, u32(offsets[ti].length), offsets[ti].map(u32));
      const stsd = full("stsd", 0, 0, u32(1), video ? videoEntry(tr) : audioEntry(tr));
      const stbl = box("stbl", stsd, stts, ctts, stss, stsc, stsz, stco);
      return box("trak", tkhd, edts, box("mdia", mdhd, hdlr, box("minf", mhd, dinf, stbl)));
    });
    return box("moov", mvhd, traks);
  }

  globalThis.Mp4Mux = { mux };
})();
