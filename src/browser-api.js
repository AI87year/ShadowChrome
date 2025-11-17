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
  return invokeWithCallback(
    (...args) => browser.runtime.sendMessage(...args),
    message
  );
}

export function getFromStorage(keys) {
  return invokeWithCallback(
    (...args) => browser.storage.local.get(...args),
    keys
  );
}

export function setInStorage(obj) {
  return invokeWithCallback(
    (...args) => browser.storage.local.set(...args),
    obj
  );
}

export function removeFromStorage(keys) {
  return invokeWithCallback(
    (...args) => browser.storage.local.remove(...args),
    keys
  );
}

function getLastRuntimeError() {
  const runtime = browser && browser.runtime;
  const lastError = runtime && runtime.lastError;
  if (!lastError) {
    return null;
  }
  if (lastError instanceof Error) {
    return lastError;
  }
  const error = new Error(lastError.message || String(lastError));
  if (lastError.name) {
    error.name = lastError.name;
  }
  return error;
}

function invokeWithCallback(fn, ...args) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveOnce = value => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    const rejectOnce = error => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    const callback = (...cbArgs) => {
      const runtimeError = getLastRuntimeError();
      if (runtimeError) {
        rejectOnce(runtimeError);
        return;
      }
      if (cbArgs.length === 0) {
        resolveOnce(undefined);
      } else if (cbArgs.length === 1) {
        resolveOnce(cbArgs[0]);
      } else {
        resolveOnce(cbArgs);
      }
    };

    let maybePromise;
    try {
      maybePromise = fn(...args, callback);
    } catch (error) {
      rejectOnce(error);
      return;
    }

    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(resolveOnce, rejectOnce);
    }
  });
}
// Updated: 2025-11-17
