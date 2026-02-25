const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const checkbox = document.getElementById('toggle');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

function updateStatus(enabled) {
  if (enabled) {
    statusDot.classList.add('active');
    statusText.textContent = 'Skjuler afstemte posteringer';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = 'Viser alle posteringer';
  }
}

function setIcon(enabled) {
  const iconPath = enabled ? {
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

browserAPI.storage.local.get('hideEnabled').then(({hideEnabled}) => {
  const enabled = !!hideEnabled;
  checkbox.checked = enabled;
  updateStatus(enabled);
  setIcon(enabled);
});

checkbox.addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  updateStatus(enabled);
  setIcon(enabled);
  await browserAPI.storage.local.set({ hideEnabled: enabled });

  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    browserAPI.tabs.sendMessage(tab.id, { action: enabled ? 'enable' : 'disable' });
  }
});
