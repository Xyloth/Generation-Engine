const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");

const ROOT = path.resolve(__dirname, "..");
const STATE_PATH = path.join(ROOT, ".server_state.json");
const LOG_PATH = path.join(ROOT, "desktop-shell.log");
const PYTHONW = path.join(ROOT, "runtime", "pythonw.exe");
const PYTHON = path.join(ROOT, "runtime", "python.exe");
const ICON = path.join(ROOT, "assets", "generation-engine.ico");

let mainWindow = null;
let serverProcess = null;
let serverUrl = null;
let serverOwnedByShell = false;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_PATH, line, "utf8");
  } catch (_error) {
    // Logging must never block launch.
  }
}

function htmlPage(title, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root { color-scheme: dark; }
    html, body { height: 100%; margin: 0; }
    body {
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 35% 20%, rgba(220,183,102,.12), transparent 42%), #07070a;
      color: #f4f1e6;
      font-family: Inter, Segoe UI, system-ui, sans-serif;
    }
    main {
      width: min(680px, calc(100vw - 48px));
      padding: 32px;
      border-radius: 22px;
      background: rgba(24,24,32,.74);
      box-shadow: 0 24px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.08);
    }
    .eyebrow {
      color: #dcb766;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .2em;
      text-transform: uppercase;
    }
    h1 { margin: 10px 0 12px; font-size: 30px; font-weight: 500; }
    p { margin: 0 0 12px; color: #d8d4c2; line-height: 1.5; }
    code { color: #f4e3b0; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">Generation Engine</div>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadInline(win, title, body) {
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlPage(title, body))}`);
}

function readStateUrl() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    return state && state.url;
  } catch (_error) {
    return null;
  }
}

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const req = http.get(`${url}/api/status`, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 50000) {
          resolve(false);
          req.destroy();
        }
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return resolve(false);
        try {
          const payload = JSON.parse(body);
          resolve(Boolean(payload && payload.booksDir && payload.mode && payload.preflight));
        } catch (_error) {
          resolve(false);
        }
      });
    });
    req.setTimeout(1800, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

async function waitForServer(timeoutMs = 70000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = readStateUrl();
    if (url && await checkUrl(url)) return url;
    for (let port = 8765; port < 8815; port += 1) {
      const candidate = `http://127.0.0.1:${port}`;
      if (await checkUrl(candidate)) return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Generation Engine backend did not become reachable.");
}

async function ensureServer() {
  const existing = readStateUrl();
  if (existing && await checkUrl(existing)) {
    serverUrl = existing;
    log(`Using existing backend at ${serverUrl}`);
    return serverUrl;
  }

  const python = fs.existsSync(PYTHONW) ? PYTHONW : PYTHON;
  if (!fs.existsSync(python)) {
    throw new Error(`Portable Python is missing at ${python}`);
  }
  try {
    fs.unlinkSync(STATE_PATH);
  } catch (_error) {
    // stale state is optional
  }
  log(`Starting backend with ${python}`);
  serverProcess = spawn(python, ["server.py"], {
    cwd: ROOT,
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });
  serverOwnedByShell = true;
  serverProcess.on("exit", (code, signal) => log(`Backend exited code=${code} signal=${signal}`));
  serverUrl = await waitForServer();
  log(`Backend ready at ${serverUrl}`);
  return serverUrl;
}

function createWindow(options = {}) {
  const win = new BrowserWindow({
    width: options.width || 1440,
    height: options.height || 940,
    minWidth: options.minWidth || 980,
    minHeight: options.minHeight || 680,
    title: options.title || "Generation Engine",
    icon: ICON,
    backgroundColor: "#07070a",
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log(`renderer console level=${level} ${sourceId}:${line} ${message}`);
  });
  win.webContents.on("did-fail-load", (_event, code, description, validatedUrl) => {
    log(`did-fail-load code=${code} description=${description} url=${validatedUrl}`);
    loadInline(win, "Could not load the app", `<p>${escapeHtml(description)}</p><p>Backend URL: <code>${escapeHtml(validatedUrl)}</code></p><p>See <code>${escapeHtml(LOG_PATH)}</code>.</p>`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    log(`render-process-gone ${JSON.stringify(details)}`);
    loadInline(win, "Renderer crashed", `<p>Electron's renderer stopped unexpectedly.</p><p>See <code>${escapeHtml(LOG_PATH)}</code>.</p>`);
  });
  win.webContents.on("unresponsive", () => log("window became unresponsive"));
  loadInline(win, "Starting Generation Engine", "<p>Starting the local backend and opening the Projects screen.</p>");
  return win;
}

function loadAppUrl(win, url) {
  win.webContents.setWindowOpenHandler(({ url: childUrl }) => {
    if (!serverUrl || !childUrl.startsWith(serverUrl)) {
      shell.openExternal(childUrl);
      return { action: "deny" };
    }
    const child = createWindow({ width: 820, height: 920, minWidth: 520, minHeight: 520, title: "Generation Engine" });
    loadAppUrl(child, childUrl);
    return { action: "deny" };
  });
  log(`Loading ${url}`);
  win.loadURL(url);
}

async function start() {
  log("Electron shell starting");
  try {
    if (process.env.GE_ELECTRON_SMOKE === "1") {
      const url = await ensureServer();
      console.log(url);
      app.quit();
      return;
    }
    mainWindow = createWindow({ title: "Generation Engine" });
    const url = await ensureServer();
    loadAppUrl(mainWindow, `${url}/?home=1`);
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  } catch (error) {
    log(`startup error: ${error.stack || error.message}`);
    if (mainWindow) {
      loadInline(mainWindow, "Generation Engine failed to start", `<p>${escapeHtml(error.stack || error.message)}</p><p>See <code>${escapeHtml(LOG_PATH)}</code>.</p>`);
    } else {
      dialog.showErrorBox("Generation Engine failed to start", error.stack || error.message);
      app.quit();
    }
  }
}

async function shutdownServer() {
  if (!serverOwnedByShell || !serverUrl) return;
  await new Promise((resolve) => {
    const req = http.request(`${serverUrl}/api/shutdown`, { method: "POST", timeout: 1200 }, (res) => {
      res.resume();
      resolve();
    });
    req.on("error", resolve);
    req.on("timeout", () => {
      req.destroy();
      resolve();
    });
    req.end();
  });
  if (serverProcess && serverProcess.exitCode === null && serverProcess.signalCode === null) {
    await Promise.race([
      new Promise((resolve) => serverProcess.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  }
  if (serverProcess && serverProcess.exitCode === null && serverProcess.signalCode === null) {
    try {
      serverProcess.kill();
    } catch (_error) {
      // process may have already exited
    }
  }
  try {
    const current = readStateUrl();
    if (!current || current === serverUrl) fs.unlinkSync(STATE_PATH);
  } catch (_error) {
    // stale state is non-fatal; the next launch verifies /api/status before use
  }
}

app.whenReady().then(start);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverUrl) {
    mainWindow = createWindow({ title: "Generation Engine" });
    loadAppUrl(mainWindow, `${serverUrl}/?home=1`);
  }
});

app.on("before-quit", (event) => {
  if (!serverOwnedByShell || app.__didShutdownServer) return;
  event.preventDefault();
  app.__didShutdownServer = true;
  shutdownServer().finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
