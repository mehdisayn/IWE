# Installing IWE (Integrated Writing Environment)

Installing IWE on Linux is designed to be as simple as possible. We provide a convenient installation script that automatically sets up dependencies, builds the application, and creates a desktop entry.

## Quick Install (One-Liner)

To install IWE on your Linux machine, simply copy and paste the following command into your terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/mehdisayn/IWE/main/install.sh | bash
```

### What does this script do?

The installation script performs the following steps automatically:

1. **System Dependencies:** Checks and installs required Tauri build dependencies using `apt-get` (Debian/Ubuntu-based distributions). It may prompt you for your `sudo` password.
2. **Rust & Node.js:** Verifies if Rust and Node.js are installed. If not, it safely installs them via their official scripts (`rustup` and `nvm`).
3. **Cloning:** Clones the latest version of the IWE repository into `~/.local/share/IWE`.
4. **Building:** Installs Node dependencies and compiles the Tauri application from source. *(Note: This step may take a few minutes depending on your hardware).*
5. **Installation:** Copies the compiled binary `iwe` to `~/.local/bin/iwe`.
6. **Desktop Integration:** Sets up a `.desktop` application shortcut so you can easily launch IWE from your application menu or launcher.

### Post-Installation

Once the script finishes, you can run the app directly from your terminal by typing:

```bash
iwe
```

> **Note:** If `iwe` is not recognized, ensure that `~/.local/bin` is added to your system's `PATH`.

Alternatively, search for **IWE** in your desktop environment's application menu and launch it from there!

## Updating IWE

To update to the latest version, you can simply run the one-liner installation command again. The script will detect your existing installation, pull the latest changes, and rebuild the application.

## Manual Installation

If you prefer to install IWE manually instead of using the script:

1. Install Tauri prerequisites for your OS: [Tauri Linux Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites#linux)
2. Clone the repository: `git clone https://github.com/mehdisayn/IWE.git`
3. Navigate to the folder: `cd IWE`
4. Install dependencies: `npm install`
5. Build the app: `npm run tauri:build`
6. The executable will be located at `src-tauri/target/release/iwe`.
