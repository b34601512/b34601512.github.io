// 离线导出自检（check-export.html，issue #15）：走和导出按钮同一条路（film-engine 的 exportVideo）把宣传片导出一遍，
// 再用三种互相独立的办法核对这个文件：mp4-inspect 拆盒子对样本表；WebCodecs 解码器把每一帧、每一包声音都解一遍；
// <video> 读一次元数据（浏览器自己的 MP4 解析器认不认）。结果是一段 JSON，打到控制台和页面上。
// 地址带 ?s=秒数 把宣传片压短（只为跑得快），带 ?auto 打开就跑（无人值守的探针用）。
(() => {
  const params = new URLSearchParams(location.search);
  const root = document.querySelector("[data-promo-film]");
  const seconds = Number(params.get("s"));
  // 本脚本排在 promo-film.js 前面（都是 defer，按顺序执行），所以改片长赶在宣传片挂载之前
  if (seconds) root.dataset.duration = String(seconds);
  const runButton = document.getElementById("export-run");
  const fileLink = document.getElementById("export-file");
  const log = document.getElementById("export-log");
  let fileUrl = "";

  const show = (text) => (log.textContent = text);

  // esds 里取 AudioSpecificConfig：DecSpecificInfo（标签 0x05），长度是 1–4 字节的 7 位分段写法
  function ascFromEsds(esds) {
    for (let i = 0; i < esds.length; i++) {
      if (esds[i] !== 0x05) continue;
      let len = 0;
      let j = i + 1;
      for (let n = 0; n < 4; n++, j++) {
        len = (len << 7) | (esds[j] & 0x7f);
        if (!(esds[j] & 0x80)) break;
      }
      return esds.slice(j + 1, j + 1 + len);
    }
    return null;
  }

  // 把一条轨的样本全部交给解码器，数解出来多少帧 / 多少声音样本
  async function decodeAll(bytes, t) {
    const video = t.handler === "vide";
    let frames = 0;
    let errors = 0;
    let firstError = "";
    const Dec = video ? VideoDecoder : AudioDecoder;
    const dec = new Dec({
      output(out) {
        frames += video ? 1 : out.numberOfFrames;
        out.close();
      },
      error(e) {
        errors++;
        firstError ||= e.message;
      },
    });
    const config = video
      ? { codec: t.profile, description: t.config, codedWidth: t.width, codedHeight: t.height }
      : t.codec === "mp4a"
        ? { codec: "mp4a.40.2", sampleRate: t.sampleRate, numberOfChannels: t.channels, description: ascFromEsds(t.config) }
        : { codec: "opus", sampleRate: t.sampleRate, numberOfChannels: t.channels };
    const support = await Dec.isConfigSupported(config).catch((e) => ({ supported: false, why: e.message }));
    if (!support.supported) return { supported: false, codec: config.codec };
    dec.configure(config);
    const Chunk = video ? EncodedVideoChunk : EncodedAudioChunk;
    const { sizes, offsets, pts, keys } = t.table;
    for (let i = 0; i < sizes.length; i++) {
      dec.decode(
        new Chunk({
          type: !keys || keys.has(i) ? "key" : "delta",
          timestamp: Math.round((pts[i] * 1e6) / t.timescale),
          data: bytes.subarray(offsets[i], offsets[i] + sizes[i]),
        }),
      );
      if (dec.decodeQueueSize > 16) await new Promise((r) => dec.addEventListener("dequeue", r, { once: true }));
    }
    await dec.flush().catch((e) => {
      errors++;
      firstError ||= e.message;
    });
    if (dec.state !== "closed") dec.close();
    return video ? { samples: sizes.length, frames, errors, firstError } : { packets: sizes.length, sampleFrames: frames, seconds: Number((frames / t.sampleRate).toFixed(3)), errors, firstError };
  }

  // 浏览器自己的播放器读一遍元数据。Chrome 不给后台标签页里新建的 <video> 加载媒体（切回来也不补），
  // 所以导出途中切走了的话，这一步等回到这个标签页再做；再加个超时，怎样都不会卡住自检。
  async function playerSees(blob) {
    if (document.hidden) await new Promise((r) => document.addEventListener("visibilitychange", r, { once: true }));
    return new Promise((resolve) => {
      const v = document.createElement("video");
      const url = URL.createObjectURL(blob);
      const timer = setTimeout(() => finish({ error: "15 秒内没读到元数据" }), 15000);
      const finish = (r) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(r);
      };
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => finish({ duration: Number(v.duration.toFixed(3)), width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => finish({ error: v.error?.message || `MediaError ${v.error?.code}` });
      v.src = url;
    });
  }

  async function run() {
    runButton.disabled = true;
    show("正在导出……（宣传片左上角有进度）");
    const film = root.promoFilm;
    const hidden = [];
    const onVis = () => document.hidden && hidden.push(performance.now());
    document.addEventListener("visibilitychange", onVis);
    const report = {
      userAgent: navigator.userAgent,
      webcodecs: Boolean(window.filmExport?.available()),
      filmSeconds: Number(root.dataset.duration),
    };
    try {
      const began = performance.now();
      const result = await film.exportVideo({ save: false });
      report.wallSeconds = Number(((performance.now() - began) / 1000).toFixed(2));
      report.hiddenDuringExport = hidden.length;
      if (!result) {
        report.route = "MediaRecorder（实时录制，这个浏览器编不了 H.264 或声音）";
        report.ok = false;
        return;
      }
      report.route = "离线编码（WebCodecs + 自己拼 MP4）";
      report.speed = `${(report.filmSeconds / report.wallSeconds).toFixed(2)}× 实时`;
      report.plan = { video: result.plan.video.codec, audio: result.plan.audio.codec };
      report.bytes = result.blob.size;
      report.megabytes = Number((result.blob.size / 1048576).toFixed(2));
      show("导出完了，正在拆开文件核对、整条解码一遍……");
      const bytes = new Uint8Array(await result.blob.arrayBuffer());
      const info = Mp4Inspect.inspect(bytes);
      report.mp4 = Mp4Inspect.summary(info);
      const video = info.tracks.find((t) => t.handler === "vide");
      const audio = info.tracks.find((t) => t.handler === "soun");
      report.frames = video?.samples ?? 0;
      report.expectedFrames = Math.round(report.filmSeconds * 60);
      report.decode = {
        video: video ? await decodeAll(bytes, video) : null,
        audio: audio ? await decodeAll(bytes, audio) : null,
      };
      show(document.hidden ? "解码完了，回到这个标签页就让浏览器的播放器读一遍……" : "解码完了，正在让浏览器的播放器读一遍……");
      report.player = await playerSees(result.blob);
      const dv = report.decode.video;
      report.ok =
        !info.problems.length &&
        report.frames === report.expectedFrames &&
        Boolean(dv?.frames === report.frames && !dv.errors) &&
        Boolean(report.decode.audio && !report.decode.audio.errors && report.decode.audio.sampleFrames > 0) &&
        Math.abs((report.player.duration ?? 0) - report.filmSeconds) < 0.1;
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      fileUrl = URL.createObjectURL(result.blob);
      fileLink.href = fileUrl;
      fileLink.download = "导出自检.mp4";
      fileLink.hidden = false;
    } catch (e) {
      report.ok = false;
      report.error = `${e?.name || "Error"}: ${e?.message || e}`;
    } finally {
      document.removeEventListener("visibilitychange", onVis);
      const text = JSON.stringify(report, null, 2);
      console.log(`[check-export] ${report.ok ? "通过" : "没通过"}\n${text}`);
      show(`${report.ok ? "通过" : "没通过"}\n${text}`);
      document.documentElement.dataset.checkExport = report.ok ? "pass" : "fail";
      runButton.disabled = false;
    }
  }

  runButton.addEventListener("click", run);
  // promo-film.js 挂载完（排在本脚本后面）才有 root.promoFilm，所以等 DOMContentLoaded
  if (params.has("auto")) document.addEventListener("DOMContentLoaded", run);
})();
