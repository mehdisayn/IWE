# Issue: Dashboard "Total Words" Count is Inaccurate

## User Flow
1. The user opens a workspace that contains hundreds of markdown files and thousands of words.
2. The user opens the Dashboard.
3. The Dashboard displays a "Total Words" count (e.g., 0).
4. The user opens a file from the sidebar, then returns to the Dashboard. The "Total Words" count increases slightly.

## Why it is not working
- **Lazy Loaded Content:** In `src/App.tsx`, the `files` state dictionary only stores the content of files that the user has explicitly opened during the current session to save memory and startup time.
- **Flawed Calculation:** The `totalWords` calculation is a `useMemo` that simply iterates over `Object.keys(files)` and counts the words. It does not read un-opened files from the disk.
- **Result:** The Dashboard shows the total word count for *currently open/cached tabs* rather than the entire workspace, which is highly misleading.

## Proposed Solutions
1. **Background Indexing:** Implement a Tauri backend command that natively calculates the total word count by asynchronously scanning all `.md` files in the workspace on startup.
2. **UI Clarification:** Change the label from "Total Words" to "Words in Open Files" (not recommended as it defeats the purpose of the metric).
