const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const filterInputs = document.querySelectorAll('input[name="filter"]');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const STATUS_MESSAGES = {
  'unchecked-only': 'Viser kun uafstemte posteringer',
  'checked-only': 'Viser kun afstemte posteringer',
  'all': 'Viser alle posteringer'
};

function updateUI(mode) {
  filterInputs.forEach(input => {
    input.checked = input.value === mode;
  });
  
  statusText.textContent = STATUS_MESSAGES[mode];
  statusDot.classList.toggle('active', mode !== 'all');
}

function setIcon(mode) {
  const isActive = mode !== 'all';
  const iconPath = isActive ? {
    '16': 'icons/active/icon16.svg',
    '48': 'icons/active/icon48.svg',
    '128': 'icons/active/icon128.svg'
  } : {
    '16': 'icons/inactive/icon16.svg',
    '48': 'icons/inactive/icon48.svg',
    '128': 'icons/inactive/icon128.svg'
  };
  
  browserAPI.action.setIcon({ path: iconPath });
}

async function migrateFromLegacyStorage() {
  const { hideEnabled, filterMode } = await browserAPI.storage.local.get(['hideEnabled', 'filterMode']);
  
  if (filterMode === undefined && hideEnabled !== undefined) {
    const migratedMode = hideEnabled ? 'unchecked-only' : 'all';
    await browserAPI.storage.local.set({ filterMode: migratedMode });
    await browserAPI.storage.local.remove('hideEnabled');
    return migratedMode;
  }
  
  return filterMode || 'all';
}

async function init() {
  const mode = await migrateFromLegacyStorage();
  updateUI(mode);
  setIcon(mode);
}

filterInputs.forEach(input => {
  input.addEventListener('change', async () => {
    if (!input.checked) return;
    
    const mode = input.value;
    updateUI(mode);
    setIcon(mode);
    await browserAPI.storage.local.set({ filterMode: mode });

    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      browserAPI.tabs.sendMessage(tab.id, { action: 'setFilterMode', mode });
    }
  });
});

init();
