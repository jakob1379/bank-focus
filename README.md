<p align="center">
  <img src=".github/assets/focus-filter.svg" width="880" alt="A February transaction list beside the extension popup. Choosing &quot;Kun uafstemte&quot; fades the reconciled rows out to the left and closes the gaps, leaving the three rows that still need attention. &quot;Kun afstemte&quot; shows only the four reconciled rows, and &quot;Vis alle&quot; brings everything back.">
</p>

<h1 align="center">Focus for Nykredit</h1>

<p align="center">
  Hide the transactions you have already reconciled in Nykredit netbank,<br>
  so the list shows only what still needs your attention.
</p>

<p align="center"><strong>Not affiliated with, endorsed by, or produced by Nykredit A/S.</strong></p>

---

## Why

Nykredit netbank shows every transaction in one list, checked and unchecked mixed
together. Once most of them are reconciled, the few that are left are hard to find.
This browser extension adds a filter to your toolbar so you can see just those.

## Filter modes

Pick a mode in the toolbar popup. The extension remembers it and applies it as soon
as the account overview loads.

| Popup option  | Shows                              |
| ------------- | ---------------------------------- |
| Kun uafstemte | Only unchecked (unreconciled) rows |
| Kun afstemte  | Only checked (reconciled) rows     |
| Vis alle      | Every row, nothing hidden          |

When you tick or untick a row while a filter is on, it fades out instead of
vanishing, so you can see what just changed.

## Privacy

- Runs only on `https://netbank.nykredit.dk/*`
- Permissions: `storage` (your chosen mode) and `activeTab`
- No data leaves your browser and nothing is collected

## Install

Builds use Nix. If you do not have it, the
[Determinate Nix Installer](https://determinate.systems/nix-installer) sets it up:

```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

### Firefox

```bash
nix build .#firefox
```

1. Open `about:debugging` and click **This Firefox**
2. Click **Load Temporary Add-on**
3. Select `firefox.xpi` from `./result/`

### Chrome

```bash
nix run .#pack
```

This copies the shared sources into `chrome/` and also writes `chrome.zip` and `firefox.xpi`.

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked**
3. Select the `chrome/` directory

`nix build .#chrome` builds `chrome.zip` into `./result/`, and `nix build .#all` builds both packages.

## Testing

Playwright and its browsers come from Nix, so there is no `npm install`.

```bash
nix run .#run-tests                        # both browsers, headed
nix run .#run-tests -- --project=chromium  # one browser
HEADLESS=true nix run .#run-tests          # headless, as in CI
```

Or directly with Playwright:

```bash
cd tests
playwright test
```

The tests load a saved netbank page from `tests/fixtures/` and check that:

- the popup toggles between filter modes
- the content script hides checked rows
- rows reappear when filtering is turned off

Run the GitHub Actions test workflow locally with `act`:

```bash
nix run .#act -- -j test -W .github/workflows/test.yml --matrix project:chromium
nix run .#act -- -j test -W .github/workflows/test.yml --matrix project:firefox
```

## Automated releases

[`.github/workflows/release.yml`](.github/workflows/release.yml) does the following on a version tag:

- Runs browser tests for Chromium and Firefox
- Builds `chrome.zip` and `firefox.xpi`
- Creates a GitHub release and uploads build artifacts
- Publishes to Firefox Add-ons when Firefox secrets are configured
- Publishes to Chrome Web Store when Chrome secrets are configured

If Chrome or Firefox secrets are missing, the workflow still creates a GitHub release and only skips store publishing.

### Release process

1. Make sure both `chrome/manifest.json` and `firefox/manifest.json` have the same version.
2. Create and push a tag matching that version as `v<major>.<minor>.<patch>`.

```bash
git tag v2.0.0
git push origin v2.0.0
```

The workflow validates that the tag version matches both manifest versions before publishing.

### Repository secrets

Add these at
`GitHub repo -> Settings -> Secrets and variables -> Actions -> Repository secrets`.

| Secret                 | Needed for | Where it comes from                                                                 |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `FIREFOX_ISSUER`       | Firefox    | Firefox Add-ons Developer Hub API credentials (JWT): create keys in your AMO account |
| `FIREFOX_SECRET`       | Firefox    | Same AMO API key pair as the issuer                                                 |
| `CHROME_EXTENSION_ID`  | Chrome     | Chrome Web Store listing (item ID from URL)                                         |
| `CHROME_CLIENT_ID`     | Chrome     | Google Cloud OAuth client credentials for Chrome Web Store API                      |
| `CHROME_CLIENT_SECRET` | Chrome     | Same OAuth client as the client ID                                                  |
| `CHROME_REFRESH_TOKEN` | Chrome     | OAuth consent flow for that client with scope `https://www.googleapis.com/auth/chromewebstore` |

The Chrome secrets are optional until you create a Chrome Web Store account.

### Repository settings

1. `GitHub repo -> Settings -> Actions -> General -> Workflow permissions`
   - set to **Read and write permissions** (needed for creating GitHub releases)
2. `GitHub repo -> Settings -> Actions -> General -> Allow GitHub Actions`
   - allow Marketplace actions used by this repo (`softprops/action-gh-release`, `wdzeng/firefox-addon`, `wdzeng/chrome-extension`)

---

<p align="center">No bloat. Just works.</p>
