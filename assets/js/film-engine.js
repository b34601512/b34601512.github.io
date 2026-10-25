// 短片播放器引擎：宣传片（promo-film.js）与「怎么用」短片（guide-film.js）共用这一套，片子只管画面与声音内容。
// 两部片子的播放语义不同（时钟、声音、片尾、进度条、控件来源……），引擎不替它们统一，而是按选项走：
//
// 公共选项
//   base, duration                // 剧本秒数与真实秒数（真实秒 = 剧本秒 × duration / base）
//   still                         // 还没开始播时停的那一帧（剧本秒）
//   score, createSynth()          // 声音事件 [{ u, … }]（按 u 排好序）与建声音的函数（见下面两种时钟各自的约定）
//
// 宣传片（默认：clock 不写）——画布 + 引擎自己生成控件 + 声音时钟：
//   classes: { screen, canvas, cover, coverIcon, coverText, bar, track, fill, time },  // 各部件的类名（片子自己的样式表里定义）
//   width, height,                // 画布的设计尺寸，render 按这个坐标画
//   label,                        // 画布的 aria-label
//   cover: { text, again },       // 封面文字、播完后的封面文字
//   render(ctx, u),               // 画第 u 秒（剧本秒）
//   createSynth() → { ctx: AudioContext, bus(), play(e, at, k, bus, skip), stream() }
//   fullscreen: true,             // 可选：全屏按钮（浏览器支持才出现）
//   record: { filename },         // 可选：导出视频按钮（MediaRecorder + captureStream 都有才出现）
//   → { seek, play, pause, render, refresh }（seek/render 用真实秒；refresh：没在播就重画一次）
//
// 「怎么用」短片（clock: "frame"）——DOM 舞台 + 页面里写死的控件 + 逐帧时钟：
//   controls: { play, track, fill, time },   // 页面上已有的元素（播放键用 data-playing 切两个图标）
//   render(u),                    // 把舞台画成第 u 秒
//   layout(),                     // 舞台尺寸变了：重新量；返回 false 表示量不到（不重画）
//   end: { at, label },           // 播到 at 秒停在这一帧，播放键文字换成 label（没有封面）
//   maxStep,                      // 每帧最多走几秒（切回标签页时不跳一大段）
//   lookahead,                    // 声音每帧提前排几秒
//   createSynth() → { ctx, out, play(e, at, bus), silence(when) }
//   sound: { button, hint, key, labels: { on, off, locked }, gate },  // 三态声音键 + 「点一下打开声音」，选择存 localStorage[key]
//   switches: [{ button, key, initial, label(on), change(on) }],       // 其它开关（特效），选择存 localStorage[key]
//   chapters: { buttons, start(n), current(u), jumped() },            // 章节按钮（data-chapter）：点了跳过去接着播
//   autoplay: { threshold, paused },  // 进入视野（IntersectionObserver）且标签页可见时自动播；paused：开始时算访客已暂停
//   → {}（「怎么用」短片不需要从外面控制）
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

  // 访客的选择记在 localStorage；读不到、写不了（隐私模式）就只管这一次。
  const load = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const save = (key, on) => {
    try {
      localStorage.setItem(key, on ? "on" : "off");
    } catch {
      /* 存不了就只管这一次 */
    }
  };

  // ---------- 两部片子共用：进度条显示 ----------
  // 宣传片：填充用 scaleX、读数四舍五入；「怎么用」：填充用宽度百分比、读数取整秒，另带 aria-valuetext。
  function showProgress({ track, fill, time }, real, ratio, total, style) {
    if (fill) {
      if (style.width) fill.style.width = `${(ratio * 100).toFixed(2)}%`;
      else fill.style.transform = `scaleX(${ratio})`;
    }
    const label = `${fmt(real)} / ${fmt(total)}`;
    if (time) time.textContent = label;
    if (track) {
      track.setAttribute("aria-valuenow", String(style.floor ? Math.floor(real) : Math.round(real)));
      if (style.valuetext) track.setAttribute("aria-valuetext", label);
    }
  }

  // ---------- 两部片子共用：进度条的点、拖、方向键 ----------
  //   locked()      为真时不响应（宣传片录制中）
  //   touch()       响应之前先做的事（「怎么用」：放行声音）
  //   once          只在按下时量一次进度条位置（「怎么用」）；否则每次移动都重新量（宣传片）
  //   toRatio(r)    跳到进度条上比例 r 的位置
  //   key(name)     方向键对应的目标秒；不认的键返回 undefined
  function wireTrack(track, w) {
    track.addEventListener("pointerdown", (e) => {
      if (w.locked?.()) return;
      w.touch?.();
      const fixed = w.once ? track.getBoundingClientRect() : null;
      const move = (ev) => {
        const r = fixed || track.getBoundingClientRect();
        w.toRatio((ev.clientX - r.left) / r.width);
      };
      // 抓指针与第一次跳转的先后照两部片子各自原来的写法（浏览器里看不出差别，保留是为了新旧逐条对得上）
      if (!w.once) track.setPointerCapture(e.pointerId);
      move(e);
      if (w.once) track.setPointerCapture(e.pointerId);
      track.addEventListener("pointermove", move);
      track.addEventListener("pointerup", () => track.removeEventListener("pointermove", move), { once: true });
    });
    track.addEventListener("keydown", (e) => {
      if (w.locked?.()) return;
      const to = w.key(e.key);
      if (to === undefined) return;
      w.touch?.();
      w.seek(to);
      e.preventDefault();
    });
  }

  function mountFilm(root, o) {
    return o.clock === "frame" ? mountFrame(root, o) : mountCanvas(root, o);
  }

  // ---------- 宣传片：画布、引擎生成的控件、以声音时钟为准 ----------
  function mountCanvas(root, o) {
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
      showProgress({ track, fill, time }, started ? u * k : 0, started ? u / BASE : 0, duration, {});
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

    wireTrack(track, {
      locked: () => recorder,
      toRatio: (r) => seek(clamp(r, 0, 1) * BASE),
      key: (name) => ({ ArrowRight: u + 3 / k, ArrowLeft: u - 3 / k, Home: 0, End: BASE })[name],
      seek,
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

  // ---------- 「怎么用」短片：DOM 舞台、页面里的控件、逐帧时钟 ----------
  function mountFrame(stage, o) {
    const { play: playButton, track, fill, time: timeLabel } = o.controls;
    const DURATION = o.duration;
    const END = o.end.at;
    const score = o.score;
    const chapters = o.chapters;
    const stepButtons = chapters ? [...chapters.buttons] : [];

    let time = o.still;
    let playing = false;
    let userPaused = Boolean(o.autoplay?.paused);
    let ended = false;
    let onScreen = false;
    let lastNow = 0;
    let raf = 0;

    // 其它开关（特效）：默认值由片子给；访客点过以后以访客为准，记在 localStorage。
    const switches = (o.switches || []).map((s) => {
      const saved = load(s.key);
      const sw = { ...s, on: saved ? saved === "on" : s.initial };
      sw.change(sw.on);
      return sw;
    });
    function syncSwitch(sw) {
      if (!sw.button) return;
      sw.button.hidden = false;
      sw.button.setAttribute("aria-pressed", String(sw.on));
      sw.button.setAttribute("aria-label", sw.label(sw.on));
      sw.button.title = sw.button.getAttribute("aria-label"); // 图标按钮，悬停时把字说出来
    }

    // 声音：默认开，选择记在 localStorage。浏览器只许在用户有过一次操作之后出声，所以页面打开时一定是静的：
    // 自动播放的画面没有声音，访客在页面任何地方第一次点一下 / 按一个键之后才建 AudioContext，
    // 从短片当时的位置接着响（不重放画面，不补已经过去的音）。
    // 还没放行时挂一个「点一下打开声音」，放行或静音后就收起来。
    // 静音时一个音频节点都不建（连 AudioContext 都关掉）。
    const sound = o.sound || {};
    const soundButton = sound.button;
    const hint = sound.hint;
    const canSound = Boolean(window.AudioContext || window.webkitAudioContext);
    let soundOn = load(sound.key) !== "off";
    let unlocked = false; // 用户操作过了没有
    let audio = null;
    let suspendTimer = 0;

    function syncSoundUi() {
      if (hint) hint.hidden = !(canSound && soundOn && !unlocked);
      if (!soundButton) return;
      soundButton.hidden = !canSound;
      const state = !soundOn ? "off" : unlocked ? "on" : "locked";
      soundButton.dataset.sound = state;
      soundButton.setAttribute("aria-pressed", String(state === "on"));
      soundButton.setAttribute("aria-label", sound.labels[state]);
      soundButton.title = soundButton.getAttribute("aria-label");
    }

    // 声音跟着短片自己的时间走：每帧 sync(T)，只把接下来 lookahead 秒里的音交给 Web Audio。
    // 节点图：每个音 → bus（这一段播放专用，暂停/拖动时淡出并整个断开）→ synth.out。
    function follow(synth) {
      const ctx = synth.ctx;
      let bus = null;
      let anchor = null; // { t: 短片秒, c: 对应的 ctx.currentTime }
      let cursor = 0;
      const a = {
        ctx,
        // 开一段新的播放：建 bus，下一次 sync 时按当时的 T 对齐时钟
        begin() {
          a.end();
          bus = ctx.createGain();
          bus.connect(synth.out);
          anchor = null;
        },
        // 结束这一段：bus 30ms 淡出，所有已排上的音立刻停掉并断开，不留任何还在响的振荡器
        end() {
          const b = bus;
          bus = null;
          anchor = null;
          if (!b) return;
          const now = ctx.currentTime;
          b.gain.cancelScheduledValues(now);
          b.gain.setValueAtTime(b.gain.value, now);
          b.gain.linearRampToValueAtTime(0, now + 0.03);
          synth.silence(now + 0.04);
          setTimeout(() => b.disconnect(), 120);
        },
        sync(t) {
          if (!bus || ctx.state !== "running") return;
          const now = ctx.currentTime;
          // 画面卡了一下（每帧最多走 maxStep 秒）或刚开始：重新对齐，跳过已经过去的音
          if (!anchor || Math.abs(anchor.t + (now - anchor.c) - t) > 0.08) {
            const fresh = !anchor;
            anchor = { t, c: now + 0.02 };
            if (fresh) {
              // 留 40ms 余量：跳到章节开头时第一帧已经走过了一点，章节的翻页声不能因此漏掉
              cursor = score.findIndex((e) => e.u >= t - 0.04);
              if (cursor === -1) cursor = score.length;
            }
          }
          while (cursor < score.length && score[cursor].u < t + o.lookahead) {
            const e = score[cursor++];
            const at = anchor.c + (e.u - anchor.t);
            if (at < now - 0.03) continue; // 来不及了就不响，绝不补一串
            synth.play(e, Math.max(at, now), bus);
          }
        },
      };
      return a;
    }

    function audioStart() {
      if (!canSound || !soundOn || !unlocked) return;
      if (!audio) {
        try {
          audio = follow(o.createSynth());
        } catch {
          audio = null;
          return;
        }
      }
      clearTimeout(suspendTimer);
      if (audio.ctx.state === "suspended") audio.ctx.resume().catch(() => {});
      audio.begin();
    }
    // 暂停：停掉这一段的音，再把 AudioContext 挂起（不占 CPU）；close=true 时整个关掉，所有节点随之释放
    function audioStop(close = false) {
      if (!audio) return;
      audio.end();
      clearTimeout(suspendTimer);
      const ctx = audio.ctx;
      if (close) {
        audio = null;
        setTimeout(() => ctx.close().catch(() => {}), 150);
      } else {
        suspendTimer = setTimeout(() => ctx.state === "running" && ctx.suspend().catch(() => {}), 150);
      }
    }
    // 只在浏览器认的「用户操作」里放行（触屏的 pointerdown 不算，要等 pointerup），否则建出来的 AudioContext 是挂起的。
    function unlock() {
      if (unlocked || !canSound) return;
      if (navigator.userActivation && !navigator.userActivation.isActive) return;
      unlocked = true;
      GESTURES.forEach((type) => document.removeEventListener(type, onGesture, true));
      syncSoundUi();
      if (playing) audioStart();
    }
    // 页面任何地方的第一下操作都算放行。片子自己的开关与提示（sound.gate）自己处理（不然按下时提示先消失、
    // 声音键先被放行，松开时就点到了下面的舞台或把声音又关掉）。
    const GESTURES = ["pointerdown", "pointerup", "keydown"];
    function onGesture(event) {
      if (event.target instanceof Element && event.target.closest(sound.gate)) return;
      unlock();
    }
    if (canSound) GESTURES.forEach((type) => document.addEventListener(type, onGesture, { capture: true, passive: true }));

    function syncUi() {
      showProgress({ track, fill, time: timeLabel }, time, time / DURATION, DURATION, { width: true, floor: true, valuetext: true });
      if (!chapters) return;
      const chapter = chapters.current(time);
      stepButtons.forEach((button) => button.setAttribute("aria-current", String(Number(button.dataset.chapter) === chapter)));
    }

    function draw() {
      o.render(time);
      syncUi();
    }

    // 播到片尾就停在最后一帧（不再循环），声音同时收尾；再按播放从头放。
    function tick(now) {
      raf = 0;
      if (!playing) return;
      time += Math.min(o.maxStep, (now - lastNow) / 1000);
      lastNow = now;
      if (time >= END) {
        time = END;
        ended = true;
        setPlaying(false);
        draw();
        return;
      }
      audio?.sync(time);
      draw();
      raf = requestAnimationFrame(tick);
    }

    function setPlaying(next) {
      if (next && ended) {
        ended = false;
        time = 0;
      }
      const was = playing;
      playing = next;
      if (playButton) {
        playButton.dataset.playing = String(next);
        playButton.setAttribute("aria-label", next ? "暂停" : ended ? o.end.label : "播放");
      }
      if (next && !raf) {
        lastNow = performance.now();
        raf = requestAnimationFrame(tick);
      }
      if (next && !was) audioStart();
      if (!next && was) audioStop(ended);
    }

    function seek(t) {
      time = clamp(t, 0, END);
      ended = false;
      if (playing) audioStart(); // 停掉旧的、按新位置重新对齐
      draw();
    }

    function resize() {
      if (o.layout() === false) return;
      draw();
    }

    playButton?.addEventListener("click", () => {
      unlock();
      userPaused = playing;
      setPlaying(!playing);
    });
    stage.addEventListener("click", () => playButton?.click());

    soundButton?.addEventListener("click", () => {
      if (soundOn && !unlocked) {
        unlock(); // 默认就是开着的，只是浏览器还没放行：这一下就是放行
        return;
      }
      unlock();
      soundOn = !soundOn;
      save(sound.key, soundOn);
      syncSoundUi();
      if (!soundOn) audioStop(true);
      else if (playing) audioStart();
    });
    hint?.addEventListener("click", unlock);

    switches.forEach((sw) =>
      sw.button?.addEventListener("click", () => {
        unlock();
        sw.on = !sw.on;
        save(sw.key, sw.on);
        syncSwitch(sw);
        sw.change(sw.on);
        draw(); // 当场换，暂停时也一样
      }),
    );

    if (track) {
      wireTrack(track, {
        once: true,
        touch: unlock,
        toRatio: (r) => seek(r * DURATION),
        key: (name) => {
          const step = { ArrowLeft: -5, ArrowRight: 5, Home: -DURATION, End: DURATION }[name];
          return step === undefined ? undefined : time + step;
        },
        seek,
      });
    }

    stepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        unlock();
        seek(chapters.start(Number(button.dataset.chapter)));
        userPaused = false;
        setPlaying(true);
        chapters.jumped?.();
      });
    });

    // 只在看得见的时候播：滚走或切到别的标签页就停，回来接着放（除非访客自己按了暂停，或已经播完）。
    if (o.autoplay) {
      const autoPlay = () => {
        if (!userPaused && !ended) setPlaying(onScreen && !document.hidden);
      };
      new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          autoPlay();
        },
        { threshold: o.autoplay.threshold },
      ).observe(stage);
      document.addEventListener("visibilitychange", autoPlay);
    }
    new ResizeObserver(resize).observe(stage);
    syncSoundUi();
    switches.forEach(syncSwitch);
    resize();
    return {};
  }

  window.mountFilm = mountFilm;
})();
