document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem('site-theme');
    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme) => {
        const resolvedTheme = theme || (systemThemeQuery.matches ? 'dark' : 'light');
        root.dataset.theme = resolvedTheme;
        root.style.colorScheme = resolvedTheme;
    };

    applyTheme(storedTheme);

    const currentPage = window.location.pathname.split('/').pop() || 'home';
    const siteHeader = document.querySelector('.site-header');
    const navToggle = document.querySelector('[data-nav-toggle]');
    const siteNav = document.querySelector('.site-nav');

    const themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', '切换深色模式');
    themeToggle.innerHTML = '<span aria-hidden="true"></span>';
    document.body.append(themeToggle);

    const syncThemeButton = () => {
        const isDark = root.dataset.theme === 'dark';
        themeToggle.dataset.theme = isDark ? 'dark' : 'light';
        themeToggle.title = isDark ? '切换到浅色模式' : '切换到深色模式';
        themeToggle.setAttribute('aria-pressed', String(isDark));
    };

    syncThemeButton();

    themeToggle.addEventListener('click', () => {
        const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('site-theme', nextTheme);
        applyTheme(nextTheme);
        syncThemeButton();
    });

    systemThemeQuery.addEventListener('change', () => {
        if (!localStorage.getItem('site-theme')) {
            applyTheme();
            syncThemeButton();
        }
    });

    let lastThemeScrollY = window.scrollY;
    let themeScrollTicking = false;
    const updateThemeToggleVisibility = () => {
        const currentY = window.scrollY;
        const delta = currentY - lastThemeScrollY;
        const shouldHide = currentY > 120 && delta > 8;

        themeToggle.classList.toggle('is-hidden', shouldHide);

        if (delta < -6 || currentY < 80) {
            themeToggle.classList.remove('is-hidden');
        }

        lastThemeScrollY = currentY;
        themeScrollTicking = false;
    };

    window.addEventListener('scroll', () => {
        if (!themeScrollTicking) {
            window.requestAnimationFrame(updateThemeToggleVisibility);
            themeScrollTicking = true;
        }
    }, { passive: true });

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
        let scrollTicking = false;
        const updateScrollMotion = () => {
            const progress = Math.min(window.scrollY / 900, 1).toFixed(3);
            document.documentElement.style.setProperty('--scroll-progress', progress);
            scrollTicking = false;
        };

        updateScrollMotion();

        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                window.requestAnimationFrame(updateScrollMotion);
                scrollTicking = true;
            }
        }, { passive: true });

        window.addEventListener('pointermove', (event) => {
            document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
            document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
        }, { passive: true });

        document.querySelectorAll('.feature-card, .info-card, .detail-card, .contact-card, .social-card, .feedback-card, .match-card, .product-console, .console-grid article, .arch-node, .case-summary, .case-steps article, .interview-process article, .interview-summary-card, .skill-matrix article').forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                card.style.setProperty('--tilt-x', `${(-y * 3.5).toFixed(2)}deg`);
                card.style.setProperty('--tilt-y', `${(x * 4.5).toFixed(2)}deg`);
                card.style.setProperty('--card-x', `${event.clientX - rect.left}px`);
                card.style.setProperty('--card-y', `${event.clientY - rect.top}px`);
            }, { passive: true });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--tilt-x', '0deg');
                card.style.setProperty('--tilt-y', '0deg');
            });
        });
    }

    document.querySelectorAll('.feature-grid, .timeline, .project-layout, .skill-matrix, .contact-grid, .social-grid, .comment-list, .match-bars, .pill-list, .quick-tags, .console-grid, .arch-branches, .case-steps, .case-metrics, .interview-process').forEach((group) => {
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
