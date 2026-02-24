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

chrome.storage.local.get('hideEnabled', ({hideEnabled}) => {
  checkbox.checked = !!hideEnabled;
  updateStatus(!!hideEnabled);
});

checkbox.addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  updateStatus(enabled);
  await chrome.storage.local.set({ hideEnabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: enabled ? 'enable' : 'disable' });
  }
});
