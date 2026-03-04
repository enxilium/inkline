# Issue: Extraction Progress Always Shows 0% and Never Updates

**Type:** Bug  
**Area:** Setup Wizard · Download / Installation  
**Priority:** Medium

---

## Summary

During the initial setup flow, when the AI Engine (ComfyUI, ~2 GB) or the LanguageTool package is being extracted from its downloaded archive, the progress bar is stuck at **0%** for the entire extraction phase and never advances. After extraction finishes the UI jumps directly to 100% (complete). The extraction can take several minutes on slower hardware, leaving users with no feedback and making the app appear frozen.

---

## Current Behavior

1. **Download phase** – progress updates correctly from 0 → 100% with byte counts.
2. **Extraction phase** – the UI immediately shows `"Extracting... 0%"` and stays there until the 7za process exits.
3. The status then jumps to `"completed"` with no intermediate updates.

---

## Root Cause

### `extract7z()` ignores its progress callback

`src/@infrastructure/services/ModelDownloadService.ts`, lines 375–396:

```ts
private async extract7z(
    archivePath: string,
    destPath: string,
    _onProgress: (progress: DownloadProgress) => void,  // ← prefixed _ = intentionally unused
    downloadType: "comfyui" | "languagetool" = "comfyui",
): Promise<void> {
    this.activeExtractions.set(downloadType, {
        kill: () => { /* Post-completion cleanup only. */ },
    });

    try {
        await unpack(archivePath, destPath);   // ← callback is never invoked
    } finally {
        this.activeExtractions.delete(downloadType);
    }
}
```

### The `unpack()` helper discards stdout

`src/@infrastructure/services/ModelDownloadService.ts`, lines 36–59:

```ts
function unpack(archivePath: string, destPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

        let stdout = "";
        proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
        // stdout is accumulated but never parsed for file counts / percentages
        proc.on("close", (code) => {
            if (code === 0) resolve(stdout);
            else reject(...);
        });
    });
}
```

`7za` writes lines like `  3% - some/file.bin` to stdout that could be parsed for real-time progress, but they are only accumulated into a string and discarded on success.

### Extraction start always emits 0%

Before calling `extract7z`, the caller emits a single progress event with `percentage: 0`:

```ts
onProgress({
    downloadType: "comfyui",
    downloadedBytes: 0,
    totalBytes: 0,
    percentage: 0,         // ← stuck here until completion
    status: "extracting",
});

await this.extract7z(archivePath, this.serverBasePath, onProgress);
```

The same pattern exists for `extractZip()` (lines 792–812).

---

## Expected Behavior

- The progress bar should advance smoothly during extraction, reflecting the actual completion percentage reported by 7za.
- If true per-file progress cannot be determined, the UI should at minimum show an indeterminate / animated progress indicator (e.g. a pulsing bar) so the user knows work is happening.

---

## Steps to Reproduce

1. Run the initial setup wizard on a fresh install.
2. Select local AI features and click **Start Downloads**.
3. Watch the AI Engine row complete its download phase (correct progress).
4. Observe that once the "Extracting" label appears, the percentage stays at 0% for the entire extraction duration (typically 1–5 minutes).

---

## Affected Files

| File | Line(s) | Note |
|------|---------|------|
| `src/@infrastructure/services/ModelDownloadService.ts` | 36–59 | `unpack()` – accumulates but never parses 7za stdout for progress |
| `src/@infrastructure/services/ModelDownloadService.ts` | 375–396 | `extract7z()` – accepts `_onProgress` but never calls it |
| `src/@infrastructure/services/ModelDownloadService.ts` | 792–812 | `extractZip()` – same issue, no progress tracking |
| `src/@infrastructure/services/ModelDownloadService.ts` | 252–261 | Caller emits a single `percentage: 0 / status: "extracting"` event and then awaits |

---

## Proposed Fix

### Option A – Parse 7za stdout for real progress (recommended)

`7za x` with `-bsp1` flag outputs lines in the form:

```
  3% - path/to/file
 10% - path/to/another/file
```

Update `unpack()` to accept an optional `onProgress` callback and parse each stdout line with a regex such as `/^\s*(\d+)%/`:

```ts
function unpack(
    archivePath: string,
    destPath: string,
    onProgress?: (pct: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const args = ["x", archivePath, `-o${destPath}`, "-y", "-bsp1"];
        const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

        proc.stdout.on("data", (d: Buffer) => {
            const text = d.toString();
            const match = text.match(/^\s*(\d+)%/m);
            if (match && onProgress) onProgress(parseInt(match[1], 10));
        });
        // ... rest unchanged
    });
}
```

Then update `extract7z` to rename `_onProgress` → `onProgress` (removing the intentional-unused prefix) and thread the callback through to `unpack()` invocations.

### Option B – Indeterminate progress indicator (quick fix)

If parsing 7za output is impractical in the short term, replace the static 0% display with an animated/indeterminate progress bar when `status === "extracting"` so the UI doesn't look frozen. The percentage value can be omitted from the label in that case.
