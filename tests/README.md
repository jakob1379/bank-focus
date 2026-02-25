# Nykredit Extension Playwright Tests

Headed browser extension tests for both Chrome and Firefox using Nix-managed Playwright.

## Setup

From the project root:

```bash
# Using nix (recommended)
nix run .#playwright-test

# Or manually
cd tests
playwright test
```

## Running Tests

### Run all tests (both browsers)
```bash
playwright test
```

### Run Chrome only
```bash
playwright test --project=chrome
```

### Run Firefox only
```bash
playwright test --project=firefox
```

### Debug mode (headed with slow motion)
```bash
playwright test --headed --timeout=0
```

## Test Structure

- `playwright.config.ts` - Browser configuration with extension loading
- `fixtures.ts` - Custom fixtures for loading extensions and local HTML
- `extension.spec.ts` - Test cases

## Notes

- Tests run in **headed mode** by default as requested
- Uses the local `Nykredit Privat.html` as a test fixture
- Chrome loads the extension automatically
- Firefox has limited extension support in Playwright - tests mock the browser APIs
- The content script is manually injected for file:// URLs with mocked browser APIs
- No npm dependencies - Playwright is managed entirely by Nix
