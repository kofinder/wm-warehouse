# WM Warehouse — TypeScript + GitHub Pages Build Fix

This source update fixes the four TypeScript errors from the uploaded `wm-warehouse` GitHub Actions build. It builds the React + Vite app, **not Jekyll**.

## Fixes

- Three.js controls use the `.js` ESM import path supported by TypeScript's `moduleResolution: "Bundler"`.
- The warehouse background uses a `THREE.Color` instance, satisfying React Three Fiber types.
- MUI's `Box` gets a lightweight local JSX type alias in `App.tsx` and `DeviceIntegrationDialog.tsx` to avoid TS2590 with the pinned MUI 5 / TypeScript 5.2 toolchain. The component still renders MUI Box at runtime.
- Production Vite `base` is `/wm-warehouse/`. Both fox logo and favicon honor this prefix.
- `.github/workflows/deploy.yml` builds with Node.js 20 on GitHub Actions and uploads `dist`. **Local Node.js 14.20.1 remains supported.**

## Install in your existing local Git repo

Back up or commit your local changes first. The ZIP has the top-level directory `wm-warehouse`, but does **not** contain `.git` or `node_modules`.

```bash
cd ~/Downloads
unzip -o ~/Downloads/wm-warehouse-github-build-fixed.zip -d .
cd wm-warehouse
```

If your Git repo is in another directory, extract the ZIP into that repo's parent directory instead. Alternatively, from the repo root run `git apply --check <path-to-patch>` and `git apply <path-to-patch>`.

**Remove/disable the previous Jekyll workflow** (often `.github/workflows/jekyll-gh-pages.yml`) so only the Vite workflow deploys the page.

## Test on your laptop

```bash
nvm use 14.20.1
npm install
npm run build
npm run check:logic
npm run dev
```

The dev site runs at `http://localhost:3000/`. If you have old dependencies causing problems: `rm -rf node_modules && npm install`.

## Push to GitHub Pages

```bash
git status
git add .
git commit -m "Fix TypeScript build and GitHub Pages deployment"
git push
```

Your uploaded local repository metadata points to `master`. The new workflow handles both `main` and `master`. In repository Settings → Pages, choose **GitHub Actions** as the build source. Then check Actions and visit `https://kofinder.github.io/wm-warehouse/` after deployment.

## Limitations

The 3D scene is a mock simulation. On GitHub Pages the local Vite WMS/WCS proxy does not exist, so Device Integration's local read-only API checks require a separately hosted secure gateway. Do not expose PLC/OPC UA write controls to the public browser.

**Validation:** Using the uploaded dependency tree, TypeScript 5.2 passed, Vite 4 production build completed, and the mock warehouse logic tests passed in the container with Node.js 22. Live execution on your machine with Node.js 14 and GitHub Actions deployment still require confirmation.
