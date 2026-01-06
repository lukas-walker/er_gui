let liveEnabled = true;

async function refresh() {
  const res = await fetch("/api/state");
  const data = await res.json();

  document.getElementById("round").innerText = data.round ?? "—";

  const pretty = JSON.stringify(data, null, 2);
  document.getElementById("state-live").innerText = pretty;
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
setInterval(() => {
  if (liveEnabled) refresh();
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