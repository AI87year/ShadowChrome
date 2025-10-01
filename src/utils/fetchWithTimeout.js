/**
 * Performs a fetch request that automatically aborts after the provided timeout.
 * This prevents background sync routines from hanging indefinitely on stalled
 * network calls, which is a common MV3 best practice for resilient extensions.
 *
 * @param {RequestInfo | URL} input - The resource that should be fetched.
 * @param {Object} [options] - Timeout controls combined with standard fetch options.
 * @param {number} [options.timeout=8000] - Timeout in milliseconds.
 * @param {string} [options.message='Request timed out'] - Error message thrown on timeout.
 * @returns {Promise<Response>} Resolves with the fetch response or rejects if the
 *   request times out or fails. Remaining properties in `options` are forwarded to
 *   the underlying `fetch` call.
 */
export async function fetchWithTimeout(input, options = {}) {
  const {
    timeout = 8000,
    message = 'Request timed out',
    ...init
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(message);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Updated: 2025-10-01
