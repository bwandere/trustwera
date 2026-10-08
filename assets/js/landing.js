// TrustWera Landing Page Logic
(function() {
  'use strict';

  const TRADES = [
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
   * 1. Search Filters Form Submission
   * Navigates to /workers with selected parameters.
   */
  function initSearchForm() {
    const form = document.querySelector('.search-filters__form');
    if (!form) return;

    form.addEventListener('submit', function(event) {
      event.preventDefault();

      const service = (document.getElementById('service-needed')?.value || '').trim();
      const location = (document.getElementById('location')?.value || '').trim();
      const availability = (document.getElementById('availability')?.value || '').trim();

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
      window.location.href = '/workers' + (queryString ? '?' + queryString : '');
    });
  }

  /**
   * Render loading skeleton placeholders for featured workers.
   */
  function renderFeaturedSkeletons(container) {
    container.innerHTML = '';
    for (let i = 0; i < 4; i++) {
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
      container.appendChild(li);
    }
  }

  /**
   * 2. Live Counts for "Browse by Trade" & 3. Featured Workers
   * Single GET /api/workers call powers both sections.
   */
  async function loadWorkersData() {
    const featuredGrid = document.getElementById('featured-workers-grid');
    const featuredContainer = document.querySelector('.featured-workers');
    if (featuredGrid) {
      renderFeaturedSkeletons(featuredGrid);
    }

    try {
      const api = window.TrustWera?.api;
      if (!api) {
        throw new Error('API wrapper not initialized');
      }

      const workers = await api.get('/api/workers');
      const workersList = Array.isArray(workers) ? workers : [];

      // Update Trade Counts
      updateTradeCounts(workersList);

      // Render Featured Workers
      if (featuredGrid) {
        renderFeaturedWorkers(featuredGrid, workersList);
      }
    } catch (err) {
      console.warn('Could not load live worker directory for landing page:', err);

      // If fetch fails, omit trade count texts completely per P1 rules
      clearTradeCounts();

      // Show retry button in featured section
      if (featuredGrid) {
        featuredGrid.innerHTML = `
          <li style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
            <p style="margin-bottom: 1rem;">Unable to load featured workers right now.</p>
            <button type="button" class="btn btn--outline btn--small" id="featured-retry-btn">Try again</button>
          </li>
        `;
        document.getElementById('featured-retry-btn')?.addEventListener('click', loadWorkersData);
      }
    }
  }

  /**
   * Count workers by trade and update the DOM.
   */
  function updateTradeCounts(workers) {
    const counts = {};
    TRADES.forEach(t => { counts[t] = 0; });

    workers.forEach(w => {
      const skills = Array.isArray(w.skills) ? w.skills : [];
      skills.forEach(s => {
        const skillName = typeof s === 'string' ? s : s.name;
        if (skillName) {
          const key = skillName.trim().toLowerCase();
          if (counts[key] !== undefined) {
            counts[key]++;
          }
        }
      });
    });

    TRADES.forEach(trade => {
      const el = document.getElementById(`count-${trade}`);
      if (!el) return;

      const num = counts[trade] || 0;
      if (num > 0) {
        el.textContent = `${num} listed`;
      } else {
        el.innerHTML = '<a href="/become-a-worker" class="category-card__join-link" style="color: var(--color-primary); text-decoration: underline;">Be the first to join</a>';
      }
    });
  }

  /**
   * Clear count elements if the API fetch fails.
   */
  function clearTradeCounts() {
    TRADES.forEach(trade => {
      const el = document.getElementById(`count-${trade}`);
      if (el) {
        el.textContent = '';
      }
    });
  }

  /**
   * Render up to 4 featured workers (verified first).
   */
  function renderFeaturedWorkers(container, workers) {
    container.innerHTML = '';

    if (workers.length === 0) {
      container.innerHTML = `
        <li style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
          <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Be the first worker on TrustWera</h3>
          <p style="max-width: 480px; margin: 0 auto 1.5rem auto;">Join our local directory today, get verified by our team, and connect with households and small businesses looking for your skills.</p>
          <a href="/become-a-worker" class="btn btn--primary">Become a Worker</a>
        </li>
      `;
      return;
    }

    // Sort: verified first, then newest
    const sorted = [...workers].sort((a, b) => {
      if (a.is_verified === b.is_verified) return 0;
      return a.is_verified ? -1 : 1;
    });

    const top4 = sorted.slice(0, 4);
    const renderCard = window.TrustWera?.renderWorkerCard;

    top4.forEach(worker => {
      if (typeof renderCard === 'function') {
        container.appendChild(renderCard(worker));
      }
    });
  }

  // Initialize on DOM ready
  function init() {
    initSearchForm();
    loadWorkersData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
