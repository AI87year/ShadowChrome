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
    signal,
    ...init
  } = options;

  const shouldTimeout = Number.isFinite(timeout) && timeout > 0;
  const timeoutController = shouldTimeout ? new AbortController() : null;
  const timeoutError = shouldTimeout ? createTimeoutError(message) : null;
  const timer = shouldTimeout
    ? setTimeout(() => timeoutController.abort(timeoutError), timeout)
    : null;

  const { signal: combinedSignal, cleanup } = combineAbortSignals(
    signal,
    timeoutController ? timeoutController.signal : null
  );

  try {
    const response = await fetch(
      input,
      combinedSignal ? { ...init, signal: combinedSignal } : init
    );
    return response;
  } catch (error) {
    if (
      timeoutController &&
      timeoutController.signal.aborted &&
      timeoutController.signal.reason === timeoutError
    ) {
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    cleanup();
  }
}

function combineAbortSignals(...signals) {
  const filtered = signals.filter(Boolean);
  if (!filtered.length) {
    return { signal: undefined, cleanup: () => {} };
  }
  if (filtered.length === 1) {
    return { signal: filtered[0], cleanup: () => {} };
  }
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(filtered), cleanup: () => {} };
  }
  const controller = new AbortController();
  const listeners = [];
  const forwardAbort = abortedSignal => {
    if (!controller.signal.aborted) {
      controller.abort(abortedSignal.reason);
    }
  };
  filtered.forEach(sig => {
    if (sig.aborted) {
      forwardAbort(sig);
      return;
    }
    const handler = () => forwardAbort(sig);
    sig.addEventListener('abort', handler, { once: true });
    listeners.push({ sig, handler });
  });
  return {
    signal: controller.signal,
    cleanup() {
      listeners.forEach(entry => {
        entry.sig.removeEventListener('abort', entry.handler);
      });
    }
  };
}

function createTimeoutError(message) {
  if (typeof DOMException === 'function') {
    return new DOMException(message, 'TimeoutError');
  }
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

// Updated: 2025-11-17
