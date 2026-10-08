// TrustWera API fetch wrapper
(function() {
  'use strict';

  window.TrustWera = window.TrustWera || {};

  /**
   * Represents a network connectivity failure or request timeout.
   */
  class NetworkError extends Error {
    constructor(message, isTimeout) {
      super(message || 'Network connection failed. Please check your internet connection.');
      this.name = 'NetworkError';
      this.isNetworkError = true;
      this.isTimeout = Boolean(isTimeout);
    }
  }

  /**
   * Represents an HTTP error response from the server (e.g. 400, 404, 500).
   */
  class HttpError extends Error {
    constructor(status, message, data) {
      super(message || `Request failed with status ${status}`);
      this.name = 'HttpError';
      this.status = status;
      this.data = data;
      this.isHttpError = true;
    }
  }

  /**
   * Central request helper with timeout, signal combination, and error discrimination.
   *
   * @param {string} endpoint - Path or absolute URL (e.g. "/api/workers")
   * @param {object} [options] - Standard fetch options + optional timeout (ms)
   * @returns {Promise<any>}
   */
  async function request(endpoint, options) {
    const opts = options || {};
    const config = window.TrustWera.Config || { API_BASE: '' };
    const baseURL = config.API_BASE || '';
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : (baseURL + endpoint);

    const timeoutMs = opts.timeout !== undefined ? opts.timeout : 10000;
    const controller = new AbortController();
    let timeoutId = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(new NetworkError(`Request timed out after ${timeoutMs / 1000} seconds`, true));
      }, timeoutMs);
    }

    // Propagate external caller AbortSignal
    if (opts.signal) {
      if (opts.signal.aborted) {
        if (timeoutId) clearTimeout(timeoutId);
        throw opts.signal.reason || new DOMException('Aborted', 'AbortError');
      }
      opts.signal.addEventListener('abort', () => {
        controller.abort(opts.signal.reason);
      }, { once: true });
    }

    const headers = {
      'Accept': 'application/json',
      ...(opts.headers || {})
    };

    let body = opts.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const fetchConfig = {
      ...opts,
      headers,
      body,
      signal: controller.signal
    };

    let response;
    try {
      response = await fetch(url, fetchConfig);
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      // Distinguish caller cancellation from network/timeout errors
      if (opts.signal && opts.signal.aborted) {
        const abortErr = new Error('Request was aborted');
        abortErr.name = 'AbortError';
        abortErr.isAbort = true;
        throw abortErr;
      }

      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason && reason.isTimeout) {
          throw reason;
        }
        const timeoutErr = new NetworkError('Request timed out. Please check your connection and try again.', true);
        throw timeoutErr;
      }

      const netErr = new NetworkError(err.message || 'Unable to connect to the server');
      netErr.originalError = err;
      throw netErr;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    // Parse response body
    let parsedData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        parsedData = await response.json();
      } catch (_) {
        parsedData = null;
      }
    } else {
      try {
        const text = await response.text();
        if (text) parsedData = text;
      } catch (_) {
        parsedData = null;
      }
    }

    if (!response.ok) {
      let errorMessage = `Server responded with status ${response.status}`;
      if (parsedData && typeof parsedData === 'object' && parsedData.error) {
        errorMessage = parsedData.error;
      } else if (typeof parsedData === 'string' && parsedData.trim()) {
        errorMessage = parsedData.trim();
      }
      throw new HttpError(response.status, errorMessage, parsedData);
    }

    return parsedData;
  }

  function get(endpoint, options) {
    return request(endpoint, { ...options, method: 'GET' });
  }

  function post(endpoint, body, options) {
    return request(endpoint, { ...options, method: 'POST', body });
  }

  window.TrustWera.api = {
    request,
    get,
    post,
    NetworkError,
    HttpError
  };
})();
