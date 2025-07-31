async function loadConfig() {
  try {
    const res = await fetch('http://localhost:3000/config');
    const cfg = await res.json();
    document.getElementById('port').value = cfg.localPort || '1080';
    if (cfg.accessUrl) {
      document.getElementById('url').value = cfg.accessUrl;
    }
  } catch (e) {
    console.error('Failed to load config', e);
  }
}

document.addEventListener('DOMContentLoaded', loadConfig);

document.getElementById('connect').addEventListener('click', async () => {
  const port = document.getElementById('port').value || '1080';
  const url = document.getElementById('url').value.trim();
  const status = document.getElementById('status');
  status.textContent = 'Starting proxy...';

  try {
    await fetch('http://localhost:3000/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, localPort: port })
    });
    await fetch('http://localhost:3000/start', { method: 'POST' });
    chrome.runtime.sendMessage({ type: 'set-proxy', host: '127.0.0.1', port }, response => {
      if (response && response.success) {
        status.textContent = 'Proxy running on 127.0.0.1:' + port;
      } else {
        status.textContent = 'Error: ' + (response && response.error);
      }
    });
  } catch (err) {
    status.textContent = 'Failed to start proxy';
  }
});

document.getElementById('disconnect').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Stopping...';
  try {
    await fetch('http://localhost:3000/stop', { method: 'POST' });
    chrome.runtime.sendMessage({ type: 'clear-proxy' }, () => {
      status.textContent = 'Proxy stopped';
    });
  } catch (e) {
    status.textContent = 'Failed to stop proxy';
  }
});
