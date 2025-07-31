const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const {
  SHADOWSOCKS_URI,
  parseOnlineConfigUrl,
} = require('./shadowsocks_config');

const app = express();
app.use(express.json());
const configPath = path.join(__dirname, 'config.json');
let ssProcess = null;

function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function parseAccessUrl(url) {
  if (url.startsWith('ssconf://')) {
    const params = parseOnlineConfigUrl(url);
    const requester = params.location.startsWith('https') ? https : http;
    const method = params.httpMethod || 'GET';
    return new Promise((resolve, reject) => {
      const req = requester.request(params.location, { method }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error('HTTP ' + res.statusCode));
          }
          data = data.toString().trim();
          try {
            if (data.startsWith('ss://')) {
              return resolve(SHADOWSOCKS_URI.parse(data));
            }
            const obj = JSON.parse(data);
            if (obj.accessUrl) {
              return resolve(SHADOWSOCKS_URI.parse(obj.accessUrl));
            }
          } catch (e) {
            return reject(e);
          }
          reject(new Error('Invalid config response'));
        });
      });
      req.on('error', reject);
      req.end();
    });
  }
  return SHADOWSOCKS_URI.parse(url);
}

app.get('/config', (req, res) => {
  try {
    const cfg = loadConfig();
    res.json(cfg);
  } catch (err) {
    console.error('Failed to load config', err);
    res.status(500).send('Missing config');
  }
});

app.post('/configure', async (req, res) => {
  const { url, localPort } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
  }
  try {
    const cfg = await parseAccessUrl(url);
    const finalCfg = {
      serverAddr: cfg.host.data,
      serverPort: parseInt(cfg.port.data, 10),
      password: cfg.password.data,
      method: cfg.method.data,
      localPort: localPort || 1080,
      accessUrl: url
    };
    fs.writeFileSync(configPath, JSON.stringify(finalCfg, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to configure', err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/start', (req, res) => {
  if (ssProcess) {
    return res.json({ running: true });
  }

  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    console.error('Failed to load config', err);
    return res.status(500).send('Missing config');
  }

  const localssPath = path.join(__dirname, 'node_modules', '.bin', 'localssjs');
  const args = [
    '-s', cfg.serverAddr,
    '-p', String(cfg.serverPort),
    '-l', '127.0.0.1',
    '-b', String(cfg.localPort || 1080),
    '-k', cfg.password,
    '-m', cfg.method || 'aes-128-cfb'
  ];

  ssProcess = spawn(localssPath, args, { stdio: 'inherit' });
  ssProcess.on('close', (code) => {
    console.log(`localssjs exited with code ${code}`);
    ssProcess = null;
  });

  res.json({ started: true });
});

app.post('/stop', (req, res) => {
  if (ssProcess) {
    ssProcess.kill();
    ssProcess = null;
    return res.json({ stopped: true });
  }
  res.json({ running: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
