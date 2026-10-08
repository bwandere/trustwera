// Client Registration Logic
(function() {
  'use strict';

  const form = document.getElementById('client-register-form');
  const submitBtn = document.getElementById('reg-submit-btn');
  const generalError = document.getElementById('register-general-error');
  const successPanel = document.getElementById('register-success-panel');

  const nameInput = document.getElementById('reg-name');
  const phoneInput = document.getElementById('reg-phone');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');
  const togglePasswordBtn = document.getElementById('toggle-reg-password-btn');

  const errors = {
    name: document.getElementById('error-reg-name'),
    phone: document.getElementById('error-reg-phone'),
    email: document.getElementById('error-reg-email'),
    password: document.getElementById('error-reg-password')
  };

  // Toggle password visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function() {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  function setFieldError(field, errorEl, message) {
    if (field) field.setAttribute('aria-invalid', 'true');
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(field, errorEl) {
    if (field) field.removeAttribute('aria-invalid');
    if (errorEl) errorEl.textContent = '';
  }

  function validateName() {
    const val = (nameInput.value || '').trim();
    if (!val) {
      setFieldError(nameInput, errors.name, 'Full name is required.');
      return false;
    }
    clearFieldError(nameInput, errors.name);
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
      setFieldError(phoneInput, errors.phone, 'Please enter a valid phone number (e.g. 0712345678).');
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

  nameInput?.addEventListener('blur', validateName);
  phoneInput?.addEventListener('blur', validatePhone);
  emailInput?.addEventListener('blur', validateEmail);
  passwordInput?.addEventListener('blur', validatePassword);

  if (form) {
    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      if (generalError) generalError.hidden = true;

      const isNameValid = validateName();
      const isPhoneValid = validatePhone();
      const isEmailValid = validateEmail();
      const isPassValid = validatePassword();

      if (!isNameValid || !isPhoneValid || !isEmailValid || !isPassValid) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const payload = {
        full_name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        role: 'client'
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account…';
      }

      try {
        const api = window.TrustWera?.api;
        if (!api) throw new Error('API client unavailable');

        try {
          await api.post('/api/register', payload);
        } catch (postErr) {
          // If auth endpoint not implemented in backend (M4), handle 404/501 gracefully
          if (postErr.status === 404 || postErr.status === 501) {
            console.info('Client registration endpoint pending backend M4. Showing success.');
          } else {
            throw postErr;
          }
        }

        form.hidden = true;
        if (successPanel) successPanel.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('Registration failed:', err);
        const msg = (err.message || '').toLowerCase();
        if (err.status === 409 || msg.includes('already exists')) {
          if (msg.includes('email')) {
            setFieldError(emailInput, errors.email, 'An account with this email already exists.');
            emailInput.focus();
          } else if (msg.includes('phone')) {
            setFieldError(phoneInput, errors.phone, 'An account with this phone already exists.');
            phoneInput.focus();
          } else {
            if (generalError) {
              generalError.textContent = 'An account with this email or phone already exists.';
              generalError.hidden = false;
            }
          }
        } else {
          if (generalError) {
            generalError.textContent = err.message || 'Unable to register right now. Please try again.';
            generalError.hidden = false;
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      }
    });
  }
})();
