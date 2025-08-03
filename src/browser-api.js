export const isFirefox =
  typeof globalThis.browser !== 'undefined' && !!globalThis.browser.runtime;
export const isChrome =
  typeof globalThis.chrome !== 'undefined' && !!globalThis.chrome.runtime && !isFirefox;

export const browser = isFirefox ? globalThis.browser : globalThis.chrome;

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
