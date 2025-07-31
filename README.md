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
4. The extension works unpacked, but you can create a zip for distribution:

   ```bash
   zip -r ShadowChrome.zip src
   ```

   Upload the generated archive to the Chrome Web&nbsp;Store or keep it for manual installation.


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

## Included code

ShadowChrome bundles a small subset of existing Shadowsocks tooling so the server
can launch a proxy without any additional downloads. The following projects are
embedded or used as dependencies:

- [`encryptsocks`](https://github.com/oyyd/encryptsocks) (BSD) provides the
  `localssjs` binary used to run a local Shadowsocks proxy. This package is a
  modern fork of [`shadowsocks-nodejs`](https://github.com/shadowsocks/shadowsocks-nodejs).
- [`outline-shadowsocksconfig`](https://github.com/Jigsaw-Code/outline-shadowsocksconfig)
  (Apache&nbsp;2.0) supplies the parsing logic in `server/shadowsocks_config.js`
  for handling `ss://` and `ssconf://` configuration URLs.

These components originate from the GitHub organizations
[shadowsocks](https://github.com/orgs/shadowsocks/repositories?type=all) and
[Jigsaw-Code](https://github.com/orgs/Jigsaw-Code/repositories?type=all).

## License

The ShadowChrome code is released under the terms of the
[MIT License](LICENSE). Third‑party components retain their respective
licenses as noted above.
