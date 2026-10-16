const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const api = (path) => `${window.DERMA_API || ""}${path}`;

const state = {
  file: null,
  previewUrl: "",
  lesion: "",
  stream: null,
  last: null,
  followSessionId: "",
  keepFollow: false,
};
window.dermaAppState = state;

const views = $$("[data-view]");
const trail = [];
const toastEl = $("#toast");
const DECISION_LABEL = {
  grade: "Grade issued",
  abstain: "Model abstains",
  quality_reject: "Quality reject",
  unavailable: "Head not loaded",
};

function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    toastEl.hidden = true;
  }, 3200);
}

function route() {
  const raw = (location.hash.replace(/^#\/?/, "") || "home").split("?")[0];
  const [routeName, routeArg] = raw.split("/");
  let name = routeName || "home";
  if ((name === "result" || name === "report") && !state.last) {
    location.hash = "#/assess";
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
  if (name === "assess") {
    if (!state.keepFollow) state.followSessionId = "";
    state.keepFollow = false;
  }
  const back = $("#back");
  if (back) back.hidden = name === "home";
  if (trail[trail.length - 1] !== name) trail.push(name);
  if (name === "track" && window.DermaProgress) window.DermaProgress.renderTrack(state);
  if (name === "progress" && window.DermaProgress) window.DermaProgress.renderProgress();
  if (name === "compare" && window.DermaProgress) window.DermaProgress.renderCompare(routeArg || "");
  if (window.DermaProgress) window.DermaProgress.checkReminders();
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
$("#btn-track")?.addEventListener("click", () => {
  if (!state.last) return;
  location.hash = "#/track";
});
function syncCustomDate() {
  const custom = document.querySelector("input[name=when]:checked")?.value === "custom";
  const wrap = document.getElementById("track-custom-wrap");
  const input = document.getElementById("track-custom");
  const chosen = document.getElementById("track-custom-chosen");
  if (wrap) wrap.hidden = !custom;
  if (!input || !chosen) return;
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  input.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value || "");
  if (!custom || !match) {
    chosen.textContent = "";
    return;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  chosen.textContent = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
document.getElementById("track-when")?.addEventListener("change", syncCustomDate);
document.getElementById("track-custom")?.addEventListener("change", syncCustomDate);
$("#track-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.target.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  try {
    const saved = await window.DermaProgress.saveTrackedScan(state);
    state.followSessionId = "";
    const permissionNote =
      saved.reminderSaved && saved.permission === "denied"
        ? " Reminder saved. Browser notifications are off, so the prompt will appear in the app."
        : saved.reminderSaved
          ? " Reminder saved."
          : "";
    toast(`Progress saved.${permissionNote}`);
    location.hash = `#/compare/${saved.sessionId}`;
  } catch (err) {
    toast(err.message || "Could not save progress.");
  } finally {
    if (button) button.disabled = false;
  }
});
$("#session-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("#session-accept")?.checked) {
    toast("Please accept the non-diagnostic disclaimer to continue.");
    return;
  }
  location.hash = "#/assess";
});
$("#btn-print")?.addEventListener("click", () => window.print());
$("#btn-print-report")?.addEventListener("click", () => window.print());
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
    btn.textContent = "See results";
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

  $("#result-kicker").textContent = "Risk prediction";
  const trackBtn = $("#btn-track");
  if (trackBtn) {
    const canTrack = data.decision === "grade" || data.decision === "abstain";
    trackBtn.hidden = !canTrack;
    trackBtn.textContent = state.followSessionId ? "Save follow-up scan" : "Track skin progress";
  }
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
      ? "The top two grades are close, so no single risk level is shown."
      : data.uncertain && data.risk
        ? "The two leading grades are close."
        : decision === "grade" && data.confidence != null
          ? `Confidence ${pct(data.confidence)}.`
          : "";
  const guidanceHost = $("#result-guidance");
  const guidanceCopy = $("#result-guidance-copy");
  if (guidanceHost && guidanceCopy) {
    const guidanceText =
      decision === "abstain"
        ? "The top two grades are close, so no single grade is shown. Retake the photograph or see a clinician."
        : decision === "grade" && data.risk
          ? {
              Low: "Minor or common appearance. Monitor with ordinary skincare. Photograph again in a few days. See a clinician if it spreads or becomes painful.",
              Medium: "May need observation. If it persists or worsens, seek professional dermatological guidance.",
              High: "Stronger abnormality indicators. Consult a dermatologist. This is not an emergency diagnosis and not a substitute for urgent care if symptoms escalate.",
            }[data.risk] || ""
          : "";
    guidanceCopy.textContent = guidanceText;
    guidanceHost.hidden = !guidanceText;
  }
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

  const triad = $("#triad");
  const note = $("#result-note");
  if (note) note.innerHTML = "";
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
    if (note) {
      note.innerHTML = `<p class="fine">Risk inference was not run. The quality gate rejected this frame first, as specified in the proposal.</p>`;
    }
  } else {
    if (note) {
      note.innerHTML = `
      <p class="fine">No screening head on disk yet. Quality still ran. To attach Low / Medium / High:</p>
      <p class="fine"><code>python scripts/bootstrap_web_model.py</code> or <code>python train_v4.py --data-root pipeline_output/Skin_Risk_Dataset_V4 --output-dir models</code></p>
    `;
    }
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
  if (effectEl) {
    if (data.lesion_effect?.note) {
      effectEl.hidden = false;
      const note = $("#lesion-effect-note");
      if (note) note.textContent = data.lesion_effect.note;
    } else {
      effectEl.hidden = true;
    }
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
        <p class="fine">${card.architecture || "EfficientNet screening head"}.</p>
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
    if (ds.final_images && $("#trust-images")) $("#trust-images").textContent = fmt(ds.final_images);
    if (ig.leakage && String(ig.leakage).includes("PASSED") && $("#trust-leak")) {
      $("#trust-leak").textContent = "passed";
    }
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
      .filter((item) => !/accuracy|\d+\s*%/i.test(`${item.title} ${item.summary}`))
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

function renderGuidance() {}

$("#back")?.addEventListener("click", () => {
  const current = (location.hash.replace("#/", "") || "home").split("?")[0] || "home";
  if (trail.length > 1 && trail[trail.length - 1] === current) {
    trail.pop();
    const prev = trail.pop();
    location.hash = !prev || prev === "home" ? "#/" : `#/${prev}`;
    return;
  }
  location.hash = "#/";
});

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
  try {
    const health = await fetch(api("/api/v1/health")).then((r) => r.json());
    if (!health.model_loaded && $("#ready-hint")) {
      $("#ready-hint").textContent = "Quality screening will still run. Train the head to attach Low / Medium / High.";
    }
    const lab = await fetch(api("/api/v1/lab")).then((r) => r.json());
    if (lab.dataset?.final_images && $("#trust-images")) {
      $("#trust-images").textContent = fmt(lab.dataset.final_images);
    }
  } catch {
    /* Screening still starts from the home page when the API is up. */
  }
}

boot();
