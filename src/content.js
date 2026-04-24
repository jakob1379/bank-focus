const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// State management
let observer = null;
let currentMode = 'all';
const processedRows = new WeakSet();

// CSS styles for animations
const CSS_STYLES = `
  .PostingTable-tr.nykrit-row { will-change: opacity, transform; }
  .PostingTable-tr.nykrit-fade-out { opacity: 0; transform: translateX(-10px); pointer-events: none; transition: opacity 0.4s cubic-bezier(0.4, 0, 1, 1), transform 0.4s cubic-bezier(0.4, 0, 1, 1); }
  .PostingTable-tr.nykrit-fade-in { opacity: 1; transform: translateX(0); transition: opacity 0.25s cubic-bezier(0, 0, 0.2, 1), transform 0.25s cubic-bezier(0, 0, 0.2, 1); }
  .PostingTable-tr.nykrit-hidden { display: none !important; }
`;

/**
 * Inject CSS styles for animations
 */
function injectStyles() {
  if (document.getElementById('nykrit-styles')) return;
  const style = document.createElement('style');
  style.id = 'nykrit-styles';
  style.textContent = CSS_STYLES;
  document.head.appendChild(style);
}

/**
 * Determine if a row should be hidden based on current filter mode
 */
function shouldHide(checkbox, mode = currentMode) {
  if (mode === 'all') return false;
  if (mode === 'unchecked-only') return checkbox.checked;
  if (mode === 'checked-only') return !checkbox.checked;
  return false;
}

/**
 * Show a row with fade-in animation
 */
function showRow(row) {
  if (!row.classList.contains('nykrit-hidden') && !row.classList.contains('nykrit-fade-out')) {
    return;
  }

  row.classList.remove('nykrit-hidden', 'nykrit-fade-out');
  row.classList.add('nykrit-fade-in');
  
  // Clean up animation class after transition completes
  const onTransitionEnd = () => {
    row.classList.remove('nykrit-fade-in');
    row.removeEventListener('transitionend', onTransitionEnd);
  };
  row.addEventListener('transitionend', onTransitionEnd);
}

/**
 * Hide a row with fade-out animation
 */
function hideRow(row) {
  if (row.classList.contains('nykrit-hidden') || row.classList.contains('nykrit-fade-out')) {
    return;
  }

  row.classList.remove('nykrit-fade-in');
  row.classList.add('nykrit-fade-out');
  
  const onTransitionEnd = () => {
    row.classList.add('nykrit-hidden');
    row.classList.remove('nykrit-fade-out');
    row.removeEventListener('transitionend', onTransitionEnd);
  };
  row.addEventListener('transitionend', onTransitionEnd);
}

/**
 * Process a single row - add listeners and apply initial state
 */
function processRow(row) {
  // Add base styling class
  row.classList.add('nykrit-row');
  
  const cb = row.querySelector('input[type="checkbox"]');
  if (!cb) return;

  // Skip if already processed
  if (processedRows.has(row)) return;
  processedRows.add(row);
  
  // Apply initial visibility based on current mode
  if (currentMode !== 'all' && shouldHide(cb, currentMode)) {
    hideRow(row);
  }
  
  // Add change listener
  cb.addEventListener('change', () => {
    if (shouldHide(cb)) {
      hideRow(row);
    } else {
      showRow(row);
    }
  });
}

function processAddedNode(node) {
  if (node.nodeType !== 1) return;

  if (node.matches?.('.PostingTable-tr')) {
    processRow(node);
  }

  node.querySelectorAll?.('.PostingTable-tr').forEach(processRow);

  if (node.matches?.('input[type="checkbox"]')) {
    const row = node.closest('.PostingTable-tr');
    if (row) processRow(row);
  }

  node.querySelectorAll?.('input[type="checkbox"]').forEach((checkbox) => {
    const row = checkbox.closest('.PostingTable-tr');
    if (row) processRow(row);
  });
}

/**
 * Enable filtering - start observing DOM changes
 */
function enable() {
  if (observer) return;
  
  // Process existing rows
  document.querySelectorAll('.PostingTable-tr').forEach(processRow);
  
  // Observe for dynamically added rows
  observer = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((n) => {
        processAddedNode(n);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Disable filtering - stop observing and show all rows
 */
function disable() {
  if (!observer) return;
  observer.disconnect();
  observer = null;

  // Show all rows and clean up classes
  document.querySelectorAll('.PostingTable-tr').forEach((row) => {
    row.classList.remove('nykrit-hidden', 'nykrit-fade-out', 'nykrit-fade-in');
  });
}

/**
 * Set the filter mode and update all rows accordingly
 */
function setFilterMode(mode) {
  currentMode = mode;

  // Update all existing rows
  document.querySelectorAll('.PostingTable-tr').forEach((row) => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (!cb) return;
    
    if (mode === 'all') {
      showRow(row);
    } else if (shouldHide(cb, mode)) {
      hideRow(row);
    } else {
      showRow(row);
    }
  });
  
  // Update icon
  updateIcon();
}

/**
 * Update extension icon based on current mode
 */
function updateIcon() {
  let iconSet;
  if (currentMode === 'unchecked-only') {
    iconSet = 'active';
  } else if (currentMode === 'checked-only') {
    iconSet = 'reverse';
  } else {
    iconSet = 'inactive';
  }
  
  const iconPath = {
    '16': `icons/${iconSet}/icon16.svg`,
    '48': `icons/${iconSet}/icon48.svg`,
    '128': `icons/${iconSet}/icon128.svg`
  };
  
  browserAPI.action.setIcon({ path: iconPath });
}

/**
 * Migrate from old hideEnabled boolean to new filterMode enum
 */
async function migrateFromLegacy() {
  const { hideEnabled, filterMode } = await browserAPI.storage.local.get(['hideEnabled', 'filterMode']);
  
  // If we have legacy hideEnabled but no filterMode, migrate
  if (hideEnabled !== undefined && !filterMode) {
    const newMode = hideEnabled ? 'unchecked-only' : 'all';
    await browserAPI.storage.local.set({ filterMode: newMode });
    await browserAPI.storage.local.remove('hideEnabled');
    return newMode;
  }
  
  return filterMode || 'all';
}

// Initialize
(async function init() {
  injectStyles();
  
  const mode = await migrateFromLegacy();
  currentMode = mode;
  
  if (currentMode !== 'all') {
    enable();
  }
  
  updateIcon();
})();

// Message handling
browserAPI.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'setFilterMode') {
    const newMode = msg.mode;
    
    if (!['unchecked-only', 'checked-only', 'all'].includes(newMode)) {
      console.warn('Invalid filter mode:', newMode);
      return;
    }
    
    setFilterMode(newMode);
    
    // Save to storage
    browserAPI.storage.local.set({ filterMode: newMode });
    
    // Enable/disable observer based on mode
    if (newMode === 'all') {
      disable();
    } else {
      enable();
    }
  }
});
