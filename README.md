<div align="center">

# 🧹 CleanSweep for Mac

**The fast, open-source, zero-telemetry macOS optimizer, app uninstaller, and developer cleaning suite.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%2012%2B%20(Intel%20%26%20Apple%20Silicon)-black.svg)](https://apple.com/macos)
[![Telemetry](https://img.shields.io/badge/Telemetry-0%25%20(Strictly%20Local)-brightgreen.svg)](#privacy--security)
[![CLI Companion](https://img.shields.io/badge/CLI-sweep-orange.svg)](#cli-companion-sweep)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

*An independent, open-source alternative uniting the deep developer power of [tw93/mole](https://github.com/tw93/mole) and the native privacy-first UX of [momenbasel/PureMac](https://github.com/momenbasel/PureMac).*

[Key Features](#-features) • [CLI Companion](#-cli-companion-sweep) • [Comparison](#-feature-comparison) • [Installation](#-installation) • [Privacy & Safety](#-privacy--safety) • [Contributing](#-contributing)

</div>

---

## 💡 Why CleanSweep?

Commercial Mac cleaners often rely on aggressive recurring subscriptions, closed-source background daemons, and tracking analytics. Meanwhile, open-source utilities are either command-line only or lack comprehensive developer cache support.

**CleanSweep** bridges both worlds:
1. **Zero Telemetry**: No tracking, no network calls, no analytics, 100% local operation.
2. **Safe by Default**: Automatically routes cleanup through the native macOS Trash (`shell.trashItem`) so files can be effortlessly restored.
3. **Deep Developer & AI Cache Support**: Reclaims gigabytes from Xcode `DerivedData`, Docker virtual disks, Homebrew bottles, package stores (npm, pnpm, yarn, bun, pip, uv, cargo, gradle), and local AI model caches (Ollama, LM Studio, Hugging Face).
4. **Desktop GUI + Terminal CLI**: Beautiful Apple Human Interface Guidelines desktop application paired with an ultra-fast terminal CLI companion (`sweep`).

---

## ✨ Features

### 1. 🧹 Smart System & Developer Clean
Analyzes 25+ high-impact directories across your Mac:
- **System Junk & Logs**: User & system caches (`~/Library/Caches`), diagnostic reports, spindumps, and QuickLook thumbnail servers.
- **Browsers**: Cache, media, and script storage for Google Chrome, Safari, Arc, Brave, Microsoft Edge, and Firefox.
- **Developer Artifacts**:
  - **Xcode**: `DerivedData`, iOS DeviceSupport symbols, simulator runtimes, and archives.
  - **Package Managers**: npm `_cacache`, Yarn cache, pnpm store, Bun cache, CocoaPods, and Homebrew bottles.
  - **Languages & Runtimes**: Pip cache, Poetry cache, uv cache, Rust Cargo registry/git cache, Go build cache, and Gradle build daemon caches.
  - **IDEs**: VS Code extension/GPU caches and JetBrains project indexing caches.
- **AI & Local Model Caches**: Model weights and blobs downloaded by **Ollama** (`~/.ollama/models`), **LM Studio** (`~/.cache/lm-studio`), and **Hugging Face Hub** (`~/.cache/huggingface`).
- **Containers & Virtual Disks**: Docker Desktop virtual disks (`Docker.raw`), overlay layers, and Podman machine storage.
- **Trash & Backups**: User Trash bin, iOS/iPadOS device backups (`MobileSync`), and Apple Mail attachment downloads.

### 2. 📦 Smart App Uninstaller & Orphan Finder
- **Deep Application Scraper**: Scans `/Applications` and `~/Applications` with real native macOS icons, bundle identifiers, and versions.
- **Residual Leftover Discovery**: Tracks down files scattered across 10 system locations:
  - `~/Library/Application Support`
  - `~/Library/Caches`
  - `~/Library/Preferences` (`.plist`)
  - `~/Library/Saved Application State`
  - `~/Library/Containers` & `~/Library/Group Containers`
  - `~/Library/Logs`, `~/Library/WebKit`, and `~/Library/HTTPStorages`
- **Orphan Finder**: Automatically scans your Library for orphaned preference files, cache directories, and application support folders left behind by apps you uninstalled months ago.
- **Trash-Safe Deletion**: Safely trashes app bundles and associated files with instant restore capability.

### 3. 🏗️ Developer Project Artifacts Purger (Mole `mo purge`)
- Automatically detects heavy rebuildable project artifacts sitting across your code repositories:
  - `node_modules` (JavaScript / TypeScript)
  - `.next`, `.nuxt`, `.svelte-kit` (Frontend builds)
  - `target` (Rust Cargo)
  - `.venv`, `venv`, `__pycache__` (Python)
  - `.turbo`, `.parcel-cache`, `dist`, `build`
  - `.gradle`, `.dart_tool` (Mobile & Java)
- One-click purge of project build folders without touching source code.

### 4. ♊ Cryptographic Duplicate Finder (PureMac Duplicate Finder)
- **High-speed 2-pass duplicate scanning**:
  - **Pass 1**: Rapid grouping by exact file sizes.
  - **Pass 2**: Cryptographic **SHA-256** checksum verification across candidate files.
- Automatically keeps the oldest original file and selects all redundant duplicate copies for safe trashing.

### 5. 📂 Large & Old Files Explorer
- Instantly surfaces multi-gigabyte files sitting idle in Downloads, Documents, Desktop, Movies, and Music.
- **Size Filters**: `>50 MB`, `>100 MB`, `>500 MB`, `>1 GB`.
- **Age Filters**: `All`, `>30 Days`, `>90 Days`, `>180 Days`, `>1 Year`.
- **Categorization**: Grouped into Archives & Disk Images (`.dmg`, `.iso`, `.zip`, `.pkg`), Videos, Audio, Documents, and App Packages.
- One-click **Reveal in Finder** and batch Move to Trash.

### 4. ⚡ macOS System Maintenance & Optimizer
One-click maintenance routines to speed up and stabilize macOS:
- **Flush DNS Cache**: Flushes system DNS cache and reloads `mDNSResponder` to resolve web glitches and broken connections.
- **Purge Inactive RAM**: Reclaims physical memory held by inactive disk cache and returns it to the free system pool.
- **Rebuild LaunchServices**: Fixes duplicate "Open With" contextual menus and broken file associations.
- **Reset QuickLook Server**: Clears corrupted preview thumbnail caches and restarts the QuickLook daemon.
- **Trim APFS Local Snapshots**: Identifies and trims stale local Time Machine backup snapshots consuming hidden SSD space.
- **Check Spotlight Health**: Inspects indexing status across the primary APFS drive.

### 5. 🚀 Startup & Background Launch Items
- Inspects `~/Library/LaunchAgents`, `/Library/LaunchAgents`, and `/Library/LaunchDaemons`.
- Identifies background executables and services running automatically at boot.
- Disable or move unwanted user-level startup items to Trash to speed up Mac boot times.

### 6. 📊 Real-Time Activity Monitor
- Live CPU utilization gauge (% load, physical and efficiency core count, Apple Silicon / Intel architecture).
- Memory breakdown: Active, Wired, Inactive, Compressed, and Free RAM.
- APFS disk capacity, allocated space, and available storage.
- Battery health, percentage, power source (AC vs Battery), and charging state.

---

## 💻 CLI Companion (`sweep`)

CleanSweep includes a companion command-line interface named `sweep` (inspired by `tw93/mole`'s `mo` and `momenbasel/PureMac`'s `puremac`):

```bash
# Launch the interactive terminal menu (default when no parameters passed)
sweep

# Display live system hardware, CPU, memory, and disk status
sweep status

# Output system metrics as JSON (ideal for scripts & AI agents)
sweep status --json

# Preview system and developer cleanup without deleting files
sweep clean --dry-run

# Execute cleanup (moves files to Trash safely)
sweep clean

# Purge heavy rebuildable project build folders (node_modules, target, .venv)
sweep purge ~/Code
sweep purge --dry-run

# Scan and identify duplicate files via SHA-256 fingerprinting
sweep duplicates ~/Downloads
sweep duplicates ~/Downloads --clean

# List installed applications and their total disk footprints
sweep apps

# Completely uninstall an app and remove all leftover files
sweep uninstall "Slack"

# Find large and old files taking up space
sweep analyze

# Run macOS system maintenance routines (DNS flush, purge RAM, etc.)
sweep optimize
```

To enable the `sweep` CLI command globally:
```bash
npm link
# or
chmod +x ./bin/sweep.mjs
sudo ln -sf "$(pwd)/bin/sweep.mjs" /usr/local/bin/sweep
```

---

## 📊 Feature Comparison

| Feature | CleanSweep (This Project) | tw93/mole | momenbasel/PureMac | CleanMyMac (Paid) |
| :--- | :---: | :---: | :---: | :---: |
| **License** | **Free & MIT Open Source** | Free CLI / Paid GUI | Free & MIT Open Source | Proprietary ($39.95/yr) |
| **Telemetry & Tracking** | **0% (Zero Telemetry)** | 0% | 0% | Analytics & Telemetry |
| **Native macOS UI** | ✅ (Apple HIG Dark/Light) | ❌ (CLI only / Paid app) | ✅ (SwiftUI) | ✅ |
| **Terminal CLI Tool** | ✅ (`sweep`) | ✅ (`mo`) | ✅ (`puremac`) | ❌ |
| **Trash-Safe Deletion** | ✅ (`shell.trashItem`) | ✅ (Protected paths) | ✅ (`trashItem`) | Optional |
| **Dry Run Mode** | ✅ (GUI + `--dry-run`) | ✅ (`--dry-run`) | ✅ (`--dry-run`) | ❌ |
| **App Uninstaller** | ✅ (Deep leftover scan) | ✅ (`mo uninstall`) | ✅ (Drag-and-drop) | ✅ |
| **Orphaned Leftovers Finder** | ✅ | ❌ | ✅ | ✅ |
| **Project Build Purge (`node_modules`, `target`, etc.)** | ✅ (`sweep purge` + GUI) | ✅ (`mo purge`) | ❌ | ❌ |
| **Duplicate File Finder (SHA-256)** | ✅ (`sweep duplicates` + GUI) | ❌ | ✅ | ✅ |
| **Developer Caches (Xcode, Homebrew, npm, etc.)** | ✅ (Comprehensive) | ✅ (Comprehensive) | ✅ (Basic) | ❌ (Minimal) |
| **Modern AI Caches (Ollama, LM Studio, HuggingFace)** | ✅ | ❌ | ✅ | ❌ |
| **Container & Virtual Disks (Docker, Podman)** | ✅ | ✅ | ❌ | ❌ |
| **System Maintenance (DNS, RAM, LaunchServices)** | ✅ | ✅ | ❌ | ✅ |
| **Startup Items Manager** | ✅ | ❌ | ✅ | ✅ |
| **Live Hardware Monitor** | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Installation & Getting Started

### Prerequisites
- macOS 12 Monterey, macOS 13 Ventura, macOS 14 Sonoma, or macOS 15 Sequoia (Apple Silicon & Intel supported).
- Node.js 18+ (for local development and building from source).

### Running Locally (Development Mode)
```bash
# 1. Clone the repository
git clone https://github.com/thecodekaizen/clean-my-mac.git cleansweep
cd cleansweep

# 2. Install dependencies
npm install

# 3. Start development server with live reload
npm run dev
```

### Building the Production macOS App
To compile and package the standalone macOS application:
```bash
npm run build
```
The packaged application and distribution archives will be generated in:
- `dist-electron/release/mac-arm64/CleanSweep.app`
- `dist-electron/release/CleanSweep-1.0.0-arm64-mac.zip`

---

## 🛡️ Privacy & Safety

- **Zero Analytics**: CleanSweep does not contain any tracking pixels, telemetry probes, or analytics SDKs. No telemetry packets leave your machine.
- **Trash-First Philosophy**: Unlike scripts that run permanent `rm -rf`, CleanSweep routes cleanups through the native macOS Trash. If you ever need a file back, open your Trash and click "Put Back".
- **SIP & Permission Guardrails**: CleanSweep respects macOS System Integrity Protection (SIP) and sandboxing boundaries. Sensitive system files are strictly protected. To clean protected caches and the user Trash bin, grant **Full Disk Access** in:
  `System Settings > Privacy & Security > Full Disk Access > CleanSweep`.

---

## 🤝 Contributing

Contributions, bug reports, and pull requests are warmly welcomed!
1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure code quality passes linter:
   ```bash
   npm run lint
   ```
4. Commit your changes (`git commit -m 'feat: add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free and open source for everyone.

*Disclaimer: CleanSweep is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Apple Inc. or MacPaw Inc.*
