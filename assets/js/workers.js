// Find Workers page logic
(function() {
    'use strict';

    // DOM Elements
    const form = document.getElementById('workers-filter-form');
    const tradeSelect = document.getElementById('filter-trade');
    const locationInput = document.getElementById('filter-location');
    const availableCheckbox = document.getElementById('filter-available');
    const resultsSummary = document.getElementById('results-summary');
    const workersGrid = document.getElementById('workers-grid');
    const emptyState = document.getElementById('empty-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const retryBtn = document.getElementById('retry-btn');

    // Active request controller for race condition cancellation
    let currentController = null;

    // Trade name display formatting map
    const TRADE_LABELS = {
        electrician: 'Electrician',
        plumber: 'Plumber',
        carpenter: 'Carpenter',
        painter: 'Painter',
        mechanic: 'Mechanic',
        cleaner: 'Cleaner',
        gardener: 'Gardener',
        security: 'Security Guard'
    };

    /**
     * Format skill names cleanly (e.g. "electrician" -> "Electrician")
     */
    function formatSkill(name) {
        if (!name) return '';
        const key = name.toLowerCase();
        if (TRADE_LABELS[key]) {
            return TRADE_LABELS[key];
        }
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    /**
     * Escape special HTML characters to prevent XSS.
     */
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Read filter parameters from the current URL query string
     * and pre-fill form controls.
     * The checkbox is checked only if available=true is present.
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
     * Build fetch query string from current form filter inputs.
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
     * Four distinct UI states:
     * 1. Loading
     * 2. Success with results
     * 3. Success with zero results
     * 4. Error
     */

    function setLoadingState() {
        if (resultsSummary) resultsSummary.textContent = 'Loading…';
        if (workersGrid) {
            workersGrid.innerHTML = '';
            workersGrid.hidden = true;
        }
        if (emptyState) emptyState.hidden = true;
        if (errorState) errorState.hidden = true;
    }

    function setSuccessState(workers) {
        const count = workers.length;
        if (resultsSummary) {
            resultsSummary.textContent = `${count} ${count === 1 ? 'worker' : 'workers'} found`;
        }

        if (workersGrid) {
            workersGrid.innerHTML = '';
            workers.forEach(worker => {
                const card = renderWorkerCard(worker);
                workersGrid.appendChild(card);
            });
            workersGrid.hidden = false;
        }

        if (emptyState) emptyState.hidden = true;
        if (errorState) errorState.hidden = true;
    }

    function setEmptyState() {
        if (resultsSummary) resultsSummary.textContent = '0 workers found';
        if (workersGrid) {
            workersGrid.innerHTML = '';
            workersGrid.hidden = true;
        }
        if (emptyState) emptyState.hidden = false;
        if (errorState) errorState.hidden = true;
    }

    function setErrorState(message) {
        const text = message || "Couldn't load workers right now — try again shortly";
        if (resultsSummary) resultsSummary.textContent = text;
        if (errorMessage) errorMessage.textContent = text;
        if (workersGrid) {
            workersGrid.innerHTML = '';
            workersGrid.hidden = true;
        }
        if (emptyState) emptyState.hidden = true;
        if (errorState) errorState.hidden = false;
    }

    /**
     * Render a single worker card using the API response shape:
     * id, location_area, is_available, is_verified, skills: [{id, name, category}]
     */
    function renderWorkerCard(worker) {
        const card = document.createElement('li');
        card.className = 'worker-card';
        card.setAttribute('role', 'listitem');

        // Photo or placeholder
        const photoHTML = worker.profile_photo_url
            ? `<div class="worker-card__photo"><img src="${escapeHTML(worker.profile_photo_url)}" alt="Worker #${escapeHTML(worker.id)} profile photo"></div>`
            : `<div class="worker-card__photo" role="img" aria-label="Profile photo placeholder"></div>`;

        // Verified badge (shown only when is_verified is true)
        const badgeHTML = worker.is_verified
            ? `<span class="worker-card__badge worker-card__badge--verified">✓ Verified</span>`
            : `<span class="worker-card__badge-placeholder" aria-hidden="true"></span>`;

        // Skill names
        const skills = Array.isArray(worker.skills) ? worker.skills : [];
        const skillNames = skills.length > 0
            ? skills.map(s => formatSkill(s.name)).join(', ')
            : 'General Worker';

        // Location area
        const location = worker.location_area
            ? escapeHTML(worker.location_area)
            : 'Location not specified';

        // Availability indicator
        const isAvailable = Boolean(worker.is_available);
        const availabilityText = isAvailable ? 'Available Now' : 'Currently Unavailable';
        const availabilityClass = isAvailable
            ? 'worker-card__availability worker-card__availability--available'
            : 'worker-card__availability worker-card__availability--unavailable';

        card.innerHTML = `
            ${photoHTML}
            ${badgeHTML}
            <h3>Worker #${escapeHTML(worker.id)}</h3>
            <p class="worker-card__role">${escapeHTML(skillNames)}</p>
            <p class="worker-card__location">${location}</p>
            <p class="${availabilityClass}">${escapeHTML(availabilityText)}</p>
            <a href="/workers/${encodeURIComponent(worker.id)}" class="btn btn--outline btn--small" aria-label="View worker #${escapeHTML(worker.id)}'s profile">View Profile</a>
        `;

        return card;
    }

    /**
     * Fetch workers against real API: /api/workers?[params]
     */
    async function fetchWorkers() {
        if (currentController) {
            currentController.abort();
        }
        currentController = new AbortController();

        setLoadingState();

        const params = buildQueryParams();
        const queryString = params.toString();

        try {
            const response = await fetch('/api/workers?' + queryString, {
                signal: currentController.signal
            });
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const workers = await response.json();
            if (!Array.isArray(workers) || workers.length === 0) {
                setEmptyState();
            } else {
                setSuccessState(workers);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }
            console.error('Failed to fetch workers:', err);
            setErrorState("Couldn't load workers right now — try again shortly");
        }
    }

    /**
     * Event handlers
     */

    // Form submit: prevent default reload, update URL history, fetch and re-render
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            const params = buildQueryParams();
            const queryString = params.toString();
            const newURL = window.location.pathname + (queryString ? `?${queryString}` : '');

            window.history.pushState(null, '', newURL);
            fetchWorkers();
        });
    }

    // Support browser Back/Forward navigation
    window.addEventListener('popstate', function() {
        readFiltersFromURL();
        fetchWorkers();
    });

    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            if (tradeSelect) tradeSelect.value = '';
            if (locationInput) locationInput.value = '';
            if (availableCheckbox) availableCheckbox.checked = false;

            const newURL = window.location.pathname;
            window.history.pushState(null, '', newURL);
            fetchWorkers();
        });
    }

    // Retry button for error state
    if (retryBtn) {
        retryBtn.addEventListener('click', function() {
            fetchWorkers();
        });
    }

    // Initial page load initialization
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
