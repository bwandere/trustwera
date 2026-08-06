// Mobile Navigation Toggle
(function() {
    const toggle = document.querySelector('.navbar__toggle');
    const menu = document.querySelector('.navbar__menu');
    
    if (!toggle || !menu) return;

    function openMenu() {
        menu.classList.add('is-open');
        toggle.classList.add('is-active');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close navigation menu');
    }
 
    function closeMenu() {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation menu');
    }
    
    toggle.addEventListener('click', function() {
        const isOpen = menu.classList.contains('is-open');
        isOpen ? closeMenu() : openMenu();
    });
    
    // Close menu when clicking a link (mobile UX improvement)
    const links = menu.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', closeMenu )

    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInside = toggle.contains(event.target) || menu.contains(event.target);
        if (!isClickInside && menu.classList.contains('is-open')) {
            closeMenu();
        }
    });
    
    // Handle Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            closeMenu();
            toggle.focus();
        }
    });

     // If the viewport grows past the mobile breakpoint while the menu
    // is open, reset state — the CSS shows the menu inline above 841px
    // regardless of .is-open, but the icon/aria state should still
    // reflect "closed" so it doesn't reopen oddly on the next resize
    // back down to mobile.
    window.addEventListener('resize', function() {
        if (window.innerWidth > 840 && menu.classList.contains('is-open')) {
            closeMenu();
        }
    });
})();
 
// ---------- Sticky Header Shadow ----------
(function() {
    const header = document.querySelector('.site-header');
    if (!header) return;
 
    const SCROLL_THRESHOLD = 12;
 
    function updateHeaderState() {
        header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    }
 
    updateHeaderState(); // handle a page load that's already mid-scroll
    window.addEventListener('scroll', updateHeaderState, { passive: true });
})();
 
// ---------- Scroll Reveal ----------
// Fades/slides cards in as they enter the viewport. Uses
// IntersectionObserver so the browser, not a scroll listener, decides
// when to check visibility. Falls back to showing everything
// immediately if the API isn't available.
(function() {
    const revealTargets = document.querySelectorAll(
        '.category-card, .feature-card, .timeline__step, .worker-card'
    );
 
    if (!revealTargets.length) return;
 
    if (!('IntersectionObserver' in window)) {
        revealTargets.forEach(el => el.classList.add('is-visible'));
        return;
    }
 
    revealTargets.forEach(el => el.classList.add('reveal'));
 
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
 
    revealTargets.forEach(el => observer.observe(el));
})();
 
// ---------- Search Filters Form ----------
// No backend exists yet (Milestone 1 is the landing page only), so
// this can't actually search anything. What it CAN do honestly: turn
// the selected filters into the same query-string format the
// category "Quick Browse" links already use (/workers?trade=...),
// so the behavior is consistent across the page and ready to hit a
// real endpoint the moment /workers exists.
(function() {
    const form = document.querySelector('.search-filters__form');
    if (!form) return;
 
    form.addEventListener('submit', function(event) {
        event.preventDefault();
 
        const service = document.getElementById('service-needed').value;
        const location = document.getElementById('location').value;
        const availability = document.getElementById('availability').value;
 
        const params = new URLSearchParams();
        if (service) params.set('trade', service);
        if (location) params.set('location', location);
        if (availability) params.set('available', availability);
 
        const queryString = params.toString();
        console.log('Search submitted — would navigate to:', '/workers' + (queryString ? '?' + queryString : ''));
 
        // Intentionally not navigating yet: /workers doesn't exist
        // until a later milestone. Swap the line above for a real
        // window.location.href assignment once it does.
    });
})();