const canvas = document.querySelector("#atlasCanvas");
const ctx = canvas.getContext("2d");

const els = {
  seed: document.querySelector("#seedInput"),
  depth: document.querySelector("#depthRange"),
  density: document.querySelector("#densityRange"),
  clarity: document.querySelector("#clarityRange"),
  paths: document.querySelector("#pathsToggle"),
  labels: document.querySelector("#labelsToggle"),
  randomize: document.querySelector("#randomizeBtn"),
  download: document.querySelector("#downloadBtn"),
  title: document.querySelector("#readingTitle"),
  body: document.querySelector("#readingBody"),
  statA: document.querySelector("#statA"),
  statB: document.querySelector("#statB"),
  statC: document.querySelector("#statC"),
};

const palettes = {
  ember: ["#f5a64a", "#e4d6a7", "#55c7d8", "#ef6f8f"],
  moss: ["#8fd694", "#d9e6b5", "#f5a64a", "#65b8c7"],
  reef: ["#55c7d8", "#d6f4f5", "#f5a64a", "#ef6f8f"],
  rose: ["#ef6f8f", "#f2d6cd", "#8fd694", "#55c7d8"],
};

const readings = {
  orbit: [
    ["银色潮汐正在靠近", "把今天的噪声折成一个小小的轨道，留给明天慢慢发亮。"],
    ["一枚新月正在校准", "你不必立刻抵达，只要让方向保持温柔而准确。"],
    ["暗处有稳定的回声", "那些没说完的部分，正在自己找到更好的句法。"],
  ],
  tide: [
    ["海面把星群推回来", "退一步不是撤退，是给下一次上岸留出更宽的呼吸。"],
    ["盐与光正在交换", "你会在重复里发现变化，在变化里认出自己。"],
    ["今晚适合慢慢靠岸", "把锋利的念头放低一点，它们也会学会照明。"],
  ],
  signal: [
    ["远处信号已经亮起", "先别急着解释它，记录频率，明天再命名。"],
    ["频道里有一束暖光", "一个很小的决定，会把整片地图调到更清楚。"],
    ["静电正在变成语言", "你听见的杂音里，藏着一条还没被使用过的路。"],
  ],
  bloom: [
    ["黑暗正在开花", "那些被搁置的愿望，并没有枯萎，只是在等合适的天气。"],
    ["花粉穿过星云", "把注意力交给细节，它会替你打开一扇侧门。"],
    ["光从边缘长出来", "最先改变的地方，通常不是中心，而是你允许柔软的角落。"],
  ],
};

let state = {
  mode: "orbit",
  palette: "ember",
  film: "clear",
  phase: 0,
  pointer: null,
};

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function getValues() {
  return {
    seed: els.seed.value.trim() || "quiet light",
    depth: Number(els.depth.value),
    density: Number(els.density.value),
    clarity: Number(els.clarity.value),
    paths: els.paths.checked,
    labels: els.labels.checked,
    colors: palettes[state.palette],
  };
}

function setAccent() {
  document.documentElement.style.setProperty("--accent", palettes[state.palette][0]);
  document.documentElement.style.setProperty("--accent-2", palettes[state.palette][2]);
}

function updateReading(seed, mode) {
  const set = readings[mode];
  const index = hashString(`${seed}-${mode}`) % set.length;
  els.title.textContent = set[index][0];
  els.body.textContent = set[index][1];
}

function drawBackdrop(width, height, values) {
  const depth = values.depth / 100;
  const ground = ctx.createLinearGradient(0, 0, width, height);
  ground.addColorStop(0, `rgba(18, ${18 + depth * 16}, ${17 + depth * 12}, 0.84)`);
  ground.addColorStop(0.48, "rgba(11, 13, 14, 0.56)");
  ground.addColorStop(1, `rgba(${18 + depth * 25}, 16, 14, 0.78)`);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(243, 234, 215, 0.055)";
  ctx.lineWidth = 1;
  const gap = Math.max(42, width / 18);
  for (let x = -gap; x < width + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(state.phase * 0.001 + x) * 20, height);
    ctx.stroke();
  }
  for (let y = -gap; y < height + gap; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.cos(state.phase * 0.001 + y) * 20);
    ctx.stroke();
  }
}

function pointForMode(mode, random, index, count, width, height, values) {
  const cx = width / 2;
  const cy = height / 2;
  const t = index / Math.max(1, count - 1);
  const wobble = (random() - 0.5) * values.clarity * 0.016;
  const angle = t * Math.PI * 2 * (mode === "bloom" ? 5 : 2.35) + wobble + state.phase * 0.00012;
  const spread = Math.min(width, height) * 0.42;

  if (mode === "tide") {
    const x = width * (0.12 + t * 0.76);
    const y = cy + Math.sin(t * Math.PI * 3 + state.phase * 0.001) * spread * 0.42 + (random() - 0.5) * 120;
    return [x, y];
  }

  if (mode === "signal") {
    const lane = Math.round(random() * 5) - 2.5;
    const x = width * (0.14 + t * 0.74);
    const y = cy + lane * 42 + Math.sin(t * 22 + state.phase * 0.002) * 22;
    return [x, y];
  }

  if (mode === "bloom") {
    const r = spread * Math.sin(t * Math.PI) * (0.34 + random() * 0.68);
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  }

  const r = spread * (0.25 + t * 0.75) + (random() - 0.5) * 90;
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.78];
}

function drawConstellation(width, height, values) {
  const seed = hashString(`${values.seed}-${state.mode}-${state.palette}`);
  const random = mulberry32(seed);
  const count = Math.floor(values.density);
  const points = [];
  const colors = values.colors;

  for (let i = 0; i < count; i += 1) {
    points.push(pointForMode(state.mode, random, i, count, width, height, values));
  }

  if (values.paths) {
    ctx.lineWidth = 1;
    for (let i = 1; i < points.length; i += 1) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      const distance = Math.hypot(x2 - x1, y2 - y1);
      if (distance < Math.min(width, height) * 0.24) {
        ctx.strokeStyle = `rgba(243, 234, 215, ${0.04 + values.clarity / 1800})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  points.forEach(([x, y], index) => {
    const pulse = Math.sin(state.phase * 0.004 + index) * 0.5 + 0.5;
    const radius = 0.8 + random() * 2.4 + pulse * 1.3;
    const color = colors[index % colors.length];
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 6);
    glow.addColorStop(0, color);
    glow.addColorStop(0.22, `${color}cc`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = index % 7 === 0 ? "#fff8e7" : color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  if (state.pointer) {
    const ring = ctx.createRadialGradient(state.pointer.x, state.pointer.y, 0, state.pointer.x, state.pointer.y, 170);
    ring.addColorStop(0, `${colors[0]}40`);
    ring.addColorStop(0.55, `${colors[2]}16`);
    ring.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, 170, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLabels(width, height, values) {
  if (!values.labels) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(243, 234, 215, 0.5)";
  ctx.strokeStyle = "rgba(243, 234, 215, 0.16)";
  ctx.font = "11px ui-sans-serif, system-ui";

  const ticks = 6;
  for (let i = 1; i < ticks; i += 1) {
    const x = 18 + ((width - 36) / ticks) * i;
    const y = 18 + ((height - 36) / ticks) * i;
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, height - 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.lineTo(width - 18, y);
    ctx.stroke();
    ctx.fillText(`X${String(i).padStart(2, "0")}`, x + 5, 36);
    ctx.fillText(`Y${String(i).padStart(2, "0")}`, 30, y - 5);
  }

  ctx.restore();
}

function drawFilm(width, height, values) {
  ctx.save();

  if (state.film === "silver") {
    ctx.globalCompositeOperation = "screen";
    const silver = ctx.createLinearGradient(0, 0, width, height);
    silver.addColorStop(0, "rgba(245, 234, 215, 0.1)");
    silver.addColorStop(0.5, "rgba(85, 199, 216, 0.06)");
    silver.addColorStop(1, "rgba(255, 255, 255, 0.16)");
    ctx.fillStyle = silver;
    ctx.fillRect(0, 0, width, height);
  }

  if (state.film === "thermal") {
    ctx.globalCompositeOperation = "overlay";
    const thermal = ctx.createRadialGradient(width * 0.48, height * 0.5, 0, width * 0.48, height * 0.5, Math.max(width, height) * 0.62);
    thermal.addColorStop(0, `${values.colors[3]}36`);
    thermal.addColorStop(0.42, `${values.colors[0]}24`);
    thermal.addColorStop(1, "rgba(3, 8, 10, 0.48)");
    ctx.fillStyle = thermal;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.globalCompositeOperation = "multiply";
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.18, width * 0.5, height * 0.48, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, "rgba(255, 255, 255, 1)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.64)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawFrame(width, height, values) {
  ctx.strokeStyle = "rgba(243, 234, 215, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.fillStyle = "rgba(243, 234, 215, 0.52)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText("NOCTURNE / LIVE MAP", 30, height - 30);
  ctx.fillText(new Date().toLocaleDateString("zh-CN"), width - 120, 36);
  ctx.fillText(`${state.mode.toUpperCase()} / ${state.palette.toUpperCase()} / ${state.film.toUpperCase()}`, 30, 36);

  ctx.save();
  ctx.translate(width - 32, height - 32);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(243, 234, 215, 0.38)";
  ctx.fillText(values.seed.slice(0, 28), 0, 0);
  ctx.restore();
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const values = getValues();

  setAccent();
  updateReading(values.seed, state.mode);
  els.statA.textContent = values.depth;
  els.statB.textContent = values.density;
  els.statC.textContent = values.clarity;

  ctx.clearRect(0, 0, width, height);
  drawBackdrop(width, height, values);
  drawConstellation(width, height, values);
  drawLabels(width, height, values);
  drawFilm(width, height, values);
  drawFrame(width, height, values);
}

function animate(time) {
  state.phase = time;
  draw();
  requestAnimationFrame(animate);
}

function randomize() {
  const fragments = ["late signal", "warm doubt", "quiet orbit", "salt window", "small bright maybe", "future rain", "soft static"];
  els.seed.value = fragments[Math.floor(Math.random() * fragments.length)];
  els.depth.value = 28 + Math.floor(Math.random() * 68);
  els.density.value = 48 + Math.floor(Math.random() * 120);
  els.clarity.value = 20 + Math.floor(Math.random() * 78);
  const modes = ["orbit", "tide", "signal", "bloom"];
  state.mode = modes[Math.floor(Math.random() * modes.length)];
  const films = ["clear", "silver", "thermal"];
  state.film = films[Math.floor(Math.random() * films.length)];
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
  document.querySelectorAll("[data-film]").forEach((button) => {
    button.classList.toggle("active", button.dataset.film === state.film);
  });
  draw();
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
    draw();
  });
});

document.querySelectorAll("[data-palette]").forEach((button) => {
  button.addEventListener("click", () => {
    state.palette = button.dataset.palette;
    document.querySelectorAll("[data-palette]").forEach((item) => item.classList.toggle("active", item === button));
    draw();
  });
});

document.querySelectorAll("[data-film]").forEach((button) => {
  button.addEventListener("click", () => {
    state.film = button.dataset.film;
    document.querySelectorAll("[data-film]").forEach((item) => item.classList.toggle("active", item === button));
    draw();
  });
});

[els.seed, els.depth, els.density, els.clarity, els.paths, els.labels].forEach((input) => {
  input.addEventListener("input", draw);
});

els.randomize.addEventListener("click", randomize);

els.download.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "nocturne-atlas.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  state.pointer = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
});

canvas.addEventListener("pointerleave", () => {
  state.pointer = null;
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(animate);
