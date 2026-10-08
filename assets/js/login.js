// Login Page Logic
(function() {
  'use strict';

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit-btn');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-login-password-btn');
  const generalError = document.getElementById('login-general-error');
  const noticePanel = document.getElementById('login-notice');

  const errors = {
    email: document.getElementById('error-login-email'),
    password: document.getElementById('error-login-password')
  };

  // Toggle password visibility
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', function() {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
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
    clearFieldError(passwordInput, errors.password);
    return true;
  }

  emailInput?.addEventListener('blur', validateEmail);
  passwordInput?.addEventListener('blur', validatePassword);

  if (form) {
    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      if (generalError) generalError.hidden = true;
      if (noticePanel) noticePanel.hidden = true;

      const isEmailValid = validateEmail();
      const isPassValid = validatePassword();

      if (!isEmailValid || !isPassValid) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const payload = {
        email: emailInput.value.trim(),
        password: passwordInput.value
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';
      }

      try {
        const api = window.TrustWera?.api;
        if (!api) throw new Error('API client unavailable');

        await api.post('/api/auth/login', payload);

        // If login succeeded (in future auth milestone), redirect to directory
        window.location.href = '/workers';
      } catch (err) {
        console.warn('Login attempt:', err.status, err.message);

        // Per requirement P6: on 404, 501, or network failure show calm inline notice
        if (err.status === 404 || err.status === 501 || err.isNetworkError) {
          if (noticePanel) {
            noticePanel.hidden = false;
            noticePanel.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (err.status === 401) {
          if (generalError) {
            generalError.textContent = 'Invalid email or password. Please try again.';
            generalError.hidden = false;
          }
        } else {
          if (generalError) {
            generalError.textContent = err.message || 'Sign in is not available right now. Please try again later.';
            generalError.hidden = false;
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      }
    });
  }
})();
