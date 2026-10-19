// Find Workers page logic
(function () {
  'use strict';

  const PAGE_SIZE = 24;

  // DOM Elements
  const form = document.getElementById('workers-filter-form');
  const tradeSelect = document.getElementById('filter-trade');
  const locationInput = document.getElementById('filter-location');
  const availableCheckbox = document.getElementById('filter-available');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const activeFiltersContainer = document.getElementById('active-filters');
  const resultsSummary = document.getElementById('results-summary');
  const workersGrid = document.getElementById('workers-grid');
  const showMoreContainer = document.getElementById('show-more-container');
  const showMoreBtn = document.getElementById('show-more-btn');
  const emptyState = document.getElementById('empty-state');
  const errorState = document.getElementById('error-state');
  const errorMessage = document.getElementById('error-message');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const retryBtn = document.getElementById('retry-btn');

  // Active request controller for race condition cancellation
  let currentController = null;

  // In-memory workers cache for client-side pagination
  let allWorkers = [];
  let displayedCount = 0;

  /**
   * Escape HTML utility fallback if workerCard not yet loaded
   */
  function escapeText(str) {
    if (window.TrustWera && window.TrustWera.workerCard && window.TrustWera.workerCard.escapeHTML) {
      return window.TrustWera.workerCard.escapeHTML(str);
    }
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format skill label
   */
  function formatSkillLabel(name) {
    if (window.TrustWera && window.TrustWera.workerCard && window.TrustWera.workerCard.formatSkill) {
      return window.TrustWera.workerCard.formatSkill(name);
    }
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Read filter parameters from the current URL query string
   * and pre-fill form controls.
   * Checkbox is checked only if available=true is present.
   */
  function readFiltersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const trade = urlParams.get('trade') || '';
    const location = urlParams.get('location') || '';
    const available = urlParams.get('available') === 'true';

    if (tradeSelect) tradeSelect.value = trade;
    if (locationInput) locationInput.value = location;
    if (availableCheckbox) availableCheckbox.checked = available;
  }

  /**
   * Build fetch query parameters from current form filter inputs.
   * Only include trade/location if non-empty.
   * Only include available=true if checkbox is checked (never send available=false).
   */
  function buildQueryParams() {
    const params = new URLSearchParams();
    const trade = tradeSelect ? tradeSelect.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    const isAvailableChecked = availableCheckbox ? availableCheckbox.checked : false;

    if (trade) {
      params.set('trade', trade);
    }
    if (location) {
      params.set('location', location);
    }
    if (isAvailableChecked) {
      params.set('available', 'true');
    }

    return params;
  }

  /**
   * Render active filter chips that remove themselves when clicked
   */
  function renderActiveFilterChips() {
    if (!activeFiltersContainer) return;
    activeFiltersContainer.innerHTML = '';

    const trade = tradeSelect ? tradeSelect.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    const available = availableCheckbox ? availableCheckbox.checked : false;

    const chips = [];

    if (trade) {
      chips.push({
        label: `Trade: ${formatSkillLabel(trade)}`,
        clear: () => {
          if (tradeSelect) tradeSelect.value = '';
        }
      });
    }

    if (location) {
      chips.push({
        label: `Location: ${location}`,
        clear: () => {
          if (locationInput) locationInput.value = '';
        }
      });
    }

    if (available) {
      chips.push({
        label: 'Available now',
        clear: () => {
          if (availableCheckbox) availableCheckbox.checked = false;
        }
      });
    }

    if (chips.length === 0) {
      activeFiltersContainer.hidden = true;
      return;
    }

    activeFiltersContainer.hidden = false;
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip';
      btn.setAttribute('aria-label', `Remove filter ${chip.label}`);
      btn.innerHTML = `<span>${escapeText(chip.label)}</span> <span class="filter-chip__remove" aria-hidden="true">&times;</span>`;
      btn.addEventListener('click', () => {
        chip.clear();
        applyFiltersAndPushHistory();
      });
      activeFiltersContainer.appendChild(btn);
    });
  }

  /**
   * Render loading skeleton cards
   */
  function renderSkeletons(count = 6) {
    if (!workersGrid) return;
    workersGrid.innerHTML = '';
    workersGrid.hidden = false;
    for (let i = 0; i < count; i++) {
      const card = document.createElement('li');
      card.className = 'worker-card worker-card--skeleton';
      card.setAttribute('aria-hidden', 'true');
      card.innerHTML = `
        <div class="worker-card__top">
          <div class="skeleton skeleton-avatar"></div>
          <div class="worker-card__header-text" style="flex:1;">
            <div class="skeleton skeleton-line" style="width: 60%; height: 1.1rem; margin-bottom: 0.5rem;"></div>
            <div class="skeleton skeleton-line" style="width: 40%; height: 0.9rem; margin-bottom: 0.5rem;"></div>
            <div class="skeleton skeleton-line" style="width: 50%; height: 0.8rem;"></div>
          </div>
        </div>
        <div class="worker-card__meta" style="margin-top: 1rem;">
          <div class="skeleton skeleton-line" style="width: 70%; height: 0.8rem; margin-bottom: 0.5rem;"></div>
          <div class="skeleton skeleton-line" style="width: 50%; height: 0.8rem;"></div>
        </div>
        <div class="skeleton skeleton-line" style="width: 100%; height: 38px; margin-top: auto; border-radius: 8px;"></div>
      `;
      workersGrid.appendChild(card);
    }
  }

  /**
   * Set loading UI state
   */
  function setLoadingState() {
    if (submitBtn) submitBtn.disabled = true;
    if (resultsSummary) resultsSummary.textContent = 'Searching for workers…';
    renderSkeletons(6);
    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = true;
    if (showMoreContainer) showMoreContainer.hidden = true;
  }

  /**
   * Append next batch of workers to the grid (up to PAGE_SIZE)
   */
  function renderNextBatch() {
    if (!workersGrid) return;

    if (displayedCount === 0) {
      workersGrid.innerHTML = '';
      workersGrid.hidden = false;
    }

    const nextBatch = allWorkers.slice(displayedCount, displayedCount + PAGE_SIZE);
    nextBatch.forEach(worker => {
      const card = window.TrustWera.workerCard.renderWorkerCard(worker);
      workersGrid.appendChild(card);
    });

    displayedCount += nextBatch.length;

    // Update announcement text in aria-live container
    if (resultsSummary) {
      if (allWorkers.length <= PAGE_SIZE) {
        resultsSummary.textContent = `${allWorkers.length} ${allWorkers.length === 1 ? 'worker' : 'workers'} found`;
      } else {
        resultsSummary.textContent = `Showing ${displayedCount} of ${allWorkers.length} workers found`;
      }
    }

    // Toggle "Show more" button
    if (showMoreContainer) {
      if (displayedCount < allWorkers.length) {
        showMoreContainer.hidden = false;
        if (showMoreBtn) {
          const remaining = allWorkers.length - displayedCount;
          showMoreBtn.textContent = `Show more (${remaining} remaining)`;
        }
      } else {
        showMoreContainer.hidden = true;
      }
    }
  }

  /**
   * Set success UI state
   */
  function setSuccessState(workers) {
    if (submitBtn) submitBtn.disabled = false;
    allWorkers = workers;
    displayedCount = 0;

    if (allWorkers.length === 0) {
      setEmptyState();
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = true;
    renderNextBatch();
  }

  /**
   * Set empty UI state
   */
  function setEmptyState() {
    if (submitBtn) submitBtn.disabled = false;
    allWorkers = [];
    displayedCount = 0;

    if (resultsSummary) resultsSummary.textContent = '0 workers found';
    if (workersGrid) {
      workersGrid.innerHTML = '';
      workersGrid.hidden = true;
    }
    if (showMoreContainer) showMoreContainer.hidden = true;
    if (emptyState) emptyState.hidden = false;
    if (errorState) errorState.hidden = true;
  }

  /**
   * Set error UI state
   */
  function setErrorState(message) {
    if (submitBtn) submitBtn.disabled = false;
    allWorkers = [];
    displayedCount = 0;

    const text = message || "Couldn't load workers right now — try again shortly";
    if (resultsSummary) resultsSummary.textContent = text;
    if (errorMessage) errorMessage.textContent = text;
    if (workersGrid) {
      workersGrid.innerHTML = '';
      workersGrid.hidden = true;
    }
    if (showMoreContainer) showMoreContainer.hidden = true;
    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = false;
  }

  /**
   * Fetch workers via window.TrustWera.api.get
   */
  async function fetchWorkers() {
    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    setLoadingState();
    renderActiveFilterChips();

    const params = buildQueryParams();
    const queryString = params.toString();
    const endpoint = '/api/workers' + (queryString ? '?' + queryString : '');

    try {
      const workers = await window.TrustWera.api.get(endpoint, {
        signal: currentController.signal
      });

      if (!Array.isArray(workers) || workers.length === 0) {
        setEmptyState();
      } else {
        setSuccessState(workers);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Caller cancelled or a newer request was dispatched
      }
      console.error('Failed to fetch workers:', err);
      const userMessage = err.message && !err.isNetworkError && (!err.status || err.status < 500) && err.message !== '[object Object]'
        ? err.message
        : "Couldn't load workers right now — try again shortly";
      setErrorState(userMessage);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  /**
   * Push current form state to URL and fetch
   */
  function applyFiltersAndPushHistory() {
    const params = buildQueryParams();
    const queryString = params.toString();
    const newURL = window.location.pathname + (queryString ? `?${queryString}` : '');
    window.history.pushState(null, '', newURL);
    fetchWorkers();
  }

  /**
   * Event Listeners
   */

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      applyFiltersAndPushHistory();
    });
  }

  // Handle browser Back/Forward navigation
  window.addEventListener('popstate', function () {
    readFiltersFromURL();
    fetchWorkers();
  });

  // Client-side Show More button click
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function () {
      renderNextBatch();
    });
  }

  // Clear filters button (in empty state)
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      if (tradeSelect) tradeSelect.value = '';
      if (locationInput) locationInput.value = '';
      if (availableCheckbox) availableCheckbox.checked = false;

      const newURL = window.location.pathname;
      window.history.pushState(null, '', newURL);
      fetchWorkers();
    });
  }

  // Retry button (in error state)
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      fetchWorkers();
    });
  }

  // Initial page load
  function init() {
    readFiltersFromURL();
    fetchWorkers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
