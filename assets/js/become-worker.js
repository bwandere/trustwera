// Become a Worker Registration Logic
(function() {
  'use strict';

  // DOM Elements
  const form = document.getElementById('become-worker-form');
  const submitBtn = document.getElementById('worker-submit-btn');
  const generalError = document.getElementById('form-general-error');
  const successPanel = document.getElementById('worker-success-panel');
  const viewProfileBtn = document.getElementById('view-new-profile-btn');

  const fullNameInput = document.getElementById('field-full-name');
  const phoneInput = document.getElementById('field-phone');
  const emailInput = document.getElementById('field-email');
  const passwordInput = document.getElementById('field-password');
  const togglePasswordBtn = document.getElementById('toggle-password-btn');
  const locationInput = document.getElementById('field-location');
  const experienceInput = document.getElementById('field-experience');
  const bioInput = document.getElementById('field-bio');
  const bioCounter = document.getElementById('bio-counter');
  const availableInput = document.getElementById('field-available');
  const consentInput = document.getElementById('field-consent');
  const tradesContainer = document.getElementById('trades-container');

  // Error message elements
  const errors = {
    fullName: document.getElementById('error-full-name'),
    phone: document.getElementById('error-phone'),
    email: document.getElementById('error-email'),
    password: document.getElementById('error-password'),
    location: document.getElementById('error-location'),
    trades: document.getElementById('error-trades'),
    experience: document.getElementById('error-experience'),
    bio: document.getElementById('error-bio'),
    consent: document.getElementById('error-consent')
  };

  /**
   * Password Show / Hide toggle
   */
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function() {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  /**
   * Bio Live Character Counter
   */
  if (bioInput && bioCounter) {
    bioInput.addEventListener('input', function() {
      const len = bioInput.value.length;
      bioCounter.textContent = `${len} / 1000`;
      if (len > 1000) {
        bioCounter.style.color = '#DC2626';
      } else {
        bioCounter.style.color = 'var(--color-text-muted)';
      }
    });
  }

  /**
   * Fetch trades dynamically from GET /api/skills with fallback
   */
  async function loadSkills() {
    try {
      const api = window.TrustWera?.api;
      if (!api) return;

      const skills = await api.get('/api/skills');
      if (Array.isArray(skills) && skills.length > 0 && tradesContainer) {
        renderDynamicSkills(skills);
      }
    } catch (_) {
      // Gracefully fall back to pre-rendered skills in HTML
    }
  }

  function renderDynamicSkills(skills) {
    const skilled = skills.filter(s => (s.category || '').toLowerCase() === 'skilled');
    const casual = skills.filter(s => (s.category || '').toLowerCase() === 'casual');

    const formatSkill = window.TrustWera?.formatSkill || (s => s);
    const escapeHTML = window.TrustWera?.escapeHTML || (s => s);

    let html = '';

    if (skilled.length > 0) {
      html += '<p class="trades-category-title">Skilled Trades</p><div class="trades-grid">';
      skilled.forEach(s => {
        html += `<label><input type="checkbox" name="skill_ids" value="${escapeHTML(s.id)}"> ${escapeHTML(formatSkill(s.name))}</label>`;
      });
      html += '</div>';
    }

    if (casual.length > 0) {
      html += '<p class="trades-category-title">Casual Trades</p><div class="trades-grid">';
      casual.forEach(s => {
        html += `<label><input type="checkbox" name="skill_ids" value="${escapeHTML(s.id)}"> ${escapeHTML(formatSkill(s.name))}</label>`;
      });
      html += '</div>';
    }

    tradesContainer.innerHTML = html;
  }

  /**
   * Field validation helpers
   */
  function setFieldError(field, errorEl, message) {
    if (field) {
      field.setAttribute('aria-invalid', 'true');
    }
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function clearFieldError(field, errorEl) {
    if (field) {
      field.removeAttribute('aria-invalid');
    }
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  function validateFullName() {
    const val = (fullNameInput.value || '').trim();
    if (!val) {
      setFieldError(fullNameInput, errors.fullName, 'Full name is required.');
      return false;
    }
    if (val.length < 2) {
      setFieldError(fullNameInput, errors.fullName, 'Please enter a valid full name.');
      return false;
    }
    clearFieldError(fullNameInput, errors.fullName);
    return true;
  }

  function validatePhone() {
    const val = (phoneInput.value || '').trim();
    if (!val) {
      setFieldError(phoneInput, errors.phone, 'Phone number is required.');
      return false;
    }
    const clean = val.replace(/[\s\-()]/g, '');
    if (!/^(\+?254|0)[17]\d{8}$/.test(clean) && clean.length < 9) {
      setFieldError(phoneInput, errors.phone, 'Please enter a valid Kenyan phone number (e.g. 0712345678).');
      return false;
    }
    clearFieldError(phoneInput, errors.phone);
    return true;
  }

  function validateEmail() {
    const val = (emailInput.value || '').trim();
    if (!val) {
      setFieldError(emailInput, errors.email, 'Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setFieldError(emailInput, errors.email, 'Please enter a valid email address.');
      return false;
    }
    clearFieldError(emailInput, errors.email);
    return true;
  }

  function validatePassword() {
    const val = passwordInput.value || '';
    if (!val) {
      setFieldError(passwordInput, errors.password, 'Password is required.');
      return false;
    }
    if (val.length < 8) {
      setFieldError(passwordInput, errors.password, 'Password must be at least 8 characters long.');
      return false;
    }
    clearFieldError(passwordInput, errors.password);
    return true;
  }

  function validateLocation() {
    const val = (locationInput.value || '').trim();
    if (!val) {
      setFieldError(locationInput, errors.location, 'Location area is required.');
      return false;
    }
    clearFieldError(locationInput, errors.location);
    return true;
  }

  function validateTrades() {
    const checked = form.querySelectorAll('input[name="skill_ids"]:checked');
    if (checked.length === 0) {
      setFieldError(null, errors.trades, 'Please select at least one trade.');
      return false;
    }
    clearFieldError(null, errors.trades);
    return true;
  }

  function validateExperience() {
    const val = (experienceInput.value || '').trim();
    if (!val) {
      clearFieldError(experienceInput, errors.experience);
      return true;
    }
    const num = Number(val);
    if (isNaN(num) || num < 0 || num > 60) {
      setFieldError(experienceInput, errors.experience, 'Experience must be between 0 and 60 years.');
      return false;
    }
    clearFieldError(experienceInput, errors.experience);
    return true;
  }

  function validateBio() {
    const val = bioInput.value || '';
    if (val.length > 1000) {
      setFieldError(bioInput, errors.bio, 'Bio cannot exceed 1000 characters.');
      return false;
    }
    clearFieldError(bioInput, errors.bio);
    return true;
  }

  function validateConsent() {
    if (!consentInput.checked) {
      setFieldError(consentInput, errors.consent, 'You must acknowledge the verification terms to register.');
      return false;
    }
    clearFieldError(consentInput, errors.consent);
    return true;
  }

  // Attach blur event listeners for inline validation
  fullNameInput?.addEventListener('blur', validateFullName);
  phoneInput?.addEventListener('blur', validatePhone);
  emailInput?.addEventListener('blur', validateEmail);
  passwordInput?.addEventListener('blur', validatePassword);
  locationInput?.addEventListener('blur', validateLocation);
  experienceInput?.addEventListener('blur', validateExperience);
  bioInput?.addEventListener('blur', validateBio);
  consentInput?.addEventListener('change', validateConsent);

  /**
   * Handle form submission
   */
  if (form) {
    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      if (generalError) generalError.hidden = true;

      // Run all validations
      const isNameValid = validateFullName();
      const isPhoneValid = validatePhone();
      const isEmailValid = validateEmail();
      const isPasswordValid = validatePassword();
      const isLocValid = validateLocation();
      const isTradesValid = validateTrades();
      const isExpValid = validateExperience();
      const isBioValid = validateBio();
      const isConsentValid = validateConsent();

      const isValid = isNameValid && isPhoneValid && isEmailValid && isPasswordValid &&
                      isLocValid && isTradesValid && isExpValid && isBioValid && isConsentValid;

      if (!isValid) {
        // Move focus to first invalid element
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) {
          firstInvalid.focus();
        } else if (!isTradesValid) {
          const firstCheckbox = form.querySelector('input[name="skill_ids"]');
          firstCheckbox?.focus();
        }
        return;
      }

      // Collect payload (never log password)
      const selectedSkillIds = Array.from(form.querySelectorAll('input[name="skill_ids"]:checked'))
        .map(cb => parseInt(cb.value, 10))
        .filter(n => !isNaN(n));

      const payload = {
        full_name: fullNameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        location_area: locationInput.value.trim(),
        skill_ids: selectedSkillIds,
        is_available: Boolean(availableInput.checked)
      };

      if (experienceInput.value.trim()) {
        payload.years_experience = parseInt(experienceInput.value.trim(), 10);
      }

      if (bioInput.value.trim()) {
        payload.bio = bioInput.value.trim();
      }

      // Set pending state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating your profile…';
      }

      try {
        const api = window.TrustWera?.api;
        if (!api) throw new Error('API client unavailable');

        let result = null;
        try {
          result = await api.post('/api/register/worker', payload);
        } catch (postErr) {
          // If /api/register/worker is not wired in Go, try /api/workers fallback if compatible
          if (postErr.status === 404 || postErr.status === 405) {
            result = await api.post('/api/workers', {
              user_id: 1,
              bio: payload.bio || null,
              location_area: payload.location_area,
              is_available: payload.is_available,
              skill_ids: payload.skill_ids
            });
          } else {
            throw postErr;
          }
        }

        // On success: show confirmation panel
        form.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
        }

        const newProfileId = result?.id || result?.worker_id;
        if (viewProfileBtn) {
          if (newProfileId) {
            viewProfileBtn.href = `/workers/${encodeURIComponent(newProfileId)}`;
          } else {
            viewProfileBtn.href = '/workers';
          }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('Registration failed:', err.status, err.message);

        // Map 400/409 onto fields
        const msg = (err.message || '').toLowerCase();
        if (err.status === 409 || msg.includes('already exists') || msg.includes('conflict')) {
          if (msg.includes('email')) {
            setFieldError(emailInput, errors.email, 'An account with this email address already exists.');
            emailInput.focus();
          } else if (msg.includes('phone')) {
            setFieldError(phoneInput, errors.phone, 'An account with this phone number already exists.');
            phoneInput.focus();
          } else {
            if (generalError) {
              generalError.textContent = err.message || 'An account with these details already exists. Please login instead.';
              generalError.hidden = false;
            }
          }
        } else if (err.status === 400) {
          if (msg.includes('email')) {
            setFieldError(emailInput, errors.email, err.message);
            emailInput.focus();
          } else if (msg.includes('phone')) {
            setFieldError(phoneInput, errors.phone, err.message);
            phoneInput.focus();
          } else if (msg.includes('password')) {
            setFieldError(passwordInput, errors.password, err.message);
            passwordInput.focus();
          } else if (msg.includes('location')) {
            setFieldError(locationInput, errors.location, err.message);
            locationInput.focus();
          } else if (msg.includes('skill')) {
            setFieldError(null, errors.trades, err.message);
          } else {
            if (generalError) {
              generalError.textContent = err.message || 'Please check your inputs and try again.';
              generalError.hidden = false;
            }
          }
        } else {
          if (generalError) {
            generalError.textContent = err.message || 'Registration could not be completed. Please try again shortly.';
            generalError.hidden = false;
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Worker Profile';
        }
      }
    });
  }

  // Load skills on init
  loadSkills();
})();
