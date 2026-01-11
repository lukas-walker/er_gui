let liveEnabled = true;
let lastLogsJson = null;
let lastFaceImagesSig = "";

async function refresh() {
  const res = await fetch("/api/state");
  const data = await res.json();

  document.getElementById("round").innerText = data.round ?? "—";

  const pretty = JSON.stringify(data, null, 2);
  document.getElementById("state-live").innerText = pretty;
}

async function refreshLogs() {
  const res = await fetch("/api/logs");
  if (!res.ok) {
    // Avoid spamming; show minimal failure state
    const el = document.getElementById("logs-json");
    if (el) el.innerText = `Failed to load logs (${res.status})`;
    return;
  }

  const logs = await res.json();
  lastLogsJson = logs;

  const countEl = document.getElementById("images-count");
  const faceImages = (logs?.clickwork?.["face-images"] ?? []);
  if (countEl && Array.isArray(faceImages)) {
    countEl.innerText = `${faceImages.length}`;
  }

  // Render logs JSON
  const logsPretty = JSON.stringify(logs, null, 2);
  const pre = document.getElementById("logs-json");
  if (pre) pre.innerText = logsPretty;

  // Render images (only if count changed)
  try {
    const faceImages = (logs?.clickwork?.["face-images"] ?? []);
    if (!Array.isArray(faceImages)) return;

    const sig = faceImages.length + ":" + (faceImages[faceImages.length - 1] || "").slice(0, 64);
    if (sig !== lastFaceImagesSig) {
      renderImages(faceImages);
      lastFaceImagesSig = sig;
    }
  } catch (e) {
    const err = document.getElementById("images-error");
    if (err) {
      err.innerText = "Image render error: " + e.message;
      err.classList.remove("hidden");
    }
  }
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
    const b64 = items[i];
    if (typeof b64 !== "string" || b64.length < 32) continue;

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
    label.innerText = `Image ${items.length - i}`;

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

// Auto-refresh loop
refresh();
refreshLogs();
setInterval(() => {
  if (liveEnabled) refresh();
  refreshLogs();
}, 1000);

// Handle video feed
const btn = document.getElementById('toggle-video');
const container = document.getElementById('video-container');
const img = document.getElementById('video-stream');

let videoTimer = null;

btn.addEventListener('click', () => {
  if (container.style.display === 'none') {
    container.style.display = 'block';

    // start polling snapshots
    videoTimer = setInterval(() => {
      img.src = '/api/snapshot?ts=' + Date.now();
    }, 5000);
  } else {
    container.style.display = 'none';
    img.src = '';
    if (videoTimer) {
      clearInterval(videoTimer);
      videoTimer = null;
    }
  }
});




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