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
        link.addEventListener('click', closeMenu);
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

    // Reset state on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 840 && menu.classList.contains('is-open')) {
            closeMenu();
        }
    });
})();
 
// Sticky Header Shadow
(function() {
    const header = document.querySelector('.site-header');
    if (!header) return;
 
    const SCROLL_THRESHOLD = 12;
 
    function updateHeaderState() {
        header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    }
 
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
})();
 
// Scroll Reveal
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