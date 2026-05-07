const params = new URLSearchParams(location.search);
const type = params.get("type") || "storyboard";
const slug = params.get("slug") || "";
const chapterId = params.get("id") || "";

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

let book = null;
let activeTab = "world";
let timer = null;

const $ = (selector, root = document) => root.querySelector(selector);

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

async function api(path, body, method = "PUT") {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

async function load() {
  book = await getJson(`/api/books/${encodeURIComponent(slug)}`);
  if (book.meta?.projectType === "research") activeTab = "sources";
  document.title = type === "chapter" ? `Chapter ${chapterId} - ${book.title}` : `${book.meta?.projectType === "research" ? "Research" : "Storyboard"} - ${book.title}`;
  render();
}

function render() {
  const root = $("#popout");
  if (!book) {
    root.innerHTML = `<main class="ge-popout"><p>Loading...</p></main>`;
    return;
  }
  root.innerHTML = type === "chapter" ? renderChapter() : renderBoard();
}

function renderShell(title, body) {
  return `
    <main class="ge-popout">
      <header class="ge-popout-header">
        <div>
          <div class="ge-empty-eyebrow">Generation Engine</div>
          <h1>${escapeHtml(title)}</h1>
        </div>
        <button class="ge-btn ge-btn--ghost ge-btn--small" data-action="refresh">Refresh</button>
      </header>
      ${body}
    </main>
  `;
}

function renderChapter() {
  const chapter = (book.chapters || []).find((item) => item.id === chapterId) || book.chapters?.[0];
  if (!chapter) return renderShell("Chapter", `<p>No chapter found.</p>`);
  return renderShell(
    chapter.title,
    `<section class="ge-popout-grid">
      <label>Chapter title
        <input value="${escapeHtml(chapter.title)}" data-chapter-title data-id="${escapeHtml(chapter.id)}" />
      </label>
      <label>Chapter prose
        <textarea class="ge-popout-editor" data-chapter-content data-id="${escapeHtml(chapter.id)}">${escapeHtml(chapter.content || "")}</textarea>
      </label>
      <label>Transcript sidecar
        <textarea class="ge-popout-editor small" data-chapter-transcript data-id="${escapeHtml(chapter.id)}">${escapeHtml(chapter.transcript || "")}</textarea>
      </label>
    </section>`
  );
}

function renderBoard() {
  const isResearch = book.meta?.projectType === "research";
  const tabs = isResearch ? researchTabs : canonTabs;
  if (!tabs.some(([key]) => key === activeTab)) activeTab = tabs[0][0];
  return renderShell(
    isResearch ? `Research - ${book.title}` : `Storyboard - ${book.title}`,
    `<nav class="ge-popout-tabs">
      ${tabs.map(([key, label]) => `<button class="${key === activeTab ? "is-active" : ""}" data-action="tab" data-tab="${key}">${escapeHtml(label)}</button>`).join("")}
    </nav>
    <section class="ge-popout-board">
      ${isResearch ? renderResearchTab(activeTab) : renderCanonTab(activeTab)}
    </section>`
  );
}

function renderCanonTab(tab) {
  if (tab === "sections") {
    return `<textarea class="ge-popout-editor" data-meta-json>${escapeHtml(JSON.stringify(book.meta.sections || [], null, 2))}</textarea>`;
  }
  return `<textarea class="ge-popout-editor" data-canon="${escapeHtml(tab)}">${escapeHtml(book.canon?.[tab]?.content || "")}</textarea>`;
}

function renderResearchTab(tab) {
  const research = book.research || {};
  if (tab === "timeline") {
    return `<textarea class="ge-popout-editor" data-research-timeline>${escapeHtml(research.timeline || "")}</textarea>`;
  }
  if (tab === "voice") {
    return `<textarea class="ge-popout-editor" data-research-voice>${escapeHtml(research.voice_profile || "")}</textarea>`;
  }
  if (tab === "claims") {
    return `<textarea class="ge-popout-editor" data-research-claims>${escapeHtml(JSON.stringify(research.claims || [], null, 2))}</textarea>`;
  }
  if (tab === "people") {
    return (research.people || []).map((person) => `
      <article class="ge-source-card">
        <strong>${escapeHtml(person.display_name || person.id)}</strong>
        <textarea class="ge-popout-editor small" data-person="${escapeHtml(person.id)}">${escapeHtml(person.body || "")}</textarea>
      </article>
    `).join("") || `<p class="ge-muted">No entities yet.</p>`;
  }
  if (tab === "records") {
    return (research.records || []).map((record) => `
      <article class="ge-source-card">
        <strong>${escapeHtml(record.agency || record.id)}</strong>
        <span class="ge-source-meta">${escapeHtml(record.status || "drafted")} · due ${escapeHtml(record.deadline || "not set")}</span>
        <textarea class="ge-popout-editor small" data-record="${escapeHtml(record.id)}">${escapeHtml(record.body || "")}</textarea>
      </article>
    `).join("") || `<p class="ge-muted">No records requests yet.</p>`;
  }
  return (research.sources || []).map((source) => `
    <article class="ge-source-card">
      <strong>${escapeHtml(source.title || source.id)}</strong>
      <span class="ge-source-meta">${escapeHtml(source.id)} · ${escapeHtml(source.type || "other")} · ${escapeHtml(source.reliability || "secondary")}</span>
      <p>${escapeHtml(source.excerpt || "")}</p>
    </article>
  `).join("") || `<p class="ge-muted">No sources yet.</p>`;
}

function debounceSave(fn) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      await fn();
      showToast("Saved");
    } catch (error) {
      showToast(error.message);
    }
  }, 500);
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "refresh") {
    await load();
    showToast("Refreshed");
  }
  if (button.dataset.action === "tab") {
    activeTab = button.dataset.tab;
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-chapter-title]")) {
    debounceSave(async () => {
      book = await api(`/api/books/${book.slug}/chapters/${target.dataset.id}`, { title: target.value });
    });
  } else if (target.matches("[data-chapter-content]")) {
    debounceSave(async () => {
      book = await api(`/api/books/${book.slug}/chapters/${target.dataset.id}`, { content: target.value });
    });
  } else if (target.matches("[data-chapter-transcript]")) {
    debounceSave(async () => {
      book = await api(`/api/books/${book.slug}/chapters/${target.dataset.id}`, { transcript: target.value });
    });
  } else if (target.matches("[data-canon]")) {
    debounceSave(async () => {
      book = await api(`/api/books/${book.slug}/canon/${target.dataset.canon}`, { content: target.value });
    });
  } else if (target.matches("[data-meta-json]")) {
    debounceSave(async () => {
      book = await api(`/api/books/${book.slug}/meta`, { meta: { ...book.meta, sections: JSON.parse(target.value) } });
    });
  } else if (target.matches("[data-research-timeline]")) {
    debounceSave(async () => {
      const saved = await api(`/api/research/${book.slug}/timeline`, { content: target.value });
      book.research = saved.research;
    });
  } else if (target.matches("[data-research-voice]")) {
    debounceSave(async () => {
      const saved = await api(`/api/research/${book.slug}/voice`, { content: target.value });
      book.research = saved.research;
    });
  } else if (target.matches("[data-research-claims]")) {
    debounceSave(async () => {
      const saved = await api(`/api/research/${book.slug}/claims`, { claims: JSON.parse(target.value) });
      book.research = saved.research;
    });
  } else if (target.matches("[data-person]")) {
    debounceSave(async () => {
      const person = (book.research?.people || []).find((item) => item.id === target.dataset.person) || { id: target.dataset.person };
      const saved = await api(`/api/research/${book.slug}/people/${target.dataset.person}`, { meta: person, body: target.value });
      book.research = saved.research;
    });
  } else if (target.matches("[data-record]")) {
    debounceSave(async () => {
      const saved = await api(`/api/research/${book.slug}/records/${target.dataset.record}`, { body: target.value });
      book.research = saved.research;
    });
  }
});

load().catch((error) => {
  $("#popout").innerHTML = `<main class="ge-popout"><pre>${escapeHtml(error.stack || error.message)}</pre></main>`;
});
