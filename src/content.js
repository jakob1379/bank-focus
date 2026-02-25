const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let observer = null;

const processRow = (row) => {
  const cb = row.querySelector('input[type="checkbox"]');
  if (!cb) return;
  if (cb.checked) row.style.display = 'none';
  cb.addEventListener('change', () => {
    row.style.display = cb.checked ? 'none' : '';
  });
};

const enable = () => {
  if (observer) return;
  document.querySelectorAll('.PostingTable-tr').forEach(processRow);
  observer = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && n.matches?.('.PostingTable-tr')) processRow(n);
  })));
  observer.observe(document.body, { childList: true, subtree: true });
};

const disable = () => {
  if (!observer) return;
  observer.disconnect();
  observer = null;
  document.querySelectorAll('.PostingTable-tr').forEach(r => r.style.display = '');
};

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
  setIcon(enabled);
  if (enabled) enable();
});

browserAPI.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'enable') {
    enable();
    setIcon(true);
  }
  if (msg.action === 'disable') {
    disable();
    setIcon(false);
  }
});
