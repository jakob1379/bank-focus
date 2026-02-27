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
4. Select the unpacked extension directory

## Good for

- Anyone who finds their transaction list overwhelming
- People who want a clearer view of pending items
- Anyone who checks their account regularly and wants less clutter

No bloat. Just works.
