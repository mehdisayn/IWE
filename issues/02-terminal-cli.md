# Issue: Terminal Cannot Run AI CLI or Interactive Commands

## User Flow
1. The user opens the built-in terminal via the `CMD+\`` shortcut or the UI button.
2. The user types `ai cli` (or any other interactive CLI command like `vim`, `nano`, or `python` REPL) and hits Enter.
3. The frontend passes the command string to the Tauri backend using `termApi.run(sessionCwd, "ai cli")`.
4. The backend spawns a shell process (`Command::new(&shell).arg("-lc").arg(&command)`) and calls `.output()`.
5. The terminal either hangs indefinitely, or the command exits immediately because there is no TTY.

## Why it is not working
- **No PTY (Pseudo-Terminal):** The built-in terminal is a "pragmatic integrated terminal" (as mentioned in the code) that uses standard pipes (`stdout`, `stderr`) rather than a full pseudo-terminal (PTY). Interactive commands (like the AI CLI) often check if they are connected to a TTY to format their output or accept input. Without a PTY, these commands may fail to run or refuse to execute.
- **Blocking Execution (`.output()`):** The backend waits for the command to fully complete before sending any output back to the frontend. AI CLIs that stream responses token-by-token (or require user input to continue) will appear to hang, as `std::process::Command::output()` blocks until the process exits.
- **No `stdin` connection:** If the AI CLI expects the user to type a prompt or answer a question, it cannot read from standard input because the frontend does not send `stdin` to the running command.

## Proposed Solutions
1. **Implement a PTY Backend:** Switch the terminal backend to use a PTY crate (such as `portable-pty`) instead of `std::process::Command`. This allows the terminal to emulate a real terminal environment, supporting interactive TTY programs.
2. **Streaming Execution:** Instead of waiting for the command to finish with `.output()`, use `.spawn()` to start the process and stream `stdout` and `stderr` back to the frontend using Tauri events. This will at least allow long-running processes or streaming CLIs to display their output in real-time.
3. **Handle `stdin`:** Add a mechanism in the frontend terminal UI and the backend to pipe user keystrokes into the running process's `stdin`.
