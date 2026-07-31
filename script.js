const state = {
  audioContext: null,
  analyser: null,
  audioElement: null,
  sourceNode: null,
  frequencyData: null,
  timeData: null,
  sensitivity: 5,
  motion: 1,
  glow: 1,
  density: 32,
  contrast: 1,
  animationFrame: 0,
  isReady: false,
  logIndex: 0,
  terminalMessages: [
    "mobile-first rewrite online.",
    "audio visualizer initialized.",
    "demo assets preserved.",
    "responsive panels enabled."
  ]
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindTime();
  bindControls();
  bindAudio();
  bindTerminalTyping();
  resizeCanvases();
  drawVisualizer();
  window.addEventListener("resize", resizeCanvases, { passive: true });
});

function cacheElements() {
  const ids = [
    "timestamp",
    "audio-response",
    "audio-speed",
    "audio-temperature",
    "terminal-content",
    "terminal-status",
    "audio-player",
    "audio-file-input",
    "file-btn",
    "file-label",
    "spectrum-canvas",
    "waveform-canvas",
    "density-slider",
    "glow-slider",
    "motion-slider",
    "contrast-slider",
    "density-value",
    "glow-value",
    "motion-value",
    "contrast-value",
    "sensitivity-slider",
    "sensitivity-value",
    "reset-btn",
    "analyze-btn"
  ];

  ids.forEach((id) => {
    elements[id] = document.getElementById(id);
  });

  elements.spectrumCtx = elements["spectrum-canvas"].getContext("2d");
  elements.waveformCtx = elements["waveform-canvas"].getContext("2d");
  elements.demoButtons = Array.from(document.querySelectorAll(".demo-track-btn"));
}

function bindTime() {
  const update = () => {
    const now = new Date();
    elements.timestamp.textContent = `TIME: ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}`;
  };

  update();
  setInterval(update, 1000);
}

function bindControls() {
  const setVariable = (name, value) => {
    document.documentElement.style.setProperty(name, value);
  };

  const syncControls = () => {
    state.density = Number(elements["density-slider"].value);
    state.glow = Number(elements["glow-slider"].value);
    state.motion = Number(elements["motion-slider"].value);
    state.contrast = Number(elements["contrast-slider"].value);

    elements["density-value"].textContent = String(state.density);
    elements["glow-value"].textContent = state.glow.toFixed(1);
    elements["motion-value"].textContent = state.motion.toFixed(1);
    elements["contrast-value"].textContent = state.contrast.toFixed(2);

    setVariable("--grid-density", `${state.density}px`);
    setVariable("--glow-scale", String(state.glow));
    setVariable("--motion-scale", String(state.motion));
    setVariable("--contrast-scale", String(state.contrast));
  };

  ["density-slider", "glow-slider", "motion-slider", "contrast-slider", "sensitivity-slider"].forEach((id) => {
    elements[id].addEventListener("input", () => {
      if (id === "sensitivity-slider") {
        state.sensitivity = Number(elements[id].value);
        elements["sensitivity-value"].textContent = state.sensitivity.toFixed(1);
        return;
      }

      syncControls();
    });
  });

  elements["reset-btn"].addEventListener("click", () => {
    elements["density-slider"].value = 32;
    elements["glow-slider"].value = 1;
    elements["motion-slider"].value = 1;
    elements["contrast-slider"].value = 1;
    elements["sensitivity-slider"].value = 5;
    state.sensitivity = 5;
    elements["sensitivity-value"].textContent = "5.0";
    syncControls();
    logMessage("controls reset.");
  });

  elements["analyze-btn"].addEventListener("click", () => {
    logMessage("analysis sweep completed.");
    elements["terminal-status"].textContent = "ANALYZING";
    setTimeout(() => {
      elements["terminal-status"].textContent = "ONLINE";
    }, 1200);
  });

  syncControls();
}

function bindAudio() {
  elements.audioElement = elements["audio-player"];

  const ensureAudio = async () => {
    if (!state.audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioContextCtor();
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 2048;
      state.analyser.smoothingTimeConstant = 0.82;
      state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
      state.timeData = new Uint8Array(state.analyser.fftSize);
      state.sourceNode = state.audioContext.createMediaElementSource(elements.audioElement);
      state.sourceNode.connect(state.analyser);
      state.analyser.connect(state.audioContext.destination);
    }

    if (state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }

    state.isReady = true;
  };

  const setTrack = async (url, label) => {
    await ensureAudio();
    if (elements.audioElement.src !== new URL(url, window.location.href).href) {
      elements.audioElement.src = url;
    }
    await elements.audioElement.play();
    logMessage(`playing ${label}.`);
  };

  elements.demoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.url;
      const label = button.textContent.trim();
      setTrack(url, label).catch(() => logMessage("audio playback blocked."));
      elements["file-label"].textContent = label;
    });
  });

  elements["file-btn"].addEventListener("click", async () => {
    await ensureAudio();
    elements["audio-file-input"].click();
  });

  elements["audio-file-input"].addEventListener("change", async () => {
    const [file] = elements["audio-file-input"].files || [];
    if (!file) return;

    await ensureAudio();
    const objectUrl = URL.createObjectURL(file);
    elements.audioElement.src = objectUrl;
    elements["file-label"].textContent = file.name;
    try {
      await elements.audioElement.play();
      logMessage(`loaded ${file.name}.`);
    } catch {
      logMessage("audio playback blocked.");
    }
  });

  elements.audioElement.addEventListener("play", () => {
    logMessage("audio stream active.");
  });

  elements.audioElement.addEventListener("ended", () => {
    logMessage("track finished.");
  });
}

function bindTerminalTyping() {
  const typing = elements["terminal-content"].querySelector(".typing");
  const tick = () => {
    if (!typing) return;
    typing.textContent = `status: ${state.terminalMessages[state.logIndex % state.terminalMessages.length]}`;
    state.logIndex += 1;
  };

  tick();
  setInterval(tick, 3000);
}

function logMessage(message) {
  const line = document.createElement("div");
  line.className = "terminal-line regular-line";
  line.textContent = message;
  elements["terminal-content"].insertBefore(line, elements["terminal-content"].lastElementChild);

  while (elements["terminal-content"].children.length > 8) {
    elements["terminal-content"].removeChild(elements["terminal-content"].firstElementChild);
  }
}

function resizeCanvases() {
  [elements["spectrum-canvas"], elements["waveform-canvas"]].forEach((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
  });
}

function drawVisualizer() {
  const spectrumCtx = elements.spectrumCtx;
  const waveformCtx = elements.waveformCtx;

  const render = () => {
    const spectrumCanvas = elements["spectrum-canvas"];
    const waveformCanvas = elements["waveform-canvas"];
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    const waveformWidth = waveformCanvas.width;
    const waveformHeight = waveformCanvas.height;

    spectrumCtx.clearRect(0, 0, width, height);
    waveformCtx.clearRect(0, 0, waveformWidth, waveformHeight);

    const audioActive = state.isReady && state.analyser;

    if (audioActive) {
      state.analyser.getByteFrequencyData(state.frequencyData);
      state.analyser.getByteTimeDomainData(state.timeData);
    }

    drawSpectrumFrame(spectrumCtx, width, height);
    drawBars(spectrumCtx, width, height, audioActive ? state.frequencyData : null);
    drawWaveform(waveformCtx, waveformWidth, waveformHeight, audioActive ? state.timeData : null);

    updateReadouts(audioActive);
    state.animationFrame = requestAnimationFrame(render);
  };

  render();
}

function drawSpectrumFrame(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255, 158, 61, 0.12)");
  gradient.addColorStop(1, "rgba(255, 158, 61, 0.02)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 158, 61, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  const steps = 8;
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  for (let i = 1; i < steps; i += 1) {
    const y = (height / steps) * i;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

function drawBars(ctx, width, height, data) {
  const count = 72;
  const barWidth = width / count;
  const maxHeight = height * 0.82;
  const speedBoost = state.motion;
  const sensitivityBoost = state.sensitivity / 5;

  for (let i = 0; i < count; i += 1) {
    const raw = data ? data[Math.floor((i / count) * data.length)] : 24 + Math.sin((Date.now() / 400) + i * 0.4) * 16;
    const value = Math.max(6, raw * 0.95 * speedBoost * sensitivityBoost);
    const barHeight = Math.min(maxHeight, (value / 255) * maxHeight + 8);
    const x = i * barWidth + barWidth * 0.15;
    const y = height - barHeight - 10;

    const fill = ctx.createLinearGradient(0, y, 0, height);
    fill.addColorStop(0, "rgba(255, 193, 153, 0.95)");
    fill.addColorStop(0.55, "rgba(255, 158, 61, 0.86)");
    fill.addColorStop(1, "rgba(255, 94, 0, 0.3)");

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, barWidth * 0.7, barHeight);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(x, y - 3, barWidth * 0.7, 2);
  }
}

function drawWaveform(ctx, width, height, data) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 158, 61, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();

  const points = 160;
  for (let i = 0; i < points; i += 1) {
    const x = (i / (points - 1)) * width;
    const value = data ? data[Math.floor((i / points) * data.length)] : 128 + Math.sin((Date.now() / 220) + i * 0.18) * 30;
    const normalized = value / 255;
    const y = height / 2 + (normalized - 0.5) * height * 0.62;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 193, 153, 0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.restore();
}

function updateReadouts(audioActive) {
  const modifier = audioActive ? state.sensitivity * state.motion : 1;
  const response = Math.round(120 + modifier * 1.4);
  const speed = (2.2 + modifier * 0.18).toFixed(1);
  const temperature = (0.65 + state.glow * 0.08).toFixed(2);

  elements["audio-response"].textContent = `${response}ms`;
  elements["audio-speed"].textContent = `${speed}K tok/s`;
  elements["audio-temperature"].textContent = temperature;
}