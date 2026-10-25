// 短片播放器引擎：画布外框、封面、控制条（播放 / 进度条 / 时间 / 声音，可选导出与全屏）、时钟与声音排程。
// 宣传片（promo-film.js）的播放器原样搬过来，片子只管画面与声音内容：
//   window.mountFilm(root, {
//     classes: { screen, canvas, cover, coverIcon, coverText, bar, track, fill, time },  // 各部件的类名（片子自己的样式表里定义）
//     base, duration,               // 剧本秒数与真实秒数（真实秒 = 剧本秒 × duration / base）
//     width, height,                // 画布的设计尺寸，render 按这个坐标画
//     still,                        // 还没开始播时封面底下停的那一帧（剧本秒）
//     label,                        // 画布的 aria-label
//     cover: { text, again },       // 封面文字、播完后的封面文字
//     render(ctx, u),               // 画第 u 秒（剧本秒）
//     score,                        // 声音事件 [{ u, dur }]，按 u 排好序
//     createSynth(),                // 建声音：{ ctx: AudioContext, bus(), play(e, at, k, bus, skip), stream() }
//     fullscreen: true,             // 可选：全屏按钮（浏览器支持才出现）
//     record: { filename },         // 可选：导出视频按钮（MediaRecorder + captureStream 都有才出现）
//   }) → { seek, play, pause, render, refresh }（seek/render 用真实秒；refresh：没在播就重画一次）
(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.6 8Z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z"/></svg>',
    sound: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2Z"/><path class="ctl-btn__wave" d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12 3.8a6 6 0 0 1 0 8.4"/></svg>',
    mute: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2Z"/><path class="ctl-btn__wave" d="M10.5 6l4 4M14.5 6l-4 4"/></svg>',
    full: '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="ctl-btn__wave" d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
    save: '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="ctl-btn__wave" d="M8 2.5v8M4.8 7.4 8 10.6l3.2-3.2M3 13.5h10"/></svg>',
  };

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  function mountFilm(root, o) {
    const c = o.classes;
    const BASE = o.base;
    const W = o.width;
    const H = o.height;
    const duration = o.duration;
    const k = duration / BASE; // 真实秒 = 剧本秒 × k
    const score = o.score;

    const screen = el("div", c.screen);
    const canvas = el("canvas", c.canvas);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", o.label);
    const cover = el("button", c.cover, `<span class="${c.coverIcon}">${ICON.play}</span><span class="${c.coverText}">${o.cover.text}</span>`);
    cover.type = "button";
    screen.append(canvas, cover);

    const bar = el("div", c.bar);
    const playBtn = el("button", "ctl-btn ctl-btn--solid", ICON.play);
    playBtn.type = "button";
    playBtn.setAttribute("aria-label", "播放");
    const track = el("div", c.track);
    track.tabIndex = 0;
    track.setAttribute("role", "slider");
    track.setAttribute("aria-label", "播放进度");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(Math.round(duration)));
    const fill = el("span", c.fill);
    track.append(fill);
    const time = el("span", c.time);
    const soundBtn = el("button", "ctl-btn", ICON.sound);
    soundBtn.type = "button";
    soundBtn.setAttribute("aria-label", "静音");
    const saveBtn = el("button", "ctl-btn", ICON.save);
    saveBtn.type = "button";
    saveBtn.setAttribute("aria-label", "导出视频文件（实时录制一遍，带声音）");
    saveBtn.title = "导出视频文件（实时录制一遍，带声音）";
    const fullBtn = el("button", "ctl-btn", ICON.full);
    fullBtn.type = "button";
    fullBtn.setAttribute("aria-label", "全屏");
    bar.append(playBtn, track, time, soundBtn);
    if (o.record && window.MediaRecorder && canvas.captureStream) bar.append(saveBtn);
    if (o.fullscreen && root.requestFullscreen) bar.append(fullBtn);
    root.replaceChildren(screen, bar);

    const ctx = canvas.getContext("2d");
    let synth = null;
    let u = o.still; // 封面停在这一帧上
    let playing = false;
    let muted = false;
    let startU = 0;
    let startClock = 0;
    let busNode = null;
    let cursor = 0;
    let timer = 0;
    let raf = 0;
    let recorder = null;
    let started = false;

    const clock = () => (synth ? synth.ctx.currentTime : performance.now() / 1000);

    function size() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const target = recorder ? W : Math.round(clamp(rect.width * dpr, 320, 2560));
      if (canvas.width !== target) {
        canvas.width = target;
        canvas.height = Math.round((target * H) / W);
      }
    }

    function draw() {
      size();
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      o.render(ctx, started ? u : o.still);
      fill.style.transform = `scaleX(${started ? u / BASE : 0})`;
      const real = started ? u * k : 0;
      time.textContent = `${fmt(real)} / ${fmt(duration)}`;
      track.setAttribute("aria-valuenow", String(Math.round(real)));
    }

    // 预排声音：每 25ms 把接下来 0.3 秒里的事件交给 Web Audio
    function schedule() {
      if (!synth || !busNode) return;
      const now = synth.ctx.currentTime;
      const horizon = startU + (now - startClock) / k + 0.3 / k;
      while (cursor < score.length && score[cursor].u < horizon) {
        const e = score[cursor++];
        const at = startClock + (e.u - startU) * k;
        if (at < now - 0.02) {
          // 进度条拖到一个长音中间：长音从当下接着响，短音直接跳过
          const skip = now - at;
          if (e.dur && skip < e.dur * k) synth.play(e, now + 0.01, k, busNode, skip);
          continue;
        }
        synth.play(e, at, k, busNode);
      }
    }

    function tick() {
      if (!playing) return;
      u = startU + (clock() - startClock) / k;
      if (u >= BASE) {
        u = BASE;
        stop();
        cover.hidden = false;
        cover.querySelector(`.${c.coverText}`).textContent = o.cover.again;
        if (recorder) recorder.stop();
      }
      draw();
      if (playing) raf = requestAnimationFrame(tick);
    }

    function start(from) {
      if (!synth) {
        try {
          synth = o.createSynth();
        } catch {
          synth = null;
        }
      }
      if (synth && synth.ctx.state === "suspended") synth.ctx.resume();
      started = true;
      cover.hidden = true;
      u = from >= BASE ? 0 : from;
      startU = u;
      startClock = clock() + 0.05;
      if (synth) {
        busNode = synth.bus();
        busNode.gain.value = muted ? 0 : 1;
        cursor = 0;
        // 从中间开始时，把还在响的长音也算进来
        while (cursor < score.length && score[cursor].u + (score[cursor].dur || 0) < startU) cursor++;
        schedule();
        timer = setInterval(schedule, 25);
      }
      playing = true;
      playBtn.innerHTML = ICON.pause;
      playBtn.setAttribute("aria-label", "暂停");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      playing = false;
      clearInterval(timer);
      cancelAnimationFrame(raf);
      if (busNode && synth) {
        const b = busNode;
        const t = synth.ctx.currentTime;
        b.gain.cancelScheduledValues(t);
        b.gain.setValueAtTime(b.gain.value, t);
        b.gain.linearRampToValueAtTime(0, t + 0.06);
        setTimeout(() => b.disconnect(), 200);
        busNode = null;
      }
      playBtn.innerHTML = ICON.play;
      playBtn.setAttribute("aria-label", "播放");
    }

    function seek(to) {
      const was = playing;
      if (was) stop();
      started = true;
      cover.hidden = true;
      u = clamp(to, 0, BASE);
      draw();
      if (was) start(u);
    }

    cover.addEventListener("click", () => start(u >= BASE || !started ? 0 : u));
    playBtn.addEventListener("click", () => (playing ? stop() : start(u >= BASE || !started ? 0 : u)));
    soundBtn.addEventListener("click", () => {
      muted = !muted;
      soundBtn.innerHTML = muted ? ICON.mute : ICON.sound;
      soundBtn.setAttribute("aria-label", muted ? "打开声音" : "静音");
      if (busNode) busNode.gain.setTargetAtTime(muted ? 0 : 1, synth.ctx.currentTime, 0.02);
    });
    fullBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen().catch(() => {});
    });
    saveBtn.addEventListener("click", () => {
      if (recorder) return;
      if (playing) stop();
      start(0);
      if (!synth) return;
      const stream = canvas.captureStream(60);
      synth.stream().getAudioTracks().forEach((t) => stream.addTrack(t));
      const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12_000_000 });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${o.record.filename}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        recorder = null;
        root.removeAttribute("data-recording");
        draw();
      };
      root.setAttribute("data-recording", "true");
      recorder.start(1000);
    });

    // 进度条：点、拖、方向键
    const seekFromPointer = (e) => {
      const r = track.getBoundingClientRect();
      seek(clamp((e.clientX - r.left) / r.width, 0, 1) * BASE);
    };
    track.addEventListener("pointerdown", (e) => {
      if (recorder) return;
      track.setPointerCapture(e.pointerId);
      seekFromPointer(e);
      const move = (ev) => seekFromPointer(ev);
      track.addEventListener("pointermove", move);
      track.addEventListener("pointerup", () => track.removeEventListener("pointermove", move), { once: true });
    });
    track.addEventListener("keydown", (e) => {
      if (recorder) return;
      const step = 3 / k;
      if (e.key === "ArrowRight") seek(u + step);
      else if (e.key === "ArrowLeft") seek(u - step);
      else if (e.key === "Home") seek(0);
      else if (e.key === "End") seek(BASE);
      else return;
      e.preventDefault();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && playing && !recorder) stop();
    });
    const refresh = () => playing || draw();
    new ResizeObserver(refresh).observe(canvas);
    if (document.fonts) document.fonts.ready.then(refresh);
    draw();
    return {
      seek: (s) => seek(s / k),
      play: () => start(u >= BASE || !started ? 0 : u),
      pause: stop,
      render: (s) => {
        started = true;
        cover.hidden = true;
        u = clamp(s / k, 0, BASE);
        draw();
      },
      refresh,
    };
  }

  window.mountFilm = mountFilm;
})();
