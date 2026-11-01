<p align="center">
  <img src="public/icon.png" width="100" height="100" alt="CleanSweep Logo" />
</p>

<h1 align="center">CleanSweep</h1>

<p align="center">
  <strong>The fast, zero-telemetry macOS optimizer, deep app uninstaller, and developer cleaning suite with companion CLI.</strong>
</p>

<p align="center">
  <a href="https://github.com/thecodekaizen/clean-my-mac/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/thecodekaizen/clean-my-mac/ci.yml?branch=main&label=CI&style=flat-square&color=10b981" alt="CI Status" />
  </a>
  <a href="https://github.com/thecodekaizen/clean-my-mac/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%20(Apple%20Silicon%20%26%20Intel)-6366f1.svg?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/telemetry-0%25%20(Privacy%20First)-38bdf8.svg?style=flat-square" alt="Telemetry" />
  <img src="https://img.shields.io/badge/tests-12%20passing-10b981.svg?style=flat-square" alt="Tests" />
</p>

<p align="center">
  <a href="#-quick-install">Quick Install</a> •
  <a href="#-visual-tour">Visual Tour</a> •
  <a href="#-core-features">Features</a> •
  <a href="#-cli-companion-sweep">CLI Companion</a> •
  <a href="#-menu-bar-tray-companion">Menu Bar Tray</a> •
  <a href="#-feature-comparison">Comparison</a> •
  <a href="#-privacy--safety">Privacy &amp; Safety</a>
</p>

---

## 📸 Visual Tour

<p align="center">
  <img src="assets/screenshots/hero-banner.svg" width="100%" alt="CleanSweep macOS Glassmorphism Desktop UI" />
</p>

CleanSweep brings together the raw developer cleanup speed of **[`tw93/mole`](https://github.com/tw93/mole)** and the zero-telemetry, trash-safe macOS aesthetic of **[`momenbasel/PureMac`](https://github.com/momenbasel/PureMac)** into a cohesive, commercial-grade open source suite.

---

## ⚡ Quick Install

### One-Line Terminal Installer
Install the global `sweep` companion CLI into `/usr/local/bin` with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/thecodekaizen/clean-my-mac/main/install.sh | bash
```

Once installed, simply type:
```bash
sweep
```

### Download the macOS Desktop App
- Grab the latest prebuilt `.zip` from **[GitHub Releases](https://github.com/thecodekaizen/clean-my-mac/releases)**.
- Unpack and move `CleanSweep.app` into your `/Applications` directory.

---

## 💡 Why CleanSweep?

Traditional Mac cleaning utilities often charge hefty annual recurring subscriptions, nag users with intrusive upsells, run persistent background tracking daemons, or blindly execute destructive `rm -rf` commands.

CleanSweep was engineered with four unbreakable rules:
1. **0% Telemetry & 100% Offline**: No analytics packets, tracking pixels, or phone-home pings. Ever.
2. **Trash-First Safety**: Cleaned items are safely moved to the native macOS Trash via `shell.trashItem`—you can always restore files with one click.
3. **Developer-First Intelligence**: Deep specialized support for modern software engineering stacks (Xcode DerivedData, npm/pnpm/Bun caches, Python uv, Rust Cargo, Docker virtual disks, and local LLM caches from Ollama & HuggingFace).
4. **Dual Interface**: Seamlessly switch between a modern **macOS dark/light glassmorphism desktop GUI** and a lightweight, lightning-fast **terminal companion CLI** (`sweep`).

---

## ✨ Core Features

### 1. 🧹 Deep Smart Clean
Inspects and reclaims gigabytes of disk space across 25+ target caches:
- **System Junk & Diagnostics**: User application caches (`~/Library/Caches`), diagnostic reports, spindumps, and QuickLook thumbnail databases.
- **Web Browsers**: Cache, media, and script storage for Google Chrome, Arc, Safari, Brave, Microsoft Edge, and Firefox (preserves logins, cookies, and history).
- **Developer Ecosystem**:
  - **Xcode**: `DerivedData`, iOS DeviceSupport symbols, simulator runtimes, and archives.
  - **Package Managers**: npm `_cacache`, Yarn cache, pnpm store, Bun cache, CocoaPods, and Homebrew bottles.
  - **Languages & Runtimes**: Pip cache, Poetry cache, uv cache, Rust Cargo registry/git cache, Go build cache, and Gradle daemons.
  - **IDEs**: VS Code extension/GPU caches and JetBrains project indexing caches.
- **AI & Local Model Caches**: Model weights and blobs downloaded by **Ollama** (`~/.ollama/models`), **LM Studio** (`~/.cache/lm-studio`), and **Hugging Face Hub** (`~/.cache/huggingface`).
- **Containers & Virtual Disks**: Docker Desktop virtual disks (`Docker.raw`), overlay layers, and Podman machine storage.
- **Backups & Trash**: User Trash bin, iOS/iPadOS device backups (`MobileSync`), and Apple Mail downloads.

### 2. 📦 Smart App Uninstaller & Residual Orphan Finder
- **Deep Application Scraper**: Scans `/Applications` and `~/Applications` with native icons, bundle identifiers, versions, and true disk footprint.
- **Scattered Residue Discovery**: Automatically finds associated leftovers across 10 system locations:
  - `~/Library/Application Support/<app>`
  - `~/Library/Caches/<bundle-id>`
  - `~/Library/Preferences/<bundle-id>.plist`
  - `~/Library/Saved Application State/<bundle-id>.savedState`
  - `~/Library/Containers/<bundle-id>` & `~/Library/Group Containers`
  - `~/Library/Logs`, `~/Library/WebKit`, and `~/Library/HTTPStorages`
- **Orphan Finder**: Automatically scours your system for leftover preference files and cache folders left behind by apps you deleted months ago.
- **Trash-Safe Deletion**: Safely trashes app bundles and associated leftovers with instant undo capability.

### 3. 🏗️ Developer Project Artifacts Purger (`sweep purge`)
- Recursively scans code repositories (`~/Code`, `~/Projects`, `~/Developer`) for stale, rebuildable build directories:
  - `node_modules` (JavaScript / TypeScript)
  - `.next`, `.nuxt`, `.svelte-kit` (Frontend builds)
  - `target` (Rust Cargo)
  - `.venv`, `venv`, `__pycache__` (Python)
  - `.turbo`, `.parcel-cache`, `dist`, `build`
  - `.gradle`, `.dart_tool` (Mobile & Java)
- One-click purge of project build folders without touching your source code or git history.

### 4. ♊ Cryptographic Duplicate Finder (SHA-256)
- **High-speed 2-pass duplicate scanning**:
  - **Pass 1**: Rapid size-based grouping and 64KB initial chunk verification.
  - **Pass 2**: Collision-proof cryptographic **SHA-256** checksum calculation.
- Automatically preserves the oldest original file and selects all redundant copies for safe trash removal.

### 5. ✂️ App Localization Slimmer (`sweep slim`)
- Scans installed macOS application bundles for foreign language `.lproj` folders (often 50+ languages shipped per app like Slack, Chrome, Zoom).
- Strips unneeded languages while preserving your active system language, saving hundreds of megabytes on your primary drive.

### 6. 💿 Downloaded Installer Cleaner (`sweep installer`)
- Scans Downloads and Desktop for forgotten `.dmg`, `.pkg`, and `.iso` installation images.
- Batch moves installer packages to Trash once applications are already installed.

### 7. 📂 Large & Old Files Explorer (`sweep large`)
- Instantly surfaces multi-gigabyte files sitting idle across Downloads, Documents, Desktop, Movies, and Music.
- **Size Filters**: `>50 MB`, `>100 MB`, `>500 MB`, `>1 GB`.
- **Age Filters**: `All`, `>30 Days`, `>90 Days`, `>180 Days`, `>1 Year`.
- **Categorization**: Archives & Disk Images, Videos, Audio, Documents, and App Packages.
- One-click **Reveal in Finder** and batch Move to Trash.

### 8. ⚡ macOS System Maintenance & Performance Optimizer
One-click maintenance routines to speed up and stabilize macOS:
- **Flush DNS Cache**: Flushes system DNS cache and signals `mDNSResponder` to resolve web glitches and broken connections.
- **Purge Inactive RAM**: Reclaims physical memory held by inactive disk cache and returns it to the free system pool.
- **Rebuild LaunchServices**: Fixes duplicate "Open With" contextual menus and broken file icons.
- **Reset QuickLook Server**: Clears corrupted preview thumbnail caches and restarts the QuickLook daemon.
- **Trim APFS Local Snapshots**: Identifies and trims stale local Time Machine backup snapshots consuming hidden SSD space.
- **Check Spotlight Health**: Inspects indexing status across the primary APFS drive.
- **Touch ID for Sudo**: Verifies biometric Touch ID authentication configuration in `/etc/pam.d/sudo_local`.

### 9. ⏰ Automated Background Schedule (Native macOS LaunchAgent)
- Set automated background maintenance on your preferred schedule: **Daily** or **Weekly**.
- Configures a native macOS `LaunchAgent` daemon (`~/Library/LaunchAgents/com.thecodekaizen.cleansweep.autoclean.plist`) that runs silent optimizations.
- Manage via GUI or terminal: `sweep schedule daily`, `sweep schedule weekly`, or `sweep schedule off`.

---

## 🖥️ Menu Bar Tray Companion

<p align="center">
  <img src="assets/screenshots/tray-preview.svg" width="600" alt="CleanSweep macOS Menu Bar Tray Companion" />
</p>

CleanSweep lives right in your macOS status bar:
- Displays **live available memory** (e.g. ` 14.2 GB`) in real-time.
- Click to open the quick-access menu:
  - Real-time RAM utilization bar (`9.8 GB used / 24 GB (41%)`).
  - **⚡ Quick Clean (Flush RAM & DNS)**: Instant memory reclaim without opening the main window.
  - **Open CleanSweep**: Shows and focuses the main application.
  - **Launch at Login**: Toggles automatic startup.
- Keeps CleanSweep resident in the menu bar when closing the main window (PureMac behavior).

---

## 💻 CLI Companion (`sweep`)

<p align="center">
  <img src="assets/screenshots/cli-preview.svg" width="100%" alt="CleanSweep CLI Terminal Companion Preview" />
</p>

CleanSweep features a full-featured terminal companion (`sweep`) designed for power users, SSH sessions, and automation scripts:

```bash
# Launch the interactive terminal menu (default)
sweep

# Real-time system telemetry (CPU, RAM, Disk, Battery)
sweep status

# Deep smart clean (with dry-run simulation)
sweep clean --dry-run
sweep clean --all

# Purge rebuildable project build artifacts (node_modules, target, .venv)
sweep purge
sweep purge ~/Code/MyProject --dry-run

# Cryptographic duplicate finder
sweep duplicates ~/Documents
sweep duplicates --clean

# Application uninstaller & residue finder
sweep apps
sweep uninstall Slack

# Strip foreign language packs from installed apps
sweep slim --dry-run

# Clean leftover installer packages (.dmg / .pkg)
sweep installer

# Run macOS system maintenance routines (DNS flush, RAM purge, etc.)
sweep optimize

# Configure automatic background cleaning schedule
sweep schedule daily
sweep schedule weekly
sweep schedule off

# View lifetime reclaimed space audit history
sweep history

# Check and pull the latest CleanSweep updates
sweep update
```

### CLI Command Reference

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `sweep` | — | Launches the interactive terminal menu |
| `sweep status` | `[--json]` | Shows real-time CPU, RAM breakdown, disk space, and battery metrics |
| `sweep clean` | `[--dry-run] [--all] [--json]` | Deep scans and cleans system, browser, container, and developer caches |
| `sweep purge` | `[dir] [--dry-run]` | Recursively finds and purges `node_modules`, `target`, `.venv`, `.next` |
| `sweep duplicates` | `[dir] [--clean]` | Detects duplicate files using SHA-256 cryptographic verification |
| `sweep apps` | `[--json]` | Lists all installed macOS applications and associated storage |
| `sweep uninstall` | `<app-name>` | Uninstalls an application and all residual leftover files |
| `sweep slim` | `[app] [--dry-run]` | Strips unneeded foreign language `.lproj` packs from installed apps |
| `sweep installer` | `[--clean]` | Finds and trashes downloaded `.dmg`, `.pkg`, and `.iso` installers |
| `sweep analyze` | `[dir] [--min-size]` | Analyzes directory space breakdown and surfaces large & old files |
| `sweep optimize` | — | Runs macOS maintenance routines (DNS flush, RAM purge, LaunchServices) |
| `sweep schedule` | `[daily\|weekly\|off]` | Manages the native macOS `LaunchAgent` background clean daemon |
| `sweep history` | `[--clear]` | Displays lifetime reclaimed storage stats and operation audit trail |
| `sweep update` | — | Checks remote releases and updates CleanSweep in place |

---

## 📊 Feature Comparison

| Feature | CleanSweep (This Project) | tw93/mole | momenbasel/PureMac | CleanMyMac (Paid) |
| :--- | :---: | :---: | :---: | :---: |
| **License** | **Free & MIT Open Source** | Free CLI / Paid GUI | Free & MIT Open Source | Proprietary ($39.95/yr) |
| **Telemetry & Tracking** | **0% (Zero Telemetry)** | 0% | 0% | Analytics & Telemetry |
| **Native macOS GUI** | ✅ (Glassmorphism Dark/Light) | ❌ (CLI only / Paid app) | ✅ (SwiftUI) | ✅ |
| **Terminal CLI Tool** | ✅ (`sweep`) | ✅ (`mo`) | ✅ (`puremac`) | ❌ |
| **Menu Bar Tray Helper** | ✅ (Live RAM + Quick Clean) | ❌ | ✅ | ✅ |
| **Trash-Safe Deletion** | ✅ (`shell.trashItem`) | ✅ (Protected paths) | ✅ (`trashItem`) | Optional |
| **Dry Run Mode** | ✅ (GUI + `--dry-run`) | ✅ (`--dry-run`) | ✅ (`--dry-run`) | ❌ |
| **App Uninstaller & Residue Finder** | ✅ (Deep 10-path scan) | ✅ (`mo uninstall`) | ✅ (Drag-and-drop) | ✅ |
| **Orphaned Leftovers Hunter** | ✅ | ❌ | ✅ | ✅ |
| **Project Build Purge (`node_modules`)** | ✅ (`sweep purge` + GUI) | ✅ (`mo purge`) | ❌ | ❌ |
| **Duplicate File Finder (SHA-256)** | ✅ (`sweep duplicates` + GUI) | ❌ | ✅ | ✅ |
| **App Localization Slimmer (`.lproj`)**| ✅ (`sweep slim` + GUI) | ✅ (`mo slim`) | ❌ | ✅ |
| **Installer Cleaner (`.dmg` / `.pkg`)**| ✅ (`sweep installer` + GUI) | ✅ (`mo installer`) | ❌ | ✅ |
| **Developer Caches (Xcode, Homebrew)** | ✅ (Comprehensive) | ✅ (Comprehensive) | ✅ (Basic) | ❌ (Minimal) |
| **AI Model Caches (Ollama, HF, LM)** | ✅ | ❌ | ✅ | ❌ |
| **Container Disks (Docker, Podman)** | ✅ | ✅ | ❌ | ❌ |
| **System Maintenance (DNS, RAM)** | ✅ | ✅ | ❌ | ✅ |
| **Background LaunchAgent Schedule** | ✅ (Daily / Weekly daemon) | ❌ | ✅ | ✅ |
| **Directory Exclusion Whitelist** | ✅ | ❌ | ✅ | ✅ |
| **Audit Log of Lifetime Cleaned Space**| ✅ (`~/.config/cleansweep`) | ✅ (`mo history`) | ❌ | ❌ |

---

## 🛡️ Privacy & Safety

- **Zero Analytics**: CleanSweep does not bundle any analytics SDKs, crash reporters, or tracking beacons. All operations occur strictly locally on your machine.
- **Trash-First Philosophy**: Unlike command-line scripts that execute irreversible `rm -rf`, CleanSweep defaults to routing deletions through macOS Finder Trash. If you ever need an item back, open your Trash and click "Put Back".
- **SIP & Permission Guardrails**: CleanSweep respects macOS System Integrity Protection (SIP) and sandboxing boundaries. Sensitive system files and directories are protected by default.
- **Granting Full Disk Access (Recommended)**: To allow CleanSweep to clean protected user caches, app containers, and the user Trash bin:
  1. Open **System Settings > Privacy & Security > Full Disk Access**.
  2. Toggle **CleanSweep** on (or add `CleanSweep.app`).

---

## 🛠️ Development & Building from Source

### Prerequisites
- macOS 12 Monterey, macOS 13 Ventura, macOS 14 Sonoma, or macOS 15 Sequoia (Apple Silicon & Intel).
- Node.js 18+ and npm.

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/thecodekaizen/clean-my-mac.git cleansweep
cd cleansweep

# 2. Install dependencies
npm install

# 3. Run the automated test suite
npm test

# 4. Run the code audit
npm run lint

# 5. Start development mode with hot reload
npm run dev
```

### Packaging Standalone macOS Application
To compile and package the standalone `.app` and `.zip` distribution bundles:
```bash
npm run build
```
Output files will be generated in:
- `dist-electron/release/mac-arm64/CleanSweep.app`
- `dist-electron/release/CleanSweep-1.0.0-arm64-mac.zip`

---

## 🤝 Contributing

Contributions, feature suggestions, and pull requests are warmly welcomed!
1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

CleanSweep is distributed under the **MIT License**. See [LICENSE](file:///Users/thecodekaizen/Code/Projects/clean-my-mac/LICENSE) for details.

---

<p align="center">
  Built with ❤️ for the macOS developer community by <a href="https://github.com/thecodekaizen">Vishnu (@thecodekaizen)</a>
</p>
