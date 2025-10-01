export const isFirefox =
  typeof globalThis.browser !== 'undefined' && !!globalThis.browser.runtime;
export const isChrome =
  typeof globalThis.chrome !== 'undefined' && !!globalThis.chrome.runtime && !isFirefox;

const stubStorageData = {};

function normaliseGetKeys(keys) {
  if (typeof keys === 'undefined') {
    return Object.keys(stubStorageData);
  }
  if (typeof keys === 'string') {
    return [keys];
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  if (keys && typeof keys === 'object') {
    return Object.keys(keys);
  }
  return [];
}

function buildGetResult(keys, defaults = {}) {
  const result = {};
  keys.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(stubStorageData, key)) {
      result[key] = stubStorageData[key];
    } else if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      result[key] = defaults[key];
    }
  });
  return result;
}

const stubBrowser = {
  __shadowChromeStub: true,
  runtime: {
    lastError: null,
    async sendMessage() {
      throw new Error('Extension runtime unavailable in preview mode.');
    },
    getURL(path) {
      return path;
    },
    async openOptionsPage() {
      throw new Error('Extension runtime unavailable in preview mode.');
    },
    onMessage: {
      addListener() {},
      removeListener() {}
    }
  },
  storage: {
    local: {
      async get(keys) {
        if (typeof keys === 'object' && !Array.isArray(keys)) {
          const defaults = keys || {};
          const keyList = normaliseGetKeys(keys);
          return { ...defaults, ...buildGetResult(keyList, defaults) };
        }
        const keyList = normaliseGetKeys(keys);
        if (!keyList.length) {
          return { ...stubStorageData };
        }
        return buildGetResult(keyList, {});
      },
      async set(items) {
        Object.assign(stubStorageData, items);
      },
      async remove(keys) {
        const keyList = normaliseGetKeys(keys);
        keyList.forEach(key => {
          delete stubStorageData[key];
        });
      }
    },
    onChanged: {
      addListener() {},
      removeListener() {}
    }
  },
  tabs: {
    async create() {
      throw new Error('Extension runtime unavailable in preview mode.');
    }
  },
  sockets: {
    tcp: {
      create() {},
      connect() {},
      setPaused() {},
      send() {},
      close() {},
      onReceive: {
        addListener() {},
        removeListener() {}
      },
      onReceiveError: {
        addListener() {},
        removeListener() {}
      }
    },
    tcpServer: {
      create() {},
      listen() {},
      close() {},
      onAccept: {
        addListener() {},
        removeListener() {}
      }
    }
  }
};

const activeBrowser = isFirefox
  ? globalThis.browser
  : isChrome
    ? globalThis.chrome
    : stubBrowser;

export const browser = activeBrowser;
export const isStub = activeBrowser === stubBrowser;

// Utility wrappers used across the project to provide consistent Promise-based
// APIs regardless of whether the underlying implementation uses callbacks.

export function asyncMessage(message) {
  return new Promise(resolve => {
    browser.runtime.sendMessage(message, resolve);
  });
}

export function getFromStorage(keys) {
  return new Promise(resolve => {
    browser.storage.local.get(keys, resolve);
  });
}

export function setInStorage(obj) {
  return new Promise(resolve => {
    browser.storage.local.set(obj, resolve);
  });
}

export function removeFromStorage(keys) {
  return new Promise(resolve => {
    browser.storage.local.remove(keys, resolve);
  });
}
// Updated: 2025-10-01
