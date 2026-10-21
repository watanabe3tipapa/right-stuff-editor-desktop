# right-stuff-editor-desktop

[日本語](./README.md) | **English**

**Your Markdown, where it lives. Apple Notes and AI, in one writing environment.**

right-stuff-editor-desktop is a local-first macOS editor built with tinyjs (txiki.js + a native WebView). Open a workspace folder and edit the Markdown inside it directly. It combines the feel of rich-text writing with the portability of Markdown, and lets you work with selected Apple Notes in the same window.

> **Write, refine, keep. Keep the whole flow on your machine.** Drafts stay as files in the folder you chose and remain usable from other editors, Finder, and Git. There is no cloud sync and no account.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.1.0-blue.svg)](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/releases)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://github.com/watanabe3tipapa/right-stuff-editor-desktop)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/right-stuff-editor-desktop/)
[![GitHub issues](https://img.shields.io/github/issues/watanabe3tipapa/right-stuff-editor-desktop.svg)](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues)

**Quick links:** [Website](https://watanabe3tipapa.github.io/right-stuff-editor-desktop/) · [Usage](./docs/USAGE.md) · [Dev memo](./docs/DEV-MEMO.md) · [Issues](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues) · [Releases](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/releases)

## Download

v0.1.0 is currently built from source. Distribution builds are planned for GitHub Releases.

> The build is ad-hoc signed. It is not signed or notarized with an Apple Developer ID. If macOS warns on first launch, right-click the app and choose **Open**.

## Concept

### Why desktop?

A browser-only editor is convenient, but your drafts live inside the browser's storage. The desktop version removes that constraint and makes **the folder you choose the home of your drafts**. Files stay there after the app closes and remain usable from your existing workflow.

| Experience | What right-stuff-editor-desktop provides |
|---|---|
| Write | Lexical rich-text editing (headings, lists, quotes, tables, links, code) |
| Check | Rich-text / Markdown switching and an enhanced preview |
| Keep | Direct autosave into workspace Markdown files |
| Protect | Atomic writes, external-change conflict detection, history, recovery, backups |
| Connect | Apple Notes browsing/editing and GitHub Gist |
| Refine | AI completion, inline transforms, AI chat, style profiles |
| Take away | Markdown / HTML / JSON / TXT / DOCX / Ollama Modelfile export |

### Design principles

1. **Files come first** — Markdown on disk is the source of truth, not a private database
2. **Saving is visible** — saving, saved, unsaved, and conflict states are always shown
3. **Stay on the machine** — no accounts, telemetry, or cloud sync
4. **Do not break drafts** — atomic write (temp file + rename), hash/mtime conflict detection, and trash instead of hard deletes

## Features

- **Workspace** — choose a folder and recursively list Markdown / TXT. Create, rename, delete, and reload
- **Rich-text editing** — headings, bold, italic, underline, strikethrough, color, highlight, lists, checklists, quotes, code blocks, links, tables
- **Markdown sync** — save as Markdown with frontmatter, with source view and preview
- **Autosave and conflict handling** — saves every 30 seconds by default; prompts for reload when a file changed externally
- **Version history** — records the previous content on every save and restores any version
- **Recovery** — snapshots unsaved work every 15 seconds and offers to restore on next launch
- **Backups** — periodic workspace copies as JSON or Markdown under `.right-stuff/backups`
- **Apple Notes** — list folders and notes, read and update bodies. Locked and shared notes are read-only
- **Enhanced preview** — GitHub Alerts, Mermaid, KaTeX, syntax highlighting, GFM
- **AI assistant** — 18 providers, ghost text, slash commands, inline transforms, chat
- **Style and memory** — style profiles and entity memory for consistent terminology
- **Terminal** — a macOS PTY rendered with wterm, starting in the workspace
- **Writing tools** — templates, command palette, search, writing stats, Zen mode, typewriter mode
- **Themes** — Light / Dark / System
- **Export** — Markdown / HTML / JSON / TXT / DOCX / Ollama Modelfile via the native save panel; PDF through the print dialog

### Architecture

- **Frontend**: Vite + React 18 + Lexical 0.32
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Desktop**: tinyjs (txiki.js backend + native WebView)
- **Backend**: Tiny API handlers, workspace I/O, SQLite, Apple Notes bridge, PTY
- **Database**: `tjs:sqlite` in WAL mode for settings, history, recovery, stats, templates, and chat
- **Bridge**: a thin wrapper around `window.tiny` in `src/frontend/utils/desktop.ts`
- **Packaging**: `tinyjs build` + `scripts/postbuild-macos.sh` (Apple Events usage string and ad-hoc signing)

### Data and security

- Drafts are stored as Markdown in the workspace and are never uploaded by the app
- There are no accounts, telemetry, or cloud sync
- Apple Notes access uses macOS automation permission and only touches notes you select
- AI features run only when you explicitly configure and call a provider
- API keys are stored in local app settings
- Backend path validation rejects paths outside the workspace and blocks direct access to `.right-stuff`

## Install and build

### Requirements

| Tool | Version | Check |
|---|---:|---|
| macOS | 15 or later (Apple Silicon) | `sw_vers` |
| Node.js | >= 20 | `node --version` |
| tinyjs | >= 0.60 | `tinyjs --version` |

Install tinyjs following the [official guide](https://tinyjs.app/). The built-in terminal uses `/usr/bin/python3` (included with Command Line Tools).

### Steps

1. Clone the repository

```bash
git clone https://github.com/watanabe3tipapa/right-stuff-editor-desktop.git
cd right-stuff-editor-desktop
```

2. Install dependencies

```bash
npm ci
```

3. Launch the native window

```bash
tinyjs dev
```

Vite starts at `http://127.0.0.1:3000` and tinyjs loads it in a native window. On first launch, the default workspace (`~/Documents/Right-Stuff`) is created.

4. Build the app

```bash
npm run package
open "dist/Right-Stuff Editor Desktop.app"
```

`npm run package` runs `tinyjs build` followed by macOS post-processing. Use this path for Apple Notes support. To build only the frontend, run `npm run build`.

### Commands

| Command | Purpose |
|---|---|
| `tinyjs dev` | Run the native window with HMR |
| `npm run dev` | Run only the Vite dev server |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm run build:landing` | Build the landing page into `site/` |
| `npm run typecheck` | TypeScript type-check |
| `npm run lint` | Static analysis with oxlint |
| `npm test` | Unit tests with Vitest |
| `npm run package` | Build and post-process the macOS `.app` |
| `npm run applefm` | Build and start the Apple Foundation Models bridge |

## Publishing

The landing page is built by [GitHub Actions](./.github/workflows/pages.yml) on every push to `main` and deployed to GitHub Pages.

| Path | Content |
|---|---|
| `/` | Landing page (`src/landing/`) |
| `assets/` | Landing CSS and JavaScript |
| `favicon.*` / `site.webmanifest` | Icons and PWA metadata |

The app itself is not distributed on the web. macOS builds are intended for GitHub Releases (v0.1.0 currently provides source build instructions only).

- Landing output: `site/`
- App bundle: `dist/Right-Stuff Editor Desktop.app`
- Signing: ad-hoc
- Architecture: arm64

## Project layout

```text
src/
├── backend/                        # txiki.js backend
│   ├── main.ts                     # Tiny API handlers / init
│   ├── workspace.ts                # workspace I/O, conflicts, backups
│   ├── db.ts                       # SQLite (settings, history, stats, templates, chat)
│   ├── notes-bridge.ts             # Apple Notes AppleScript bridge
│   ├── terminal.ts                 # Python PTY bridge
│   └── markdown.ts                 # frontmatter parse / serialize
├── frontend/                       # WebView frontend
│   ├── App.tsx                     # layout, saving, recovery
│   ├── components/                 # Editor / Preview / Notes / Chat / Settings, etc.
│   ├── stores/                     # Zustand state
│   └── utils/                      # desktop bridge, Markdown, LLM
├── landing/                        # GitHub Pages landing page
│   ├── index.html
│   ├── main.tsx
│   └── landing.css
└── shared/types.ts                 # shared backend/frontend types

applefm/                            # Apple Foundation Models Swift bridge
scripts/postbuild-macos.sh          # Info.plist and ad-hoc signing
public/                             # favicon, OG image, wterm.wasm
docs/                               # usage and development notes
.github/workflows/pages.yml         # GitHub Pages deployment
tinyjs.json                         # tinyjs app config
vite.landing.config.ts              # landing page build config
package.json
```

## Usage

1. After launch, choose a workspace from the folder name in the sidebar
2. Create a document with **+**, or open a Markdown file from the list
3. Format with the toolbar and switch to Markdown or preview when needed
4. Changes autosave; press `⌘S` to save manually
5. Open History to review or restore previous versions
6. Open Notes to browse Apple Notes folders and edit a selected note
7. Use the export menu to write Markdown, HTML, JSON, TXT, DOCX, or an Ollama Modelfile

## Known limitations and roadmap

### v0.1.0

- [x] tinyjs project and native window
- [x] Lexical rich-text editing and Markdown sync
- [x] Workspace list, create, rename, and delete
- [x] Atomic write, external-change conflicts, and trash
- [x] Autosave, version history, recovery, and periodic backups
- [x] Apple Notes listing, reading, and saving
- [x] Enhanced preview (Alerts / Mermaid / KaTeX / highlighting)
- [x] AI completion, inline transforms, chat, and style profiles
- [x] macOS PTY terminal
- [x] Templates, writing stats, command palette, and themes
- [x] Markdown / HTML / JSON / TXT / DOCX / Ollama Modelfile export
- [x] Vitest round-trip tests for Markdown and Notes

### Next candidates

- [ ] Apple Developer ID signing and notarized distribution
- [ ] Universal build (Intel Mac support)
- [ ] Native PDF export
- [ ] Better Apple Notes checklist and attachment round-trips
- [ ] Re-enable Agent Skill Manager and mdv integrations
- [ ] Windows / Linux builds

### Constraints

- The current target is macOS; the distributed package is arm64 only
- The built-in terminal requires macOS and `/usr/bin/python3`
- Apple Notes requires macOS automation permission. Shared and locked notes are read-only
- PDF export goes through the print dialog
- There is no sync or collaborative editing
- The app itself is not served on the web

## Documentation

1. [USAGE.md](./docs/USAGE.md) — setup, operation, and troubleshooting (Japanese)
2. [DEV-MEMO.md](./docs/DEV-MEMO.md) — implementation history, decisions, and verification (Japanese)
3. [README.md](./README.md) — Japanese overview

## Contributing

Contributions are welcome. Open an [Issue](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues) before large changes. General flow:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push the branch and open a Pull Request

## Contact

- GitHub: https://github.com/watanabe3tipapa/right-stuff-editor-desktop
- Issues: https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues

## License

MIT License — see [LICENSE](LICENSE) for details.

RIGHT-STUFF EDITOR is a personal project. tinyjs, txiki.js, Lexical, and Tailwind CSS remain under their respective licenses.
