# Contributing to IWE

First off, thank you for considering contributing to IWE! It's people like you that make IWE such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check if there's already an issue open. If not, feel free to open one!

## Setting up your environment

1. **Prerequisites:**
   - Node.js (v18+)
   - Rust (`rustup` recommended)
   - Tauri prerequisites for Linux (e.g. `libwebkit2gtk-4.1-dev`, `build-essential`)

2. **Clone and Install:**
   ```bash
   git clone https://github.com/mehdisayn/IWE.git
   cd IWE
   npm install
   ```

3. **Run in Development:**
   ```bash
   npm run tauri:dev
   ```

## Architecture

- **Frontend:** React + Vite + TypeScript. Located in `src/`.
- **Backend:** Rust + Tauri. Located in `src-tauri/`.
- **Terminal:** `xterm.js` frontend with `portable-pty` Rust backend.

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
