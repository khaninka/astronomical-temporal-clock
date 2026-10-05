# Chrome Extension Delivery Plan

## Decision

The completed GitHub Pages web application remains an independent, working delivery target and must not be replaced or modified merely to support Chrome. A future Chrome extension will be an additional shell around the same tested calculation modules.

The extension will use **Chrome Extension Manifest V3** and the **Side Panel API**. A side panel was selected instead of a toolbar popup because the clock should remain visible while the user navigates between browser tabs. A legacy Chrome App is explicitly excluded.

## Architectural boundary

- The calculation pipeline remains shared and browser-neutral:
  `Location → SunCrossing → BoundaryRule → TemporalClock → Display`.
- Chrome-specific files, permissions, storage adapters, and build output must be kept separate from the current web entry point and GitHub Pages build.
- The current website, URL, GitHub Pages workflow, Vite base path, behavior, and security model must continue to work independently.
- Extension work must not introduce `chrome.*` dependencies into the astronomical calculation modules.
- The extension receives its own integration tests and security review before it is considered releasable.

## Planned user experience

- Clicking the pinned extension action opens or closes a global side panel.
- The panel displays the same Hebrew RTL clock and calculation views, adapted to the narrower panel width.
- The clock continues updating while its side panel document remains open.
- No backend or continuously running server is required.
- All HTML, CSS, JavaScript, icons, and astronomical calculations are packaged locally in the extension.
- Network access is used only when the user explicitly requests terrain elevation from Open-Meteo. The ordinary astronomical calculations remain local.

## Planned storage policy

The web application keeps its existing `sessionStorage` policy unchanged.

The extension should use `chrome.storage.session` for validated latitude, longitude, and elevation so that closing and reopening the side panel does not lose the location during the same Chrome session. The values must disappear when the Chrome session ends. Dates and calculated results must not be persisted.

## Minimum permissions

The initial manifest should request only the capabilities required by the approved behavior:

- `sidePanel` — display the persistent clock panel;
- `storage` — access `chrome.storage.session`;
- `geolocation` — support the explicit **Use current location** action;
- a narrowly scoped Open-Meteo host permission — perform the user-triggered elevation request.

The extension must not request `tabs`, `activeTab`, `history`, `scripting`, broad website access, content scripts, cookies, downloads, or access to page contents. If a future feature needs another permission, it requires a separate decision and security review.

## Build and repository layout

The exact layout will be selected during implementation, but the build must produce two independent artifacts:

1. the existing `dist/` web build for GitHub Pages;
2. a separate extension package directory containing `manifest.json`, the side-panel entry point, local bundled assets, icons, and the minimal Manifest V3 service worker needed to open the panel from the action icon.

Relative packaged asset paths must be used in the extension build. The GitHub Pages base path `/astronomical-temporal-clock/` remains unchanged for the web build.

## Distribution

- Development/personal installation: load the built extension directory through `chrome://extensions` in Developer mode.
- Wider distribution: publish the reviewed package through the Chrome Web Store.
- The GitHub Pages version remains available by URL regardless of extension installation or publication.

## Acceptance gate

The extension milestone is complete only when:

1. all existing web tests still pass without weakening their assertions;
2. the normal GitHub Pages production build is unchanged and successful;
3. the unpacked Manifest V3 extension loads without errors;
4. clicking the extension action opens the side panel;
5. the panel is visually usable at Chrome side-panel widths and in RTL;
6. DAY/NIGHT transitions and resume-after-sleep behavior work in the panel;
7. session location survives panel closure but not a new Chrome session;
8. denial or absence of geolocation and Open-Meteo access fails safely;
9. the built package contains no remote executable code;
10. requested permissions match this document exactly and receive a documented security/privacy review.

## Status

**In progress.** The first separate Manifest V3 Side Panel build exists and reuses the current web entry point without changing the GitHub Pages build. It still uses the side panel document's `sessionStorage`; the `chrome.storage.session` adapter, extension icons, narrow-panel visual verification, unpacked-Chrome verification, and the remaining acceptance gates are not yet complete. The current web application remains the released working version.
