# Nykredit Extension Playwright Tests

Headed browser extension tests for both Chrome and Firefox.

## Setup

From the project root:

```bash
# Using nix (recommended)
nix run .#playwright-test

# Or manually
cd tests
npm install
npx playwright test
```

## Running Tests

### Run all tests (both browsers)
```bash
npm test
```

### Run Chrome only
```bash
npm run test:chrome
```

### Run Firefox only
```bash
npm run test:firefox
```

### Debug mode (headed with slow motion)
```bash
npm run test:debug
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
