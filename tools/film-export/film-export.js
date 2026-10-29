// 离线编码（issue #15）：一帧一帧把短片画好交给 WebCodecs 编码，声音用 OfflineAudioContext 一次算完再编码，
// 最后用 mp4-mux.js 拼成 MP4。和播放完全脱钩：不用播放、不用等真实时间，机器多快就多快。
// 不进站点：只由离线出片工具（tools/export-films.mjs）注进片子页面里跑（run.js 调它）。
//
// 片子画什么、响什么都不归这里管：run.js 把「第 t 秒画到这块画布上」（film-engine.js 的 mountFilm.paint）和「把声音排到这个 AudioContext 上」交进来。
//
//   filmExport.available()                          // 浏览器有没有 WebCodecs 这一套（没有就由 run.js 实时录 WebM）
//   filmExport.plan({ width, height, fps, bitrate }) → Promise<plan | null>   // 挑浏览器真能编的格式；null = 编不了 H.264 或声音
//   filmExport.encode({ plan, width, height, fps, seconds, paint(ctx, t), sound(audioCtx), progress(ratio), signal })
//     → Promise<Blob>（video/mp4）；signal 放弃时抛 AbortError，编码器一律关掉
(() => {
  // H.264 从高到低试：先 High（同码率画质最好），硬件编码器不认再降。
  // 级别 4.2 够 1080×1920 / 1920×1080 的 60 帧；有的编码器只报 5.1，所以两种都试。
  const AVC = ["avc1.64002A", "avc1.640033", "avc1.4D002A", "avc1.4D0033", "avc1.42002A", "avc1.420033"];
  // 声音先 AAC（抖音等平台最认），编不了再 Opus（Linux 版 Chrome 就编不了 AAC），两种都装进 MP4
  const AUDIO = [
    { codec: "mp4a.40.2", box: "mp4a" },
    { codec: "opus", box: "Opus" },
  ];
  const RATE = 48000;
  const CHANNELS = 2;
  const AUDIO_BITRATE = 192_000;
  const KEY_EVERY = 2; // 每 2 秒一个关键帧：拖进度条、平台转码都够用，又不至于把文件撑大
  const QUEUE = 8; // 编码器手里最多压这么多帧，多了就等它消化（不然几千帧全堆在内存里）
  const AUDIO_BLOCK = RATE; // 声音每次交给编码器 1 秒

  const available = () => Boolean(window.VideoEncoder && window.AudioEncoder && window.VideoFrame && window.AudioData && window.OfflineAudioContext);

  async function plan({ width, height, fps, bitrate }) {
    if (!available()) return null;
    const pick = async (Enc, configs) => {
      for (const c of configs) {
        const r = await Enc.isConfigSupported(c.config).catch(() => null);
        if (r?.supported) return c;
      }
      return null;
    };
    const video = await pick(
      VideoEncoder,
      AVC.map((codec) => ({ config: { codec, width, height, bitrate, framerate: fps, avc: { format: "avc" } } })),
    );
    const audio = await pick(
      AudioEncoder,
      AUDIO.map((a) => ({ box: a.box, config: { codec: a.codec, sampleRate: RATE, numberOfChannels: CHANNELS, bitrate: AUDIO_BITRATE } })),
    );
    return video && audio ? { video: video.config, audio: audio.config, audioBox: audio.box } : null;
  }

  // WebCodecs 给的 description 可能是 ArrayBuffer，也可能是某种视图；复制一份，编码器关了也还在
  function copyBytes(src) {
    return ArrayBuffer.isView(src) ? new Uint8Array(src.buffer, src.byteOffset, src.byteLength).slice() : new Uint8Array(src).slice();
  }

  // 让出一下主线程：进度字条才画得出来，页面也不卡。用 MessageChannel 而不是 setTimeout——
  // 后台标签页里 setTimeout 会被压到每秒一次，导出就慢成蜗牛了。
  const nextTask = () =>
    new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => resolve();
      ch.port2.postMessage(0);
    });

  async function encode(job) {
    const { plan: p, width, height, fps, seconds, signal } = job;
    const frames = Math.round(seconds * fps);
    const scale = 1000; // 画面轨的时间单位：每帧 1000（timescale = fps × 1000），帧号换时间没有舍入
    const encoders = [];

    // 编码器报错、访客放弃、或者这一次已经结束：所有在等的地方一起醒过来，统一往外抛。
    // 结束以后 check() 也会抛——声音可能比画面晚算完，这时不能再新建编码器（finally 已经关过一轮了）。
    let over = null;
    let stop;
    const stopped = new Promise((_, reject) => (stop = reject));
    stopped.catch(() => {});
    const fail = (e) => {
      over ||= e;
      stop(e);
    };
    const onAbort = () => fail(new DOMException("导出已取消", "AbortError"));
    signal?.addEventListener("abort", onAbort);
    const check = () => {
      if (over) throw over;
    };
    const wait = (promise) => Promise.race([promise, stopped]);

    try {
      if (signal?.aborted) onAbort();
      check();
      // 声音和画面同时开工：OfflineAudioContext 在音频线程上算，不占画画的主线程
      const soundDone = wait(encodeSound());
      soundDone.catch(() => {}); // 画面先失败时，这里的失败由下面的 finally 收尾，不算未处理
      const video = await encodeVideo();
      const audio = await soundDone;
      check();
      const { parts } = Mp4Mux.mux({ tracks: [video, audio] });
      return new Blob(parts, { type: "video/mp4" });
    } finally {
      over ||= new DOMException("导出已结束", "AbortError");
      signal?.removeEventListener("abort", onAbort);
      for (const e of encoders) if (e.state !== "closed") e.close();
    }

    async function encodeVideo() {
      const samples = [];
      let config = null;
      const enc = new VideoEncoder({
        output(chunk, meta) {
          if (!config && meta?.decoderConfig?.description) config = copyBytes(meta.decoderConfig.description);
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          // 帧号从时间戳反推（B 帧时编码器吐出来的顺序不是帧号顺序）
          samples.push({ data, pts: Math.round((chunk.timestamp * fps) / 1e6) * scale, key: chunk.type === "key" });
        },
        error: fail,
      });
      encoders.push(enc);
      enc.configure(p.video);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const dequeued = () => new Promise((resolve) => enc.addEventListener("dequeue", resolve, { once: true }));
      for (let i = 0; i < frames; i++) {
        check();
        job.paint(ctx, i / fps);
        const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
        enc.encode(frame, { keyFrame: i % (KEY_EVERY * fps) === 0 });
        frame.close();
        job.progress?.((i + 1) / frames);
        // 编码器忙不过来就等它吐一帧；不忙也每 8 帧让一下主线程。老浏览器没有 dequeue 事件就一直让着等。
        if (enc.encodeQueueSize > QUEUE) {
          while (enc.encodeQueueSize > QUEUE) await wait("ondequeue" in enc ? dequeued() : nextTask());
        } else if (i % 8 === 7) await wait(nextTask());
      }
      await wait(enc.flush());
      if (!config) throw new Error("编码器没有给出 H.264 的 avcC");
      samples[samples.length - 1].duration = scale;
      return { kind: "video", codec: "avc1", width, height, timescale: fps * scale, config, samples };
    }

    async function encodeSound() {
      const ac = new OfflineAudioContext({ numberOfChannels: CHANNELS, length: Math.ceil(seconds * RATE), sampleRate: RATE });
      job.sound(ac);
      const buffer = await ac.startRendering();
      check();
      const samples = [];
      let config = null;
      const enc = new AudioEncoder({
        output(chunk, meta) {
          if (!config && meta?.decoderConfig?.description) config = copyBytes(meta.decoderConfig.description);
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          samples.push({ data, pts: Math.round((chunk.timestamp * RATE) / 1e6), duration: Math.round((chunk.duration * RATE) / 1e6), key: true });
        },
        error: fail,
      });
      encoders.push(enc);
      enc.configure(p.audio);
      const planes = Array.from({ length: CHANNELS }, (_, c) => buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1)));
      for (let at = 0; at < buffer.length; at += AUDIO_BLOCK) {
        check();
        const n = Math.min(AUDIO_BLOCK, buffer.length - at);
        const data = new Float32Array(n * CHANNELS);
        planes.forEach((plane, c) => data.set(plane.subarray(at, at + n), c * n));
        const chunk = new AudioData({ format: "f32-planar", sampleRate: RATE, numberOfFrames: n, numberOfChannels: CHANNELS, timestamp: Math.round((at * 1e6) / RATE), data });
        enc.encode(chunk);
        chunk.close();
      }
      await wait(enc.flush());
      // mux 按样本之间的时间差算时长，只有最后一包要自己报；编码器没给时长就沿用前一包
      const last = samples[samples.length - 1];
      if (!last.duration && samples.length > 1) last.duration = last.pts - samples[samples.length - 2].pts;
      const track = { kind: "audio", codec: p.audioBox, channels: CHANNELS, sampleRate: RATE, timescale: RATE, bitrate: AUDIO_BITRATE, samples };
      if (p.audioBox === "mp4a") return { ...track, config: config || aacConfig() };
      // Opus：编码器给的是 OpusHead（小端），从里面取 pre-skip；没给就当 0（开头多响几毫秒的静音，不影响同步）
      const head = config && new DataView(config.buffer);
      return { ...track, preSkip: head && config.byteLength >= 12 ? head.getUint16(10, true) : 0 };
    }
  }

  // 编码器没给 AudioSpecificConfig 时自己拼：AAC-LC（2）、48 kHz（采样率表第 3 项）、声道数
  function aacConfig() {
    const freq = 3;
    return new Uint8Array([(2 << 3) | (freq >> 1), ((freq & 1) << 7) | (CHANNELS << 3)]);
  }

  window.filmExport = { available, plan, encode };
})();
