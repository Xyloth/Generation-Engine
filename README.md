# Generation Engine

A local-first, voice-first desktop app for long-form writing and research. One author, persistent project memory, files on disk, no cloud dependency. Built as a personal tool for the author's family — initially for true-crime nonfiction — and expanded into a general-purpose long-form writing system supporting both fiction and research projects.

The interesting thing about this app is what it doesn't do: no autopilot generation, no opaque memory, no judging pipelines, no retry-until-clean loops. The AI is a collaborator visible at every step, and project memory is plain markdown the user can hand-edit. See [Engineering notes](#engineering-notes) for why.

## Project types

- **Novel** — voice-first chapter drafting with editable canon (world, characters, timeline, arcs, sections, prose voice profile).
- **Research** — nonfiction / true-crime with sources, entities, timeline, atomic claims with sourcing state, FOIA / public-records workflow, citation-aware drafting, and a pre-export sourcing review pass that flags unsupported assertions.

Both modes share the same chat-first surface and the same persistent conversation per project. What changes between modes is the memory spine the AI reads at draft time and the system prompt it operates under. Mock fallback is disabled entirely in research mode by design — fabricated prose is a liability when the output describes real people.

## Screenshots

![Projects screen](docs/screenshots/projects.png)

![Research workspace](docs/screenshots/research-workspace.png)

![Bug report flow](docs/screenshots/bug-report.png)

## Engineering notes

### Architecture

- **Backend.** Python stdlib HTTP server (`server.py`). No framework, no pip dependencies. All HTTP, file I/O, subprocess, SSE streaming, and prompt-cache wiring done with the standard library. The deliberate choice was to keep the runtime portable — a single `python.exe` bundled with the app launches the whole backend with no install step.
- **Frontend.** Vanilla JavaScript, no build step, served from `web/`. Custom markdown mini-parser, custom DOM diff/render. The native shell is Electron in `desktop/` for window chrome, mic permissions, and system integration.
- **Storage is the filesystem.** A project is a folder. Chapters are markdown. Canon is markdown. Claims are JSON. Sources are markdown with frontmatter, original files preserved alongside. Conversations are JSON. Any text editor, file-diff tool, or version-control system can operate on project state directly. The app is one consumer of those files; future versions of the app, or a different app entirely, can pick up the same folder and continue.
- **Three model backends, auto-detected.** Claude Code CLI subprocess (uses the user's existing Claude subscription via `claude --print`, no API spend), Anthropic API (with prompt caching for canon and recent chapters), and a fiction-only mock fallback for offline UI testing. The auto resolver prefers CLI → API → mock; the user can pin a specific mode. Research projects refuse to fall back to mock.
- **Portable Windows install.** Bundled embedded Python runtime + batch-file launcher + Electron shell. Drop the folder on a target machine, double-click `install.bat`, get a desktop shortcut. No Python install required on the target.

### Why local-first

Most AI writing tools route everything through opaque cloud memory. Generation Engine inverts that: the user owns the files, the AI reads them at draft time, and any other tool — text editor, file diff, version control — operates on the same surface. Projects survive future versions of the app and aren't locked to any vendor.

### Why no autopilot

An earlier iteration of this project (preserved as a private archive outside the public repo) attempted full-autonomy novel generation: scene cards, hard gates, style surgeons, motif cooldowns, retry-until-clean loops, multi-judge consensus. It hit a quality wall — every retry pushed prose toward a generic-AI center of mass, and stories collapsed to corridor-locked, mantra-heavy interior monologue regardless of seed material. Smarter base models didn't fix it; the architecture itself was the problem.

The lesson: current models can sustain long-form continuity given good rolling context, but they cannot direct a 100k-word story without a human in the loop. Generation Engine commits to that division. The user owns structure, intent, and judgment; the AI owns prose, memory, and continuity. The retry loop is the user reading and revising, not a judge re-prompting the model.

### Why atomic claims for nonfiction

In research mode, claims with explicit sourcing state are the mechanism that prevents the AI from inventing facts. Every factual sentence in a research draft traces back to a claim, which traces back to a source excerpt with a hash and a verified-by signature. The research-mode system prompt forbids unsourced assertion. A pre-export review pass walks the manuscript and flags every claim that lacks backing or carries a high defamation-risk profile. Publish-readiness is auto-derived from sourcing depth, contradictions, living-person involvement, and allegation-vs-fact distinction — not a manual flag.

This is the engineering difference between an AI writing assistant and a research-grade tool.

### Other notable bits

- The mic button uses MediaRecorder + a local Whisper transcription path bundled into the runtime, not Web Speech API. Web Speech fails silently in `--app=` mode and reports "network" errors when underlying STT services are unreachable; bundling Whisper makes voice work offline and consistently.
- Drafts live in the chat as AI messages, not in chapter files, until the user explicitly clicks Save. Multiple drafts of the same chapter coexist in the conversation; the user picks the one they liked.
- Conversations persist per project. Closing and reopening the app restores the entire thread.
- In-app bug reporting opens a Gmail compose pre-filled with an AI-summarized report, addressed to the maintainer. No telemetry pipeline.

## Configuration

Copy `config.example.json` to `config.local.json`.

Claude Code CLI mode (recommended — uses an existing Claude subscription, no API spend):

```json
{ "mode": "claude-code" }
```

Anthropic API mode:

```json
{
  "mode": "api",
  "anthropicApiKey": "your-key"
}
```

Release updates:

```json
{
  "update": { "repo": "Xyloth/Generation-Engine" }
}
```

`config.local.json` is ignored by Git and should never be committed.

## Start

```powershell
start.bat
```

Opens the desktop shell and starts the local backend.

## Portable install

For a beta machine:

1. Copy the release folder to the target Windows machine.
2. Drop a private `config.local.json` in the folder.
3. Double-click `install.bat`.
4. Launch **Generation Engine** from the desktop shortcut.

The app creates required local folders automatically. The portable runtime means no Python install required on the target.

## Release packaging

Build a portable release zip:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release.ps1 -Root .
```

If the GitHub repo exists and `gh auth login` is done, publish the current committed version:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\publish-release.ps1 -Repo Xyloth/Generation-Engine
```

The in-app **Check for update** button reads the latest GitHub Release, downloads the zip, preserves `books/` and `config.local.json`, replaces app files, refreshes the desktop shortcut, and restarts.

## Repository safety

The public repo intentionally excludes:

- `books/` (user content)
- `config.local.json`, `ANTHROPIC_API_KEY.txt` (credentials)
- `runtime/` (portable Python — bundled into release zips, not source control)
- `desktop/node_modules/` (Electron deps)
- `Legacy/`, `Visuals/` (private working material and design assets)
- generated logs, temp files, release zips, internal engineering briefs

Release zips contain the portable runtime and all dependencies. Source control does not.

## Status

Pre-1.0 beta. Currently used privately by the author's family. Expect breakage as features land. Bug reports surface inside the app and open a pre-filled Gmail draft addressed to the maintainer.

## License

Source code and project documentation are released under the MIT License. User
content, local configuration, release archives, private working material, design
assets, and portable runtime bundles are excluded from this repository and are
not covered by the source license.

## About

Built and maintained by [@Xyloth](https://github.com/Xyloth). Designed end-to-end — product model, architecture, system prompts, and the decision to scrap the prior autopilot iteration in favor of the current chat-first, file-led, human-in-the-loop direction. AI-assisted implementation; solo-directed engineering. Contact via the in-app bug-report flow or GitHub.
