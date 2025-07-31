const loginView = document.getElementById('loginView');
const mainView = document.getElementById('mainView');
const configInput = document.getElementById('configKey');
const importBtn = document.getElementById('importBtn');
const loginError = document.getElementById('loginError');
const serverSelect = document.getElementById('serverSelect');
const statusEl = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const logoutBtn = document.getElementById('logoutBtn');

function show(view) {
  loginView.classList.add('hidden');
  mainView.classList.add('hidden');
  view.classList.remove('hidden');
}

async function parseKey(key) {
  if (key.startsWith('ss://')) {
    const cleaned = key.replace('ss://', '').split('#')[0];
    const [userinfo, hostinfo] = cleaned.split('@');
    const [method, password] = atob(userinfo).split(':');
    const [server, port] = hostinfo.split(':');
    return [{ name: server, server, port, method, password }];
  }
  const lower = key.toLowerCase();
  if (lower.startsWith('sconf://') || lower.startsWith('ssconf://') || lower.startsWith('outline://')) {
    const cleaned = key.replace(/^[a-zA-Z]+:\/\//, '');
    const fetchUrl = cleaned.startsWith('http') ? cleaned : 'https://' + cleaned;
    const res = await fetch(fetchUrl);
    const data = await res.json();
    return data.servers || [];
  }
  try {
    const data = JSON.parse(atob(key));
    return data.servers || [];
  } catch (e) {
    throw new Error('Invalid key');
  }
}

async function loadProfile() {
  const data = await chrome.storage.local.get(['servers', 'selected']);
  if (data.servers) {
    populateServers(data.servers, data.selected);
    show(mainView);
  }
}

function populateServers(servers, selected) {
  serverSelect.innerHTML = '';
  servers.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = s.name || s.server;
    if (selected === i) opt.selected = true;
    serverSelect.appendChild(opt);
  });
}

importBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  try {
    const servers = await parseKey(configInput.value.trim());
    await chrome.storage.local.set({ servers, selected: 0 });
    populateServers(servers, 0);
    show(mainView);
  } catch (e) {
    loginError.textContent = e.message;
  }
});

serverSelect.addEventListener('change', () => {
  const idx = parseInt(serverSelect.value, 10);
  chrome.storage.local.set({ selected: idx });
});

connectBtn.addEventListener('click', async () => {
  const idx = parseInt(serverSelect.value, 10);
  const servers = (await chrome.storage.local.get('servers')).servers;
  const server = servers[idx];
  await chrome.storage.local.set({ selected: idx });
  statusEl.textContent = 'Connecting...';
  statusEl.className = 'status connecting';
  connectBtn.classList.add('hidden');
  disconnectBtn.classList.remove('hidden');
  chrome.runtime.sendMessage({ action: 'connect', server });
});

disconnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'disconnect' });
  statusEl.textContent = 'Disconnected';
  statusEl.className = 'status disconnected';
  disconnectBtn.classList.add('hidden');
  connectBtn.classList.remove('hidden');
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.clear();
  chrome.runtime.sendMessage({ action: 'logout' });
  show(loginView);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.status) {
    statusEl.textContent = msg.status;
    statusEl.className = 'status ' + msg.status.toLowerCase();
  }
});

loadProfile();
