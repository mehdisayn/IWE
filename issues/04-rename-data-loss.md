# Issue: CRITICAL - Renaming a File Causes Data Loss

## User Flow
1. The user opens a file (e.g., `doc.md`) which has existing content (e.g., "Hello world").
2. The user right-clicks the file in the sidebar and chooses "Rename", changing it to `newdoc`.
3. The frontend calls `fsApi.rename` and successfully renames the file on disk.
4. The frontend updates the `tabs` and `active` states to point to the new path (`newdoc`).
5. The editor view updates to show the file, but it appears completely empty.
6. If the user types any character, the `autosave` feature saves this new text to disk, permanently erasing the original "Hello world" content.

## Why it is not working
- **State Not Remapped:** When `renameNode` is called in `src/App.tsx`, it remaps the `tabs` array and the `active` string to the new file path. However, it **does not** update the keys in the `files` and `saved` state dictionaries.
- **Lazy Loading bypass:** `files["newdoc"]` is undefined. Since the `active` state was updated directly without passing through `openFile`, the app does not lazy-load the content from disk again.
- **Data Destruction via Autosave:** The editor sees `files["newdoc"] ?? ""` and renders an empty text area. If the user edits the empty text area, `files["newdoc"]` becomes the typed string. The autosave effect sees that `files["newdoc"] !== saved["newdoc"]` and writes the typed string to disk, destroying the original file content.

## Proposed Solutions
1. **Remap State Dictionaries:** Update `renameNode` to iterate over `files` and `saved` states, copy the contents of the old path to the new path, and delete the old path key.
2. **Reload on Rename:** Alternatively, force the active tab to reload its content from disk immediately after a rename.
