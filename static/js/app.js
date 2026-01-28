let liveEnabled = true;
let lastLogsJson = null;
let lastFaceImagesSig = "";
let lastLogsLastChanged = null; // last seen state.logs_last_changed
let lastExtendedLastChanged = null; // last seen state.extended_state_last_changed
let lastExtendedJson = null;
let tickRunning = false;

async function refresh() {
  const res = await fetch("/api/state");
  const data = await res.json();

  const pretty = JSON.stringify(data, null, 2);
  const statePre = document.getElementById("state-live");
  if (statePre) statePre.innerText = pretty;

  // Return timestamps used to decide whether to refresh logs / extended state
  return {
    logs_last_changed: data.logs_last_changed ?? null,
    extended_state_last_changed: data.extended_state_last_changed ?? null,
  };
}

async function refreshLogs() {
  const pre = document.getElementById("logs-json");

  try {
    const res = await fetch("/api/logs");
    if (!res.ok) {
      const text = await res.text();
      if (pre) pre.innerText = `Failed to load logs (${res.status}): ${text}`;
      return;
    }

    const logs = await res.json();
    lastLogsJson = logs;

    if (pre) pre.innerText = JSON.stringify(logs, null, 2);

    const faceImages = (logs?.clickwork?.["face-images"] ?? []);
    if (Array.isArray(faceImages)) {
      const last = faceImages[faceImages.length - 1];
        const lastB64 =
          typeof last === "string" ? last :
          (last && typeof last === "object" && typeof last.image_b64 === "string")
            ? last.image_b64
            : "";
        const sig = faceImages.length + ":" + lastB64.slice(0, 64);
      if (sig !== lastFaceImagesSig) {
        renderImages(faceImages);
        lastFaceImagesSig = sig;
      }
      const countEl = document.getElementById("images-count");
      if (countEl) countEl.innerText = `${faceImages.length}`;
    }
  } catch (e) {
    if (pre) pre.innerText = `Failed to load logs: ${e.message}`;
  }
}

async function refreshExtendedState() {
  const pre = document.getElementById("extended-state-json");
  if (!pre) return;

  try {
    const res = await fetch("/api/extended_state");
    if (!res.ok) {
      const text = await res.text();
      pre.innerText = `Failed to load extended_state (${res.status}): ${text}`;
      return;
    }

    const ext = await res.json();
    lastExtendedJson = ext;
    pre.innerText = JSON.stringify(ext, null, 2);
  } catch (e) {
    pre.innerText = `Failed to load extended_state: ${e.message}`;
  }
}

async function copyExtendedStateToClipboard() {
  if (!lastExtendedJson) return;
  await navigator.clipboard.writeText(JSON.stringify(lastExtendedJson, null, 2));
}

function clearImages() {
  const grid = document.getElementById("images-grid");
  const empty = document.getElementById("images-empty");
  const err = document.getElementById("images-error");
  if (grid) grid.innerHTML = "";
  if (empty) empty.classList.add("hidden");
  if (err) {
    err.classList.add("hidden");
    err.innerText = "";
  }
}

function guessImageMime(b64) {
  // Common base64 magic headers:
  // JPEG: /9j/
  // PNG:  iVBORw0KGgo
  // WEBP: UklGR
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("iVBORw0KGgo")) return "image/png";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function renderImages(faceImages) {
  const grid = document.getElementById("images-grid");
  const empty = document.getElementById("images-empty");
  const err = document.getElementById("images-error");

  if (!grid) return;

  // Reset UI
  if (err) {
    err.classList.add("hidden");
    err.innerText = "";
  }

  grid.innerHTML = "";

  if (!faceImages.length) {
    if (empty) empty.classList.remove("hidden");
    return;
  } else {
    if (empty) empty.classList.add("hidden");
  }

  // Render newest first
  const items = [...faceImages].reverse();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const b64 =
      typeof item === "string" ? item :
      (item && typeof item === "object" && typeof item.image_b64 === "string")
        ? item.image_b64
        : null;

    if (!b64 || b64.length < 32) continue;

    // Heuristic: if it already includes a data: prefix, keep it; else assume jpeg
    const src = b64.startsWith("data:")
      ? b64
      : `data:${guessImageMime(b64)};base64,${b64}`;

    const card = document.createElement("div");
    card.className = "card bg-base-200";

    const body = document.createElement("div");
    body.className = "card-body p-4";

    const title = document.createElement("div");
    title.className = "flex items-center justify-between gap-2";

    const label = document.createElement("div");
    label.className = "text-sm opacity-70";

    const ts =
      item && typeof item === "object" && typeof item.timestamp === "string"
        ? item.timestamp
        : null;

    label.innerText = ts
      ? `Image ${items.length - i} — ${ts}`
      : `Image ${items.length - i}`;

    const btn = document.createElement("button");
    btn.className = "btn btn-xs btn-outline";
    btn.innerText = "Copy b64";
    btn.onclick = async () => {
      await navigator.clipboard.writeText(b64);
    };

    title.appendChild(label);
    title.appendChild(btn);

    const img = document.createElement("img");
    img.src = src;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "0.75rem";
    img.style.border = "1px solid #444";
    img.loading = "lazy";

    body.appendChild(title);
    body.appendChild(img);
    card.appendChild(body);
    grid.appendChild(card);
  }
}

async function copyLogsToClipboard() {
  if (!lastLogsJson) return;
  await navigator.clipboard.writeText(JSON.stringify(lastLogsJson, null, 2));
}

// === Controls ===

async function inc() {
    await fetch("/api/inc", { method: "POST" });
    refresh();
}

async function dec() {
    await fetch("/api/dec", { method: "POST" });
    refresh();
}

async function doReset() {
    await fetch("/api/reset", { method: "POST" });
    refresh();
}

async function doReboot() {
    await fetch("/api/reboot", { method: "POST" });
    refresh();
}

async function doShutdown() {
    await fetch("/api/shutdown", { method: "POST" });
    refresh();
}

// Auto-refresh loop including logs and extended state
(async () => {
  // initial load
  const ts0 = await refresh();
  lastLogsLastChanged = ts0.logs_last_changed;
  lastExtendedLastChanged = ts0.extended_state_last_changed;

  await refreshLogs();
  await refreshExtendedState();

  setInterval(async () => {
    if (!liveEnabled || tickRunning) return;
    tickRunning = true;

    try {
      const ts = await refresh();

      if (ts.logs_last_changed !== lastLogsLastChanged) {
        lastLogsLastChanged = ts.logs_last_changed;
        await refreshLogs();
      }

      if (ts.extended_state_last_changed !== lastExtendedLastChanged) {
        lastExtendedLastChanged = ts.extended_state_last_changed;
        await refreshExtendedState();
      }
    } finally {
      tickRunning = false;
    }
  }, 1000);
})();

// Handle video feed
// Handle video feed (optional section)
const btn = document.getElementById("toggle-video");
const container = document.getElementById("video-container");
const img = document.getElementById("video-stream");

let videoTimer = null;

if (btn && container && img) {
  btn.addEventListener("click", () => {
    if (container.style.display === "none") {
      container.style.display = "block";

      videoTimer = setInterval(() => {
        img.src = "/api/snapshot?ts=" + Date.now();
      }, 5000);
    } else {
      container.style.display = "none";
      img.src = "";
      if (videoTimer) {
        clearInterval(videoTimer);
        videoTimer = null;
      }
    }
  });
}




// Advanced Mode (State manipulation)
function showMsg(id, text) {
  const el = document.getElementById(id);
  el.innerText = text;
  el.classList.remove("hidden");
}
function hideMsg(id) {
  const el = document.getElementById(id);
  el.classList.add("hidden");
  el.innerText = "";
}

function toggleLive() {
  liveEnabled = !liveEnabled;
  const btn = document.getElementById("toggle-live");
  btn.innerText = liveEnabled ? "Pause" : "Resume";
}

function copyLiveToEditor() {
  hideMsg("state-error");
  hideMsg("state-success");
  const live = document.getElementById("state-live").innerText;
  document.getElementById("state-editor").value = live && live !== "…" ? live : "";
}

async function copyLiveToClipboard() {
  const live = document.getElementById("state-live").innerText;
  await navigator.clipboard.writeText(live);
  showMsg("state-success", "Live JSON copied to clipboard.");
  setTimeout(() => hideMsg("state-success"), 1500);
}

function formatEditorJson() {
  hideMsg("state-error");
  hideMsg("state-success");

  const raw = document.getElementById("state-editor").value.trim();
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    document.getElementById("state-editor").value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    showMsg("state-error", "Invalid JSON in editor: " + e.message);
  }
}

async function applyStateFromEditor() {
  hideMsg("state-error");
  hideMsg("state-success");

  const raw = document.getElementById("state-editor").value.trim();
  if (!raw) {
    showMsg("state-error", "Editor is empty.");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    showMsg("state-error", "Invalid JSON: " + e.message);
    return;
  }

  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    });

    if (!res.ok) {
      const text = await res.text();
      showMsg("state-error", `Apply failed (${res.status}): ${text}`);
      return;
    }

    showMsg("state-success", "State applied.");
  } catch (e) {
    showMsg("state-error", "Network error: " + e.message);
  }
}