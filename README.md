# IWE — Integrated Writing Environment

![IWE Editor](https://via.placeholder.com/800x450.png?text=IWE+Editor+Interface)

A markdown workspace with a built-in interactive terminal and Git interface, specifically designed for people who write. Whether you are a developer practicing "Docs as Code", an author managing a large manuscript, or a technical writer leveraging AI tools directly in your workspace, IWE brings the tools you need into one cohesive, distraction-free environment.

## 🚀 Why it was built

Writers and developers often have to juggle multiple tools to get their work done:
1. A markdown editor to write the content.
2. A terminal to execute build scripts, test code, or run AI CLI tools.
3. A Git client for version control and syncing.

IWE solves this fragmentation by integrating these three pillars into a single, lightweight desktop application. It provides a seamless workspace where you don't have to leave the editor to commit your changes or run your scripts. 

## 🎯 What it does (Use Cases)

- **Technical Writing:** Write documentation for software projects, run code examples or compilers natively in the built-in terminal, and commit changes straight to GitHub.
- **Novel & Book Writing:** Manage large manuscripts with chapters split across multiple markdown files. Use Git to track character arcs, plot changes, and maintain a robust version history.
- **AI-Assisted Writing:** Spin up an interactive AI CLI directly in the built-in PTY terminal to chat, generate content, or edit drafts without losing your flow.

## ✨ Features

- **📝 Markdown Editor:** Split-pane live preview, syntax highlighting, and completely accurate native workspace word counts.
- **💻 Built-in Interactive Terminal:** Fully interactive PTY terminal powered by Rust and `xterm.js`. Seamlessly supports `vim`, `nano`, interactive REPLs (like `python`), and AI CLIs.
- **🐙 Git Integration:** Visual source control panel, auto-commit on save, and seamless GitHub syncing (with automatic upstream branch handling).
- **📁 Secure File Management:** Safely create, rename, and manage heavily nested files and folders without risking data loss.
- **🎨 Beautiful Themes:** Comes with three carefully curated themes: Soft Slate (VS Code-style), True Terminal (Monospace Green-on-Black), and Warm Ink (Reading-oriented).
- **⚡ Fast & Lightweight:** Built on top of Rust (Tauri) and React.

## 📦 Installation

To quickly install IWE on your Linux system, run the automated installation script:

```bash
curl -sSL https://raw.githubusercontent.com/mehdisayn/IWE/main/install.sh | bash
```

Alternatively, you can build from source:

1. Ensure you have Node.js (v18+) and Rust (`rustup`) installed.
2. Install Tauri prerequisites for your OS (e.g., `libwebkit2gtk-4.1-dev`, `build-essential` on Ubuntu).
3. Clone and build:
```bash
git clone https://github.com/mehdisayn/IWE.git
cd IWE
npm install
npm run tauri:build
```

## 🗑️ Uninstallation

If you installed IWE using the `install.sh` script, you can easily remove it from your system with these commands:

```bash
# Remove the application bundle
rm -rf ~/.local/share/iwe

# Remove the desktop entry
rm ~/.local/share/applications/iwe.desktop

# Remove the CLI symlink
rm ~/.local/bin/iwe
```

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Toggle sidebar | `⌘B` |
| Toggle terminal | `` ⌘` `` |
| Toggle source control | `⌘⇧G` |
| Command palette | `⌘⇧P` |
| Quick file switcher | `⌘P` |
| Switch edit/preview/split | `⌘⇧V` |
| New note | `⌘N` |
| Save | `⌘S` |
| Settings | `⌘,` |

## 🤝 Contributing

This is an open-source project! If you'd like to contribute, please check out the [CONTRIBUTING.md](CONTRIBUTING.md) guide. We welcome pull requests for bug fixes, new features, and documentation improvements.

## 📄 License

IWE is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
