async function refresh() {
    const res = await fetch("/api/state");
    const data = await res.json();
    document.getElementById("round").innerText = data.round;
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
setInterval(refresh, 1000);


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
    }, 50);
  } else {
    container.style.display = 'none';
    img.src = '';
    if (videoTimer) {
      clearInterval(videoTimer);
      videoTimer = null;
    }
  }
});