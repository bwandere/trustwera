(function () {
  'use strict';

  window.TrustWera = window.TrustWera || {};

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
   * Escape special HTML characters to prevent XSS.
   *
   * @param {any} str
   * @returns {string}
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
   * Format trade name into clean title case.
   *
   * @param {string} name
   * @returns {string}
   */
  function formatSkill(name) {
    if (!name) return '';
    const key = String(name).trim().toLowerCase();
    if (TRADE_LABELS[key]) {
      return TRADE_LABELS[key];
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Extract initials from a full name (e.g. "James Otieno" -> "JO").
   *
   * @param {string} name
   * @returns {string}
   */
  function initials(name) {
    if (!name || typeof name !== 'string') return 'TW';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'TW';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Render an interactive worker card matching preview.png and G4 rules.
   *
   * @param {Object} worker
   * @returns {HTMLLIElement}
   */
  function renderWorkerCard(worker) {
    const card = document.createElement('li');
    card.className = 'worker-card';
    card.setAttribute('role', 'listitem');

    const name = worker.full_name && worker.full_name.trim() !== ''
      ? worker.full_name.trim()
      : 'Worker Profile';

    const skills = Array.isArray(worker.skills) ? worker.skills : [];
    const primarySkillName = skills.length > 0 ? formatSkill(skills[0].name) : 'General Worker';

    // Avatar
    const avatarHTML = worker.profile_photo_url
      ? `<div class="worker-card__avatar"><img src="${escapeHTML(worker.profile_photo_url)}" alt="${escapeHTML(name)}" class="worker-card__avatar-img"></div>`
      : `<div class="worker-card__avatar"><div class="avatar avatar--initials" aria-hidden="true">${escapeHTML(initials(name))}</div></div>`;

    // Verified badge (only when is_verified is true)
    const verifiedBadgeHTML = worker.is_verified
      ? `<span class="badge badge--verified" title="Checked by the TrustWera team"><svg class="badge__icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Verified</span>`
      : '';

    // Location
    const locationArea = worker.location_area && worker.location_area.trim() !== ''
      ? worker.location_area.trim()
      : 'Location on request';

    // Experience
    let experienceHTML = '';
    if (typeof worker.years_experience === 'number' && worker.years_experience >= 0) {
      const expText = `${worker.years_experience} ${worker.years_experience === 1 ? 'Year' : 'Years'} Experience`;
      experienceHTML = `
        <div class="worker-card__meta-item">
          <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          <span>${escapeHTML(expText)}</span>
        </div>`;
    }

    // Availability
    const isAvailable = Boolean(worker.is_available);
    const availabilityText = isAvailable ? 'Available Today' : 'Unavailable';
    const availabilityClass = isAvailable ? 'worker-card__meta-item--available' : 'worker-card__meta-item--unavailable';

    // Skill chips: max 3 plus "+N"
    let chipsHTML = '';
    if (skills.length > 0) {
      const visibleSkills = skills.slice(0, 3);
      const chips = visibleSkills.map(s => `<span class="chip">${escapeHTML(formatSkill(s.name))}</span>`);
      if (skills.length > 3) {
        chips.push(`<span class="chip chip--more" title="${skills.length - 3} more skills">+${skills.length - 3}</span>`);
      }
      chipsHTML = `<div class="worker-card__chips">${chips.join('')}</div>`;
    }

    // Bio snippet if present
    let bioHTML = '';
    if (worker.bio && worker.bio.trim() !== '') {
      bioHTML = `<p class="worker-card__bio">${escapeHTML(worker.bio.trim())}</p>`;
    }

    const workerID = encodeURIComponent(worker.id || '');

    card.innerHTML = `
      <div class="worker-card__top">
        ${avatarHTML}
        <div class="worker-card__header-text">
          <div class="worker-card__name-badge">
            <h3 class="worker-card__name">${escapeHTML(name)}</h3>
            ${verifiedBadgeHTML}
          </div>
          <p class="worker-card__primary-skill">${escapeHTML(primarySkillName)}</p>
          <p class="worker-card__location">
            <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${escapeHTML(locationArea)}</span>
          </p>
        </div>
      </div>

      <div class="worker-card__meta">
        ${experienceHTML}
        <div class="worker-card__meta-item ${availabilityClass}">
          <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${escapeHTML(availabilityText)}</span>
        </div>
        <div class="worker-card__meta-item worker-card__meta-item--rating">
          <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span>Ratings coming soon</span>
        </div>
      </div>

      ${chipsHTML}
      ${bioHTML}

      <div class="worker-card__action">
        <a href="/workers/${workerID}" class="btn btn--outline btn--small worker-card__view-btn" aria-label="View ${escapeHTML(name)}'s profile">View Profile</a>
      </div>
    `;

    return card;
  }

  window.TrustWera.workerCard = {
    escapeHTML,
    formatSkill,
    initials,
    renderWorkerCard
  };
})();
