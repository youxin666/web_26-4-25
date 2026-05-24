document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const siteHeader = document.querySelector('.site-header');
    const navToggle = document.querySelector('[data-nav-toggle]');
    const siteNav = document.querySelector('.site-nav');

    document.querySelectorAll('.site-nav a').forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (href === currentPage) {
            link.classList.add('is-active');
        }
    });

    const closeNav = () => {
        siteHeader?.classList.remove('is-nav-open');
        navToggle?.setAttribute('aria-expanded', 'false');
    };

    navToggle?.addEventListener('click', () => {
        const isOpen = siteHeader?.classList.toggle('is-nav-open');
        navToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
    });

    siteNav?.addEventListener('click', (event) => {
        if (event.target.closest('a') && window.matchMedia('(max-width: 860px)').matches) {
            closeNav();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeNav();
        }
    });

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canAnimate = !motionQuery.matches;

    if (canAnimate) {
        window.addEventListener('pointermove', (event) => {
            document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
            document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
        }, { passive: true });

        document.querySelectorAll('.feature-card, .info-card, .detail-card, .contact-card, .social-card, .feedback-card, .match-card, .interview-process article, .interview-summary-card, .skill-matrix article').forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                card.style.setProperty('--tilt-x', `${(-y * 3.5).toFixed(2)}deg`);
                card.style.setProperty('--tilt-y', `${(x * 4.5).toFixed(2)}deg`);
            }, { passive: true });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--tilt-x', '0deg');
                card.style.setProperty('--tilt-y', '0deg');
            });
        });
    }

    document.querySelectorAll('.feature-grid, .timeline, .project-layout, .skill-matrix, .contact-grid, .social-grid, .comment-list, .match-bars, .pill-list, .quick-tags, .interview-process').forEach((group) => {
        group.classList.add('reveal-stagger');
        Array.from(group.children).forEach((child, index) => {
            child.style.setProperty('--stagger-index', index);
        });
    });

    const revealItems = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.16 });

    revealItems.forEach((item) => observer.observe(item));
});
