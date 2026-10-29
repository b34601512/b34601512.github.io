// 离线出片的页内驱动（issue #15）：tools/export-films.mjs 把它和 film-export.js / mp4-mux.js / mp4-inspect.js 一起注进片子页面。
// 片子的选项（画面 render、镜头、声音 score / createSynth）由工具在页面加载前挂的钩子从 window.mountFilm 的调用里截下来，
// 画面一律走 film-engine.js 的 mountFilm.paint，和播放器画的是同一个函数。不进站点。
//
//   filmRun.go({ file, fps, bitrate, webm }) → { file, type, bytes, plan, filmSeconds, width, height, mp4?, decode? }
//     webm=true：不走 WebCodecs，直接实时录 WebM（只为测退路）；浏览器编不了 H.264 或声音时也自动走这条
//     出好的文件 POST 到同源的 /__save?name=…，工具写进输出目录
(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const WEBM_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

  // 片子的 Synth 在构造函数里自己 new AudioContext()：建的那一下把构造函数临时换成「交出 ac」，片子的声音代码一个字不用改
  function synthOn(o, ac) {
    const had = "webkitAudioContext" in window;
    const saved = [window.AudioContext, window.webkitAudioContext];
    // 不能用箭头函数：要能被 new，并且 new 出来的就是 ac 本身
    const Lend = function () {
      return ac;
    };
    window.AudioContext = window.webkitAudioContext = Lend;
    try {
      return o.createSynth();
    } finally {
      window.AudioContext = saved[0];
      if (had) window.webkitAudioContext = saved[1];
      else delete window.webkitAudioContext;
    }
  }

  // 声音事件按播放时同一条换算（真实秒 = 剧本秒 × k）从 at0 起一次排完
  function scoreOn(o, ac, at0) {
    const k = o.duration / o.base;
    const synth = synthOn(o, ac);
    const bus = synth.bus();
    for (const e of o.score) synth.play(e, at0 + e.u * k, k, bus);
  }

  // 退路：画布 + MediaRecorder 实时录一遍（片子多长就录多久）。声音接到 MediaStreamDestination 上：
  // 片子把总线接在 ctx.destination，这里把这个 context 的 destination 换成录音口。
  async function recordWebm(o, bitrate, fps) {
    const type = WEBM_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
    if (!type) throw new Error("这个浏览器既编不了 H.264，也录不了 WebM");
    const canvas = Object.assign(document.createElement("canvas"), { width: o.width, height: o.height });
    const g = canvas.getContext("2d");
    const ac = new AudioContext({ sampleRate: 48000 });
    await ac.resume();
    const tap = ac.createMediaStreamDestination();
    Object.defineProperty(ac, "destination", { value: tap });
    const k = o.duration / o.base;
    mountFilm.paint(g, o, 0);
    const stream = canvas.captureStream(fps);
    tap.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bitrate });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (e) => reject(e.error || new Error("录制被浏览器中断"));
    });
    const t0 = ac.currentTime + 0.1;
    scoreOn(o, ac, t0);
    recorder.start(1000);
    let shown = -1;
    await new Promise((resolve) => {
      const frame = () => {
        const t = ac.currentTime - t0;
        mountFilm.paint(g, o, clamp(t, 0, o.duration) / k);
        const pct = Math.floor(clamp(t / o.duration, 0, 1) * 100);
        if (pct !== shown && pct % 5 === 0) console.log(`[film] ${(shown = pct)}%`);
        if (t >= o.duration + 0.1) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    recorder.stop();
    await stopped;
    ac.close();
    return new Blob(chunks, { type: recorder.mimeType });
  }

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
    const support = await Dec.isConfigSupported(config).catch(() => ({ supported: false }));
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

  async function go({ file, fps, bitrate, webm }) {
    const o = window.__filmOptions;
    if (!o || o.clock === "frame") throw new Error("这一页没有画布短片");
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 800)); // 小精灵等图片加载完（封面帧要用）
    const k = o.duration / o.base;
    const plan = webm ? null : await filmExport.plan({ width: o.width, height: o.height, fps, bitrate }).catch(() => null);
    let blob;
    if (plan) {
      let shown = -1;
      blob = await filmExport.encode({
        plan,
        width: o.width,
        height: o.height,
        fps,
        seconds: o.duration,
        paint: (g, t) => mountFilm.paint(g, o, t / k),
        sound: (ac) => scoreOn(o, ac, 0),
        progress(r) {
          const pct = Math.floor(r * 100);
          if (pct !== shown && pct % 5 === 0) console.log(`[film] ${(shown = pct)}%`);
        },
      });
    } else {
      blob = await recordWebm(o, bitrate, fps);
    }
    const name = `${file}.${plan ? "mp4" : "webm"}`;
    const out = { file: name, type: blob.type, bytes: blob.size, plan: plan && { video: plan.video.codec, audio: plan.audio.codec }, filmSeconds: o.duration, width: o.width, height: o.height };
    if (plan) {
      console.log("[film] 拆开核对、整条解码一遍……");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const info = Mp4Inspect.inspect(bytes);
      out.mp4 = Mp4Inspect.summary(info);
      const video = info.tracks.find((t) => t.handler === "vide");
      const audio = info.tracks.find((t) => t.handler === "soun");
      out.decode = { video: video ? await decodeAll(bytes, video) : null, audio: audio ? await decodeAll(bytes, audio) : null };
    }
    const res = await fetch(`/__save?name=${encodeURIComponent(name)}`, { method: "POST", body: blob });
    if (!res.ok) throw new Error(`写文件失败：HTTP ${res.status}`);
    return out;
  }

  window.filmRun = { go };
})();
