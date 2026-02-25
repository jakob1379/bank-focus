# Nykredit Extension

Focus on what needs your attention by hiding already-reconciled transactions from your account overview.

## What it does

Nykredit netbank shows all transactions in one list—checked and unchecked mixed together. When you have many reconciled items, it's hard to see what's actually left to handle.

This extension adds a simple toggle to your browser. When enabled, it hides all checked transactions so only the unchecked ones remain visible. You get a clear view of what still needs attention without scrolling through pages of already-handled items.

Toggle it on when you need focus. Toggle it off when you want to see everything again.

## Features

- Hides checked/reconciled transactions from view
- Shows only unchecked items for better focus
- Works with a single click in the browser toolbar
- No data leaves your browser

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
4. Select the extracted `.zip` from `./result/`

## Good for

- Anyone who finds their transaction list overwhelming
- People who want a clearer view of pending items
- Anyone who checks their account regularly and wants less clutter

No bloat. Just works.
