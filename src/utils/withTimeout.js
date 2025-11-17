/**
 * Wraps a promise with a timeout. If the promise does not settle within the
 * specified duration, the returned promise rejects.
 *
 * @template T
 * @param {Promise<T>} promise - The promise to wrap.
 * @param {number} ms - Timeout in milliseconds.
 * @param {string} [message='Operation timed out'] - Error message on timeout.
 * @returns {Promise<T>} A promise that resolves or rejects with the original
 *   promise's outcome, or rejects if the timeout is reached first.
 */
export function withTimeout(promise, ms, message = 'Operation timed out') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
// Updated: 2025-11-13
