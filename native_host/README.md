# Native Messaging Host

The Python script `shadowchrome_host.py` acts as the native host for the Chrome extension. It must be registered with Chrome using a manifest file.

1. Replace `__HOST_PATH__` in `shadowchrome_host.json` with the absolute path to `shadowchrome_host.py`.
2. Replace `__EXT_ID__` with the extension's ID once installed unpacked.
3. Copy the manifest to the platform-specific location:
   - **Windows:** `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts`.
   - **Linux:** `~/.config/google-chrome/NativeMessagingHosts`.
4. Ensure `ss-local` from a Shadowsocks client is installed and in `PATH`.

The host listens for JSON messages from the extension to start or stop `ss-local` using the provided server configuration.
