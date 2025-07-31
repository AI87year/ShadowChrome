# ShadowChrome

ShadowChrome combines a Chrome extension with a small Node.js service to route traffic through a Shadowsocks proxy.  Paste a `ss://` or `ssconf://` access key and the extension will launch a local proxy using `localssjs`.

## Features

- Paste an access key (`ss://` or `ssconf://`) to configure the proxy
- Extension sets Chrome proxy settings automatically
- Helper service spawns `localssjs` from the [encryptsocks](https://github.com/oyyd/encryptsocks) project
- Uses [outline-shadowsocksconfig](https://github.com/Jigsaw-Code/outline-shadowsocksconfig) to parse access keys

## Usage

1. Install dependencies and start the helper service:

   ```bash
   cd server
   npm install
   node index.js
   ```

   The service exposes:
   - `POST /configure` with `{url, localPort}` to parse an access key
   - `POST /start` to launch the local proxy
   - `POST /stop` to stop it
   - `GET /config` to return the current configuration

2. Load the `src/` folder as an unpacked extension in Chrome (`chrome://extensions`).

3. Click the ShadowChrome icon, paste your access key and desired local port, then click **Connect**. The proxy will start and Chrome will route traffic through it.

## Configuring the server

If you prefer static configuration you can edit `server/config.json` manually:

```json
{
  "serverAddr": "your.server.com",
  "serverPort": 8388,
  "localPort": 1080,
  "password": "example-password",
  "method": "aes-256-gcm",
  "accessUrl": "ss://example"
}
```

## Development

Modify the files in `src/` and reload the extension to test changes. The helper service can be restarted with `node index.js`.

## License

MIT
