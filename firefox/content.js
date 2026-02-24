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

browser.storage.local.get('hideEnabled').then(({hideEnabled}) => {
  if (hideEnabled) enable();
});

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'enable') enable();
  if (msg.action === 'disable') disable();
});
