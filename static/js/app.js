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

async function resetState() {
    await fetch("/api/reset", { method: "POST" });
    refresh();
}

async function reboot() {
    await fetch("/api/reboot", { method: "POST" });
    refresh();
}

async function shutdown() {
    await fetch("/api/shutdown", { method: "POST" });
    refresh();
}

// Auto-refresh loop
refresh();
setInterval(refresh, 1000);