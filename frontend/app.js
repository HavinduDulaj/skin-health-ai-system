const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const api = (path) => `${window.DERMA_API || ""}${path}`;

const state = {
  file: null,
  previewUrl: "",
  lesion: "",
  stream: null,
  last: null,
};

const views = $$("[data-view]");
const toastEl = $("#toast");
const DECISION_LABEL = {
  grade: "Grade issued",
  abstain: "Model abstains",
  quality_reject: "Quality reject",
  unavailable: "Head not loaded",
};

const GATED = new Set(["assess", "result", "guidance", "report"]);

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem("dermaSession") || "null");
  } catch {
    return null;
  }
}

function hasSession() {
  const current = readSession();
  return Boolean(current && current.accepted);
}

function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    toastEl.hidden = true;
  }, 3200);
}

function route() {
  const name = (location.hash.replace("#/", "") || "home").split("?")[0] || "home";
  if (GATED.has(name) && !hasSession()) {
    location.hash = "#/enter";
    return;
  }
  if ((name === "result" || name === "report") && !state.last) {
    location.hash = hasSession() ? "#/assess" : "#/enter";
    return;
  }
  views.forEach((view) => {
    view.hidden = view.dataset.view !== name;
  });
  $$(".nav a").forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle(
      "is-on",
      href === `#/${name}` || (name === "home" && href === "#/")
    );
  });
  if (name === "lab") loadLab();
  if (name === "method") loadMethod();
  if (name === "assess") loadGallery();
  if (name === "guidance") renderGuidance();
  if (name === "report") renderReport();
  if (name === "log") renderLog();
  window.scrollTo(0, 0);
}

function setPreview(file) {
  state.file = file;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = URL.createObjectURL(file);
  const img = $("#preview");
  img.src = state.previewUrl;
  $("#preview-wrap").hidden = false;
  $("#empty-wrap").hidden = true;
  $("#btn-analyze").disabled = false;
  $("#ready-hint").textContent = "Photograph ready. The system will identify the family unless you confirmed one.";
}

window.addEventListener("hashchange", route);

$("#file-input").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) setPreview(file);
});

$("#btn-upload").addEventListener("click", () => $("#file-input").click());

const well = $("#drop-well");
;["dragenter", "dragover"].forEach((type) => {
  well.addEventListener(type, (e) => {
    e.preventDefault();
    well.classList.add("is-over");
  });
});
;["dragleave", "drop"].forEach((type) => {
  well.addEventListener(type, (e) => {
    e.preventDefault();
    well.classList.remove("is-over");
  });
});
well.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) setPreview(file);
});

$$("input[name=lesion]").forEach((input) => {
  input.addEventListener("change", () => {
    state.lesion = input.value;
  });
});

async function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
  $("#cam-video").srcObject = null;
}

$("#btn-camera").addEventListener("click", async () => {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      audio: false,
    });
    $("#cam-video").srcObject = state.stream;
    $("#camera-sheet").showModal();
  } catch {
    toast("Camera permission was declined. Upload a photo instead.");
  }
});

$("#btn-cam-close").addEventListener("click", async () => {
  await stopCamera();
  $("#camera-sheet").close();
});

$("#camera-sheet").addEventListener("close", stopCamera);

$("#btn-shutter").addEventListener("click", async () => {
  const video = $("#cam-video");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 960;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    setPreview(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    $("#camera-sheet").close();
  }, "image/jpeg", 0.92);
});

$("#btn-analyze").addEventListener("click", analyze);
$("#btn-print").addEventListener("click", () => window.print());
$("#btn-print-report")?.addEventListener("click", () => window.print());
$("#session-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("#session-accept")?.checked) {
    toast("Please accept the non-diagnostic disclaimer to continue.");
    return;
  }
  sessionStorage.setItem(
    "dermaSession",
    JSON.stringify({
      name: ($("#session-name")?.value || "").trim(),
      accepted: true,
      at: Date.now(),
    })
  );
  location.hash = "#/assess";
});
$("#toggle-cam")?.addEventListener("change", (e) => {
  const cam = $("#result-cam");
  if (!cam || cam.hidden && !e.target.checked) return;
  cam.style.opacity = e.target.checked ? "1" : "0";
});

async function analyze() {
  if (!state.file) return;
  const btn = $("#btn-analyze");
  btn.disabled = true;
  btn.textContent = "Reading the photograph…";
  document.body.classList.add("is-busy");
  $("#busy").hidden = false;
  const body = new FormData();
  body.append("image", state.file);
  body.append("lesion", state.lesion);
  try {
    const res = await fetch(api("/api/v1/analyze"), { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Analysis failed");
    state.last = data;
    rememberRun(data);
    renderResult(data);
    location.hash = "#/result";
  } catch (err) {
    toast(err.message || "Could not analyze that photograph.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Run screening";
    document.body.classList.remove("is-busy");
    $("#busy").hidden = true;
  }
}

function renderPipeline(steps) {
  const host = $("#pipeline-trace");
  if (!host) return;
  if (!steps.length) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = steps
    .map(
      (step) => `
      <li class="trace-step is-${step.status || "skipped"}">
        <span class="trace-title">${step.title}</span>
        <span class="trace-status">${step.status || ""}</span>
        <span class="trace-detail">${step.detail || ""}</span>
      </li>`
    )
    .join("");
}

function pct(n) {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

function titleFor(data) {
  if (data.decision === "quality_reject") return "Photograph not suitable";
  if (data.decision === "abstain") return "No single grade";
  if (data.decision === "unavailable") return "Model not loaded";
  return data.risk ? `${data.risk} risk` : "Unavailable";
}

function renderResult(data) {
  const decision = data.decision || (data.risk ? "grade" : "unavailable");
  document.body.dataset.grade = decision === "grade" ? data.risk || "" : "";
  document.body.dataset.decision = decision;

  const pill = $("#result-decision");
  pill.hidden = false;
  pill.textContent = DECISION_LABEL[decision] || decision;
  pill.className = `decision-pill is-${decision === "quality_reject" ? "reject" : decision}`;

  $("#result-kicker").textContent = data.model?.loaded
    ? data.model?.kind === "keras_v5"
      ? "Screening result · V5"
      : "Screening result"
    : "Quality check only";
  $("#result-title").textContent = titleFor(data);
  $("#result-summary").textContent =
    data.guidance?.summary ||
    "A screening head is not on disk yet. Quality still ran. Train with scripts/bootstrap_web_model.py or train_v4.py.";
  $("#result-headline").textContent = data.guidance?.headline || "";
  const caution = $("#result-caution");
  if (data.caution && data.guidance?.alert) {
    caution.hidden = false;
    caution.textContent = data.guidance.alert;
  } else {
    caution.hidden = true;
    caution.textContent = "";
  }
  const cond = data.condition || {};
  $("#result-condition").textContent = cond.used
    ? `Detected condition: ${cond.used}${cond.source === "model" ? " (identified by the model)" : " (confirmed)"}. ${cond.note || ""}`
    : data.lesion
      ? `Lesion context: ${data.lesion}`
      : "Condition was not identified.";
  $("#result-uncertain").textContent =
    decision === "abstain"
      ? `Entropy ${data.entropy?.toFixed?.(2) ?? "—"}. Leading grade at ${pct(data.confidence)}, margin ${pct(data.margin)}.`
      : data.uncertain && data.risk
        ? "The two leading grades are close. Medium is the class this dataset struggles to separate."
        : data.risk
          ? `Leading grade at ${pct(data.confidence)}, margin ${pct(data.margin)}.`
          : "";
  $("#result-disclaimer").textContent = data.disclaimer || "";
  $("#result-lesion").textContent = "";

  const ind = data.indicators;
  const indHost = $("#result-indicators");
  if (indHost) {
    if (ind) {
      indHost.innerHTML = `
        <p class="fine">${(ind.notes || []).join(" ")}</p>
        <p class="fine">Texture ${ind.texture_energy} · colour variation ${ind.color_variation} · irregularity ${ind.structural_irregularity} · extent ${ind.estimated_extent}</p>
      `;
    } else {
      indHost.innerHTML = `<p class="fine">No severity indicators on this run.</p>`;
    }
  }
  $("#result-photo").src = state.previewUrl;

  const camImg = $("#result-cam");
  const camToggle = $("#cam-toggle");
  const camNote = $("#result-cam-note");
  const overlay = data.explainability?.overlay_jpeg;
  if (overlay && data.explainability?.available) {
    camImg.src = overlay;
    camImg.hidden = false;
    camImg.style.opacity = "1";
    camToggle.hidden = false;
    $("#toggle-cam").checked = true;
    camNote.textContent = data.explainability.note || "";
  } else {
    camImg.removeAttribute("src");
    camImg.hidden = true;
    camToggle.hidden = true;
    camNote.textContent = data.explainability?.note || "";
  }

  renderPipeline(data.pipeline || []);

  const meters = $("#meters");
  const triad = $("#triad");
  meters.innerHTML = "";
  if (triad) {
    triad.hidden = true;
    triad.innerHTML = "";
  }
  if (data.model?.loaded && decision !== "quality_reject" && decision !== "unavailable") {
    if (triad) {
      triad.hidden = false;
      triad.innerHTML = ["Low", "Medium", "High"]
        .map((name) => {
          const value = data.probabilities?.[name];
          const lead = decision === "grade" && data.risk === name ? " is-lead" : "";
          return `<div class="triad-col${lead}" data-grade="${name}">
            <span class="triad-pct">${value == null ? "—" : Math.round(value * 100)}</span>
            <span class="triad-unit">%</span>
            <span class="triad-name">${name}</span>
            <div class="track ${name.toLowerCase()}"><span style="width:${value ? value * 100 : 0}%"></span></div>
          </div>`;
        })
        .join("");
    }
  } else if (decision === "quality_reject") {
    meters.innerHTML = `<p class="fine">Risk inference was not run. The quality gate rejected this frame first, as specified in the proposal.</p>`;
  } else {
    meters.innerHTML = `
      <p class="fine">No screening head on disk yet. Quality still ran. To attach Low / Medium / High:</p>
      <p class="fine"><code>python scripts/bootstrap_web_model.py</code> or <code>python train_v4.py --data-root pipeline_output/Skin_Risk_Dataset_V4 --output-dir models</code></p>
    `;
  }

  const steps = $("#result-steps");
  steps.innerHTML = "";
  const list = data.guidance?.steps || ["Load a screening head to see grade-specific next steps."];
  list.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    steps.appendChild(li);
  });

  const q = data.quality || {};
  const score = q.score ?? 0;
  $("#result-quality").innerHTML = `
    <div class="meter-label"><span>Quality score</span><span>${score.toFixed(2)}</span></div>
    <div class="q-bar"><span style="width:${score * 100}%"></span></div>
    <p class="fine">${q.width || "?"}×${q.height || "?"} · brightness ${Math.round(q.brightness || 0)}</p>
    ${(q.flags || []).map((f) => `<span class="flag">${f.replaceAll("_", " ")}</span>`).join("") || '<span class="flag">no quality flags</span>'}
  `;

  const effectEl = $("#lesion-effect");
  if (data.lesion_effect?.note) {
    effectEl.hidden = false;
    $("#lesion-effect-note").textContent = data.lesion_effect.note;
  } else {
    effectEl.hidden = true;
  }
}

async function loadLab() {
  const host = $("#lab-stats");
  if (host.dataset.ready) return;
  try {
    const data = await fetch(api("/api/v1/lab")).then((r) => r.json());
    const ds = data.dataset || {};
    const ig = data.integrity || {};
    const card = data.model_card || {};
    const policy = data.policy || {};
    host.innerHTML = [
      [fmt(ds.final_images), "Images in V4"],
      [fmt(ds.removed), "Held out or removed"],
      [ig.leakage === "DATA LEAKAGE CHECK: PASSED" ? "Passed" : ig.leakage || "—", "Leakage check"],
      [pct(card.v5_test_accuracy), "V5 test accuracy"],
    ]
      .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`)
      .join("");
    $("#lab-grid").innerHTML = `
      <article class="card">
        <h3>Cleaning</h3>
        <p class="fine">Near-duplicates flagged: ${fmt(ds.near_duplicates)}. Low quality: ${fmt(ds.low_quality)}. Ambiguous labels: ${fmt(ds.ambiguous)}. Review queue: ${fmt(ds.review_queue)}. Synthetic copies were excluded from the rebuilt set.</p>
      </article>
      <article class="card">
        <h3>Model card</h3>
        <p class="fine">${card.architecture || "EfficientNet screening head"}. Val ${pct(card.v5_validation_accuracy)} · test ${pct(card.v5_test_accuracy)} · macro F1 ${pct(card.v5_test_macro_f1)}. V4 baseline ${pct(card.v4_test_accuracy_baseline)}.</p>
        <p class="fine">${card.limitation || ""}</p>
      </article>
      <article class="card">
        <h3>Selective policy</h3>
        <p class="fine">Abstain below confidence ${policy.confidence_min ?? "—"} or margin ${policy.margin_min ?? "—"}. Reject the frame below quality ${policy.quality_min ?? "—"}.</p>
      </article>
      <article class="card">
        <h3>Split</h3>
        <p class="fine">Train ${fmt(card.training_images)} · val ${fmt(card.validation_images)} · test ${fmt(card.test_images)}. Synthetic training images recorded separately: ${fmt(card.synthetic_training_images)}.</p>
      </article>
    `;
    host.dataset.ready = "1";
    if (ds.final_images) $("#trust-images").textContent = fmt(ds.final_images);
    if (ig.leakage && String(ig.leakage).includes("PASSED")) $("#trust-leak").textContent = "passed";
  } catch {
    host.innerHTML = `<div class="stat"><b>—</b><span>Lab logs not found</span></div>`;
  }
}

async function loadMethod() {
  const host = $("#method-contrib");
  if (host.dataset.ready) return;
  try {
    const data = await fetch(api("/api/v1/research")).then((r) => r.json());
    const method = data.method || {};
    if (method.problem) $("#method-problem").textContent = method.problem;
    if (method.model) $("#method-model").textContent = method.model;
    if (Array.isArray(method.pipeline) && method.pipeline.length) {
      $("#method-pipeline").innerHTML = method.pipeline.map((step) => `<li>${step}</li>`).join("");
    }
    const arch = $("#method-arch");
    if (arch && Array.isArray(data.architecture) && data.architecture.length) {
      arch.innerHTML = data.architecture
        .map(
          (item, idx) => `
          <li>
            <span class="arch-n">${String(idx + 1).padStart(2, "0")}</span>
            <div>
              <strong>${item.title}</strong>
              <p class="fine">${item.summary}</p>
            </div>
          </li>`
        )
        .join("");
    }
    host.innerHTML = (data.contributions || [])
      .map(
        (item) => `
        <article class="card">
          <h3>${item.title}</h3>
          <p class="fine">${item.summary}</p>
        </article>`
      )
      .join("");
    host.dataset.ready = "1";
  } catch {
    host.dataset.ready = "1";
  }
}

function renderGuidance() {
  const copy = $("#guidance-latest-copy");
  if (!copy) return;
  const data = state.last;
  if (!data) {
    copy.textContent = "Run an assessment to see your latest condition, grade, and caution here.";
    return;
  }
  const cond = data.condition?.used || data.lesion || "unidentified";
  const grade = data.decision === "grade" ? `${data.risk} risk` : DECISION_LABEL[data.decision] || data.decision;
  copy.textContent = `${cond}: ${grade}. ${data.guidance?.alert || data.guidance?.summary || ""} Confidence ${pct(data.confidence)}.`;
}

function renderReport() {
  const data = state.last;
  const dl = $("#report-dl");
  const module = $("#report-module");
  if (!data) {
    $("#report-title").textContent = "No report yet";
    $("#report-lead").textContent = "Complete an assessment to generate the structured output.";
    if (dl) dl.innerHTML = "";
    if (module) module.innerHTML = "";
    return;
  }
  const cond = data.condition?.used || data.lesion || "—";
  const grade = data.decision === "grade" ? `${data.risk} risk` : DECISION_LABEL[data.decision] || data.decision;
  $("#report-title").textContent = `${cond} · ${grade}`;
  $("#report-lead").textContent = data.guidance?.summary || "";
  const rows = [
    ["Detected condition", cond],
    ["Risk level", data.decision === "grade" ? data.risk : "Not issued"],
    ["Confidence", pct(data.confidence)],
    ["Decision", DECISION_LABEL[data.decision] || data.decision],
    ["Caution", data.guidance?.alert || "None"],
    ["Advisory", data.guidance?.headline || "—"],
  ];
  dl.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  module.innerHTML = (data.risk_module || [])
    .map(
      (step) => `
      <li>
        <span class="arch-n">${step.status}</span>
        <div>
          <strong>${step.title}</strong>
          <p class="fine">${step.detail || ""}</p>
        </div>
      </li>`
    )
    .join("");
  $("#report-disclaimer").textContent = data.disclaimer || "";
  const wrap = $("#report-photo-wrap");
  if (state.previewUrl) {
    wrap.hidden = false;
    $("#report-photo").src = state.previewUrl;
    const cam = $("#report-cam");
    if (data.explainability?.overlay_jpeg && data.explainability?.available) {
      cam.src = data.explainability.overlay_jpeg;
      cam.hidden = false;
    } else {
      cam.hidden = true;
    }
  } else {
    wrap.hidden = true;
  }
}

function rememberRun(data) {
  try {
    const log = JSON.parse(sessionStorage.getItem("dermaLog") || "[]");
    log.unshift({
      at: Date.now(),
      decision: data.decision,
      risk: data.risk || "",
      condition: data.condition?.used || data.lesion || "",
      confidence: data.confidence ?? null,
    });
    sessionStorage.setItem("dermaLog", JSON.stringify(log.slice(0, 24)));
  } catch {
    /* ignore quota */
  }
}

function renderLog() {
  const host = $("#session-log");
  if (!host) return;
  let log = [];
  try {
    log = JSON.parse(sessionStorage.getItem("dermaLog") || "[]");
  } catch {
    log = [];
  }
  if (!log.length) {
    host.innerHTML = `<p class="fine">No plates yet. Run a capture to start the log.</p>`;
    return;
  }
  host.innerHTML = log
    .map((item, i) => {
      const grade =
        item.decision === "grade" ? `${item.risk} risk` : DECISION_LABEL[item.decision] || item.decision;
      const when = new Date(item.at).toLocaleString();
      return `<article class="log-row">
        <span class="log-n">${String(log.length - i).padStart(2, "0")}</span>
        <div>
          <p class="log-title">${item.condition || "Screening"} · ${grade}</p>
          <p class="log-meta">${when}${item.confidence != null ? ` · ${pct(item.confidence)}` : ""}</p>
        </div>
      </article>`;
    })
    .join("");
}

function fmt(n) {
  if (n == null || n === "") return "—";
  if (typeof n === "number") return n.toLocaleString("en-US");
  return String(n);
}

async function loadGallery() {
  const block = $("#gallery-block");
  const host = $("#gallery");
  if (host.dataset.ready) return;
  try {
    const data = await fetch(api("/api/v1/samples")).then((r) => r.json());
    const items = data.items || [];
    if (!items.length) return;
    block.hidden = false;
    host.innerHTML = items
      .map(
        (item) => `
        <button class="thumb" type="button" data-id="${item.id}" data-lesion="${item.lesion}">
          <img src="${api(`/api/v1/samples/${item.id}`)}" alt="${item.lesion} example" />
          <span>${item.lesion}</span>
        </button>`
      )
      .join("");
    host.dataset.ready = "1";
    host.addEventListener("click", async (e) => {
      const btn = e.target.closest(".thumb");
      if (!btn) return;
      const res = await fetch(api(`/api/v1/samples/${btn.dataset.id}`));
      const blob = await res.blob();
      const lesion = btn.dataset.lesion;
      const radio = $(`input[name=lesion][value="${lesion}"]`);
      if (radio) {
        radio.checked = true;
        state.lesion = lesion;
      }
      setPreview(new File([blob], `${lesion}.jpg`, { type: "image/jpeg" }));
      toast("Test image loaded. Run screening to see the grade.");
    });
  } catch {
    /* gallery is optional */
  }
}

async function boot() {
  route();
  const docs = $(".nav-api");
  if (docs) docs.href = api("/docs");
  const status = $("#api-status");
  try {
    const health = await fetch(api("/api/v1/health")).then((r) => r.json());
    status.textContent = health.model_loaded
      ? `API ${health.version} · ${health.model_kind} loaded`
      : `API ${health.version} · quality screening only`;
    if (!health.model_loaded) {
      $("#ready-hint").textContent = "Quality screening will still run. Train the head to attach Low / Medium / High.";
    }
    const lab = await fetch(api("/api/v1/lab")).then((r) => r.json());
    if (lab.dataset?.final_images) $("#trust-images").textContent = fmt(lab.dataset.final_images);
  } catch {
    status.textContent = window.DERMA_API
      ? `Cannot reach API at ${window.DERMA_API}. Start it with python -m backend.`
      : "API offline.";
  }
}

boot();
