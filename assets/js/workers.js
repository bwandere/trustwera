// Find Workers Page Logic
(function() {
  'use strict';

  // DOM Elements
  const form = document.getElementById('workers-filter-form');
  const tradeSelect = document.getElementById('filter-trade');
  const locationInput = document.getElementById('filter-location');
  const availableCheckbox = document.getElementById('filter-available');
  const submitBtn = document.getElementById('filter-submit-btn');
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

  // State
  let currentController = null;
  let allWorkers = [];
  let displayedCount = 24;
  const PAGE_SIZE = 24;

  /**
   * Read filter parameters from the URL query string and prefill form controls.
   */
  function readFiltersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const trade = urlParams.get('trade') || '';
    const location = urlParams.get('location') || '';
    const available = urlParams.get('available') === 'true';

    if (tradeSelect) tradeSelect.value = trade;
    if (locationInput) locationInput.value = location;
    if (availableCheckbox) availableCheckbox.checked = available;

    renderActiveFilterChips(trade, location, available);
  }

  /**
   * Render removable filter chips for active filters.
   */
  function renderActiveFilterChips(trade, location, available) {
    if (!activeFiltersContainer) return;

    const chips = [];

    if (trade) {
      const formatSkill = window.TrustWera?.formatSkill || (s => s);
      chips.push({
        type: 'trade',
        label: `Trade: ${formatSkill(trade)}`,
        clear: () => { if (tradeSelect) tradeSelect.value = ''; }
      });
    }

    if (location) {
      chips.push({
        type: 'location',
        label: `Location: ${location}`,
        clear: () => { if (locationInput) locationInput.value = ''; }
      });
    }

    if (available) {
      chips.push({
        type: 'available',
        label: 'Available now',
        clear: () => { if (availableCheckbox) availableCheckbox.checked = false; }
      });
    }

    if (chips.length === 0) {
      activeFiltersContainer.innerHTML = '';
      activeFiltersContainer.hidden = true;
      return;
    }

    activeFiltersContainer.innerHTML = '<span class="active-filters__label">Active filters:</span>';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'active-filter-chip';
      btn.setAttribute('aria-label', `Remove filter ${chip.label}`);
      btn.innerHTML = `${window.TrustWera.escapeHTML(chip.label)} <span class="active-filter-chip__remove" aria-hidden="true">&times;</span>`;
      btn.addEventListener('click', () => {
        chip.clear();
        applyCurrentFilters();
      });
      activeFiltersContainer.appendChild(btn);
    });

    activeFiltersContainer.hidden = false;
  }

  /**
   * Build fetch query string from current form filter inputs.
   */
  function buildQueryParams() {
    const params = new URLSearchParams();
    const trade = tradeSelect ? tradeSelect.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';
    const isAvailableChecked = availableCheckbox ? availableCheckbox.checked : false;

    if (trade) params.set('trade', trade);
    if (location) params.set('location', location);
    if (isAvailableChecked) params.set('available', 'true');

    return params;
  }

  /**
   * Update URL and re-fetch workers.
   */
  function applyCurrentFilters() {
    const params = buildQueryParams();
    const queryString = params.toString();
    const newURL = window.location.pathname + (queryString ? `?${queryString}` : '');

    window.history.pushState(null, '', newURL);
    readFiltersFromURL();
    fetchWorkers();
  }

  /**
   * Render loading skeleton placeholders without layout shift.
   */
  function setLoadingState() {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Searching…';
    }

    if (resultsSummary) {
      resultsSummary.textContent = 'Loading workers…';
    }

    if (workersGrid) {
      workersGrid.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const li = document.createElement('li');
        li.className = 'worker-card skeleton-card';
        li.setAttribute('aria-hidden', 'true');
        li.innerHTML = `
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
            <div class="skeleton" style="width: 52px; height: 52px; border-radius: 50%;"></div>
            <div style="flex: 1;">
              <div class="skeleton skeleton-text" style="width: 70%; height: 18px;"></div>
              <div class="skeleton skeleton-text" style="width: 40%; height: 14px;"></div>
            </div>
          </div>
          <div class="skeleton skeleton-text" style="width: 90%; height: 14px;"></div>
          <div class="skeleton skeleton-text" style="width: 60%; height: 14px; margin-bottom: 1.5rem;"></div>
          <div class="skeleton" style="width: 100%; height: 38px; margin-top: auto; border-radius: 8px;"></div>
        `;
        workersGrid.appendChild(li);
      }
      workersGrid.hidden = false;
    }

    if (showMoreContainer) showMoreContainer.hidden = true;
    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = true;
  }

  /**
   * Render slice of workers to the grid.
   */
  function renderWorkersList() {
    if (!workersGrid) return;

    workersGrid.innerHTML = '';
    const renderCard = window.TrustWera?.renderWorkerCard;
    const slice = allWorkers.slice(0, displayedCount);

    slice.forEach(worker => {
      if (typeof renderCard === 'function') {
        workersGrid.appendChild(renderCard(worker));
      }
    });

    workersGrid.hidden = false;

    // Show more button visibility
    if (showMoreContainer) {
      showMoreContainer.hidden = displayedCount >= allWorkers.length;
    }
  }

  function setSuccessState(workers) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Filter Workers';
    }

    allWorkers = workers;
    displayedCount = PAGE_SIZE;

    const count = allWorkers.length;
    if (resultsSummary) {
      resultsSummary.textContent = `${count} ${count === 1 ? 'worker' : 'workers'} found`;
    }

    renderWorkersList();

    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = true;
  }

  function setEmptyState() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Filter Workers';
    }

    allWorkers = [];
    if (resultsSummary) {
      resultsSummary.textContent = '0 workers found';
    }

    if (workersGrid) {
      workersGrid.innerHTML = '';
      workersGrid.hidden = true;
    }

    if (showMoreContainer) showMoreContainer.hidden = true;
    if (emptyState) emptyState.hidden = false;
    if (errorState) errorState.hidden = true;
  }

  function setErrorState(message) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Filter Workers';
    }

    allWorkers = [];
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
   * Fetch workers from API with cancellation.
   */
  async function fetchWorkers() {
    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    setLoadingState();

    const params = buildQueryParams();
    const queryString = params.toString();
    const endpoint = '/api/workers' + (queryString ? `?${queryString}` : '');

    try {
      const api = window.TrustWera?.api;
      if (!api) {
        throw new Error('API wrapper not available');
      }

      const workers = await api.get(endpoint, { signal: currentController.signal });

      if (!Array.isArray(workers) || workers.length === 0) {
        setEmptyState();
      } else {
        setSuccessState(workers);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.isAbort) {
        return;
      }
      console.error('Failed to fetch workers:', err);
      setErrorState(err.message || "Couldn't load workers right now — try again shortly");
    }
  }

  /**
   * Event Listeners
   */
  if (form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      applyCurrentFilters();

      // Scroll to results on mobile devices after submit
      if (window.innerWidth <= 768 && resultsSummary) {
        resultsSummary.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Show more button
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function() {
      displayedCount += PAGE_SIZE;
      renderWorkersList();
    });
  }

  // Popstate navigation (back/forward)
  window.addEventListener('popstate', function() {
    readFiltersFromURL();
    fetchWorkers();
  });

  // Clear filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function() {
      if (tradeSelect) tradeSelect.value = '';
      if (locationInput) locationInput.value = '';
      if (availableCheckbox) availableCheckbox.checked = false;

      const newURL = window.location.pathname;
      window.history.pushState(null, '', newURL);
      readFiltersFromURL();
      fetchWorkers();
    });
  }

  // Retry button
  if (retryBtn) {
    retryBtn.addEventListener('click', function() {
      fetchWorkers();
    });
  }

  // Initialization
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
