// TrustWera Worker Card Renderer
(function() {
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
   * Escape HTML special characters to prevent XSS.
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
   * Format skill names into display-friendly trade labels.
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
   * Extract uppercase initials from a name (e.g. "James Otieno" -> "JO").
   * @param {string} name
   * @returns {string}
   */
  function initials(name) {
    if (!name || typeof name !== 'string') return 'TW';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'TW';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Render a worker card as an <li> element matching preview.png and G4 rules.
   * Never shows "Worker #id".
   *
   * @param {object} worker - Worker profile data
   * @returns {HTMLLIElement}
   */
  function renderWorkerCard(worker) {
    const card = document.createElement('li');
    card.className = 'worker-card';
    card.setAttribute('role', 'listitem');

    const id = worker.id;
    const skills = Array.isArray(worker.skills) ? worker.skills : [];
    const primarySkillObj = skills[0];
    const primarySkillName = primarySkillObj ? (primarySkillObj.name || primarySkillObj) : '';
    const formattedPrimarySkill = primarySkillName ? formatSkill(primarySkillName) : 'General Trade';

    // Worker full name or friendly profession fallback (NEVER "Worker #id")
    const fullName = worker.full_name || worker.name || (primarySkillName ? `${formattedPrimarySkill} Professional` : 'Local Professional');
    const workerInitials = initials(fullName);

    // Location
    const location = worker.location_area || worker.location || 'Local Community';

    // Verification badge
    const isVerified = Boolean(worker.is_verified);
    const badgeHTML = isVerified
      ? `<span class="worker-card__badge" title="Identity and trade verified by TrustWera">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Verified
        </span>`
      : '';

    // Avatar or photo
    const avatarHTML = worker.profile_photo_url
      ? `<div class="worker-card__avatar"><img src="${escapeHTML(worker.profile_photo_url)}" alt="${escapeHTML(fullName)}"></div>`
      : `<div class="worker-card__avatar" aria-hidden="true">${escapeHTML(workerInitials)}</div>`;

    // Experience (when present)
    const experienceYears = worker.years_experience !== undefined ? worker.years_experience : worker.experience_years;
    let experienceHTML = '';
    if (experienceYears && Number(experienceYears) > 0) {
      const expNum = Number(experienceYears);
      experienceHTML = `
        <span class="worker-card__meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          ${expNum} ${expNum === 1 ? 'Year' : 'Years'} Experience
        </span>`;
    }

    // Availability
    const isAvailable = worker.is_available !== false;
    const availabilityHTML = isAvailable
      ? `<span class="worker-card__meta-item worker-card__meta-item--available">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Available Today
        </span>`
      : `<span class="worker-card__meta-item worker-card__meta-item--unavailable">
          Currently Unavailable
        </span>`;

    // Ratings coming soon
    const ratingsHTML = `
      <span class="worker-card__meta-item worker-card__meta-item--ratings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        Ratings coming soon
      </span>`;

    // Skill chips (max 3 plus "+N")
    let chipsHTML = '';
    if (skills.length > 0) {
      const visibleSkills = skills.slice(0, 3);
      const remainingCount = skills.length - 3;
      const chips = visibleSkills.map(s => {
        const sName = typeof s === 'string' ? s : s.name;
        return `<span class="chip">${escapeHTML(formatSkill(sName))}</span>`;
      }).join('');
      const moreChip = remainingCount > 0 ? `<span class="chip chip--more">+${remainingCount}</span>` : '';
      chipsHTML = `<div class="worker-card__chips">${chips}${moreChip}</div>`;
    }

    // Short Bio excerpt (safely text)
    let bioHTML = '';
    if (worker.bio) {
      bioHTML = `<p class="worker-card__bio">${escapeHTML(worker.bio)}</p>`;
    }

    card.innerHTML = `
      <div class="worker-card__header">
        ${avatarHTML}
        <div class="worker-card__title-row">
          <div class="worker-card__name-badge">
            <h3>${escapeHTML(fullName)}</h3>
            ${badgeHTML}
          </div>
          <p class="worker-card__role">${escapeHTML(formattedPrimarySkill)}</p>
          <p class="worker-card__location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            ${escapeHTML(location)}
          </p>
        </div>
      </div>

      <div class="worker-card__meta">
        ${experienceHTML}
        ${availabilityHTML}
        ${ratingsHTML}
      </div>

      ${chipsHTML}
      ${bioHTML}

      <a href="/workers/${encodeURIComponent(id)}" class="btn btn--outline btn--small" aria-label="View ${escapeHTML(fullName)}'s profile">View Profile</a>
    `;

    return card;
  }

  window.TrustWera.escapeHTML = escapeHTML;
  window.TrustWera.formatSkill = formatSkill;
  window.TrustWera.initials = initials;
  window.TrustWera.renderWorkerCard = renderWorkerCard;
})();
