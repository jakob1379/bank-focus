# Focus for Nykredit

**Not affiliated with, endorsed by, or produced by Nykredit A/S.**

A browser extension to help you focus on what needs your attention by hiding already-reconciled transactions from your Nykredit account overview.

## What it does

Nykredit netbank shows all transactions in one list—checked and unchecked mixed together. When you have many reconciled items, it's hard to see what's actually left to handle.

This extension adds a simple filter control in your browser toolbar so you can switch between:

- Only unchecked transactions
- Only checked transactions
- All transactions

You get a clear view of what still needs attention without scrolling through pages of already-handled items.

## Features

- Three filter modes: unchecked only, checked only, or all
- Gradual hide behavior when a row changes state so updates are easy to track
- Works with a single click in the browser toolbar popup
- No data leaves your browser
- No data collection whatsoever

## Build

### Install Nix

Using the [Determinate Nix Installer](https://determinate.systems/nix-installer):

```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

### Build extension

For Firefox:
```bash
nix build .#firefox
```

For Chrome:
```bash
nix build .#chrome
```

The built extension will be in `./result/`.

## Testing

Run the Playwright tests to verify the extension works in both browsers:

```bash
nix run .#playwright-test
```

Or directly with Playwright:
```bash
cd tests
playwright test
```

Tests run in headed mode so you can see the browser interactions. They verify:
- Extension popup toggle works
- Content script hides checked rows
- Rows reappear when disabled

Playwright and browsers are managed entirely by Nix - no npm install needed.

Run the GitHub Actions test workflow locally with `act`:

```bash
nix run .#act -- -j test -W .github/workflows/test.yml --matrix project:chromium
nix run .#act -- -j test -W .github/workflows/test.yml --matrix project:firefox
```

## Automated releases

This repository includes a release workflow at `.github/workflows/release.yml` that:

- Runs browser tests for Chromium and Firefox
- Builds `chrome.zip` and `firefox.xpi`
- Creates a GitHub release and uploads build artifacts
- Publishes to Firefox Add-ons when Firefox secrets are configured
- Publishes to Chrome Web Store when Chrome secrets are configured

### Required repository secrets

Firefox publish:

- `FIREFOX_ISSUER`
- `FIREFOX_SECRET`

Chrome publish (optional until you create a Chrome Web Store account):

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_EXTENSION_ID`

### Release process

1. Make sure both `chrome/manifest.json` and `firefox/manifest.json` have the same version.
2. Create and push a tag matching that version as `v<major>.<minor>.<patch>`.

```bash
git tag v2.0.0
git push origin v2.0.0
```

The workflow validates that the tag version matches both manifest versions before publishing.

## Install

### Firefox
1. Open `about:debugging` in Firefox
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `.xpi` file from `./result/`

### Chrome
1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome/` directory

## Good for

- Anyone who finds their transaction list overwhelming
- People who want a clearer view of pending items
- Anyone who checks their account regularly and wants less clutter

No bloat. Just works.
