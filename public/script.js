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
    const mobileNavQuery = window.matchMedia('(max-width: 860px)');
    const navHome = document.createComment('site-nav-home');
    siteNav?.parentNode?.insertBefore(navHome, siteNav);
    const navScrim = document.createElement('button');
    navScrim.type = 'button';
    navScrim.className = 'nav-scrim';
    navScrim.setAttribute('aria-label', '关闭导航菜单');
    document.body.append(navScrim);

    const navigationGroups = [
        {
            className: 'nav-main',
            label: '站内页面',
            links: [
                ['about.html', '关于本站'],
                ['works.html', '网站作品'],
                ['release.html', '项目经历'],
                ['immerse.html', '工作经历'],
                ['rest.html', '技能证书'],
                ['player.html', '联系方式']
            ]
        },
        {
            className: 'nav-tools',
            label: '在线服务',
            links: [
                ['interview.html', '面试邀约'],
                ['feedback.html', '反馈系统']
            ]
        },
        {
            className: 'nav-external',
            label: '站外页面',
            links: [
                ['https://blog.858846.xyz', '博客系统'],
                ['https://mail.858846.xyz', '邮件系统'],
                ['https://lab.858846.xyz', '技术实验室']
            ]
        }
    ];

    if (siteNav) {
        const navigationFragment = document.createDocumentFragment();

        navigationGroups.forEach(({ className, label, links }) => {
            const group = document.createElement('span');
            group.className = className;
            group.dataset.navLabel = label;

            links.forEach(([href, text]) => {
                const link = document.createElement('a');
                const isExternal = href.startsWith('https://');

                link.href = href;
                link.append(document.createTextNode(text));

                if (isExternal) {
                    const arrow = document.createElement('span');
                    arrow.className = 'external-arrow';
                    arrow.setAttribute('aria-hidden', 'true');
                    arrow.textContent = '↗';
                    link.append(arrow);
                } else if (href === currentPage) {
                    link.classList.add('is-active');
                    link.setAttribute('aria-current', 'page');
                }

                group.append(link);
            });

            navigationFragment.append(group);
        });

        siteNav.classList.add('grouped-nav');
        siteNav.replaceChildren(navigationFragment);
    }

    const navClose = document.createElement('button');
    navClose.type = 'button';
    navClose.className = 'nav-close';
    navClose.setAttribute('aria-label', '关闭导航菜单');
    navClose.innerHTML = '<span></span><span></span>';
    siteNav?.prepend(navClose);
    const themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', '切换深色模式');
    themeToggle.innerHTML = '<span aria-hidden="true"></span>';
    siteHeader?.append(themeToggle);

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

    document.querySelectorAll('.site-nav a').forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (href === currentPage) {
            link.classList.add('is-active');
        }
    });

    const closeNav = () => {
        siteHeader?.classList.remove('is-nav-open');
        document.body.classList.remove('is-nav-open');
        navToggle?.setAttribute('aria-expanded', 'false');
    };

    const syncNavPlacement = () => {
        if (!siteNav) {
            return;
        }

        if (mobileNavQuery.matches) {
            if (siteNav.parentNode !== document.body) {
                document.body.append(siteNav);
            }
        } else if (navHome.parentNode) {
            navHome.parentNode.insertBefore(siteNav, navHome.nextSibling);
        }
    };

    syncNavPlacement();

    const openNav = () => {
        syncNavPlacement();
        siteHeader?.classList.add('is-nav-open');
        document.body.classList.add('is-nav-open');
        navToggle?.setAttribute('aria-expanded', 'true');
    };

    navToggle?.addEventListener('click', () => {
        if (siteHeader?.classList.contains('is-nav-open')) {
            closeNav();
        } else {
            openNav();
        }
    });

    siteNav?.addEventListener('click', (event) => {
        if (event.target.closest('a') && mobileNavQuery.matches) {
            closeNav();
        }
    });

    navClose.addEventListener('click', closeNav);
    navScrim.addEventListener('click', closeNav);

    mobileNavQuery.addEventListener('change', (event) => {
        closeNav();
        syncNavPlacement();
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

        document.querySelectorAll('.feature-card, .info-card, .detail-card, .contact-card, .social-card, .feedback-card, .match-card, .product-console, .console-grid article, .console-grid .console-card, .arch-node, .case-summary, .case-steps article, .interview-process article, .interview-summary-card, .skill-matrix article').forEach((card) => {
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
