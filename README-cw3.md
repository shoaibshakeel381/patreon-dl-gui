# patreon-dl-gui (Custom Build / v2.10.3-cw3)

**Creator / Maintainer: Moe Haduki (@hadukimoe)**  
**Release Date: September 21, 2026**

This document outlines the cumulative specifications, design decisions, and fixes applied to the custom build series (Edition: cw3) based on the official `patreon-dl-gui` 2.10.0 release.

---

## 1. Overview & Purpose of the Custom Build Series

This custom build was developed to resolve critical download failures triggered by changes in Patreon's website specifications. Rather than altering the core user experience, its primary objective is to restore the tool's original downloader functionality and ensure future-proof stability by incorporating community-driven patches and architectural enhancements.

### Status & Stance of cw3

* **Final Custom Build for Issue #85:** cw3 represents the final iteration addressing the Patreon URL prefix issue discussed in Issue #85.
* **cw2 Remains Sufficient for Daily Use:** If cw2 currently works for your subscriptions, there is no urgent need to update. Please feel free to continue using cw2.
* **Motivation for cw3 (Preparedness for Unknown Future Prefixes):**
* Just as Patreon introduced `/cw/` alongside `/c/`, additional prefixes (e.g., `/cx/`, `/cy/`, `/cz/`) may emerge unexpectedly.
* Previously, accommodating a new prefix required patching source files, rebuilding binaries, and distributing a new release.
* cw3 introduces a user-configurable rule mechanism via `custom-rules.json`, enabling users to bypass unknown prefixes immediately **without requiring binary re-releases**.

---

## 2. Cumulative Fixes from 2.10.0

### ① cw1: Initial Restoration (Contribution by Tian Sun)

* **Problem:** Patreon updated its internal Next.js payload format, breaking page data parsing and causing persistent "No target identified" errors.
* **Fix:** Tian Sun (@tiansun2) identified the parsing discrepancy and introduced a fallback mechanism that extracted the target creator directly from the active browser URL, restoring basic download capabilities.

### ② cw2: Refining the Parsing Logic (Inspired by PR #88)

* **Problem:** While basic downloads were restored, downloading directly from individual post pages still encountered issues.
* **Fix:** We adopted the elegant URL parsing approach proposed by @ma7m0d999 in PR #88. Instead of relying on rigid regular expressions, the application splits the URL into segments and uses `shift()` to cleanly drop known prefixes (like `c` or `cw`). This allowed the app to seamlessly reuse its existing, robust URL parsing logic, comprehensively fixing downloads for both creator homepages and individual post pages.

### ③ cw3: Dynamic Rule Engine (`custom-rules.json`)

* **Problem:** Hardcoded route patterns (even with `shift()`) require new software releases whenever Patreon rolls out unexpected URL prefixes.
* **Fix:** Implemented dynamic prefix evaluation. When standard parsing paths encounter an unknown prefix, the URL analyzer dynamically loads configured prefixes from `custom-rules.json` and shifts them out of the URL array.

---

## 3. Version Management & UI Display Architecture

**Motivation for Custom Metadata:**

To prevent confusion with upstream official releases when distributing Windows installers (MSI), clearly displaying custom build details in Help > About was essential. However, modifying `package.json`'s `version` field arbitrarily breaks Electron's MSI installer (WiX) and its root launcher.

### ① Preserving Three-Segment Versioning

The `version` field in `package.json` determines the installation directory name (e.g., `app-2.10.3`). Appending extra segments (e.g., `2.10.3.1`) or string suffixes prevents the root launcher (`patreon-dl-gui.exe`) from correctly resolving executable paths via `.installInfo.json`. Therefore, `version` is strictly kept as a standard 3-segment number (`2.10.3`).

### ② Separation of UI Representation and Metadata

Custom metadata fields are introduced in `package.json`:

* `"customName": "cw custom"`
* `"customEdition": "cw3"`

The main process (`SupportEvents.ts`) reads these properties, and the About UI (`AboutModal.tsx`) renders the combined custom label (`patreon-dl-gui (cw custom)` / `v2.10.3-cw3`) without disrupting core packaging semantics.

### ③ Configuration for this Build

In this build, the relevant fields in `package.json` are configured as follows to reflect the design described above:

*⚠️ **Note:** The following is an excerpt. Please only update or add these specific fields in your existing `package.json`. Do not overwrite the entire file with this block, as it will delete essential build scripts and dependencies.*

```json
{
  "name": "patreon-dl-gui",
  "productName": "patreon-dl-gui",
  "version": "2.10.3",
  "customName": "cw custom",
  "customEdition": "cw3"
}
```

---

## 4. `custom-rules.json` Specification & Operations

### File Lookup Priority

1. **Priority 1 (Recommended):** `{Destination}/.patreon-dl/custom-rules.json`
   * Ideal for managing output folders with distinct creator-specific rules.
2. **Priority 2 (Global Fallback):** `%APPDATA%/patreon-dl-gui/custom-rules.json`
   * Acts as a global rule applied across all tabs.

*Note: Default prefixes (`c` and `cw`) are already supported internally. Any overlapping prefixes defined across rules are automatically deduplicated into a unique set.*

### Configuration Format

Standard JSON comments (`//` or `/* */`) are unsupported by `JSON.parse()`. Use dummy keys (`_comment`) for notes.

Below is an example configuration illustrating how to handle hypothetical new prefixes if Patreon were to introduce `cx`, `cy`, and `cz`:

```json
{
  "_comment1": "Reload (↻) the browser before downloading after updating this file.",
  "_comment2": "Locations: [Destination]/.patreon-dl/custom-rules.json or %APPDATA%/patreon-dl-gui/custom-rules.json",
  "urlRules": {
    "stripPrefixes": [
      "cx",
      "cy",
      "cz"
    ]
  }
}

```

### [Important] Reloading the Browser View

* `custom-rules.json` can be edited while `patreon-dl-gui` is running.
* **After updating the rules, you must click the Reload button (↻) in the embedded browser toolbar before clicking "Start Download".**
* Reloading re-triggers URL analysis using the updated rules. Confirm that the Target panel identifies the creator properly before initiating downloads (relaunching the application achieves the same result).

---

## 5. Technical Columns

### Why Not Reload Automatically on "Start Download"?

Automating browser reloads directly from the "Start Download" button was intentionally avoided to maintain architectural stability:

* **Preserving a Simple, Synchronous Flow:** "Start Download" acts as a lightweight, synchronous step that collects already-resolved target metadata.
* **Avoiding Fragile Async Coordination:** Triggering page reloads inside the click handler introduces race conditions with DOM rendering, network responses, and Cloudflare challenges. Keeping analysis strictly bound to page load events guarantees stability.

### Evolution of Ideas: Integrating Community Wisdom

The path from cw2 to cw3 involved a notable evolution in how we process URLs:

1. **Initial Breakthrough (@tiansun2's Regex Fallback):**
When Issue #85 first arose, @tiansun2 quickly provided a workaround (`#analyzeCurrentURL`) that extracted the target directly from the active URL using regular expressions. This was the first working fix that helped the community.
2. **Refining the Logic (PR #88's Shift Approach):**
Later, PR #88 (@ma7m0d999) introduced a much more elegant approach: splitting the URL path into segments and simply using `shift()` to drop the prefix (e.g., `c` or `cw`) if present. This allowed the app to reuse all existing URL parsing logic flawlessly without rigid regex, forming the robust foundation of cw2.
3. **Dynamic Evaluation in cw3:**
In cw3, we took PR #88's brilliant `shift()` design and made it fully dynamic. Instead of hardcoding which prefixes to drop, the application now dynamically loads the target prefixes from `custom-rules.json` and shifts them out of the URL array. This beautifully unifies @tiansun2's fallback concept with PR #88's elegant segment processing, future-proofing the application against unknown patterns.

---

## 6. Overview of Source Code Changes

* **`PatreonPageAnalyzer.ts`:**
  * Added `#getUrlPrefixes()` to discover and parse rules from `{Destination}/.patreon-dl/` and AppData.
  * Enhanced `#analyzeURL()` to dynamically strip rule-defined prefixes using `shift()`.
  * Added `destinationDir` to `AnalyzerRequestOptions`.
* **`MainWindow.ts`:**
  * Injected active `out.dir` into `WebBrowserView` upon editor creation and tab switching.
* **`WebBrowserView.ts`:**
  * Added `#destinationDir` storage and `setDestinationDir()` setter, passing the path to `PatreonPageAnalyzer.analyze()`.

---

## 7. Acknowledgments

* **Tian Sun (@tiansun2):** For identifying the root cause of Issue #85 and providing the foundational URL analysis concept that powers cw3.
* **@ma7m0d999:** For PR #88, illustrating the highly elegant array `shift()` approach that seamlessly integrated with the existing logic.
* Everyone who joined the discussions on Issue #85 and PR #88 to test and verify behavior.
* **Patrick Kan (@patrickkfkan):** The original author of `patreon-dl-gui`, for developing and maintaining this indispensable tool.

---

## 8. License and Disclaimer

This project is distributed under the terms of the original project's license. The software is provided "as is", without warranty of any kind, express or implied. The authors and contributors shall not be held liable for any damages arising from the use of this software.
