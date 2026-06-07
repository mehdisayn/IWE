#!/bin/bash
set -e

echo "========================================"
echo "  Installing IWE (Integrated Writing Environment)"
echo "========================================"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# 1. Install system dependencies (Debian/Ubuntu specific for now)
if command_exists apt-get; then
    echo "Installing system dependencies (requires sudo)..."
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
else
    echo "Warning: apt-get not found. Not a Debian/Ubuntu system."
    echo "Please ensure you have Tauri system dependencies installed for your distribution."
fi

# 2. Install Rust if not installed
if ! command_exists cargo; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "Rust is already installed."
fi

# Ensure Rust environment is loaded
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# 3. Install Node.js & npm if not installed
if ! command_exists node || ! command_exists npm; then
    echo "Installing Node.js via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
else
    echo "Node.js is already installed."
fi

# 4. Clone or update repository
INSTALL_DIR="$HOME/.local/share/IWE"
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing IWE installation in $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "Cloning IWE repository..."
    git clone https://github.com/mehdisayn/IWE.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 5. Build the application
echo "Installing Node dependencies..."
npm install

echo "Building IWE..."
npm run tauri:build

# 6. Install the binary
echo "Installing binary..."
mkdir -p "$HOME/.local/bin"
cp "$INSTALL_DIR/src-tauri/target/release/iwe" "$HOME/.local/bin/iwe"

# 7. Create a desktop entry
echo "Creating desktop entry..."
mkdir -p "$HOME/.local/share/applications"
mkdir -p "$HOME/.local/share/icons/hicolor/512x512/apps"
if [ -f "$INSTALL_DIR/src-tauri/icons/512x512.png" ]; then
    cp "$INSTALL_DIR/src-tauri/icons/512x512.png" "$HOME/.local/share/icons/hicolor/512x512/apps/iwe.png"
fi

cat > "$HOME/.local/share/applications/iwe.desktop" << EOF
[Desktop Entry]
Name=IWE
Comment=Integrated Writing Environment
Exec=$HOME/.local/bin/iwe
Icon=iwe
Terminal=false
Type=Application
Categories=Office;TextEditor;
EOF

echo "========================================"
echo "Installation complete! 🎉"
echo "You can now run 'iwe' from your terminal, or find it in your application menu."
echo "Note: Make sure $HOME/.local/bin is in your PATH."
echo "========================================"
