# Issue: Back Button Buggy During Setup Download Phase

**Type:** Bug  
**Area:** Setup Wizard · Download / Installation  
**Priority:** Medium

---

## Summary

Pressing the **Back** button during the download/extraction phase of the initial setup wizard is unreliable:

- While a download or extraction is in progress the button is disabled, so the user cannot navigate back at all without first pressing **Cancel**.
- Pressing **Cancel** does not reliably stop all ongoing operations: extraction processes cannot actually be killed (the `kill()` handler is a no-op), and the LanguageTool background download is explicitly excluded from cancellation — it continues running silently even after the user cancels.
- As a result, components can "continue installing" in the background even after the user presses Back or Cancel and has moved to a different step.

---

## Current Behavior

### 1. Back button is disabled during any active download/extraction

`src/renderer/views/initialization/setup.tsx`, lines 544–552:

```tsx
{downloadStarted && (
    <div style={styles.buttonRow}>
        <button
            style={styles.secondaryButton}
            onClick={onBack}
            disabled={isActivelyDownloading}   // ← user cannot go back
        >
```

`isActivelyDownloading` is true whenever `comfyProgress`, `imageProgress`, or `audioProgress` has status `"pending"`, `"downloading"`, or `"extracting"` (lines 411–418). The only escape is to press **Cancel** and wait for the cancellation to succeed.

### 2. Cancelling extractions is a no-op

`src/@infrastructure/services/ModelDownloadService.ts`, lines 381–385:

```ts
this.activeExtractions.set(downloadType, {
    kill: () => {
        // Post-completion cleanup only.
    },
});
```

When `cancelDownload` is called during an active extraction it calls `extraction.kill()`, which does nothing. The `7za` child process continues to run to completion even though the UI now shows the download as cancelled.

### 3. LanguageTool is never cancelled

`src/renderer/views/initialization/setup.tsx`, lines 381–385:

```ts
await (window as any).setupApi.cancelDownloads([
    "comfyui",
    "image",
    "audio",
    // "languagetool" is intentionally omitted
]);
```

LanguageTool (Java JRE + grammar server, ~350 MB) always downloads in the background. It is not included in the cancel list and will continue downloading and extracting regardless of what the user does in the UI.

### 4. HTTP download abort is soft

The abort mechanism for HTTP downloads (`src/@infrastructure/services/ModelDownloadService.ts`, lines 410–416) sets an `aborted` flag that is checked on the next incoming data chunk. The download is not immediately terminated at the TCP level; it can continue for an unpredictable period after the user presses Cancel.

---

## Expected Behavior

1. The **Back** button should always be accessible (enabled) during the download phase. Pressing it should automatically trigger a full cancellation of all in-progress operations before navigating back.
2. Pressing **Cancel** should completely and immediately stop all ongoing downloads *and* extractions (including LanguageTool).
3. No background processes should continue after the user has explicitly cancelled or navigated away from the download step.

---

## Steps to Reproduce

1. Start the setup wizard and reach the **Download AI Components** step.
2. Click **Start Downloads**.
3. While a download is in progress, observe that the **Back** button is disabled.
4. Click **Cancel**.
5. Observe in Task Manager / Activity Monitor that the `7za.exe` process may still be running.
6. Navigate forward to the **Finalizing** step — observe that the LanguageTool download was never stopped and may still be in progress.

---

## Affected Files

| File | Line(s) | Note |
|------|---------|------|
| `src/renderer/views/initialization/setup.tsx` | 411–418 | `isActivelyDownloading` — controls Back button disabled state |
| `src/renderer/views/initialization/setup.tsx` | 378–396 | `cancelDownloads()` — omits `"languagetool"` from cancel list |
| `src/renderer/views/initialization/setup.tsx` | 544–552 | Back button `disabled={isActivelyDownloading}` |
| `src/@infrastructure/services/ModelDownloadService.ts` | 381–395 | `extract7z()` — `kill()` is a no-op; 7za process is never terminated |
| `src/@infrastructure/services/ModelDownloadService.ts` | 797–811 | `extractZip()` — same no-op `kill()` issue |
| `src/@infrastructure/services/ModelDownloadService.ts` | 886–903 | `cancelDownload()` — calls `kill()` which does nothing during extraction |

---

## Proposed Fix

### 1. Enable Back button and auto-cancel on navigate back

Instead of disabling the Back button, allow it when active and have `onBack` call `cancelDownloads` (defined at lines 378–396 of `setup.tsx`) first:

```tsx
const handleBack = async () => {
    if (isActivelyDownloading) {
        await cancelDownloads();
    }
    onBack();
};

// ...

<button style={styles.secondaryButton} onClick={handleBack}>
    Back
</button>
```

### 2. Actually kill the 7za child process on cancellation

Store the `ChildProcess` reference and call `.kill()` on it:

```ts
// In extract7z():
const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

this.activeExtractions.set(downloadType, {
    kill: () => proc.kill(),   // ← actually terminates the subprocess
});
```

Apply the same fix to `extractZip()`.

### 3. Cancel LanguageTool when the user explicitly cancels all downloads

Remove the hard-coded exclusion of `"languagetool"` from the cancel list when the user presses **Cancel** or **Back** on the downloads step, or make it configurable:

```ts
await (window as any).setupApi.cancelDownloads([
    "comfyui",
    "image",
    "audio",
    "languagetool",   // ← include so no background process survives a cancel
]);
```

### 4. Destroy the HTTP request immediately on abort

Replace the flag-based abort with an `http.ClientRequest.destroy()` call so the TCP connection is torn down at once rather than waiting for the next data chunk.
