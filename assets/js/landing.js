(function () {
  'use strict';

  // DOM Elements
  const searchForm = document.getElementById('landing-search-form');
  const serviceSelect = document.getElementById('service-needed');
  const locationSelect = document.getElementById('location');
  const availabilitySelect = document.getElementById('availability');
  const featuredGrid = document.getElementById('featured-workers-grid');
  const featuredEmpty = document.getElementById('featured-empty');
  const featuredError = document.getElementById('featured-error');
  const featuredRetryBtn = document.getElementById('featured-retry-btn');

  // Trade count map
  const TRADE_SLUGS = [
    'electrician',
    'plumber',
    'carpenter',
    'painter',
    'cleaner',
    'gardener',
    'mechanic',
    'security'
  ];

  /**
   * Search Card navigation handler
   */
  if (searchForm) {
    searchForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const service = serviceSelect ? serviceSelect.value.trim() : '';
      const location = locationSelect ? locationSelect.value.trim() : '';
      const availability = availabilitySelect ? availabilitySelect.value.trim() : '';

      const params = new URLSearchParams();
      if (service) {
        params.set('trade', service);
      }
      if (location) {
        params.set('location', location);
      }
      if (availability === 'true') {
        params.set('available', 'true');
      }

      const queryString = params.toString();
      const targetURL = '/workers' + (queryString ? '?' + queryString : '');
      window.location.href = targetURL;
    });
  }

  /**
   * Skeleton loader for featured workers
   */
  function renderSkeletons(count = 4) {
    if (!featuredGrid) return;
    featuredGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeletonCard = document.createElement('li');
      skeletonCard.className = 'worker-card worker-card--skeleton';
      skeletonCard.setAttribute('aria-hidden', 'true');
      skeletonCard.innerHTML = `
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
      featuredGrid.appendChild(skeletonCard);
    }
  }

  /**
   * Update live trade counts across the Browse by Trade tiles
   */
  function updateTradeCounts(workers) {
    // Count workers for each trade slug
    const counts = {};
    TRADE_SLUGS.forEach(slug => {
      counts[slug] = 0;
    });

    if (Array.isArray(workers)) {
      workers.forEach(w => {
        if (Array.isArray(w.skills)) {
          w.skills.forEach(s => {
            const skillName = (s.name || '').toLowerCase().trim();
            if (counts.hasOwnProperty(skillName)) {
              counts[skillName]++;
            }
          });
        }
      });
    }

    TRADE_SLUGS.forEach(slug => {
      const countEl = document.getElementById(`count-${slug}`);
      if (!countEl) return;

      const num = counts[slug] || 0;
      if (num > 0) {
        countEl.textContent = `${num} listed`;
        countEl.classList.remove('category-card__count--join');
      } else {
        countEl.innerHTML = `<a href="/become-a-worker" class="category-card__count-link">Be the first to join</a>`;
        countEl.classList.add('category-card__count--join');
      }
    });
  }

  /**
   * Reset trade counts if fetch fails
   */
  function clearTradeCounts() {
    TRADE_SLUGS.forEach(slug => {
      const countEl = document.getElementById(`count-${slug}`);
      if (countEl) {
        countEl.textContent = '';
      }
    });
  }

  /**
   * Fetch workers once for both trade counts and featured workers
   */
  async function loadLandingData() {
    renderSkeletons(4);
    if (featuredEmpty) featuredEmpty.hidden = true;
    if (featuredError) featuredError.hidden = true;
    if (featuredGrid) featuredGrid.hidden = false;

    try {
      const workers = await window.TrustWera.api.get('/api/workers');

      // Update trade tiles counts
      updateTradeCounts(workers);

      // Render featured workers (up to 4, verified first)
      if (!featuredGrid) return;
      featuredGrid.innerHTML = '';

      if (!Array.isArray(workers) || workers.length === 0) {
        featuredGrid.hidden = true;
        if (featuredEmpty) featuredEmpty.hidden = false;
        return;
      }

      // Sort: verified first, then by id descending
      const sorted = [...workers].sort((a, b) => {
        const aVerified = a.is_verified ? 1 : 0;
        const bVerified = b.is_verified ? 1 : 0;
        if (bVerified !== aVerified) return bVerified - aVerified;
        return (b.id || 0) - (a.id || 0);
      });

      const featured = sorted.slice(0, 4);
      featured.forEach(w => {
        const card = window.TrustWera.workerCard.renderWorkerCard(w);
        featuredGrid.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to load landing page worker data:', err);
      clearTradeCounts();
      if (featuredGrid) {
        featuredGrid.innerHTML = '';
        featuredGrid.hidden = true;
      }
      if (featuredError) featuredError.hidden = false;
    }
  }

  if (featuredRetryBtn) {
    featuredRetryBtn.addEventListener('click', loadLandingData);
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLandingData);
  } else {
    loadLandingData();
  }
})();
