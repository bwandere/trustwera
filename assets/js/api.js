(function () {
  'use strict';

  window.TrustWera = window.TrustWera || {};

  const DEFAULT_TIMEOUT_MS = 10000;

  /**
   * Represents an HTTP error with response status and optional parsed body.
   */
  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
      this.isNetworkError = false;
    }
  }

  /**
   * Represents a network-level failure (offline, DNS failure, connection refused, etc.).
   */
  class NetworkError extends Error {
    constructor(message, originalError) {
      super(message);
      this.name = 'NetworkError';
      this.isNetworkError = true;
      this.originalError = originalError;
    }
  }

  /**
   * Performs an HTTP request with timeout, AbortSignal handling, and error body parsing.
   *
   * @param {string} endpoint
   * @param {RequestInit & { timeout?: number }} options
   * @returns {Promise<any>}
   */
  async function request(endpoint, options = {}) {
    const config = window.TrustWera.config || { API_BASE: '' };
    const baseURL = (config.API_BASE || '').replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const url = baseURL + path;

    const timeoutMs = typeof options.timeout === 'number' ? options.timeout : DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    let timeoutId = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(new DOMException('Request timed out after ' + timeoutMs + 'ms', 'TimeoutError'));
      }, timeoutMs);
    }

    // Connect caller-supplied AbortSignal if present
    if (options.signal) {
      if (options.signal.aborted) {
        if (timeoutId) clearTimeout(timeoutId);
        throw options.signal.reason || new DOMException('Aborted', 'AbortError');
      }
      options.signal.addEventListener('abort', () => {
        controller.abort(options.signal.reason);
      });
    }

    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const fetchOptions = {
      ...options,
      body,
      headers,
      signal: controller.signal
    };

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      // Distinguish caller cancellation from network failure
      if (options.signal && options.signal.aborted) {
        const cancelErr = new DOMException('Request aborted', 'AbortError');
        cancelErr.isNetworkError = false;
        throw cancelErr;
      }
      if (err.name === 'TimeoutError' || (err.message && err.message.includes('timed out'))) {
        const timeoutErr = new NetworkError('Request timed out. Please check your internet connection.', err);
        throw timeoutErr;
      }
      if (err.name === 'AbortError') {
        const abortErr = new DOMException('Request aborted', 'AbortError');
        abortErr.isNetworkError = false;
        throw abortErr;
      }

      throw new NetworkError('Unable to connect to the server. Please verify your connection.', err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    let parsedData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        parsedData = await response.json();
      } catch (jsonErr) {
        parsedData = null;
      }
    } else {
      try {
        parsedData = await response.text();
      } catch (textErr) {
        parsedData = null;
      }
    }

    if (!response.ok) {
      let message = 'Request failed with status ' + response.status;
      if (parsedData && typeof parsedData === 'object' && parsedData.error) {
        if (typeof parsedData.error === 'string') {
          message = parsedData.error;
        } else if (typeof parsedData.error === 'object' && parsedData.error.message) {
          message = String(parsedData.error.message);
        } else {
          message = 'Server error. Please try again shortly.';
        }
      } else if (response.status === 404) {
        message = 'The requested resource was not found.';
      } else if (response.status === 409) {
        message = 'Conflict with existing data.';
      } else if (response.status >= 500) {
        message = 'Server error. Please try again shortly.';
      }
      throw new ApiError(message, response.status, parsedData);
    }

    return parsedData;
  }

  window.TrustWera.api = {
    request,
    get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
    ApiError,
    NetworkError
  };
})();
