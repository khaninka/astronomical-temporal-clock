# Chrome extension development

This directory contains only Chrome-specific source files. The side panel itself is built from the existing root `index.html` and shared `src/` modules.

## Build

```sh
npm run build:extension
```

The unpacked extension is written to `dist-extension/`. The ordinary GitHub Pages build remains in `dist/` and continues to use `vite.config.js`.

## Load locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the generated `dist-extension/` directory.
5. Pin the extension action if desired and click it to open the side panel.

## Current first-step limitation

This shell deliberately reuses the current web application without changing its behavior. Location is therefore still stored in the side panel's `sessionStorage`. Migration to `chrome.storage.session`, with an adapter that leaves the website unchanged, is a later M6 gate before release.
