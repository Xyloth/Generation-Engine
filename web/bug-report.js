const params = new URLSearchParams(location.search);
const slug = params.get("slug") || "";
const projectTitle = params.get("project") || "";
const source = params.get("from") || "unknown";

const state = {
  status: null,
  book: null,
  messages: [
    {
      role: "assistant",
      content: "Tell me what broke. You can type it or record it, and I will turn it into a bug report James can actually fix.",
    },
  ],
  inputText: "",
  draft: null,
  generating: false,
  recording: false,
  transcribing: false,
  micPermission: "unknown",
  micError: "",
  recordingSeconds: 0,
  mediaRecorder: null,
  audioChunks: [],
  audioStream: null,
  audioContext: null,
  analyser: null,
  meterFrame: null,
};

const $ = (selector, root = document) => root.querySelector(selector);

const iconSvg = {
  Mic: `<rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path>`,
  Send: `<path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path>`,
  Mail: `<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M4 7l8 6 8-6"></path>`,
  Copy: `<rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect>`,
  X: `<line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line>`,
};

function icon(name, className = "") {
  return `<svg class="${escapeHtml(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconSvg[name] || ""}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getJson(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

async function api(path, body, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

async function init() {
  try {
    state.status = await getJson("/api/status");
    if (slug) state.book = await getJson(`/api/books/${encodeURIComponent(slug)}`);
  } catch (error) {
    state.messages.push({ role: "assistant", content: `Status check failed: ${error.message}` });
  }
  render();
}

function render() {
  const root = $("#bugReportApp");
  root.innerHTML = `
    <main class="ge-popout ge-bug-window">
      <header class="ge-popout-header ge-bug-header">
        <div>
          <div class="ge-empty-eyebrow">Generation Engine</div>
          <h1>Report Bug</h1>
          <p class="ge-muted">${escapeHtml(projectTitle || state.book?.title || "Projects screen")} · ${escapeHtml(state.status?.mode || "checking backend")}</p>
        </div>
        <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="close-window">${icon("X")}Close</button>
      </header>

      <section class="ge-bug-thread" id="bugThread">
        ${state.messages.map((message) => `
          <article class="ge-bug-msg ${message.role === "user" ? "is-user" : "is-ai"}">
            <div>${escapeHtml(message.content).replace(/\n/g, "<br />")}</div>
          </article>
        `).join("")}
      </section>

      ${state.micError ? `
        <div class="ge-mic-banner ge-bug-mic-banner">
          <div class="icn">!</div>
          <div><strong>Microphone issue</strong><span>${escapeHtml(state.micError)}</span></div>
        </div>
      ` : ""}

      <section class="ge-bug-compose">
        <textarea id="bugInput" placeholder="Tell me what happened. You can ramble." ${state.generating ? "disabled" : ""}>${escapeHtml(state.inputText)}</textarea>
        <button class="ge-bug-mic ${state.recording ? "is-recording" : ""} ${state.transcribing ? "is-transcribing" : ""}" data-action="toggle-recording" title="Record bug report">
          ${state.transcribing ? `<span class="ge-spinner"></span>` : icon("Mic")}
          ${state.recording ? `<span id="recordingTimer">${formatSeconds(state.recordingSeconds)}</span>` : ""}
        </button>
        <button class="ge-btn ge-btn--primary" data-action="send-complaint" ${state.generating ? "disabled" : ""}>${icon("Send")}${state.generating ? "Writing..." : "Send"}</button>
      </section>

      ${state.draft ? renderDraft() : ""}
    </main>
  `;
  $("#bugInput")?.focus();
  const thread = $("#bugThread");
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function renderDraft() {
  const recipient = state.draft.recipient || state.status?.bugReport?.recipient || "founder@xyflowinnovations.com";
  return `
    <section class="ge-bug-draft-panel">
      <div>
        <strong>Bug report email</strong>
        <span>Send opens Gmail compose for ${escapeHtml(recipient)}.</span>
      </div>
      <label>Subject
        <input id="bugSubject" value="${escapeHtml(state.draft.subject || "Generation Engine bug report")}" />
      </label>
      <label>Report body
        <textarea id="bugDraftBody" class="ge-bug-report-editor">${escapeHtml(state.draft.body || "")}</textarea>
      </label>
      <footer>
        <button class="ge-btn ge-btn--ghost" data-action="copy-report">${icon("Copy")}Copy</button>
        <button class="ge-btn ge-btn--primary" data-action="send-report">${icon("Mail")}Open Gmail</button>
      </footer>
    </section>
  `;
}

function syncInput() {
  const input = $("#bugInput");
  if (input) state.inputText = input.value;
}

async function sendComplaint() {
  syncInput();
  const description = state.inputText.trim();
  if (!description) {
    showToast("Tell me what broke first");
    return;
  }
  state.messages.push({ role: "user", content: description });
  state.messages.push({ role: "assistant", content: "I am writing that up as a fixable bug report." });
  state.inputText = "";
  state.generating = true;
  render();
  try {
    const report = await api("/api/bug-report/draft", {
      description,
      diagnostics: bugDiagnostics(),
    });
    state.draft = report;
    state.messages[state.messages.length - 1] = {
      role: "assistant",
      content: "I wrote the report. Read it once if you want, then hit Open Gmail and send it.",
    };
  } catch (error) {
    state.draft = { subject: "Generation Engine bug report", body: fallbackBugBody(description) };
    state.messages[state.messages.length - 1] = {
      role: "assistant",
      content: `The AI report writer failed, so I made a plain fallback report instead. Error: ${error.message}`,
    };
  } finally {
    state.generating = false;
    render();
  }
}

function bugDiagnostics() {
  return {
    url: location.href,
    userAgent: navigator.userAgent,
    source,
    mode: state.status?.mode,
    statusMessage: state.status?.statusMessage,
    booksDir: state.status?.booksDir,
    version: state.status?.version,
    activeProject: state.book ? {
      slug: state.book.slug,
      title: state.book.title,
      projectType: state.book.meta?.projectType || state.book.projectType,
      chapterCount: state.book.chapters?.length || 0,
    } : null,
    micPermission: state.micPermission,
    micError: state.micError,
  };
}

function fallbackBugBody(description) {
  return `Generation Engine bug report\n\nWhat happened:\n${description}\n\nDiagnostics:\n${JSON.stringify(bugDiagnostics(), null, 2)}\n`;
}

async function sendBugReport() {
  if (!state.draft) return;
  const body = $("#bugDraftBody")?.value || state.draft.body || "";
  const subject = $("#bugSubject")?.value || state.draft.subject || "Generation Engine bug report";
  const recipient = state.draft.recipient || state.status?.bugReport?.recipient || "founder@xyflowinnovations.com";
  let composeBody = body;
  if (composeBody.length > 14000) {
    await navigator.clipboard.writeText(body);
    composeBody = `${body.slice(0, 12000)}\n\n[Report was too long for a Gmail compose URL. The full report has been copied to the clipboard. Paste it here before sending if needed.]`;
    showToast("Full report copied; opening Gmail");
  } else {
    showToast("Opening Gmail compose");
  }
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeBody)}`;
  window.open(gmailUrl, "_blank", "noopener");
}

async function copyBugReport() {
  if (!state.draft) return;
  const body = $("#bugDraftBody")?.value || state.draft.body || "";
  await navigator.clipboard.writeText(body);
  showToast("Copied");
}

async function toggleRecording() {
  if (state.transcribing) return;
  if (state.recording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  state.micError = "";
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    state.micPermission = "denied";
    state.micError = "This window cannot record audio. Open Generation Engine in the desktop app or Edge/Chrome.";
    render();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioStream = stream;
    state.audioChunks = [];
    state.mediaRecorder = new MediaRecorder(stream);
    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) state.audioChunks.push(event.data);
    };
    state.mediaRecorder.onstop = handleRecordingStopped;
    setupAudioMeter(stream);
    state.recording = true;
    state.micPermission = "granted";
    state.recordingSeconds = 0;
    state.mediaRecorder.start(250);
    render();
    startRecordingTimer();
    startMeterLoop();
  } catch (_error) {
    state.micPermission = "denied";
    state.recording = false;
    state.micError = "Microphone permission was denied. Allow microphone access for this app, then reopen the bug report window.";
    render();
  }
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") state.mediaRecorder.stop();
}

function startRecordingTimer() {
  clearInterval(startRecordingTimer.timer);
  const started = Date.now();
  startRecordingTimer.timer = setInterval(() => {
    if (!state.recording) {
      clearInterval(startRecordingTimer.timer);
      return;
    }
    state.recordingSeconds = Math.floor((Date.now() - started) / 1000);
    const timer = $("#recordingTimer");
    if (timer) timer.textContent = formatSeconds(state.recordingSeconds);
  }, 250);
}

function setupAudioMeter(stream) {
  try {
    state.audioContext = new AudioContext();
    const sourceNode = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    sourceNode.connect(state.analyser);
  } catch (_error) {
    state.analyser = null;
  }
}

function startMeterLoop() {
  if (state.meterFrame) cancelAnimationFrame(state.meterFrame);
  const data = state.analyser ? new Uint8Array(state.analyser.frequencyBinCount) : null;
  const tick = () => {
    if (!state.recording) return;
    let level = 0.25;
    if (state.analyser && data) {
      state.analyser.getByteFrequencyData(data);
      level = Math.min(1, Math.max(0.12, data.reduce((sum, value) => sum + value, 0) / data.length / 120));
    }
    const mic = $(".ge-bug-mic");
    if (mic) mic.style.setProperty("--level", String(level));
    state.meterFrame = requestAnimationFrame(tick);
  };
  tick();
}

async function handleRecordingStopped() {
  const chunks = [...state.audioChunks];
  state.audioStream?.getTracks().forEach((track) => track.stop());
  if (state.audioContext) await state.audioContext.close().catch(() => {});
  state.recording = false;
  state.transcribing = true;
  state.mediaRecorder = null;
  state.audioStream = null;
  state.audioContext = null;
  state.analyser = null;
  clearInterval(startRecordingTimer.timer);
  render();
  try {
    const sourceBlob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
    const wavBlob = await blobToWav(sourceBlob);
    const form = new FormData();
    form.append("audio", wavBlob, "bug-report.wav");
    const response = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Transcription failed");
    state.inputText = [state.inputText.trim(), data.transcript].filter(Boolean).join(state.inputText.trim() ? "\n" : "");
    state.micError = "";
  } catch (error) {
    state.micError = error.message;
  } finally {
    state.transcribing = false;
    render();
  }
}

async function blobToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
  await context.close();
  return new Blob([encodeWav(audioBuffer)], { type: "audio/wav" });
}

function encodeWav(audioBuffer) {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples * blockAlign);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples * blockAlign, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples * blockAlign, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_v, index) => audioBuffer.getChannelData(index));
  for (let i = 0; i < samples; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "close-window") window.close();
  if (action === "send-complaint") sendComplaint();
  if (action === "toggle-recording") toggleRecording();
  if (action === "send-report") sendBugReport();
  if (action === "copy-report") copyBugReport();
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#bugInput")) state.inputText = event.target.value;
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("#bugInput") && event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendComplaint();
  }
  if (event.key === "Escape" && !state.recording && !state.transcribing && !state.generating) window.close();
});

init();
