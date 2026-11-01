#!/usr/bin/env bash

# CleanSweep Installer
# One-line installer for CleanSweep CLI (sweep) on macOS

set -e

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"

echo -e "\n${BOLD}${CYAN}🧹 CleanSweep${RESET} ${BOLD}macOS Optimizer & CLI Companion Installer${RESET}\n"

# 1. Verify macOS environment
OS="$(uname -s)"
if [ "$OS" != "Darwin" ]; then
    echo -e "${RED}Error: CleanSweep is built specifically for macOS (Darwin).${RESET}"
    exit 1
fi

# 2. Check Node.js prerequisite
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}Error: Node.js is required but was not found on your PATH.${RESET}"
    echo -e "Please install Node.js 18 or higher using Homebrew: ${YELLOW}brew install node${RESET}"
    echo -e "Or download directly from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | tr -d 'v' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required (found Node $(node -v)).${RESET}"
    echo -e "Please update your Node.js runtime."
    exit 1
fi

INSTALL_DIR="${HOME}/.cleansweep"
REPO_URL="https://github.com/thecodekaizen/clean-my-mac.git"

# 3. Clone or update repository
if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "${BLUE}Updating existing CleanSweep installation in ${INSTALL_DIR}...${RESET}"
    cd "$INSTALL_DIR"
    git fetch origin main --quiet
    git reset --hard origin/main --quiet
else
    echo -e "${BLUE}Downloading CleanSweep to ${INSTALL_DIR}...${RESET}"
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" --quiet
    cd "$INSTALL_DIR"
fi

# 4. Install production dependencies
echo -e "${BLUE}Configuring dependencies...${RESET}"
if command -v npm >/dev/null 2>&1; then
    npm install --omit=dev --quiet --no-fund --no-audit
fi

# 5. Make CLI companion executable
chmod +x "${INSTALL_DIR}/bin/sweep.mjs"

# 6. Determine target binary directory
TARGET_BIN="/usr/local/bin"
USE_SUDO=0

if [ ! -d "$TARGET_BIN" ] || [ ! -w "$TARGET_BIN" ]; then
    # Fallback to ~/.local/bin if /usr/local/bin is not writable without sudo
    TARGET_BIN="${HOME}/.local/bin"
    mkdir -p "$TARGET_BIN"
    
    # Check if ~/.local/bin is in PATH
    if [[ ":$PATH:" != *":$TARGET_BIN:"* ]]; then
        echo -e "${YELLOW}Notice: ${TARGET_BIN} is not in your PATH.${RESET}"
        echo -e "Add this to your ~/.zshrc or ~/.bash_profile: ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
    fi
fi

SWEEP_BIN="${TARGET_BIN}/sweep"
rm -f "$SWEEP_BIN"
ln -sf "${INSTALL_DIR}/bin/sweep.mjs" "$SWEEP_BIN"

echo -e "\n${GREEN}✓ CleanSweep CLI successfully installed to ${BOLD}${SWEEP_BIN}${RESET}\n"
echo -e "Get started with:"
echo -e "  ${BOLD}sweep${RESET}             Launch the interactive terminal menu"
echo -e "  ${BOLD}sweep clean${RESET}       Deep scan and clean system/dev caches"
echo -e "  ${BOLD}sweep status${RESET}      View real-time CPU, RAM, disk, and battery metrics"
echo -e "  ${BOLD}sweep help${RESET}        List all available commands and flags\n"
