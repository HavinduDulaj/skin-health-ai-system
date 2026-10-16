/* Skin progress tracking. Personal monitoring only — not a diagnosis. */
const PROGRESS_KEY = "dermaProgress.v1";
const RISK_RANK = { low: 1, medium: 2, high: 3 };
const DISCLAIMER =
  "AI predictions are not a medical diagnosis. Changes between scans do not prove that a product caused improvement. Seek professional medical advice for concerning or worsening symptoms.";

function progressId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyProgress() {
  return { sessions: [], scans: [], products: [], reminders: [] };
}

function capWord(value) {
  if (!value) return "—";
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function compareScans(prev, next) {
  const notes = [];
  const prevCond = (prev?.condition || "").trim().toLowerCase();
  const nextCond = (next?.condition || "").trim().toLowerCase();
  const prevArea = (prev?.bodyArea || "").trim().toLowerCase();
  const nextArea = (next?.bodyArea || "").trim().toLowerCase();
  if (prevCond && nextCond && prevCond !== nextCond) {
    notes.push("The detected condition differs, so these scans may not be directly comparable.");
  }
  if (prevArea && nextArea && prevArea !== nextArea) {
    notes.push("The recorded body area differs, so these scans may not be directly comparable.");
  }
  const graded =
    prev?.decision === "grade" &&
    next?.decision === "grade" &&
    prev?.risk &&
    next?.risk;
  if (!graded) {
    return {
      kind: "uncertain",
      summary: "There is not a clear risk grade on both scans, so this comparison is uncertain.",
      notes,
    };
  }
  const before = RISK_RANK[String(prev.risk).toLowerCase()];
  const after = RISK_RANK[String(next.risk).toLowerCase()];
  if (before == null || after == null) {
    return {
      kind: "uncertain",
      summary: "There is not a clear risk grade on both scans, so this comparison is uncertain.",
      notes,
    };
  }
  if (after < before) {
    return {
      kind: "lower",
      summary: "Your latest scan shows a lower predicted risk than your previous scan.",
      notes,
    };
  }
  if (after > before) {
    return {
      kind: "higher",
      summary: "Your latest scan shows a higher predicted risk than your previous scan.",
      notes,
    };
  }
  return {
    kind: "same",
    summary: "Your latest scan shows the same predicted risk as your previous scan.",
    notes,
  };
}

function dueFromChoice(choice, customValue) {
  if (!choice) return null;
  if (choice === "custom") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customValue || "");
    if (!match) return null;
    const when = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 9, 0, 0, 0);
    if (Number.isNaN(when.getTime())) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const chosen = new Date(when);
    chosen.setHours(0, 0, 0, 0);
    if (chosen < start) return null;
    return when.toISOString();
  }
  const days = Number(choice);
  if (!Number.isFinite(days) || days <= 0) return null;
  const when = new Date();
  when.setDate(when.getDate() + days);
  when.setHours(9, 0, 0, 0);
  return when.toISOString();
}

if (typeof window === "undefined") {
  const base = { decision: "grade", condition: "acne", bodyArea: "cheek" };
  const lower = compareScans({ ...base, risk: "Medium" }, { ...base, risk: "Low" });
  const higher = compareScans({ ...base, risk: "Low" }, { ...base, risk: "High" });
  const same = compareScans({ ...base, risk: "High" }, { ...base, risk: "High" });
  const changed = compareScans(
    { ...base, risk: "Medium" },
    { ...base, risk: "Low", condition: "rash" }
  );
  const area = compareScans(
    { ...base, risk: "Medium" },
    { ...base, risk: "Medium", bodyArea: "arm" }
  );
  const uncertain = compareScans(
    { ...base, risk: "Medium", decision: "abstain" },
    { ...base, risk: "Low" }
  );
  if (!lower.summary.includes("lower predicted risk")) throw new Error("lower");
  if (!higher.summary.includes("higher predicted risk")) throw new Error("higher");
  if (!same.summary.includes("same predicted risk")) throw new Error("same");
  if (!changed.notes.some((note) => note.includes("condition differs"))) throw new Error("condition");
  if (!area.notes.some((note) => note.includes("body area differs"))) throw new Error("area");
  if (uncertain.kind !== "uncertain") throw new Error("uncertain");
  if (!dueFromChoice("3")) throw new Error("due");
  if (dueFromChoice("")) throw new Error("empty due");
  const custom = new Date(dueFromChoice("custom", "2026-10-20"));
  if (custom.getFullYear() !== 2026 || custom.getMonth() !== 9 || custom.getDate() !== 20) throw new Error("custom day");
  if (custom.getHours() !== 9 || custom.getMinutes() !== 0) throw new Error("custom time");
  if (dueFromChoice("custom", "")) throw new Error("empty custom");
  if (dueFromChoice("custom", "2020-01-01")) throw new Error("past custom");
  console.log("progress compare checks passed");
} else {
  const timers = new Set();

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "");
      if (!parsed || !Array.isArray(parsed.sessions)) return emptyProgress();
      parsed.scans ||= [];
      parsed.products ||= [];
      parsed.reminders ||= [];
      return parsed;
    } catch {
      return emptyProgress();
    }
  }

  function saveProgress(data) {
    const copy = JSON.parse(JSON.stringify(data));
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(copy));
    } catch {
      copy.scans = copy.scans.map((scan) => ({ ...scan, image: "" }));
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(copy));
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function whenLabel(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  }

  function compareIdFromHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return parts[0] === "compare" ? parts[1] || "" : "";
  }

  function sessionScans(data, sessionId) {
    return data.scans
      .filter((scan) => scan.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function shrinkImage(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve("");
        return;
      }
      const img = new Image();
      img.onload = () => {
        const max = 420;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => resolve("");
      img.src = src;
    });
  }

  function notifyFollowUp(sessionId) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const note = new Notification("DermaSafe AI", {
        body: "It's time for your skin follow-up check.",
        tag: `dermasafe-followup-${sessionId}`,
      });
      note.onclick = () => {
        window.focus();
        location.hash = `#/compare/${sessionId}`;
      };
    } catch {
      /* permission or browser limits */
    }
  }

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
  }

  function checkReminders() {
    const data = loadProgress();
    const now = Date.now();
    let changed = false;
    const due = data.reminders.filter((item) => {
      if (item.status !== "scheduled") return false;
      if (item.snoozeUntil && new Date(item.snoozeUntil).getTime() > now) return false;
      return new Date(item.dueAt).getTime() <= now;
    });
    due.forEach((item) => {
      if (!item.notified) {
        notifyFollowUp(item.sessionId);
        item.notified = true;
        changed = true;
      }
    });
    if (changed) saveProgress(data);
    const banner = document.getElementById("reminder-banner");
    if (!banner) return;
    if (!due.length) {
      banner.hidden = true;
      banner.dataset.session = "";
      return;
    }
    const first = due.sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    banner.hidden = false;
    banner.dataset.session = first.sessionId;
    banner.dataset.reminder = first.id;
  }

  function armReminders() {
    clearTimers();
    const data = loadProgress();
    const now = Date.now();
    data.reminders.forEach((item) => {
      if (item.status !== "scheduled") return;
      const delay = new Date(item.dueAt).getTime() - now;
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
      timers.add(setTimeout(checkReminders, delay + 200));
    });
    checkReminders();
  }

  async function ensureNotify() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }

  function snapshotText(result) {
    const condition = result?.condition?.used || result?.lesion || "Not identified";
    const risk = result?.decision === "grade" && result?.risk ? capWord(result.risk) : "Not issued";
    const confidence =
      result?.confidence == null ? "" : ` Confidence ${Math.round(result.confidence * 100)}%.`;
    return `Condition: ${capWord(condition)}. Predicted risk: ${risk}.${confidence}`;
  }

  function renderTrack(appState) {
    const title = document.getElementById("track-title");
    const snap = document.getElementById("track-snapshot");
    const result = appState.last;
    if (!result) {
      location.hash = "#/assess";
      return;
    }
    if (title) {
      title.textContent = appState.followSessionId ? "Save follow-up scan" : "Track skin progress";
    }
    if (snap) snap.textContent = snapshotText(result);
    const area = document.getElementById("track-area");
    if (area && appState.followSessionId && !area.value) {
      const data = loadProgress();
      const session = data.sessions.find((item) => item.id === appState.followSessionId);
      if (session?.bodyArea) area.value = session.bodyArea;
    }
  }

  function renderProgress() {
    const host = document.getElementById("progress-list");
    if (!host) return;
    const data = loadProgress();
    if (!data.sessions.length) {
      host.innerHTML = `<p class="fine">No tracked scans yet. Save one from a results screen.</p>`;
      return;
    }
    const sessions = [...data.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    host.innerHTML = sessions
      .map((session) => {
        const scans = sessionScans(data, session.id);
        const latest = scans[scans.length - 1];
        const product = data.products.find((item) => item.sessionId === session.id);
        const reminder = data.reminders
          .filter((item) => item.sessionId === session.id && item.status === "scheduled")
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
        return `<article class="card">
          <h3>${esc(capWord(latest?.condition || "Scan"))} · ${esc(
            latest?.decision === "grade" ? capWord(latest.risk) : "Risk not issued"
          )}</h3>
          <p class="fine">${esc(whenLabel(latest?.createdAt || session.createdAt))}${
            (latest?.bodyArea || session.bodyArea)
              ? ` · ${esc(latest?.bodyArea || session.bodyArea)}`
              : ""
          }</p>
          <p class="fine">${scans.length} scan${scans.length === 1 ? "" : "s"}${
            product ? ` · ${esc(product.name)}` : ""
          }</p>
          <p class="fine">${
            reminder ? `Reminder ${esc(whenLabel(reminder.dueAt))}` : "No upcoming reminder"
          }</p>
          <div class="result-actions">
            <a class="btn btn-primary" href="#/compare/${esc(session.id)}" data-nav>Open</a>
            <button class="btn btn-ghost" type="button" data-progress-action="delete-session" data-id="${esc(
              session.id
            )}">Delete</button>
          </div>
        </article>`;
      })
      .join("");
  }

  function reminderParts(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return { day: "—", time: "", local: "" };
    const pad = (value) => String(value).padStart(2, "0");
    return {
      day: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
      time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      local: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
  }

  function productDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
    if (!match) return value || "—";
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function scanHint(scan) {
    if (!scan) return "";
    const risk = scan.decision === "grade" ? `${capWord(scan.risk)} risk` : "Risk not issued";
    return `${capWord(scan.condition)} · ${risk}`;
  }

  function reminderCard(item, hint) {
    const parts = reminderParts(item.dueAt);
    return `<article class="remind-card">
      <p class="remind-date">${esc(parts.day)}</p>
      <p class="remind-time">${esc(parts.time)}</p>
      <p class="remind-status">Scheduled</p>
      ${hint ? `<p class="fine">${esc(hint)}</p>` : ""}
      <div class="remind-actions">
        <button class="btn btn-primary" type="button" data-progress-action="complete-reminder" data-id="${esc(item.id)}">Done</button>
        <button class="btn btn-ghost" type="button" data-progress-action="open-reschedule" data-id="${esc(item.id)}">Reschedule</button>
        <button class="btn btn-ghost" type="button" data-progress-action="cancel-reminder" data-id="${esc(item.id)}">Cancel reminder</button>
      </div>
    </article>`;
  }

  function reminderSection(sessionId, reminders, latest) {
    const scheduled = reminders
      .filter((item) => item.status === "scheduled")
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const history = reminders
      .filter((item) => item.status !== "scheduled")
      .sort((a, b) => b.dueAt.localeCompare(a.dueAt));
    const hint = scanHint(latest);
    return `<article class="card">
      <h3>Reminders</h3>
      <p class="fine">A reminder is a personal prompt. It does not mean it is medically safe to wait.</p>
      <div class="remind-list">
        ${
          scheduled.length
            ? scheduled.map((item) => reminderCard(item, hint)).join("")
            : `<p class="fine">No upcoming reminder.</p>`
        }
      </div>
      ${
        history.length
          ? `<details class="remind-history">
              <summary>Earlier reminders (${history.length})</summary>
              ${history
                .map((item) => {
                  const parts = reminderParts(item.dueAt);
                  return `<div class="remind-history-row">
                    <span class="remind-history-when"><span>${esc(parts.day)}</span><span>${esc(parts.time)}</span></span>
                    <span class="remind-status is-${esc(item.status)}">${esc(capWord(item.status))}</span>
                  </div>`;
                })
                .join("")}
            </details>`
          : ""
      }
      <div class="remind-add">
        <button class="btn btn-ghost" type="button" data-progress-action="open-add-reminder">+ Add New Reminder</button>
      </div>
      <dialog class="remind-dialog" id="add-reminder-dialog">
        <form class="session-form" data-progress-action="add-reminder" data-session="${esc(sessionId)}">
          <h3>Add a reminder</h3>
          <div class="chips">
            <button class="chip remind-chip" type="button" data-progress-action="fill-reminder" data-days="1">Tomorrow</button>
            <button class="chip remind-chip" type="button" data-progress-action="fill-reminder" data-days="3">In 3 days</button>
            <button class="chip remind-chip" type="button" data-progress-action="fill-reminder" data-days="7">In 7 days</button>
            <button class="chip remind-chip" type="button" data-progress-action="fill-reminder" data-days="14">In 14 days</button>
          </div>
          <label>Date and time
            <input name="due" type="datetime-local" required />
          </label>
          <p class="remind-error" data-remind-error hidden></p>
          <div class="remind-actions">
            <button class="btn btn-primary" type="submit">Save reminder</button>
            <button class="btn btn-ghost" type="button" data-progress-action="close-add-reminder">Cancel</button>
          </div>
        </form>
      </dialog>
      <dialog class="remind-dialog" id="reschedule-dialog">
        <form class="session-form" data-progress-action="reschedule">
          <h3>Reschedule</h3>
          <p class="fine">Currently scheduled</p>
          <p class="remind-date" data-current-date></p>
          <p class="remind-time" data-current-time></p>
          <label>New date and time
            <input name="due" type="datetime-local" required />
          </label>
          <p class="remind-error" data-remind-error hidden></p>
          <div class="remind-actions">
            <button class="btn btn-primary" type="submit">Save changes</button>
            <button class="btn btn-ghost" type="button" data-progress-action="close-reschedule">Back</button>
          </div>
        </form>
      </dialog>
    </article>`;
  }

  function scanBlock(label, scan) {
    if (!scan) return `<article class="card"><h3>${esc(label)}</h3><p class="fine">No scan saved.</p></article>`;
    const image = scan.image
      ? `<img src="${scan.image}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px" />`
      : `<p class="fine">Photograph was not kept for this scan.</p>`;
    return `<article class="card">
      <h3>${esc(label)}</h3>
      ${image}
      <p class="fine">${esc(whenLabel(scan.createdAt))}</p>
      <p class="fine">Condition: ${esc(capWord(scan.condition))}</p>
      <p class="fine">Predicted risk: ${esc(
        scan.decision === "grade" ? capWord(scan.risk) : "Not issued"
      )}</p>
      <p class="fine">${
        scan.confidence == null ? "" : `Confidence ${Math.round(scan.confidence * 100)}%.`
      }${scan.bodyArea ? ` Body area: ${esc(scan.bodyArea)}.` : ""}</p>
    </article>`;
  }

  function renderCompare(sessionId) {
    const host = document.getElementById("compare-root");
    if (!host) return;
    const data = loadProgress();
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session) {
      host.innerHTML = `<p class="fine">That progress record is no longer on this device.</p>`;
      return;
    }
    const scans = sessionScans(data, session.id);
    const latest = scans[scans.length - 1];
    const previous = scans.length > 1 ? scans[scans.length - 2] : null;
    const comparison = previous ? compareScans(previous, latest) : null;
    const products = data.products.filter((item) => item.sessionId === session.id);
    const reminders = data.reminders.filter((item) => item.sessionId === session.id);
    host.innerHTML = `
      <p class="eyebrow">Skin progress</p>
      <h2>Skin progress comparison</h2>
      <div class="lab-grid">
        ${previous ? scanBlock("Previous scan", previous) : ""}
        ${scanBlock(previous ? "Latest scan" : "Saved scan", latest)}
      </div>
      <article class="card effect-card">
        <h3>Progress summary</h3>
        <p class="fine">${esc(
          comparison
            ? comparison.summary
            : "Save a follow-up scan to compare it with this one."
        )}</p>
        ${(comparison?.notes || []).map((note) => `<p class="fine">${esc(note)}</p>`).join("")}
        <p class="disclaimer">${esc(DISCLAIMER)}</p>
      </article>
      <article class="card">
        <h3>Products used</h3>
        <div class="product-list">
          ${
            products.length
              ? products
                  .map(
                    (item) => `<article class="product-card">
                      <div class="product-copy">
                        <p class="product-name">${esc(item.name)}</p>
                        <p class="product-date">${esc(productDate(item.startDate))}</p>
                        ${item.notes ? `<p class="fine">${esc(item.notes)}</p>` : ""}
                      </div>
                      <button class="btn btn-ghost product-remove" type="button" data-progress-action="remove-product" data-id="${esc(
                        item.id
                      )}">Remove</button>
                    </article>`
                  )
                  .join("")
              : `<p class="fine">No product recorded.</p>`
          }
        </div>
        <div class="remind-add">
          <button class="btn btn-ghost" type="button" data-progress-action="open-add-product">+ Add Product</button>
        </div>
        <dialog class="remind-dialog" id="add-product-dialog">
          <form class="session-form" data-progress-action="add-product" data-session="${esc(session.id)}">
            <h3>Add a product</h3>
            <label>Product name
              <input name="name" type="text" maxlength="80" placeholder="e.g. Acne cream" />
            </label>
            <label>Start date
              <input name="start" type="date" />
            </label>
            <label>Usage notes
              <textarea name="notes" maxlength="240" rows="2" placeholder="e.g. Applied once daily"></textarea>
            </label>
            <div class="remind-actions">
              <button class="btn btn-primary" type="submit">Save product</button>
              <button class="btn btn-ghost" type="button" data-progress-action="close-add-product">Cancel</button>
            </div>
          </form>
        </dialog>
      </article>
      ${reminderSection(session.id, reminders, latest)}
      <div class="result-actions">
        <button class="btn btn-primary" type="button" data-progress-action="follow" data-id="${esc(
          session.id
        )}">Check skin again</button>
        <button class="btn btn-ghost" type="button" data-progress-action="delete-session" data-id="${esc(
          session.id
        )}">Delete record</button>
      </div>`;
  }

  async function saveTrackedScan(appState) {
    const result = appState.last;
    if (!result) throw new Error("Run a scan before saving progress.");
    const area = document.getElementById("track-area")?.value.trim() || "";
    const notes = document.getElementById("track-notes")?.value.trim() || "";
    const productName = document.getElementById("track-product")?.value.trim() || "";
    const productDate = document.getElementById("track-product-date")?.value || "";
    const productNotes = document.getElementById("track-product-notes")?.value.trim() || "";
    const choice = document.querySelector("input[name=when]:checked")?.value || "";
    const custom = document.getElementById("track-custom")?.value || "";
    const dueAt = dueFromChoice(choice, custom);
    if (choice === "custom" && !/^\d{4}-\d{2}-\d{2}$/.test(custom)) throw new Error("Choose a date.");
    if (choice === "custom" && !dueAt) throw new Error("Choose a date that is not in the past.");
    if (productName && !productDate) throw new Error("Add a start date for the product, or leave the name blank.");
    const image = await shrinkImage(appState.previewUrl);
    const data = loadProgress();
    const now = new Date().toISOString();
    let sessionId = appState.followSessionId;
    if (sessionId && !data.sessions.some((item) => item.id === sessionId)) sessionId = "";
    if (!sessionId) {
      sessionId = progressId();
      data.sessions.push({ id: sessionId, createdAt: now, bodyArea: area, notes });
    } else if (area) {
      const session = data.sessions.find((item) => item.id === sessionId);
      if (session && !session.bodyArea) session.bodyArea = area;
    }
    data.scans.push({
      id: progressId(),
      sessionId,
      createdAt: now,
      condition: result.condition?.used || result.lesion || "",
      risk: result.risk || "",
      confidence: result.confidence ?? null,
      decision: result.decision,
      bodyArea: area,
      notes,
      image,
    });
    if (productName) {
      data.products.push({
        id: progressId(),
        sessionId,
        name: productName,
        startDate: productDate,
        notes: productNotes,
      });
    }
    let permission = "";
    if (dueAt) {
      permission = await ensureNotify();
      data.reminders.push({
        id: progressId(),
        sessionId,
        dueAt,
        status: "scheduled",
        notified: false,
        permission,
      });
    }
    saveProgress(data);
    armReminders();
    return { sessionId, reminderSaved: Boolean(dueAt), permission };
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-progress-action]");
    if (!button || button.tagName === "FORM") return;
    const action = button.dataset.progressAction;
    const id = button.dataset.id;
    const data = loadProgress();
    if (action === "delete-session") {
      if (!confirm("Delete this progress record from this device?")) return;
      data.sessions = data.sessions.filter((item) => item.id !== id);
      data.scans = data.scans.filter((item) => item.sessionId !== id);
      data.products = data.products.filter((item) => item.sessionId !== id);
      data.reminders = data.reminders.filter((item) => item.sessionId !== id);
      saveProgress(data);
      if (location.hash.startsWith("#/compare/")) location.hash = "#/progress";
      else renderProgress();
      armReminders();
      return;
    }
    if (action === "remove-product") {
      if (!confirm("Remove this product from the progress record?")) return;
      data.products = data.products.filter((item) => item.id !== id);
      saveProgress(data);
      renderCompare(compareIdFromHash());
      return;
    }
    if (action === "open-add-product") {
      const dialog = document.getElementById("add-product-dialog");
      const form = dialog?.querySelector("form");
      if (!dialog || !form) return;
      form.reset();
      dialog.showModal();
      return;
    }
    if (action === "close-add-product") {
      document.getElementById("add-product-dialog")?.close();
      return;
    }
    if (action === "complete-reminder" || action === "cancel-reminder") {
      const reminder = data.reminders.find((item) => item.id === id);
      if (reminder) reminder.status = action === "complete-reminder" ? "completed" : "cancelled";
      saveProgress(data);
      renderCompare(compareIdFromHash());
      armReminders();
      return;
    }
    if (action === "open-reschedule") {
      const reminder = data.reminders.find((item) => item.id === id);
      const dialog = document.getElementById("reschedule-dialog");
      if (!reminder || !dialog) return;
      const parts = reminderParts(reminder.dueAt);
      dialog.querySelector("[data-current-date]").textContent = parts.day;
      dialog.querySelector("[data-current-time]").textContent = parts.time;
      const form = dialog.querySelector("form");
      form.dataset.id = reminder.id;
      form.due.value = parts.local;
      const error = form.querySelector("[data-remind-error]");
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      dialog.showModal();
      return;
    }
    if (action === "close-reschedule") {
      document.getElementById("reschedule-dialog")?.close();
      return;
    }
    if (action === "open-add-reminder") {
      const dialog = document.getElementById("add-reminder-dialog");
      const form = dialog?.querySelector("form");
      if (!dialog || !form) return;
      form.reset();
      dialog.querySelectorAll(".remind-chip").forEach((chip) => chip.classList.remove("is-on"));
      const error = form.querySelector("[data-remind-error]");
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      dialog.showModal();
      return;
    }
    if (action === "close-add-reminder") {
      document.getElementById("add-reminder-dialog")?.close();
      return;
    }
    if (action === "fill-reminder") {
      const due = dueFromChoice(button.dataset.days);
      const form = document.querySelector('form[data-progress-action="add-reminder"]');
      if (!form || !due) return;
      form.due.value = reminderParts(due).local;
      form.parentElement?.querySelectorAll(".remind-chip").forEach((chip) => {
        chip.classList.toggle("is-on", chip === button);
      });
      const error = form.querySelector("[data-remind-error]");
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      return;
    }
    if (action === "follow") {
      window.DermaProgress.prepareFollowUp(id);
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-progress-action]");
    if (!form) return;
    event.preventDefault();
    const action = form.dataset.progressAction;
    const data = loadProgress();
    const sessionId = form.dataset.session || compareIdFromHash();
    if (action === "add-product") {
      const name = form.name.value.trim();
      const start = form.start.value;
      if (!name) return;
      if (!start) {
        alert("Add a start date, or leave the product name blank.");
        return;
      }
      data.products.push({
        id: progressId(),
        sessionId,
        name,
        startDate: start,
        notes: form.notes.value.trim(),
      });
      saveProgress(data);
      renderCompare(sessionId);
      return;
    }
    if (action === "add-reminder" || action === "reschedule") {
      const error = form.querySelector("[data-remind-error]");
      const due = new Date(form.due.value);
      const invalid = Number.isNaN(due.getTime()) || due.getTime() <= Date.now();
      if (invalid) {
        if (error) {
          error.hidden = false;
          error.textContent = "Choose a date and time in the future.";
        }
        return;
      }
      if (error) error.hidden = true;
      if (action === "reschedule") {
        const reminder = data.reminders.find((item) => item.id === form.dataset.id);
        if (reminder) {
          reminder.dueAt = due.toISOString();
          reminder.status = "scheduled";
          reminder.notified = false;
          reminder.snoozeUntil = "";
        }
      } else {
        data.reminders.push({
          id: progressId(),
          sessionId,
          dueAt: due.toISOString(),
          status: "scheduled",
          notified: false,
        });
        ensureNotify();
      }
      saveProgress(data);
      renderCompare(sessionId);
      armReminders();
    }
  });

  document.getElementById("reminder-open")?.addEventListener("click", () => {
    const sessionId = document.getElementById("reminder-banner")?.dataset.session;
    if (sessionId) {
      window.DermaProgress.prepareFollowUp(sessionId);
    }
  });

  document.getElementById("reminder-later")?.addEventListener("click", () => {
    const banner = document.getElementById("reminder-banner");
    const id = banner?.dataset.reminder;
    const data = loadProgress();
    const reminder = data.reminders.find((item) => item.id === id);
    if (reminder) {
      reminder.snoozeUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      saveProgress(data);
    }
    if (banner) banner.hidden = true;
  });

  window.DermaProgress = {
    compareScans,
    DISCLAIMER,
    renderTrack,
    renderProgress,
    renderCompare,
    saveTrackedScan,
    checkReminders,
    armReminders,
    prepareFollowUp(sessionId) {
      const app = window.dermaAppState;
      if (app) {
        app.followSessionId = sessionId;
        app.keepFollow = true;
      }
      location.hash = "#/assess";
    },
  };

  armReminders();
  setInterval(checkReminders, 20000);
}
