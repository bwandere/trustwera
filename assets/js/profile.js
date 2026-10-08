// Worker Profile Page Logic
(function() {
  'use strict';

  // DOM Elements
  const skeletonEl = document.getElementById('profile-skeleton');
  const contentEl = document.getElementById('profile-content');
  const notFoundEl = document.getElementById('profile-404');
  const errorEl = document.getElementById('profile-error');
  const errorMessageEl = document.getElementById('profile-error-message');
  const retryBtn = document.getElementById('profile-retry-btn');

  // Profile data elements
  const avatarContainer = document.getElementById('profile-avatar-container');
  const nameEl = document.getElementById('profile-name');
  const verifiedBadgeEl = document.getElementById('profile-verified-badge');
  const primaryRoleEl = document.getElementById('profile-primary-role');
  const locationEl = document.getElementById('profile-location');
  const experienceCard = document.getElementById('profile-experience-card');
  const experienceEl = document.getElementById('profile-experience');
  const availabilityEl = document.getElementById('profile-availability');
  const skillsContainer = document.getElementById('profile-skills');
  const bioEl = document.getElementById('profile-bio');

  // Contact elements
  const revealContactBtn = document.getElementById('reveal-contact-btn');
  const initialContactPanel = document.getElementById('contact-initial-panel');
  const revealedContactPanel = document.getElementById('contact-revealed-panel');
  const phoneDisplay = document.getElementById('contact-phone-display');
  const callBtn = document.getElementById('call-btn');
  const whatsappBtn = document.getElementById('whatsapp-btn');
  const copyPhoneBtn = document.getElementById('copy-phone-btn');
  const copyPhoneText = document.getElementById('copy-phone-text');
  const contactErrorEl = document.getElementById('contact-error');

  let currentWorker = null;

  /**
   * Extract worker ID from the URL path (/workers/42) or query string (?id=42).
   */
  function getWorkerId() {
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('id');
    if (queryId) return queryId;

    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const last = pathSegments[pathSegments.length - 1];
    if (last && last !== 'workers' && last !== 'profile.html') {
      return last;
    }
    return null;
  }

  function showLoading() {
    if (skeletonEl) skeletonEl.hidden = false;
    if (contentEl) contentEl.hidden = true;
    if (notFoundEl) notFoundEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
  }

  function showNotFound() {
    if (skeletonEl) skeletonEl.hidden = true;
    if (contentEl) contentEl.hidden = true;
    if (notFoundEl) notFoundEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
    document.title = 'Worker Not Found — TrustWera';
  }

  function showError(msg) {
    if (skeletonEl) skeletonEl.hidden = true;
    if (contentEl) contentEl.hidden = true;
    if (notFoundEl) notFoundEl.hidden = true;
    if (errorEl) errorEl.hidden = false;
    if (errorMessageEl) {
      errorMessageEl.textContent = msg || "Couldn't load worker profile right now.";
    }
  }

  function showProfile(worker) {
    currentWorker = worker;
    const escapeHTML = window.TrustWera?.escapeHTML || (s => s);
    const formatSkill = window.TrustWera?.formatSkill || (s => s);
    const initials = window.TrustWera?.initials || (() => 'TW');

    const skills = Array.isArray(worker.skills) ? worker.skills : [];
    const primarySkill = skills[0] ? (skills[0].name || skills[0]) : '';
    const formattedPrimarySkill = primarySkill ? formatSkill(primarySkill) : 'General Trade';

    const fullName = worker.full_name || worker.name || (primarySkill ? `${formattedPrimarySkill} Professional` : 'Local Professional');
    const location = worker.location_area || worker.location || 'Local Community';

    // Update document title and meta description
    document.title = `${fullName} — ${formattedPrimarySkill} in ${location} | TrustWera`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', `Verified ${formattedPrimarySkill} in ${location}. Contact directly on TrustWera.`);
    }

    // Name & verified badge
    nameEl.textContent = fullName;

    if (worker.is_verified) {
      verifiedBadgeEl.innerHTML = `
        <span class="worker-card__badge" title="Identity and trade verified by TrustWera">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width: 12px; height: 12px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Verified
        </span>`;
    } else {
      verifiedBadgeEl.innerHTML = '';
    }

    // Role & location
    primaryRoleEl.textContent = formattedPrimarySkill;
    locationEl.textContent = location;

    // Avatar / Photo
    if (worker.profile_photo_url) {
      avatarContainer.innerHTML = `<div class="avatar avatar--lg"><img src="${escapeHTML(worker.profile_photo_url)}" alt="${escapeHTML(fullName)}"></div>`;
    } else {
      avatarContainer.innerHTML = `<div class="avatar avatar--lg" aria-hidden="true">${escapeHTML(initials(fullName))}</div>`;
    }

    // Experience
    const exp = worker.years_experience !== undefined ? worker.years_experience : worker.experience_years;
    if (exp && Number(exp) > 0) {
      const expNum = Number(exp);
      experienceEl.textContent = `${expNum} ${expNum === 1 ? 'Year' : 'Years'} Experience`;
      experienceCard.hidden = false;
    } else {
      experienceCard.hidden = true;
    }

    // Availability
    const isAvail = worker.is_available !== false;
    availabilityEl.textContent = isAvail ? 'Available Today' : 'Currently Unavailable';
    availabilityEl.style.color = isAvail ? 'var(--color-secondary)' : 'var(--color-text-muted)';

    // Skills
    skillsContainer.innerHTML = '';
    if (skills.length > 0) {
      skills.forEach(s => {
        const sName = typeof s === 'string' ? s : s.name;
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = formatSkill(sName);
        skillsContainer.appendChild(chip);
      });
    } else {
      skillsContainer.innerHTML = `<span class="chip">${escapeHTML(formattedPrimarySkill)}</span>`;
    }

    // Bio: render strictly as safe text (never innerHTML)
    if (worker.bio) {
      bioEl.textContent = worker.bio;
      bioEl.parentElement.hidden = false;
    } else {
      bioEl.textContent = 'No detailed bio provided yet. Contact this worker directly to inquire about their services and availability.';
      bioEl.parentElement.hidden = false;
    }

    // Reset contact section
    if (initialContactPanel) initialContactPanel.hidden = false;
    if (revealedContactPanel) revealedContactPanel.hidden = true;
    if (contactErrorEl) contactErrorEl.hidden = true;

    if (skeletonEl) skeletonEl.hidden = true;
    if (contentEl) contentEl.hidden = false;
    if (notFoundEl) notFoundEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
  }

  /**
   * Fetch worker profile by ID.
   */
  async function loadWorker() {
    const id = getWorkerId();
    if (!id) {
      showNotFound();
      return;
    }

    showLoading();

    try {
      const api = window.TrustWera?.api;
      if (!api) throw new Error('API client unavailable');

      const data = await api.get(`/api/workers/${encodeURIComponent(id)}`);
      if (!data || !data.id) {
        showNotFound();
        return;
      }
      showProfile(data);
    } catch (err) {
      if (err.status === 404) {
        showNotFound();
      } else {
        showError(err.message || 'Unable to load worker profile. Please check your connection.');
      }
    }
  }

  /**
   * Contact worker button click handler.
   */
  async function handleContactWorker() {
    if (!currentWorker) return;
    const id = currentWorker.id;

    if (revealContactBtn) {
      revealContactBtn.disabled = true;
      revealContactBtn.textContent = 'Retrieving contact info…';
    }
    if (contactErrorEl) contactErrorEl.hidden = true;

    try {
      const api = window.TrustWera?.api;
      let contactData = null;

      try {
        contactData = await api.get(`/api/workers/${encodeURIComponent(id)}/contact`);
      } catch (endpointErr) {
        // If /api/workers/{id}/contact endpoint doesn't exist yet, check if profile has phone
        if (currentWorker.phone) {
          contactData = { phone: currentWorker.phone };
        } else {
          throw endpointErr;
        }
      }

      const phone = contactData?.phone || contactData?.phone_number;
      if (!phone) {
        throw new Error('Contact details are not currently available for this worker.');
      }

      revealContact(phone);
    } catch (err) {
      console.warn('Failed to retrieve worker contact:', err);
      if (contactErrorEl) {
        contactErrorEl.textContent = err.message || 'Unable to retrieve contact details right now. Please try again.';
        contactErrorEl.hidden = false;
      }
      if (revealContactBtn) {
        revealContactBtn.disabled = false;
        revealContactBtn.textContent = 'Contact worker';
      }
    }
  }

  /**
   * Reveal phone number, Call, WhatsApp and Copy buttons.
   */
  function revealContact(phoneNumber) {
    const cleanPhone = String(phoneNumber).replace(/[^0-9+]/g, '');
    const workerName = nameEl ? nameEl.textContent : 'Worker';

    if (phoneDisplay) {
      phoneDisplay.textContent = phoneNumber;
    }

    if (callBtn) {
      callBtn.href = `tel:${cleanPhone}`;
    }

    if (whatsappBtn) {
      const message = `Hello ${workerName}, I found your profile on TrustWera and would like to inquire about your services.`;
      const waNumber = cleanPhone.replace(/^\+/, '');
      whatsappBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    }

    if (copyPhoneBtn) {
      copyPhoneBtn.onclick = async function() {
        try {
          await navigator.clipboard.writeText(phoneNumber);
          if (copyPhoneText) copyPhoneText.textContent = 'Copied!';
          setTimeout(() => {
            if (copyPhoneText) copyPhoneText.textContent = 'Copy number';
          }, 2500);
        } catch (_) {
          // Fallback if clipboard API fails
          if (copyPhoneText) copyPhoneText.textContent = phoneNumber;
        }
      };
    }

    if (initialContactPanel) initialContactPanel.hidden = true;
    if (revealedContactPanel) revealedContactPanel.hidden = false;
  }

  // Event Listeners
  if (revealContactBtn) {
    revealContactBtn.addEventListener('click', handleContactWorker);
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', loadWorker);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWorker);
  } else {
    loadWorker();
  }
})();
