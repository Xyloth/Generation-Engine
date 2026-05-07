const state = {
  status: null,
  books: [],
  book: null,
  conversation: [],
  activeChapterId: null,
  focusedChapterId: null,
  storyboardTab: "world",
  researchTab: "sources",
  modal: null,
  inputText: "",
  micError: "",
  micPermission: "unknown",
  recording: false,
  transcribing: false,
  recordingSeconds: 0,
  mediaRecorder: null,
  audioChunks: [],
  audioStream: null,
  audioContext: null,
  analyser: null,
  meterFrame: null,
  autoSpeak: localStorage.getItem("ge:autoSpeak") === "true",
  generating: false,
  abortController: null,
  autosave: new Map(),
  storyboardOpen: false,
  settingsOpen: false,
  projectMenuSlug: null,
  creatingProject: false,
  updateInfo: null,
  checkingUpdate: false,
  installingUpdate: false,
  railOpen: true,
  openWindows: [],
  windowTabs: {},
  zCounter: 40,
  stickToBottom: true,
};

let pointerOp = null;
const startAtHome = new URLSearchParams(window.location.search).get("home") === "1";

const canonTabs = [
  ["world", "World"],
  ["characters", "Characters"],
  ["timeline", "Timeline"],
  ["arcs", "Arcs"],
  ["voice_profile", "Voice"],
  ["sections", "Sections"],
];

const researchTabs = [
  ["sources", "Sources"],
  ["people", "People"],
  ["timeline", "Timeline"],
  ["claims", "Claims"],
  ["records", "Records"],
  ["voice", "Voice"],
];

const iconSvg = {
  Mic: `<rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path>`,
  MicOff: `<rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path><line x1="3" y1="3" x2="21" y2="21"></line>`,
  Book: `<path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H6.5a2.5 2.5 0 0 1 0-5H20"></path>`,
  Home: `<path d="M3 10.5L12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path><path d="M9 21v-6h6v6"></path>`,
  External: `<path d="M14 3h7v7"></path><path d="M21 3l-9 9"></path><path d="M11 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"></path>`,
  Chevron: `<path d="M6 9l6 6 6-6"></path>`,
  Sparkles: `<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"></path><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z"></path>`,
  Layers: `<path d="M12 3l9 5-9 5-9-5 9-5z"></path><path d="M3 13l9 5 9-5"></path><path d="M3 17l9 5 9-5"></path>`,
  X: `<line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line>`,
  Lock: `<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>`,
  LockOpen: `<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 7-1"></path>`,
  Recap: `<path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 4v5h-5"></path>`,
  Volume: `<path d="M4 9h4l5-4v14l-5-4H4z"></path><path d="M16 8a5 5 0 0 1 0 8"></path>`,
  Resize: `<path d="M22 22H12"></path><path d="M22 22V12"></path><path d="M22 22l-8-8"></path>`,
  Send: `<path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path>`,
  Plus: `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,
  AlertTri: `<path d="M12 4l10 17H2L12 4z"></path><path d="M12 10v5"></path><path d="M12 18.5v.5"></path>`,
  Sidebar: `<rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="9" y1="4" x2="9" y2="20"></line>`,
  Copy: `<rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect>`,
  Trash: `<path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path>`,
  Edit: `<path d="M4 20h4l10.5-10.5a2.2 2.2 0 0 0-3-3L5 17v3z"></path><path d="M13.5 6.5l4 4"></path>`,
  Rotate: `<path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 4v5h-5"></path>`,
  Stop: `<rect x="7" y="7" width="10" height="10" rx="1.5"></rect>`,
  Settings: `<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.8v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4v-2.8h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h2.8v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1z"></path>`,
  More: `<circle cx="12" cy="5" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="12" cy="19" r="1.4"></circle>`,
  Mail: `<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M4 7l8 6 8-6"></path>`,
  Bug: `<path d="M8 7a4 4 0 0 1 8 0"></path><rect x="7" y="7" width="10" height="12" rx="5"></rect><path d="M3 13h4"></path><path d="M17 13h4"></path><path d="M4.5 8.5L7 10"></path><path d="M19.5 8.5L17 10"></path><path d="M4.5 17.5L7 16"></path><path d="M19.5 17.5L17 16"></path><path d="M12 7v12"></path>`,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inList = false;
  let inQuote = false;
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length) {
      out.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }
  function closeList() {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  }
  function closeQuote() {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      closeQuote();
      continue;
    }
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`<p>${inlineMd(quote[1])}</p>`);
      continue;
    }
    closeQuote();
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      out.push(`<h${heading[1].length}>${inlineMd(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMd(bullet[1])}</li>`);
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  closeList();
  closeQuote();
  return out.join("\n");
}

function inlineMd(text) {
  return escapeHtml(text)
    .replace(/\[\[claim:(claim-\d+)\]\]/g, `<sup class="claim-cite" title="$1">$1</sup>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function plainText(markdown) {
  return String(markdown || "")
    .replace(/<!--\s*GE_DRAFT[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDraftMarker(content) {
  const text = String(content || "").trim();
  const match = text.match(/<!--\s*GE_DRAFT\s+({[\s\S]*?})\s*-->\s*$/);
  if (!match) return { clean: content || "", draft: null };
  let draft = { draft_for: "chapter" };
  try {
    draft = JSON.parse(match[1]);
  } catch (_error) {
    // Keep the generic draft metadata.
  }
  return { clean: text.replace(match[0], "").trim(), draft };
}

async function api(path, body, method = "POST") {
  const options = body === undefined ? {} : {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
  const response = await fetch(path, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }
  return data;
}

async function getJson(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }
  return data;
}

async function streamPost(path, body, onChunk, signal = undefined) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(chunk, full);
  }
  const rest = decoder.decode();
  if (rest) {
    full += rest;
    onChunk(rest, full);
  }
  return full;
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function modeLabel(mode) {
  if (mode === "api") return "Claude API";
  if (mode === "claude-code") return "Claude Code";
  return "AI setup needed";
}

function projectType() {
  return state.book?.meta?.projectType || state.book?.projectType || "novel";
}

function isResearch() {
  return projectType() === "research";
}

function aiAvailable() {
  return state.status?.mode === "api" || state.status?.mode === "claude-code";
}

function needsAiSetup() {
  return state.book && !aiAvailable();
}

function firstUrl(text) {
  const match = String(text || "").match(/\bhttps?:\/\/[^\s<>"']+/i);
  return match ? match[0].replace(/[),.;]+$/, "") : "";
}

function activeChapter() {
  if (!state.book) return null;
  const id = state.activeChapterId || state.book.meta.activeChapter;
  return state.book.chapters.find((chapter) => chapter.id === id) || state.book.chapters[0] || null;
}

function chapterById(id) {
  if (!state.book) return null;
  return state.book.chapters.find((chapter) => chapter.id === id) || null;
}

function chapterGroups() {
  if (!state.book) return [];
  const sections = state.book.meta.sections || [];
  const chapters = state.book.chapters || [];
  return sections.map((section) => ({
    section,
    chapters: chapters.filter((chapter) => chapter.section === section.id),
  })).filter((group) => group.chapters.length || sections.length === 1);
}

function nextChapterId() {
  const used = (state.book?.chapters || [])
    .map((chapter) => Number(chapter.id))
    .filter((id) => Number.isFinite(id));
  return String((used.length ? Math.max(...used) : 0) + 1).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nextWindowFrame() {
  const count = state.openWindows.length;
  return { x: 96 + count * 28, y: 70 + count * 28, w: 600, h: 500 };
}

function ensureChapterWindow(id, options = {}) {
  if (!id || !chapterById(id)) return null;
  let win = state.openWindows.find((item) => item.id === id);
  if (!win) {
    win = { id, ...nextWindowFrame(), z: ++state.zCounter };
    state.openWindows.push(win);
  }
  if (options.focus !== false) focusChapterWindow(id, false);
  return win;
}

function focusChapterWindow(id, rerender = true) {
  const win = state.openWindows.find((item) => item.id === id);
  if (!win) return;
  win.z = ++state.zCounter;
  state.focusedChapterId = id;
  state.activeChapterId = id;
  if (rerender) render();
}

function closeChapterWindow(id) {
  state.openWindows = state.openWindows.filter((win) => win.id !== id);
  if (state.focusedChapterId === id) {
    state.focusedChapterId = [...state.openWindows].sort((a, b) => b.z - a.z)[0]?.id || state.activeChapterId;
  }
  render();
}

function chapterEditor(chapterId, field) {
  const attr = field === "transcript" ? "data-transcript-editor" : "data-chapter-content";
  return $(`[${attr}][data-chapter-id="${CSS.escape(chapterId)}"]`);
}

async function init() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  try {
    state.status = await getJson("/api/status");
    await refreshBooks();
    if (state.books.length && !startAtHome) {
      await loadBook(state.books[0].slug, { welcome: true });
    } else {
      render();
    }
  } catch (error) {
    document.body.innerHTML = `<pre>${escapeHtml(error.stack || error.message)}</pre>`;
  }
}

async function refreshBooks() {
  const data = await getJson("/api/books");
  state.books = data.books || [];
}

async function loadBook(slug, options = {}) {
  state.book = await getJson(`/api/books/${encodeURIComponent(slug)}`);
  state.activeChapterId = state.book.meta.activeChapter || state.book.chapters.at(-1)?.id || null;
  state.focusedChapterId = state.activeChapterId;
  state.status = await getJson("/api/status");
  state.conversation = state.book.conversation?.messages || [];
  state.inputText = "";
  state.openWindows = [];
  state.windowTabs = {};
  if (options.welcome) {
    try {
      const welcome = await api(`/api/books/${encodeURIComponent(slug)}/conversation/welcome`, {});
      state.conversation = welcome.conversation?.messages || state.conversation;
    } catch (error) {
      console.warn(error);
    }
  }
  render();
}

function render() {
  const app = $("#app");
  if (!app) return;
  app.innerHTML = `
    <div class="ge-aurora-bg" aria-hidden="true"></div>
    ${state.book ? renderShell() : renderEmpty()}
    ${renderModal()}
  `;
  syncComposerValue();
  if (state.stickToBottom) requestAnimationFrame(scrollConversationBottom);
}

function renderEmpty() {
  const hasProjects = state.books.length > 0;
  return `
    <main class="ge-empty">
      <section class="ge-empty-card">
        <img class="ge-empty-mark" src="/assets/logo-glyph.svg" alt="" />
        <div class="ge-empty-eyebrow">Generation Engine</div>
        <h1 class="ge-empty-h1">${hasProjects ? "Projects" : "Start with a conversation."}</h1>
        <p class="ge-empty-p">${hasProjects ? "Open an existing project or create a new novel/research project." : "Create a book, talk to the AI, and save only the drafts you approve as chapters."}</p>
        <p class="${state.status?.mode === "api" && state.status?.preflight?.apiOk === false ? "ge-status-warning" : "ge-muted"}">${escapeHtml(state.status?.statusMessage || "")}</p>
        ${hasProjects ? renderProjectGrid() : ""}
        <div class="ge-empty-actions">
          <button class="ge-btn ge-btn--primary" data-action="create-book" data-project-type="novel" ${state.creatingProject ? "disabled" : ""}>${icon("Plus")}Create novel</button>
          <button class="ge-btn ge-btn--accent" data-action="create-book" data-project-type="research" ${state.creatingProject ? "disabled" : ""}>${icon("Plus")}Create research project</button>
          <button class="ge-btn ge-btn--accent" data-action="open-import">${icon("Book")}Import chapters</button>
          <button class="ge-btn ge-btn--ghost" data-action="open-bug-report">${icon("Bug")}Report bug</button>
        </div>
        <div class="ge-import-inline">
          <label>Book title
            <input id="emptyImportTitle" placeholder="My Novel" />
          </label>
          <label>Upload chapters
            <input id="emptyImportFiles" type="file" multiple accept=".txt,.md,.markdown" />
          </label>
          <label>Paste chapters
            <textarea id="emptyImportRaw" class="import-textarea" placeholder="Paste Chapter 1... Chapter 2... or upload markdown/text files."></textarea>
          </label>
          <button class="ge-btn ge-btn--primary" data-action="propose-import-empty">${icon("Sparkles")}Propose canon from import</button>
        </div>
      </section>
    </main>
  `;
}

function renderProjectGrid() {
  return `
    <div class="ge-project-grid">
      ${state.books.map((book) => `
        <article class="ge-project-card ${book.locked ? "is-locked" : ""}" data-action="open-project" data-slug="${escapeHtml(book.slug)}" role="button" tabindex="0" aria-label="Open ${escapeHtml(book.title)}">
          <div class="ge-project-card-top">
            <span class="ge-project-kind">${escapeHtml(book.projectType === "research" ? "Research" : "Novel")}</span>
            <button class="ge-project-menu-btn" data-action="toggle-project-menu" data-slug="${escapeHtml(book.slug)}" aria-label="Project actions" title="Project actions">${icon("More")}</button>
          </div>
          <strong>${escapeHtml(book.title)}</strong>
          <span>${book.chapterCount || 0} chapters</span>
          ${book.locked ? `<span class="ge-project-lock">${icon("Lock")}Locked</span>` : ""}
          ${state.projectMenuSlug === book.slug ? renderProjectMenu(book) : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderProjectMenu(book) {
  return `
    <div class="ge-project-menu" role="menu">
      <button data-action="toggle-project-lock" data-slug="${escapeHtml(book.slug)}" data-locked="${book.locked ? "false" : "true"}">${icon(book.locked ? "LockOpen" : "Lock")}${book.locked ? "Unlock project" : "Lock project"}</button>
      <button class="danger" data-action="delete-project-prompt" data-slug="${escapeHtml(book.slug)}" ${book.locked ? "disabled" : ""}>${icon("Trash")}Delete project</button>
    </div>
  `;
}

function renderShell() {
  return `
    <div class="ge-shell ${state.generating ? "is-generating" : ""}">
      ${renderHeader()}
      <div class="ge-main ${state.storyboardOpen ? "has-drawer" : ""} ${state.railOpen ? "" : "rail-collapsed"}">
        ${state.railOpen ? renderRail() : ""}
        <section class="ge-stage">
          ${renderConversation()}
          ${state.openWindows.map(renderChapterWindow).join("")}
          ${renderComposer()}
          ${state.stickToBottom ? "" : `<button class="ge-jump-latest" data-action="jump-latest">Jump to latest</button>`}
        </section>
      </div>
      ${renderStoryboard()}
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="ge-header">
      <div class="ge-brand">
        <button class="ge-icon-btn" data-action="toggle-rail" aria-label="Toggle chapter rail" title="Toggle chapter rail">${icon("Sidebar")}</button>
        <button class="ge-brand-mark ge-brand-home" data-action="show-projects" title="Projects home"><img src="/assets/logo-glyph.svg" alt="" /></button>
        <button class="ge-btn ge-btn--primary ge-btn--small ge-back-projects" data-action="show-projects">${icon("Home")}Back to Projects</button>
        <label class="ge-book-picker ge-book-picker-inline">
          ${icon("Book")}
          <select data-action="switch-book" aria-label="Book">
            ${state.books.map((book) => `<option value="${escapeHtml(book.slug)}" ${book.slug === state.book.slug ? "selected" : ""}>${escapeHtml(book.title)}</option>`).join("")}
          </select>
          ${icon("Chevron")}
        </label>
      </div>
      <div></div>
      <div class="ge-header-actions">
        <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="new-chapter">${icon("Plus")}New Chapter</button>
        <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="open-import">${icon("Book")}Import</button>
        <button class="ge-btn ge-btn--ghost ge-btn--small ${state.storyboardOpen ? "is-active" : ""}" data-action="toggle-storyboard" aria-label="${isResearch() ? "Research board" : "Storyboard"}" title="${isResearch() ? "Research board" : "Storyboard"}">${icon("Layers")}${isResearch() ? "Research Board" : "Storyboard"}</button>
        <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="open-bug-report" title="Report a bug">${icon("Bug")}Report Bug</button>
        <button class="ge-pill ${state.settingsOpen ? "is-active" : ""}" data-action="toggle-settings" title="${escapeHtml(state.status?.statusMessage || "")}">
          <span class="dot"></span>${escapeHtml(modeLabel(state.status?.mode))}
        </button>
        ${state.settingsOpen ? renderSettingsPopover() : ""}
      </div>
    </header>
  `;
}

function renderSettingsPopover() {
  return `
    <div class="ge-settings-popover">
      <div class="ge-settings-title">Settings</div>
      ${renderModeToggle()}
      <label class="ge-settings-check"><input type="checkbox" data-auto-speak ${state.autoSpeak ? "checked" : ""} /> Auto-read AI replies</label>
      <div class="ge-settings-meta">
        <span>Off by default. Use the speaker button on a message when you want read-aloud.</span>
      </div>
      <div class="ge-settings-meta">
        <span>Books folder</span>
        <code>${escapeHtml(state.status?.booksDir || "")}</code>
      </div>
      <div class="ge-settings-meta">
        <span>Version</span>
        <code>${escapeHtml(state.status?.version || "")}</code>
        <span>Updates: ${escapeHtml(state.status?.update?.repo || "not configured")}</span>
      </div>
      ${state.updateInfo ? `
        <div class="ge-update-card">
          <strong>${state.updateInfo.updateAvailable ? "Update available" : "Up to date"}</strong>
          <span>Current: ${escapeHtml(state.updateInfo.currentVersion || "")}</span>
          <span>Latest: ${escapeHtml(state.updateInfo.latestVersion || "none")}</span>
        </div>
      ` : ""}
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="check-update" ${state.checkingUpdate ? "disabled" : ""}>${icon("Recap")}${state.checkingUpdate ? "Checking..." : "Check for update"}</button>
      <button class="ge-btn ge-btn--primary ge-btn--small" data-action="install-update" ${state.updateInfo?.updateAvailable && !state.installingUpdate ? "" : "disabled"}>${icon("External")}${state.installingUpdate ? "Installing..." : "Download update"}</button>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="clear-conversation">${icon("Trash")}New conversation</button>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="open-bug-report">${icon("Bug")}Report bug</button>
    </div>
  `;
}

function renderModeToggle() {
  const requested = state.status?.requestedMode || state.status?.preflight?.requestedMode || "auto";
  return `
    <div class="ge-mode-toggle" title="Generation backend">
      <button class="${requested === "auto" ? "is-active" : ""}" data-action="set-mode" data-mode="auto">Auto</button>
      <button class="${requested === "claude-code" ? "is-active" : ""}" data-action="set-mode" data-mode="claude-code">CLI</button>
      <button class="${requested === "api" ? "is-active" : ""}" data-action="set-mode" data-mode="api">API</button>
    </div>
  `;
}

function renderRail() {
  const groups = chapterGroups();
  return `
    <aside class="ge-rail">
      <div class="ge-rail-top">
        <div>
          <div class="ge-rail-eyebrow">Book</div>
          <label class="ge-book-title-label">
            <input class="ge-book-title-input" value="${escapeHtml(state.book.title)}" data-book-title aria-label="Book title" />
          </label>
        </div>
      </div>
      <nav class="ge-chapter-list">
        ${groups.map((group) => `
          <div class="section-label">${escapeHtml(group.section.label || group.section.id)}</div>
          ${group.chapters.map(renderChapterRow).join("")}
        `).join("")}
      </nav>
    </aside>
  `;
}

function renderChapterRow(chapter) {
  const active = activeChapter()?.id === chapter.id;
  const open = state.openWindows.some((win) => win.id === chapter.id);
  return `
    <button class="ge-chapter-row ${active ? "is-active" : ""} ${open ? "is-open" : ""}" data-action="select-chapter" data-id="${escapeHtml(chapter.id)}">
      <span class="ge-chapter-num">${escapeHtml(chapter.id)}</span>
      <span>
        <span class="ge-chapter-name">${escapeHtml(chapter.title)}</span>
        <span class="ge-chapter-meta">${chapter.wordCount || 0} words</span>
      </span>
      <span class="lock" title="${chapter.status === "locked" ? "Locked" : "Draft"}">${chapter.status === "locked" ? icon("Lock") : icon("LockOpen")}</span>
    </button>
  `;
}

function renderConversation() {
  if (needsAiSetup()) return renderAiSetup();
  const messages = state.conversation.length
    ? state.conversation
    : [{ id: "starter", role: "assistant", content: "Tell me what you want to write. Use the mic or type. I’ll ask questions, draft when you ask, and only save chapters when you approve them." }];
  return `
    <div id="conversationScroll" class="ge-chat-scroll">
      <div class="ge-chat-thread">
        ${messages.map(renderMessage).join("")}
        ${state.generating ? `<div class="ge-bubble system">Streaming response...</div>` : ""}
      </div>
    </div>
  `;
}

function renderAiSetup() {
  const preflight = state.status?.preflight || {};
  const cliFound = Boolean(preflight.claudePath);
  const cliOk = Boolean(preflight.claudeCodeOk);
  const apiOk = Boolean(preflight.apiOk);
  return `
    <div id="conversationScroll" class="ge-chat-scroll ge-setup-scroll">
      <section class="ge-setup-card">
        <div class="ge-empty-eyebrow">AI setup required</div>
        <h1>Connect Claude to continue.</h1>
        <p>Research projects never use fake local responses. Claude Code CLI is the default; API is available if you prefer it.</p>
        <div class="ge-setup-grid">
          <div><span>Claude Code</span><strong>${cliFound ? "Found" : "Not found"}</strong></div>
          <div><span>Logged in</span><strong>${cliOk ? "Yes" : "No"}</strong></div>
          <div><span>API key</span><strong>${state.status?.hasApiKey ? (apiOk || state.status?.requestedMode !== "api" ? "Configured" : "Needs check") : "Not configured"}</strong></div>
        </div>
        <p class="ge-status-warning">${escapeHtml(state.status?.statusMessage || "")}</p>
        <div class="ge-setup-actions">
          <button class="ge-btn ge-btn--primary" data-action="open-claude-login">${icon("Sparkles")}Open Claude Login</button>
          <button class="ge-btn ge-btn--ghost" data-action="check-ai">${icon("Rotate")}Check Again</button>
        </div>
        <div class="ge-setup-form">
          <label>Claude executable path
            <input id="claudePathInput" value="${escapeHtml(preflight.claudePath || "")}" placeholder="C:\\Users\\...\\claude.exe" />
          </label>
          <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="save-claude-path">Save Claude Path</button>
        </div>
        <div class="ge-setup-form">
          <label>Anthropic API key
            <input id="apiKeyInput" type="password" placeholder="sk-ant-..." />
          </label>
          <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="save-api-key">Save API Key</button>
        </div>
      </section>
    </div>
  `;
}

function renderMessage(message) {
  const role = message.role || message.who || "assistant";
  const { clean, draft } = parseDraftMarker(message.content || "");
  const className = role === "user" ? "user" : role === "system" ? "system" : "ai";
  return `
    <article class="ge-message ${className}" data-message-id="${escapeHtml(message.id || "")}">
      <div class="ge-message-body">
        <div class="ge-message-content">${markdownToHtml(clean)}</div>
        ${renderMessageToolbar(message, role)}
        ${draft && role === "assistant" ? renderDraftActions(message, draft, clean) : ""}
      </div>
    </article>
  `;
}

function renderMessageToolbar(message, role) {
  if (role === "system") return "";
  if (role === "user") {
    return `
      <div class="ge-message-tools">
        <button data-action="edit-resend" data-id="${escapeHtml(message.id)}" title="Edit and resend">${icon("Edit")}</button>
        <button data-action="delete-message" data-id="${escapeHtml(message.id)}" title="Delete">${icon("Trash")}</button>
      </div>
    `;
  }
  return `
    <div class="ge-message-tools">
      <button data-action="copy-message" data-id="${escapeHtml(message.id)}" title="Copy">${icon("Copy")}</button>
      <button data-action="regenerate-message" data-id="${escapeHtml(message.id)}" title="Regenerate">${icon("Rotate")}</button>
      <button data-action="speak-message" data-id="${escapeHtml(message.id)}" title="Read aloud">${icon("Volume")}</button>
    </div>
  `;
}

function renderDraftActions(message, draft, clean) {
  const suggested = String(draft.suggested_id || nextChapterId()).padStart(2, "0");
  return `
    <div class="ge-draft-actions" data-draft-message="${escapeHtml(message.id)}">
      <button class="ge-btn ge-btn--primary ge-btn--small" data-action="save-draft" data-id="${escapeHtml(message.id)}" data-mode="suggested">${icon("Lock")}Save as Chapter ${Number(suggested)}</button>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="save-draft" data-id="${escapeHtml(message.id)}" data-mode="new">${icon("Plus")}Save as new chapter</button>
      <label class="ge-replace-picker">Replace
        <select data-replace-select="${escapeHtml(message.id)}">
          ${state.book.chapters.map((chapter) => `<option value="${escapeHtml(chapter.id)}" ${chapter.id === suggested ? "selected" : ""}>${escapeHtml(chapter.id)} ${escapeHtml(chapter.title)}</option>`).join("")}
        </select>
      </label>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="save-draft" data-id="${escapeHtml(message.id)}" data-mode="replace">Replace selected</button>
      <textarea hidden data-clean-draft="${escapeHtml(message.id)}">${escapeHtml(clean)}</textarea>
    </div>
  `;
}

function renderComposer() {
  const micState = state.transcribing ? "transcribing" : state.recording ? "recording" : state.micPermission === "denied" ? "denied" : "idle";
  const url = isResearch() ? firstUrl(state.inputText) : "";
  return `
    <div class="ge-composer-wrap">
      ${renderMicBanner()}
      ${url ? `<button class="ge-ingest-chip" data-action="ingest-composer-url">Ingest source: ${escapeHtml(url)}</button>` : ""}
      ${state.generating ? `<button class="ge-stop-generating" data-action="stop-generating">${icon("Stop")}Stop generating</button>` : ""}
      <div class="ge-composer">
        <textarea id="chatInput" rows="1" placeholder="Talk to the AI.">${escapeHtml(state.inputText)}</textarea>
        <button id="micButton" class="ge-chat-mic ${micState}" data-action="toggle-recording" aria-label="${state.recording ? "Stop recording" : "Record"}">
          ${micState === "transcribing" ? `<span class="ge-spinner"></span>` : micState === "recording" ? `<span class="ge-live-wave"><span></span><span></span><span></span><span></span></span>` : icon("Mic")}
          ${micState === "denied" ? `<span class="ge-mic-badge">!</span>` : ""}
        </button>
        <button class="ge-send ${state.inputText.trim() ? "is-ready" : ""}" data-action="send-chat" aria-label="Send">${icon("Send")}</button>
      </div>
      <div id="recordingTimer" class="ge-recording-timer">${state.recording ? formatSeconds(state.recordingSeconds) : ""}</div>
    </div>
  `;
}

function renderMicBanner() {
  if (!state.micError) return "";
  return `
    <div class="ge-mic-banner">
      <div class="icn">${icon("AlertTri")}</div>
      <div>
        <strong>Microphone needs attention.</strong>
        <span>${escapeHtml(state.micError)}</span>
      </div>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="dismiss-mic-banner">Dismiss</button>
    </div>
  `;
}

function renderChapterWindow(win) {
  const chapter = chapterById(win.id);
  if (!chapter) return "";
  const tab = state.windowTabs[chapter.id] || "prose";
  const focused = state.focusedChapterId === chapter.id;
  const style = `left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;z-index:${win.z};`;
  return `
    <article class="ge-chapter-window ${focused ? "is-focused" : ""}" style="${style}" data-window-id="${escapeHtml(chapter.id)}">
      <div class="ge-cw-bar" data-window-drag data-id="${escapeHtml(chapter.id)}">
        <span class="ge-window-grip">Drag</span>
        <input class="ge-cw-title-input" value="${escapeHtml(chapter.title)}" data-chapter-title data-chapter-id="${escapeHtml(chapter.id)}" aria-label="Chapter title" />
        <div class="ge-cw-tools">
          <button class="ge-icon-btn" data-action="popout-chapter" data-id="${escapeHtml(chapter.id)}" title="Open chapter in a separate window">${icon("External")}</button>
          <button class="ge-icon-btn" data-action="close-window" data-id="${escapeHtml(chapter.id)}" title="Close window">${icon("X")}</button>
        </div>
      </div>
      <div class="ge-cw-tabs">
        ${["prose", "transcript"].map((item) => `<button class="ge-cw-tab ${tab === item ? "is-active" : ""}" data-action="window-tab" data-id="${escapeHtml(chapter.id)}" data-tab="${item}">${item[0].toUpperCase()}${item.slice(1)}</button>`).join("")}
      </div>
      <div class="ge-cw-body">
        ${tab === "transcript"
          ? `<textarea class="ge-cw-editor ge-cw-notes" data-transcript-editor data-chapter-id="${escapeHtml(chapter.id)}" spellcheck="true" placeholder="Chapter transcript sidecar.">${escapeHtml(chapter.transcript || "")}</textarea>`
          : `<textarea class="ge-cw-editor ge-cw-prose" data-chapter-content data-chapter-id="${escapeHtml(chapter.id)}" spellcheck="true" placeholder="Saved chapter text.">${escapeHtml(chapter.content || "")}</textarea>`}
      </div>
      <div class="ge-cw-resize" data-window-resize data-id="${escapeHtml(chapter.id)}">${icon("Resize")}</div>
    </article>
  `;
}

function renderStoryboard() {
  const tabs = isResearch() ? researchTabs : canonTabs;
  const tab = isResearch() ? state.researchTab : state.storyboardTab;
  return `
    <aside class="ge-drawer ${state.storyboardOpen ? "is-open" : ""}">
      <div class="ge-drawer-head">
        <h2 class="ge-drawer-title">${isResearch() ? "Research" : "Storyboard"}</h2>
        <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="popout-storyboard">${icon("External")}Pop out</button>
        <button class="ge-icon-btn" data-action="close-storyboard" aria-label="Close storyboard">${icon("X")}</button>
      </div>
      <div class="ge-drawer-tabs">
        ${tabs.map(([key, label]) => `<button data-action="${isResearch() ? "research-tab" : "story-tab"}" data-tab="${key}" class="ge-drawer-tab ${tab === key ? "is-active" : ""}">${label}</button>`).join("")}
      </div>
      <div class="ge-drawer-body">
        ${isResearch() ? renderResearchPanel(tab) : tab === "sections" ? renderSectionsEditor() : renderCanonEditor(tab)}
      </div>
    </aside>
  `;
}

function renderCanonEditor(tab) {
  const doc = state.book.canon[tab]?.content || "";
  const label = canonTabs.find(([key]) => key === tab)?.[1] || tab;
  return `
    ${tab === "voice_profile" ? renderVoiceGenerator() : ""}
    <section class="ge-drawer-section">
      <h3>${escapeHtml(label)} markdown</h3>
      <textarea class="storyboard-editor" data-canon-editor="${tab}" spellcheck="true">${escapeHtml(doc)}</textarea>
      <span class="ge-drawer-saved">Autosaves to markdown</span>
    </section>
    <section class="ge-drawer-section markdown-preview">${markdownToHtml(doc)}</section>
  `;
}

function renderResearchPanel(tab) {
  if (tab === "sources") return renderResearchSources();
  if (tab === "people") return renderResearchPeople();
  if (tab === "timeline") return renderResearchTimeline();
  if (tab === "claims") return renderResearchClaims();
  if (tab === "records") return renderResearchRecords();
  if (tab === "voice") return renderResearchVoice();
  return "";
}

function renderResearchSources() {
  const research = state.book.research || {};
  const sources = research.sources || [];
  return `
    <section class="ge-drawer-section">
      <h3>Ingest source</h3>
      <label>URL
        <input id="sourceUrlInput" placeholder="https://article, court page, YouTube URL" />
      </label>
      <div class="ge-inline-actions">
        <button class="ge-btn ge-btn--primary ge-btn--small" data-action="ingest-source-url">${icon("Plus")}Ingest URL</button>
      </div>
      <label>Source title
        <input id="sourceTitleInput" placeholder="Incident report, article, interview transcript" />
      </label>
      <div class="ge-source-row">
        <label>Type
          <select id="sourceTypeInput">
            ${["police_report","court_record","article","interview","obituary","social_post","foia_response","book","broadcast","scan","other"].map((item) => `<option value="${item}">${item.replaceAll("_", " ")}</option>`).join("")}
          </select>
        </label>
        <label>Reliability
          <select id="sourceReliabilityInput">
            ${["primary","secondary","tertiary","rumor"].map((item) => `<option value="${item}" ${item === "secondary" ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </label>
      </div>
      <label>Paste text
        <textarea id="sourceTextInput" class="storyboard-editor compact" placeholder="Paste article text, notes, transcript, or OCR text."></textarea>
      </label>
      <button class="ge-btn ge-btn--primary ge-btn--small" data-action="ingest-source-text">${icon("Sparkles")}Ingest pasted text</button>
      <label>Upload file
        <input id="sourceFileInput" type="file" accept=".txt,.md,.markdown,.html,.pdf,.png,.jpg,.jpeg,.tif,.tiff,.wav,.webm,.ogg,.mp3,.m4a" />
      </label>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="upload-source">${icon("Book")}Upload and ingest</button>
    </section>
    <section class="ge-drawer-section">
      <div class="ge-panel-head">
        <h3>Sources</h3>
        <span>${sources.length}</span>
      </div>
      ${sources.length ? sources.map(renderSourceCard).join("") : `<p class="ge-muted">No sources yet. Paste a URL, upload a file, or paste text.</p>`}
    </section>
  `;
}

function renderSourceCard(source) {
  return `
    <article class="ge-source-card">
      <div class="ge-source-title">${escapeHtml(source.title || source.id)}</div>
      <div class="ge-source-meta">${escapeHtml(source.id)} · ${escapeHtml(source.type || "other")} · ${escapeHtml(source.reliability || "secondary")}</div>
      <p>${escapeHtml(source.excerpt || "")}</p>
      ${(source.claim_refs || []).length ? `<div class="ge-chip-row">${source.claim_refs.map((id) => `<span class="ge-chip">${escapeHtml(id)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

function renderResearchPeople() {
  const people = state.book.research?.people || [];
  return `
    <section class="ge-drawer-section">
      <h3>People / Entities</h3>
      ${people.length ? people.map((person) => `
        <article class="ge-source-card">
          <div class="ge-source-title">${escapeHtml(person.display_name || person.id)}</div>
          <div class="ge-source-meta">${escapeHtml(person.type || "person")} · ${escapeHtml(person.status || "other")} · risk ${escapeHtml(person.defamation_risk || "low")}</div>
          <textarea class="storyboard-editor compact" data-research-person-body="${escapeHtml(person.id)}">${escapeHtml(person.body || "")}</textarea>
        </article>
      `).join("") : `<p class="ge-muted">Entities appear here as sources are ingested.</p>`}
    </section>
  `;
}

function renderResearchTimeline() {
  return `
    <section class="ge-drawer-section">
      <h3>Timeline markdown</h3>
      <textarea class="storyboard-editor" data-research-timeline spellcheck="true">${escapeHtml(state.book.research?.timeline || "")}</textarea>
      <span class="ge-drawer-saved">Autosaves to research/timeline.md</span>
    </section>
    <section class="ge-drawer-section markdown-preview">${markdownToHtml(state.book.research?.timeline || "")}</section>
  `;
}

function renderResearchClaims() {
  const claims = state.book.research?.claims || [];
  const blocked = claims.filter((claim) => claim.publish_readiness === "blocked" || claim.contradicting_sources?.length);
  return `
    <section class="ge-drawer-section">
      <div class="ge-panel-head">
        <h3>Claims matrix</h3>
        <button class="ge-btn ge-btn--accent ge-btn--small" data-action="run-missing">${icon("Sparkles")}What's missing?</button>
      </div>
      <div class="ge-claims-summary">
        <span>${claims.length} claims</span>
        <span>${blocked.length} blocked/contradicted</span>
      </div>
      <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="run-export-review">${icon("Book")}Pre-export sourcing review</button>
      ${claims.length ? `<div class="ge-claims-table">${claims.map(renderClaimRow).join("")}</div>` : `<p class="ge-muted">Claims are created from ingested sources. They are the storage layer for factual assertions.</p>`}
    </section>
  `;
}

function renderClaimRow(claim) {
  const blockers = claim.publish_blockers || [];
  const contradictions = claim.contradicting_sources || [];
  return `
    <article class="ge-claim-row ${claim.publish_readiness || ""}">
      <div class="ge-claim-top">
        <span class="ge-chip">${escapeHtml(claim.id)}</span>
        <span class="ge-chip">${escapeHtml(claim.confidence || "unsourced")}</span>
        <span class="ge-chip">${escapeHtml(claim.publish_readiness || "needs_review")}</span>
      </div>
      <p>${escapeHtml(claim.text || "")}</p>
      ${blockers.length ? `<div class="ge-status-warning">${blockers.map(escapeHtml).join(", ")}</div>` : ""}
      ${contradictions.length ? `<details><summary>Contradictions</summary>${contradictions.map((item) => `<blockquote>${escapeHtml(item.excerpt || item.note || "")}</blockquote>`).join("")}</details>` : ""}
    </article>
  `;
}

function renderResearchRecords() {
  const records = state.book.research?.records || [];
  return `
    <section class="ge-drawer-section">
      <h3>Public-records request</h3>
      <label>Agency
        <input id="recordAgencyInput" placeholder="King County Sheriff's Office" />
      </label>
      <div class="ge-source-row">
        <label>Jurisdiction
          <select id="recordJurisdictionInput">
            <option value="local">Local</option>
            <option value="state">State</option>
            <option value="federal">Federal FOIA</option>
          </select>
        </label>
        <label>State
          <input id="recordStateInput" placeholder="WA" maxlength="2" />
        </label>
      </div>
      <label>Subject
        <input id="recordSubjectInput" placeholder="2009 case file for..." />
      </label>
      <label>Requested material
        <textarea id="recordDetailsInput" class="storyboard-editor compact" placeholder="Incident reports, call logs, dispatch audio, supplemental reports..."></textarea>
      </label>
      <button class="ge-btn ge-btn--primary ge-btn--small" data-action="create-record-request">${icon("Sparkles")}Draft request</button>
    </section>
    <section class="ge-drawer-section">
      <h3>Records</h3>
      ${records.length ? records.map(renderRecordCard).join("") : `<p class="ge-muted">Draft requests here, send manually, then upload responses as sources.</p>`}
    </section>
  `;
}

function renderRecordCard(record) {
  return `
    <article class="ge-source-card">
      <div class="ge-source-title">${escapeHtml(record.agency || record.id)}</div>
      <div class="ge-source-meta">${escapeHtml(record.id)} · ${escapeHtml(record.status || "drafted")} · due ${escapeHtml(record.deadline || "not set")}</div>
      <textarea class="storyboard-editor compact" data-record-body="${escapeHtml(record.id)}">${escapeHtml(record.body || "")}</textarea>
    </article>
  `;
}

function renderResearchVoice() {
  const doc = state.book.research?.voice_profile || "";
  return `
    ${renderVoiceGenerator()}
    <section class="ge-drawer-section">
      <h3>Research voice profile</h3>
      <textarea class="storyboard-editor" data-research-voice spellcheck="true">${escapeHtml(doc)}</textarea>
      <span class="ge-drawer-saved">Autosaves to research/voice_profile.md</span>
    </section>
  `;
}

function renderVoiceGenerator() {
  return `
    <section class="ge-drawer-section">
      <h3>Generate voice descriptor</h3>
      <label>Authors or style references
        <input id="authorsInput" placeholder="Stephen King mixed with a little Cormac McCarthy" />
      </label>
      <button class="ge-btn ge-btn--accent ge-btn--small" data-action="generate-voice-profile">${icon("Sparkles")}Generate descriptor</button>
    </section>
  `;
}

function renderSectionsEditor() {
  const sections = state.book.meta.sections || [];
  return `
    <section class="ge-drawer-section section-editor">
      <h3>Sections</h3>
      <button class="ge-btn ge-btn--accent ge-btn--small" data-action="add-section">${icon("Plus")}Add section</button>
      ${sections.map((section, index) => `
        <div class="section-row">
          <input value="${escapeHtml(section.label || section.id)}" data-section-label="${index}" />
          <button class="ge-btn ge-btn--ghost ge-btn--small danger" data-action="delete-section" data-index="${index}">Delete</button>
        </div>
      `).join("")}
    </section>
    <section class="ge-drawer-section">
      <h3>Chapter assignments</h3>
      ${state.book.chapters.map((chapter) => `
        <div class="chapter-section-row">
          <span>${escapeHtml(chapter.id)} ${escapeHtml(chapter.title)}</span>
          <select data-chapter-section="${escapeHtml(chapter.id)}">
            ${sections.map((section) => `<option value="${escapeHtml(section.id)}" ${chapter.section === section.id ? "selected" : ""}>${escapeHtml(section.label || section.id)}</option>`).join("")}
          </select>
        </div>
      `).join("")}
    </section>
  `;
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal.type === "create-project") return renderCreateProjectModal();
  if (state.modal.type === "delete-project") return renderDeleteProjectModal();
  if (state.modal.type === "bug-report") return renderBugReportModal();
  if (state.modal.type === "import") return renderImportModal();
  if (state.modal.type === "import-proposal") return renderImportProposalModal();
  return "";
}

function renderCreateProjectModal() {
  const type = state.modal.projectType === "research" ? "research" : "novel";
  const label = type === "research" ? "Research project" : "Novel";
  return `
    <div class="modal-backdrop">
      <section class="modal ge-create-project-modal">
        <header class="modal-header">
          <h2>Create ${label}</h2>
          <button class="ge-icon-btn" data-action="close-modal" aria-label="Close">${icon("X")}</button>
        </header>
        <div class="modal-body">
          <p class="ge-muted">${type === "research"
            ? "Research projects keep a source-led memory spine: sources, people, timeline, claims, records, and voice."
            : "Novel projects keep a fiction storyboard: world, characters, timeline, arcs, sections, and voice."}</p>
          <label>${label} title
            <input id="createProjectTitle" value="${escapeHtml(state.modal.title || "")}" placeholder="${type === "research" ? "The Case Files" : "Untitled Book"}" autofocus />
          </label>
        </div>
        <footer class="modal-footer">
          <button class="ge-btn ge-btn--ghost" data-action="close-modal">Cancel</button>
          <button class="ge-btn ge-btn--primary" data-action="confirm-create-book" data-project-type="${escapeHtml(type)}" ${state.creatingProject ? "disabled" : ""}>${icon("Plus")}${state.creatingProject ? "Creating..." : `Create ${label}`}</button>
        </footer>
      </section>
    </div>
  `;
}

function renderDeleteProjectModal() {
  const book = state.modal.book || {};
  return `
    <div class="modal-backdrop">
      <section class="modal ge-delete-project-modal">
        <header class="modal-header">
          <h2>Delete Project</h2>
          <button class="ge-icon-btn" data-action="close-modal" aria-label="Close">${icon("X")}</button>
        </header>
        <div class="modal-body">
          <div class="ge-danger-panel">
            <strong>This permanently deletes "${escapeHtml(book.title || "")}".</strong>
            <p>Deleting this will wipe out all files, chapters, AI conversation history, research sources, claims, records, canon/storyboard files, and saved project state. This cannot be undone.</p>
          </div>
          <label>Type the exact project title to confirm
            <input id="deleteProjectConfirm" placeholder="${escapeHtml(book.title || "")}" autocomplete="off" />
          </label>
        </div>
        <footer class="modal-footer">
          <button class="ge-btn ge-btn--ghost" data-action="close-modal">Cancel</button>
          <button class="ge-btn ge-btn--danger" data-action="confirm-delete-project" data-slug="${escapeHtml(book.slug || "")}">${icon("Trash")}Delete everything</button>
        </footer>
      </section>
    </div>
  `;
}

function renderBugReportModal() {
  const draft = state.modal.draft || null;
  const recipient = state.status?.bugReport?.recipient || "founder@xyflowinnovations.com";
  return `
    <div class="modal-backdrop">
      <section class="modal wide ge-bug-report-modal">
        <header class="modal-header">
          <h2>Report Bug</h2>
          <button class="ge-icon-btn" data-action="close-modal" aria-label="Close">${icon("X")}</button>
        </header>
        <div class="modal-body">
          <p class="ge-muted">Describe what broke like you are talking to the AI. It will format a fixable bug report for ${escapeHtml(recipient)}.</p>
          <p class="ge-muted">Send opens Gmail compose with the address, subject, and report filled in. If Gmail is not logged in, Gmail will ask for login first.</p>
          <label>What happened?
            <textarea id="bugReportDescription" class="import-textarea" placeholder="Example: I clicked Create Research Project five times because it lagged, and it made five duplicate projects.">${escapeHtml(state.modal.description || "")}</textarea>
          </label>
          ${draft ? `
            <label>Bug report email
              <textarea id="bugReportDraft" class="import-textarea ge-bug-draft">${escapeHtml(draft.body || "")}</textarea>
            </label>
          ` : ""}
        </div>
        <footer class="modal-footer">
          <button class="ge-btn ge-btn--ghost" data-action="close-modal">Cancel</button>
          <button class="ge-btn ge-btn--accent" data-action="draft-bug-report" ${state.modal.generating ? "disabled" : ""}>${icon("Sparkles")}${state.modal.generating ? "Writing..." : "Write report"}</button>
          <button class="ge-btn ge-btn--ghost" data-action="copy-bug-report" ${draft ? "" : "disabled"}>${icon("Copy")}Copy report</button>
          <button class="ge-btn ge-btn--primary" data-action="send-bug-report" ${draft ? "" : "disabled"}>${icon("Mail")}Send report</button>
        </footer>
      </section>
    </div>
  `;
}

function renderImportModal() {
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <header class="modal-header">
          <h2>Import Existing Chapters</h2>
          <button class="ge-icon-btn" data-action="close-modal" aria-label="Close">${icon("X")}</button>
        </header>
        <div class="modal-body">
          <label>Book title
            <input id="importTitle" value="${escapeHtml(state.modal.title || "")}" placeholder="Imported Book" />
          </label>
          <label>Project type
            <select id="importProjectType">
              <option value="novel">Novel</option>
              <option value="research">Research</option>
            </select>
          </label>
          <label>Upload files
            <input id="importFiles" type="file" multiple accept=".txt,.md,.markdown" />
          </label>
          <label>Chapters
            <textarea id="importRaw" class="import-textarea" placeholder="Paste chapters here.">${escapeHtml(state.modal.raw || "")}</textarea>
          </label>
        </div>
        <footer class="modal-footer">
          <button class="ge-btn ge-btn--ghost" data-action="close-modal">Cancel</button>
          <button class="ge-btn ge-btn--primary" data-action="propose-import">${icon("Sparkles")}Propose canon</button>
        </footer>
      </section>
    </div>
  `;
}

function renderImportProposalModal() {
  const proposal = state.modal.proposal;
  return `
    <div class="modal-backdrop">
      <section class="modal wide">
        <header class="modal-header">
          <h2>Review Proposed Canon</h2>
          <span class="ge-pill">${(proposal.chapters || []).length} chapters</span>
        </header>
        <div class="modal-body">
          <label>Book title
            <input id="proposalTitle" value="${escapeHtml(proposal.title || "")}" />
          </label>
          <div class="modal-grid">
            ${["world", "characters", "timeline", "arcs", "voice_profile"].map((name) => `
              <label>${name.replace("_", " ")}
                <textarea data-proposal-canon="${name}" class="storyboard-editor">${escapeHtml(proposal.canon?.[name] || "")}</textarea>
              </label>
            `).join("")}
          </div>
        </div>
        <footer class="modal-footer">
          <button class="ge-btn ge-btn--ghost" data-action="close-modal">Cancel</button>
          <button class="ge-btn ge-btn--primary" data-action="accept-import">Accept and continue</button>
        </footer>
      </section>
    </div>
  `;
}

function syncComposerValue() {
  const input = $("#chatInput");
  if (input) {
    input.value = state.inputText;
    autoGrow(input);
  }
}

function autoGrow(textarea) {
  textarea.style.height = "auto";
  const max = Number.parseFloat(getComputedStyle(textarea).lineHeight || "22") * 10 + 24;
  textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`;
  textarea.style.overflowY = textarea.scrollHeight > max ? "auto" : "hidden";
}

function scrollConversationBottom() {
  const scroller = $("#conversationScroll");
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
}

function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function debounce(key, fn, delay = 600) {
  clearTimeout(state.autosave.get(key));
  const timer = setTimeout(async () => {
    try {
      await fn();
      showToast("Saved");
    } catch (error) {
      showToast(`Save failed: ${error.message}`);
    }
  }, delay);
  state.autosave.set(key, timer);
}

async function saveMetaPatch(patch) {
  if (!state.book) return;
  const meta = structuredClone(state.book.meta);
  Object.assign(meta, patch);
  state.book = await api(`/api/books/${state.book.slug}/meta`, { meta }, "PUT");
}

async function saveChapterPatch(chapterId, patch, rerender = false) {
  if (!state.book) return;
  const chapter = chapterById(chapterId);
  if (chapter) Object.assign(chapter, patch);
  const saved = await api(`/api/books/${state.book.slug}/chapters/${chapterId}`, patch, "PUT");
  state.book = saved;
  if (rerender) render();
}

async function saveCanon(name, content, rerender = false) {
  if (!state.book) return;
  state.book.canon[name].content = content;
  const saved = await api(`/api/books/${state.book.slug}/canon/${name}`, { content }, "PUT");
  state.book = saved;
  if (rerender) render();
}

async function refreshCurrentBook(rerender = true) {
  if (!state.book) return;
  state.book = await getJson(`/api/books/${encodeURIComponent(state.book.slug)}`);
  state.conversation = state.book.conversation?.messages || state.conversation;
  if (rerender) render();
}

async function saveResearchTimeline(content, rerender = false) {
  const saved = await api(`/api/research/${state.book.slug}/timeline`, { content }, "PUT");
  state.book.research = saved.research;
  if (rerender) render();
}

async function saveResearchVoice(content, rerender = false) {
  const saved = await api(`/api/research/${state.book.slug}/voice`, { content }, "PUT");
  state.book.research = saved.research;
  if (rerender) render();
}

async function saveResearchPerson(id, body, rerender = false) {
  const person = (state.book.research?.people || []).find((item) => item.id === id);
  const saved = await api(`/api/research/${state.book.slug}/people/${id}`, { meta: person || { id }, body }, "PUT");
  state.book.research = saved.research;
  if (rerender) render();
}

async function saveRecordBody(id, body, rerender = false) {
  const saved = await api(`/api/research/${state.book.slug}/records/${id}`, { body }, "PUT");
  state.book.research = saved.research;
  if (rerender) render();
}

async function persistConversation() {
  if (!state.book) return;
  await api(`/api/books/${state.book.slug}/conversation`, { messages: state.conversation, summary: "" }, "PUT");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "open-project" && state.projectMenuSlug) {
    state.projectMenuSlug = null;
  }
  try {
    await handleAction(button.dataset.action, button);
  } catch (error) {
    console.error(error);
    showToast(error.message);
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target;
  try {
    if (target.matches("[data-action='switch-book']")) {
      await loadBook(target.value, { welcome: true });
    } else if (target.matches("[data-auto-speak]")) {
      state.autoSpeak = target.checked;
      localStorage.setItem("ge:autoSpeak", state.autoSpeak ? "true" : "false");
      if (!state.autoSpeak && "speechSynthesis" in window) window.speechSynthesis.cancel();
      showToast(state.autoSpeak ? "Auto-read enabled" : "Auto-read off");
    } else if (target.matches("#importFiles, #emptyImportFiles")) {
      await readImportFiles(target);
    } else if (target.matches("[data-chapter-section]")) {
      await saveChapterPatch(target.dataset.chapterSection, { section: target.value }, true);
    }
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (state.generating) {
      stopGenerating();
      return;
    }
    if (state.modal) {
      state.modal = null;
      render();
      return;
    }
    if (state.settingsOpen) {
      state.settingsOpen = false;
      render();
      return;
    }
    if (state.storyboardOpen) {
      state.storyboardOpen = false;
      render();
    }
  }
  if (event.target?.matches?.("#chatInput") && event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChat();
  }
  if (event.target?.matches?.("#createProjectTitle") && event.key === "Enter") {
    event.preventDefault();
    createBook(state.modal?.projectType || "novel");
  }
  if (event.key === "Enter" && event.target?.closest?.(".ge-project-card") && !event.target.closest("button, input, textarea, select")) {
    event.preventDefault();
    const card = event.target.closest(".ge-project-card");
    if (card?.dataset.slug) loadBook(card.dataset.slug, { welcome: true });
  }
  if (event.key === " " && event.target?.closest?.(".ge-project-card") && !event.target.closest("button, input, textarea, select")) {
    event.preventDefault();
    const card = event.target.closest(".ge-project-card");
    if (card?.dataset.slug) loadBook(card.dataset.slug, { welcome: true });
  }
  if (event.altKey && event.key === "ArrowLeft" && state.book) {
    event.preventDefault();
    showProjects();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("#chatInput")) {
    state.inputText = target.value;
    autoGrow(target);
    $(".ge-send")?.classList.toggle("is-ready", Boolean(state.inputText.trim()));
    return;
  }
  if (target.matches("[data-book-title]")) {
    const title = target.value;
    state.book.title = title;
    state.book.meta.title = title;
    debounce("book-title", () => saveMetaPatch({ title }), 700);
    return;
  }
  if (target.matches("[data-chapter-title]")) {
    const chapterId = target.dataset.chapterId || activeChapter()?.id;
    const chapter = chapterById(chapterId);
    if (!chapter) return;
    chapter.title = target.value;
    debounce(`chapter-title-${chapter.id}`, () => saveChapterPatch(chapter.id, { title: target.value }, true), 700);
    return;
  }
  if (target.matches("[data-chapter-content]")) {
    const chapterId = target.dataset.chapterId || activeChapter()?.id;
    const chapter = chapterById(chapterId);
    if (!chapter) return;
    chapter.content = target.value;
    debounce(`chapter-content-${chapter.id}`, () => saveChapterPatch(chapter.id, { content: target.value }), 700);
    return;
  }
  if (target.matches("[data-transcript-editor]")) {
    const chapterId = target.dataset.chapterId || activeChapter()?.id;
    const chapter = chapterById(chapterId);
    if (!chapter) return;
    chapter.transcript = target.value;
    debounce(`transcript-${chapter.id}`, () => saveChapterPatch(chapter.id, { transcript: target.value }), 700);
    return;
  }
  if (target.matches("[data-canon-editor]")) {
    const name = target.dataset.canonEditor;
    state.book.canon[name].content = target.value;
    debounce(`canon-${name}`, () => saveCanon(name, target.value), 700);
    return;
  }
  if (target.matches("[data-research-timeline]")) {
    state.book.research.timeline = target.value;
    debounce("research-timeline", () => saveResearchTimeline(target.value), 700);
    return;
  }
  if (target.matches("[data-research-voice]")) {
    state.book.research.voice_profile = target.value;
    debounce("research-voice", () => saveResearchVoice(target.value), 700);
    return;
  }
  if (target.matches("[data-research-person-body]")) {
    const id = target.dataset.researchPersonBody;
    const person = (state.book.research?.people || []).find((item) => item.id === id);
    if (person) person.body = target.value;
    debounce(`research-person-${id}`, () => saveResearchPerson(id, target.value), 700);
    return;
  }
  if (target.matches("[data-record-body]")) {
    const id = target.dataset.recordBody;
    const record = (state.book.research?.records || []).find((item) => item.id === id);
    if (record) record.body = target.value;
    debounce(`research-record-${id}`, () => saveRecordBody(id, target.value), 700);
    return;
  }
  if (target.matches("[data-section-label]")) {
    const index = Number(target.dataset.sectionLabel);
    const sections = structuredClone(state.book.meta.sections || []);
    sections[index].label = target.value;
    state.book.meta.sections = sections;
    debounce("sections", () => saveMetaPatch({ sections }), 700);
  }
});

document.addEventListener("scroll", (event) => {
  if (event.target?.id !== "conversationScroll") return;
  const el = event.target;
  state.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
}, true);

document.addEventListener("pointerdown", (event) => {
  const resize = event.target.closest("[data-window-resize]");
  if (resize) {
    const id = resize.dataset.id;
    const win = state.openWindows.find((item) => item.id === id);
    if (!win) return;
    focusChapterWindow(id, false);
    pointerOp = { type: "resize", id, startX: event.clientX, startY: event.clientY, startW: win.w, startH: win.h };
    event.preventDefault();
    return;
  }
  const drag = event.target.closest("[data-window-drag]");
  if (drag && !event.target.closest("button, input, textarea, select")) {
    const id = drag.dataset.id;
    const win = state.openWindows.find((item) => item.id === id);
    if (!win) return;
    focusChapterWindow(id, false);
    pointerOp = { type: "drag", id, startX: event.clientX, startY: event.clientY, originX: win.x, originY: win.y };
    $(`.ge-chapter-window[data-window-id="${CSS.escape(id)}"]`)?.classList.add("is-dragging");
    event.preventDefault();
    return;
  }
  const windowEl = event.target.closest("[data-window-id]");
  if (windowEl) focusChapterWindow(windowEl.dataset.windowId, false);
});

document.addEventListener("pointermove", (event) => {
  if (!pointerOp) return;
  const win = state.openWindows.find((item) => item.id === pointerOp.id);
  const el = $(`.ge-chapter-window[data-window-id="${CSS.escape(pointerOp.id)}"]`);
  if (!win || !el) return;
  const stage = $(".ge-stage")?.getBoundingClientRect();
  if (pointerOp.type === "drag") {
    const maxX = stage ? Math.max(24, stage.width - win.w - 24) : window.innerWidth;
    const maxY = stage ? Math.max(24, stage.height - win.h - 120) : window.innerHeight;
    win.x = clamp(pointerOp.originX + event.clientX - pointerOp.startX, 18, maxX);
    win.y = clamp(pointerOp.originY + event.clientY - pointerOp.startY, 18, maxY);
    el.style.left = `${win.x}px`;
    el.style.top = `${win.y}px`;
  } else {
    win.w = clamp(pointerOp.startW + event.clientX - pointerOp.startX, 380, 980);
    win.h = clamp(pointerOp.startH + event.clientY - pointerOp.startY, 330, 820);
    el.style.width = `${win.w}px`;
    el.style.height = `${win.h}px`;
  }
});

document.addEventListener("pointerup", () => {
  if (!pointerOp) return;
  $$(".ge-chapter-window.is-dragging").forEach((el) => el.classList.remove("is-dragging"));
  pointerOp = null;
});

async function handleAction(action, button) {
  if (action === "show-projects") return showProjects();
  if (action === "open-project") return loadBook(button.dataset.slug, { welcome: true });
  if (action === "toggle-project-menu") {
    state.projectMenuSlug = state.projectMenuSlug === button.dataset.slug ? null : button.dataset.slug;
    render();
    return;
  }
  if (action === "toggle-project-lock") return setProjectLock(button.dataset.slug, button.dataset.locked === "true");
  if (action === "delete-project-prompt") return openDeleteProject(button.dataset.slug);
  if (action === "confirm-delete-project") return deleteProject(button.dataset.slug);
  if (action === "open-bug-report") {
    try {
      state.status = await getJson("/api/status");
    } catch (_error) {
      // The draft endpoint will surface any backend problem.
    }
    state.modal = { type: "bug-report", description: "", draft: null, generating: false };
    state.settingsOpen = false;
    render();
    requestAnimationFrame(() => $("#bugReportDescription")?.focus());
    return;
  }
  if (action === "draft-bug-report") return draftBugReport();
  if (action === "send-bug-report") return sendBugReport();
  if (action === "copy-bug-report") return copyBugReport();
  if (action === "check-update") return checkForUpdate();
  if (action === "install-update") return installUpdate();
  if (action === "create-book") {
    state.modal = { type: "create-project", projectType: button.dataset.projectType || "novel", title: "" };
    render();
    requestAnimationFrame(() => $("#createProjectTitle")?.focus());
    return;
  }
  if (action === "confirm-create-book") return createBook(button.dataset.projectType || "novel");
  if (action === "open-import") {
    state.modal = { type: "import", raw: "", title: "" };
    render();
    return;
  }
  if (action === "close-modal") {
    state.modal = null;
    render();
    return;
  }
  if (action === "set-mode") return setMode(button.dataset.mode);
  if (action === "check-ai") return checkAi();
  if (action === "open-claude-login") return openClaudeLogin();
  if (action === "save-api-key") return saveApiKey();
  if (action === "save-claude-path") return saveClaudePath();
  if (action === "toggle-settings") {
    state.settingsOpen = !state.settingsOpen;
    render();
    return;
  }
  if (action === "clear-conversation") return clearConversation();
  if (action === "toggle-rail") {
    state.railOpen = !state.railOpen;
    render();
    return;
  }
  if (action === "toggle-storyboard") {
    state.storyboardOpen = !state.storyboardOpen;
    render();
    return;
  }
  if (action === "popout-storyboard") return popoutStoryboard();
  if (action === "close-storyboard") {
    state.storyboardOpen = false;
    render();
    return;
  }
  if (action === "dismiss-mic-banner") {
    state.micError = "";
    render();
    return;
  }
  if (action === "select-chapter") return selectChapter(button.dataset.id);
  if (action === "close-window") return closeChapterWindow(button.dataset.id);
  if (action === "popout-chapter") return popoutChapter(button.dataset.id);
  if (action === "window-tab") {
    state.windowTabs[button.dataset.id] = button.dataset.tab;
    state.activeChapterId = button.dataset.id;
    state.focusedChapterId = button.dataset.id;
    render();
    return;
  }
  if (action === "new-chapter") return newChapter();
  if (action === "story-tab") {
    state.storyboardTab = button.dataset.tab;
    render();
    return;
  }
  if (action === "research-tab") {
    state.researchTab = button.dataset.tab;
    render();
    return;
  }
  if (action === "ingest-source-url") return ingestSourceUrl($("#sourceUrlInput")?.value || "");
  if (action === "ingest-composer-url") return ingestSourceUrl(firstUrl(state.inputText), { clearFromInput: true });
  if (action === "ingest-source-text") return ingestSourceText();
  if (action === "upload-source") return uploadSource();
  if (action === "run-missing") return runMissing();
  if (action === "run-export-review") return runExportReview();
  if (action === "create-record-request") return createRecordRequest();
  if (action === "generate-voice-profile") return generateVoiceProfile();
  if (action === "propose-import") return proposeImport("#importTitle", "#importRaw");
  if (action === "propose-import-empty") return proposeImport("#emptyImportTitle", "#emptyImportRaw");
  if (action === "accept-import") return acceptImport();
  if (action === "add-section") return addSection();
  if (action === "delete-section") return deleteSection(Number(button.dataset.index));
  if (action === "send-chat") return sendChat();
  if (action === "stop-generating") return stopGenerating();
  if (action === "toggle-recording") return toggleRecording();
  if (action === "jump-latest") {
    state.stickToBottom = true;
    scrollConversationBottom();
    render();
    return;
  }
  if (action === "copy-message") return copyMessage(button.dataset.id);
  if (action === "speak-message") return speak(messageById(button.dataset.id)?.content || "");
  if (action === "edit-resend") return editResend(button.dataset.id);
  if (action === "delete-message") return deleteMessage(button.dataset.id);
  if (action === "regenerate-message") return regenerateMessage(button.dataset.id);
  if (action === "save-draft") return saveDraft(button.dataset.id, button.dataset.mode);
}

async function showProjects() {
  state.book = null;
  state.conversation = [];
  state.activeChapterId = null;
  state.focusedChapterId = null;
  state.openWindows = [];
  state.storyboardOpen = false;
  state.settingsOpen = false;
  state.projectMenuSlug = null;
  try {
    state.status = await getJson("/api/status");
    await refreshBooks();
  } catch (error) {
    showToast(error.message);
  }
  render();
}

function popoutChapter(id) {
  if (!state.book || !id) return;
  window.open(`/popout.html?type=chapter&slug=${encodeURIComponent(state.book.slug)}&id=${encodeURIComponent(id)}`, `ge-chapter-${state.book.slug}-${id}`, "popup=yes,width=760,height=860");
}

function popoutStoryboard() {
  if (!state.book) return;
  window.open(`/popout.html?type=storyboard&slug=${encodeURIComponent(state.book.slug)}`, `ge-board-${state.book.slug}`, "popup=yes,width=560,height=920");
}

async function createBook(projectType = "novel") {
  if (state.creatingProject) return;
  const title = $("#createProjectTitle")?.value.trim();
  if (!title) {
    showToast(projectType === "research" ? "Name the research project first" : "Name the novel first");
    $("#createProjectTitle")?.focus();
    return;
  }
  state.modal = { ...(state.modal || {}), title };
  state.creatingProject = true;
  render();
  try {
    const created = await api("/api/books", { title, projectType });
    state.modal = null;
    state.projectMenuSlug = null;
    await refreshBooks();
    await loadBook(created.slug, { welcome: true });
  } catch (error) {
    state.creatingProject = false;
    render();
    throw error;
  } finally {
    state.creatingProject = false;
  }
}

function projectFromSlug(slug) {
  return state.books.find((book) => book.slug === slug) || null;
}

async function setProjectLock(slug, locked) {
  if (!slug) return;
  await api(`/api/books/${encodeURIComponent(slug)}/meta`, { locked }, "PUT");
  state.projectMenuSlug = null;
  await refreshBooks();
  if (state.book?.slug === slug) {
    state.book = await getJson(`/api/books/${encodeURIComponent(slug)}`);
  }
  render();
  showToast(locked ? "Project locked" : "Project unlocked");
}

function openDeleteProject(slug) {
  const book = projectFromSlug(slug);
  if (!book) return showToast("Project not found");
  if (book.locked) return showToast("Unlock the project before deleting it");
  state.projectMenuSlug = null;
  state.modal = { type: "delete-project", book };
  render();
  requestAnimationFrame(() => $("#deleteProjectConfirm")?.focus());
}

async function deleteProject(slug) {
  const book = state.modal?.book?.slug === slug ? state.modal.book : projectFromSlug(slug);
  if (!book) return showToast("Project not found");
  if (book.locked) return showToast("Unlock the project before deleting it");
  const confirmation = $("#deleteProjectConfirm")?.value.trim() || "";
  if (confirmation !== book.title) {
    showToast("Type the exact project title to delete it");
    $("#deleteProjectConfirm")?.focus();
    return;
  }
  await api(`/api/books/${encodeURIComponent(slug)}`, { confirmation }, "DELETE");
  state.modal = null;
  if (state.book?.slug === slug) await showProjects();
  await refreshBooks();
  render();
  showToast("Project deleted");
}

function bugDiagnostics() {
  return {
    url: location.href,
    userAgent: navigator.userAgent,
    mode: state.status?.mode,
    statusMessage: state.status?.statusMessage,
    booksDir: state.status?.booksDir,
    activeProject: state.book ? {
      slug: state.book.slug,
      title: state.book.title,
      projectType: projectType(),
      chapterCount: state.book.chapters?.length || 0,
    } : null,
    projectCount: state.books.length,
    openWindows: state.openWindows.length,
    generating: state.generating,
    micPermission: state.micPermission,
    micError: state.micError,
  };
}

async function draftBugReport() {
  const description = $("#bugReportDescription")?.value.trim() || "";
  if (!description) {
    showToast("Tell me what broke first");
    $("#bugReportDescription")?.focus();
    return;
  }
  state.modal = { ...(state.modal || {}), type: "bug-report", description, generating: true };
  render();
  try {
    const report = await api("/api/bug-report/draft", {
      description,
      diagnostics: bugDiagnostics(),
    });
    state.modal = { type: "bug-report", description, draft: report, generating: false };
    render();
  } catch (error) {
    state.modal = { type: "bug-report", description, draft: { subject: "Generation Engine bug report", body: fallbackBugBody(description) }, generating: false };
    render();
    showToast(error.message);
  }
}

async function sendBugReport() {
  const draft = state.modal?.draft;
  if (!draft) return;
  const body = $("#bugReportDraft")?.value || draft.body || "";
  const subject = draft.subject || "Generation Engine bug report";
  const recipient = draft.recipient || state.status?.bugReport?.recipient || "founder@xyflowinnovations.com";
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
  const draft = state.modal?.draft;
  if (!draft) return;
  const body = $("#bugReportDraft")?.value || draft.body || "";
  await navigator.clipboard.writeText(body);
  showToast("Bug report copied");
}

async function checkForUpdate() {
  state.checkingUpdate = true;
  render();
  try {
    state.updateInfo = await getJson("/api/update/check");
    showToast(state.updateInfo.updateAvailable ? `Update ${state.updateInfo.latestVersion} available` : "Already up to date");
  } catch (error) {
    state.updateInfo = null;
    showToast(error.message);
  } finally {
    state.checkingUpdate = false;
    render();
  }
}

async function installUpdate() {
  if (!state.updateInfo?.updateAvailable) return showToast("No update available");
  state.installingUpdate = true;
  render();
  try {
    const result = await api("/api/update/install", {});
    showToast(result.message || "Installing update");
  } catch (error) {
    state.installingUpdate = false;
    render();
    showToast(error.message);
  }
}

function fallbackBugBody(description) {
  return `Generation Engine bug report\n\nWhat happened:\n${description}\n\nDiagnostics:\n${JSON.stringify(bugDiagnostics(), null, 2)}\n`;
}

async function checkAi() {
  state.status = await getJson("/api/status?refresh=1");
  if (state.book) state.book = await getJson(`/api/books/${encodeURIComponent(state.book.slug)}`);
  render();
  showToast(modeLabel(state.status.mode));
}

async function openClaudeLogin() {
  const data = await api("/api/config/claude-login", {});
  showToast(data.message || "Claude login started");
}

async function saveApiKey() {
  const key = $("#apiKeyInput")?.value.trim();
  if (!key) return showToast("Paste an API key first");
  await api("/api/config", { anthropicApiKey: key, mode: "api" }, "PUT");
  await checkAi();
}

async function saveClaudePath() {
  const claudePath = $("#claudePathInput")?.value.trim();
  if (!claudePath) return showToast("Paste a claude.exe path first");
  await api("/api/config", { claudePath, mode: "claude-code" }, "PUT");
  await checkAi();
}

async function setMode(mode) {
  if (!mode) return;
  await api("/api/config", { mode }, "PUT");
  state.status = await getJson("/api/status?refresh=1");
  if (state.book) state.book = await getJson(`/api/books/${encodeURIComponent(state.book.slug)}`);
  render();
  showToast(`Backend: ${modeLabel(state.status.mode)}`);
}

async function ingestSourceUrl(url, options = {}) {
  const clean = String(url || "").trim();
  if (!clean) return showToast("Paste a URL first");
  state.generating = true;
  render();
  try {
    const data = await api(`/api/research/${state.book.slug}/sources/ingest`, {
      url: clean,
      kind: clean.includes("youtube.com") || clean.includes("youtu.be") ? "youtube_url" : "url_fetch",
      type: clean.includes("youtube.com") || clean.includes("youtu.be") ? "broadcast" : "article",
      reliability: "secondary",
    });
    state.book.research = data.research;
    if (options.clearFromInput) state.inputText = state.inputText.replace(clean, "").trim();
    state.researchTab = "sources";
    showToast("Source ingested");
  } finally {
    state.generating = false;
    render();
  }
}

async function ingestSourceText() {
  const text = $("#sourceTextInput")?.value || "";
  if (!text.trim()) return showToast("Paste source text first");
  state.generating = true;
  render();
  try {
    const data = await api(`/api/research/${state.book.slug}/sources/ingest`, {
      title: $("#sourceTitleInput")?.value || "Pasted source",
      text,
      type: $("#sourceTypeInput")?.value || "other",
      reliability: $("#sourceReliabilityInput")?.value || "secondary",
      kind: "clipboard_paste",
    });
    state.book.research = data.research;
    showToast("Source ingested");
  } finally {
    state.generating = false;
    render();
  }
}

async function uploadSource() {
  const input = $("#sourceFileInput");
  const file = input?.files?.[0];
  if (!file) return showToast("Choose a file first");
  state.generating = true;
  render();
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("title", $("#sourceTitleInput")?.value || file.name);
    form.append("type", $("#sourceTypeInput")?.value || "other");
    form.append("reliability", $("#sourceReliabilityInput")?.value || "secondary");
    const response = await fetch(`/api/research/${state.book.slug}/sources/upload`, { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed");
    state.book.research = data.research;
    showToast("Source uploaded");
  } finally {
    state.generating = false;
    render();
  }
}

async function runMissing() {
  const data = await api(`/api/research/${state.book.slug}/missing`, {});
  state.conversation.push({ id: `missing-${Date.now()}`, role: "assistant", content: data.markdown, createdAt: new Date().toISOString(), metadata: { kind: "research-missing", local: true } });
  await persistConversation();
  render();
}

async function runExportReview() {
  const data = await api(`/api/research/${state.book.slug}/export-review`, {});
  state.conversation.push({ id: `export-review-${Date.now()}`, role: "assistant", content: data.markdown, createdAt: new Date().toISOString(), metadata: { kind: "export-review", local: true } });
  await persistConversation();
  render();
}

async function createRecordRequest() {
  state.generating = true;
  render();
  try {
    const data = await api(`/api/research/${state.book.slug}/records/request`, {
      agency: $("#recordAgencyInput")?.value || "",
      jurisdiction: $("#recordJurisdictionInput")?.value || "local",
      state: $("#recordStateInput")?.value || "",
      subject: $("#recordSubjectInput")?.value || "",
      details: $("#recordDetailsInput")?.value || "",
    });
    state.book.research = data.research;
    state.researchTab = "records";
    showToast("Records request drafted");
  } finally {
    state.generating = false;
    render();
  }
}

async function selectChapter(id) {
  state.activeChapterId = id;
  state.focusedChapterId = id;
  state.book.meta.activeChapter = id;
  ensureChapterWindow(id, { focus: true });
  await saveMetaPatch({ activeChapter: id });
  render();
}

async function newChapter() {
  state.book = await api(`/api/books/${state.book.slug}/chapters`, {});
  await refreshBooks();
  state.activeChapterId = state.book.meta.activeChapter;
  state.focusedChapterId = state.activeChapterId;
  ensureChapterWindow(state.activeChapterId, { focus: true });
  render();
  showToast("Blank chapter created");
}

function messageById(id) {
  return state.conversation.find((message) => message.id === id);
}

async function sendChat(overrideText = null) {
  const message = (overrideText ?? state.inputText).trim();
  if (!message || !state.book || state.generating) return;
  try {
    state.status = await getJson("/api/status?refresh=1");
  } catch (_error) {
    // Chat can still surface the backend error through the stream request.
  }
  state.inputText = "";
  const userMessage = { id: `local-user-${Date.now()}`, role: "user", content: message, createdAt: new Date().toISOString(), metadata: { local: true } };
  const assistantMessage = { id: `local-ai-${Date.now()}`, role: "assistant", content: "", createdAt: new Date().toISOString(), metadata: { local: true } };
  state.conversation.push(userMessage, assistantMessage);
  state.generating = true;
  state.stickToBottom = true;
  state.abortController = new AbortController();
  render();
  try {
    await streamPost("/api/chat/stream", {
      slug: state.book.slug,
      message,
    }, (_chunk, full) => {
      assistantMessage.content = full;
      updateStreamingMessage(assistantMessage.id, full);
    }, state.abortController.signal);
    const conversation = await getJson(`/api/books/${encodeURIComponent(state.book.slug)}/conversation`);
    state.conversation = conversation.messages || [];
    state.book = await getJson(`/api/books/${encodeURIComponent(state.book.slug)}`);
    state.generating = false;
    state.abortController = null;
    render();
    if (state.autoSpeak) {
      const last = [...state.conversation].reverse().find((item) => item.role === "assistant");
      if (last) speak(firstReadable(parseDraftMarker(last.content).clean));
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast(error.message);
    state.generating = false;
    state.abortController = null;
    render();
  }
}

function updateStreamingMessage(id, content) {
  const node = $(`[data-message-id="${CSS.escape(id)}"] .ge-message-content`);
  if (!node) return;
  node.innerHTML = markdownToHtml(parseDraftMarker(content).clean);
  if (state.stickToBottom) scrollConversationBottom();
}

function stopGenerating() {
  if (state.abortController) state.abortController.abort();
  state.generating = false;
  state.abortController = null;
  showToast("Stopped");
  render();
}

async function copyMessage(id) {
  const message = messageById(id);
  if (!message) return;
  await navigator.clipboard.writeText(parseDraftMarker(message.content).clean);
  showToast("Copied");
}

function editResend(id) {
  const message = messageById(id);
  if (!message) return;
  state.inputText = message.content;
  render();
  $("#chatInput")?.focus();
}

async function deleteMessage(id) {
  state.conversation = state.conversation.filter((message) => message.id !== id);
  await persistConversation();
  render();
}

async function regenerateMessage(id) {
  const index = state.conversation.findIndex((message) => message.id === id);
  const previous = [...state.conversation.slice(0, index)].reverse().find((message) => message.role === "user");
  if (previous) await sendChat(previous.content);
}

async function saveDraft(id, mode) {
  const message = messageById(id);
  if (!message) return;
  const { clean, draft } = parseDraftMarker(message.content);
  let chapterId = draft?.suggested_id;
  let replace = false;
  if (mode === "new") {
    chapterId = null;
  } else if (mode === "replace") {
    chapterId = $(`[data-replace-select="${CSS.escape(id)}"]`)?.value || chapterId;
    replace = true;
  }
  state.book = await api(`/api/books/${state.book.slug}/chapters/save-draft`, {
    content: clean,
    chapterId,
    title: draft?.title,
    replace,
  });
  await refreshBooks();
  state.conversation = state.book.conversation?.messages || state.conversation;
  state.activeChapterId = state.book.meta.activeChapter;
  render();
  showToast(`Saved Chapter ${Number(state.activeChapterId)}`);
}

async function clearConversation() {
  if (!confirm("Start a new conversation for this book? Saved chapters and storyboard stay intact.")) return;
  const data = await api(`/api/books/${state.book.slug}/conversation/clear`, {});
  state.conversation = data.messages || [];
  state.settingsOpen = false;
  render();
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
    state.micError = "This browser window cannot record audio. Open the app in Microsoft Edge or Chrome.";
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
    state.micError = "Click the lock icon in the URL bar, open site permissions, allow microphone access, then restart the app.";
    render();
  }
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }
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
    const source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    source.connect(state.analyser);
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
    const mic = $("#micButton");
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
    form.append("audio", wavBlob, "recording.wav");
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
    $("#chatInput")?.focus();
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

async function generateVoiceProfile() {
  const authors = $("#authorsInput")?.value || "";
  const data = await api("/api/ai/voice-profile", { slug: state.book.slug, authors });
  if (isResearch()) {
    await saveResearchVoice(data.content, true);
  } else {
    await saveCanon("voice_profile", data.content, true);
  }
  showToast("Voice profile updated");
}

async function readImportFiles(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  const parts = [];
  for (const file of files) {
    const text = await file.text();
    parts.push(`# Imported file: ${file.name}\n\n${text}`);
  }
  const target = input.id === "emptyImportFiles" ? $("#emptyImportRaw") : $("#importRaw");
  if (target) target.value = [target.value.trim(), parts.join("\n\n---\n\n")].filter(Boolean).join("\n\n---\n\n");
}

async function proposeImport(titleSelector, rawSelector) {
  const title = $(titleSelector)?.value || "Imported Book";
  const raw = $(rawSelector)?.value || "";
  if (!raw.trim()) {
    showToast("Paste or upload chapters first");
    return;
  }
  state.generating = true;
  render();
  const proposal = await api("/api/import/propose", { title, raw });
  proposal.projectType = $("#importProjectType")?.value || "novel";
  state.generating = false;
  state.modal = { type: "import-proposal", proposal };
  render();
}

async function acceptImport() {
  const proposal = structuredClone(state.modal.proposal);
  proposal.title = $("#proposalTitle")?.value || proposal.title;
  proposal.canon = proposal.canon || {};
  $$("[data-proposal-canon]").forEach((textarea) => {
    proposal.canon[textarea.dataset.proposalCanon] = textarea.value;
  });
  const imported = await api("/api/import/accept", { proposal, projectType: proposal.projectType || "novel" });
  await refreshBooks();
  state.modal = null;
  await loadBook(imported.slug, { welcome: true });
}

async function addSection() {
  const sections = structuredClone(state.book.meta.sections || []);
  const id = `part-${sections.length + 1}`;
  sections.push({ id, label: `Part ${sections.length + 1}`, chapterIds: [] });
  await saveMetaPatch({ sections });
  render();
}

async function deleteSection(index) {
  const sections = structuredClone(state.book.meta.sections || []);
  if (sections.length <= 1) {
    showToast("Keep at least one section");
    return;
  }
  const removed = sections.splice(index, 1)[0];
  const fallback = sections[0].id;
  state.book.meta.sections = sections;
  for (const chapter of state.book.meta.chapters) {
    if (chapter.section === removed.id) chapter.section = fallback;
  }
  await api(`/api/books/${state.book.slug}/meta`, { meta: state.book.meta }, "PUT");
  state.book = await getJson(`/api/books/${state.book.slug}`);
  render();
}

function speak(markdown) {
  if (!("speechSynthesis" in window)) {
    showToast("Browser TTS is not available");
    return;
  }
  const text = plainText(markdown);
  if (!text) return;
  window.speechSynthesis.cancel();
  const chunks = text.match(/.{1,240}(?:\s|$)/g) || [text];
  const queue = [...chunks];
  const sayNext = () => {
    const next = queue.shift();
    if (!next) return;
    const utterance = new SpeechSynthesisUtterance(next);
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 0.92;
    utterance.onend = sayNext;
    window.speechSynthesis.speak(utterance);
  };
  sayNext();
}

function preferredVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const english = voices.filter((voice) => /^en[-_]/i.test(voice.lang || ""));
  const pool = english.length ? english : voices;
  const score = (voice) => {
    const name = `${voice.name || ""} ${voice.voiceURI || ""}`;
    let value = /^en[-_]/i.test(voice.lang || "") ? 20 : 0;
    if (/natural|neural|online|aria|jenny|ava|emma|brian|guy|zira|susan/i.test(name)) value += 60;
    if (/david|mark|desktop/i.test(name)) value -= 20;
    if (voice.localService === false) value += 8;
    return value;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0] || null;
}

function firstReadable(text) {
  return String(text || "").split(/\n\s*\n/).slice(0, 4).join("\n\n");
}

init();
