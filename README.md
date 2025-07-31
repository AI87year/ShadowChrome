# ShadowChrome

ShadowChrome is a Chrome extension paired with a small Node.js helper server. The server launches a local Shadowsocks proxy and is controlled by the extension over HTTP.

## Requirements

- Node.js and npm
- Google Chrome or Chromium

## Running the helper server

1. Open the `server` directory and install the dependencies:

```bash
cd server
npm install
```

2. Start the server:

```bash
npm start
```

By default the service listens at `http://localhost:3000` and exposes a simple API:

- `POST /configure` &mdash; pass `{url, localPort}` where `url` is a `ss://` or `ssconf://` link
- `POST /start` &mdash; start the Shadowsocks process
- `POST /stop` &mdash; stop the proxy
- `GET  /config` &mdash; retrieve the current configuration

## Installing the extension

1. Navigate to `chrome://extensions/` and enable Developer mode.
2. Click **Load unpacked** and select the `src` folder.
3. Chrome may warn about permissions; the extension only talks to `http://localhost:3000`.

To distribute the extension you can zip the contents of `src` and load it using
"Load unpacked" or publish it in the Chrome Web Store.

Once the server is running click on the ShadowChrome icon:

- Paste an `ss://` or `ssconf://` key in the **Access URL** field
- Enter the local proxy port (1080 by default)
- Press **Connect** to start the proxy
- **Disconnect** stops the proxy and clears Chrome's proxy settings

## Alternative configuration

You can preconfigure `server/config.json`:

```json
{
  "serverAddr": "example.com",
  "serverPort": 8388,
  "localPort": 1080,
  "password": "password",
  "method": "aes-256-gcm",
  "accessUrl": "ss://..."
}
```

After editing simply start the server and connect via the extension.

## Development

Modify the files in `src/` and reload the extension in Chrome. The helper server
can be restarted with `npm start` inside the `server` directory.

## License

MIT
