class ScrollytellingPage {
    constructor() {
        this.videoStage = document.querySelector('.video-stage');
        this.introVideo = document.getElementById('intro-video');
        this.mainVideo = document.getElementById('main-video');
        this.outroVideo = document.getElementById('outro-video');
        this.videoFocusHalo = document.querySelector('.video-focus-halo');
        this.scrollSpace = document.getElementById('scroll-space');
        this.beats = Array.from(document.querySelectorAll('.story-beat'));
        this.progressFill = document.getElementById('progress-fill');
        this.progressLabel = document.getElementById('progress-label');
        this.phaseLabel = document.getElementById('phase-label');
        this.scrollHint = document.getElementById('scroll-hint');
        this.phaseVideos = {
            intro: this.introVideo,
            main: this.mainVideo,
            outro: this.outroVideo
        };
        this.allVideos = [this.introVideo, this.mainVideo, this.outroVideo];

        this.currentPhase = 'intro';
        this.scrollProgress = 0;
        this.easedProgress = 0;
        this.targetTime = 0;
        this.rafId = null;
        this.lastMainSeekAt = 0;
        this.lastActiveBeat = null;
        this.pointerTargetX = 0;
        this.pointerTargetY = 0;
        this.pointerCurrentX = 0;
        this.pointerCurrentY = 0;
        this.isScrollActive = false;
        this.scrollIdleTimer = null;
        this.isMobileViewport = window.matchMedia('(max-width: 640px)').matches;
        this.isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

        this.onScroll = this.onScroll.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerLeave = this.onPointerLeave.bind(this);
        this.tick = this.tick.bind(this);

        this.init();
    }

    init() {
        this.unlockLoopPlayback();
        this.setVisibleVideo('intro');
        this.bindEvents();
        this.setupPageHeight();
        this.onScroll();
        this.tick();
    }

    bindEvents() {
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize);
        window.addEventListener('pointermove', this.onPointerMove, { passive: true });
        window.addEventListener('pointerleave', this.onPointerLeave);

        this.mainVideo.addEventListener('loadedmetadata', () => {
            this.setupPageHeight();
            this.updateBeatByTime(this.mainVideo.duration * 0.02);
            this.onScroll();
        });
    }

    unlockLoopPlayback() {
        [this.introVideo, this.outroVideo].forEach((video) => {
            if (!video) {
                return;
            }

            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        });
    }

    setupPageHeight() {
        const duration = Number.isFinite(this.mainVideo.duration) && this.mainVideo.duration > 0
            ? this.mainVideo.duration
            : 11.61;
        this.scrollSpace.style.height = `${Math.max(duration, 1) * window.innerHeight}px`;
    }

    onResize() {
        this.isMobileViewport = window.matchMedia('(max-width: 640px)').matches;
        this.isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        this.setupPageHeight();
        this.onScroll();
    }

    onPointerMove(event) {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;

        this.pointerTargetX = x;
        this.pointerTargetY = y;
    }

    onPointerLeave() {
        this.pointerTargetX = 0;
        this.pointerTargetY = 0;
    }

    getScrollProgress() {
        const maxScroll = Math.max(this.scrollSpace.offsetHeight - window.innerHeight, 1);
        return Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    }

    onScroll() {
        this.scrollProgress = this.getScrollProgress();
        this.markScrollActive();
        this.updateProgressUi(this.scrollProgress);

        if (this.scrollProgress <= 0) {
            this.setVisibleVideo('intro');
            this.updateBeatByTime(0);
            return;
        }

        if (this.scrollProgress >= 0.98) {
            const duration = this.mainVideo.duration || 11.61;
            this.setVisibleVideo('outro');
            this.updateBeatByTime(duration);
            return;
        }

        this.setVisibleVideo('main');
    }

    updateProgressUi(progress) {
        const percentage = Math.round(progress * 100);
        this.progressFill.style.width = `${percentage}%`;
        this.progressLabel.textContent = `${String(percentage).padStart(2, '0')}%`;

        if (progress <= 0) {
            this.phaseLabel.textContent = 'INTRO';
        } else if (progress >= 0.98) {
            this.phaseLabel.textContent = 'OUTRO';
        } else {
            this.phaseLabel.textContent = 'MAIN';
        }

        this.scrollHint.classList.toggle('is-hidden', progress > 0.03);
    }

    setVisibleVideo(phase) {
        if (phase === this.currentPhase) {
            return;
        }

        Object.entries(this.phaseVideos).forEach(([key, video]) => {
            if (!video) {
                return;
            }

            video.classList.toggle('is-visible', key === phase);

            if (key === 'main') {
                video.pause();
            } else if (key === phase) {
                const playPromise = video.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
            } else {
                video.pause();
            }
        });

        this.currentPhase = phase;
    }

    markScrollActive() {
        this.isScrollActive = true;
        document.body.classList.add('is-scroll-active');

        if (this.scrollIdleTimer) {
            window.clearTimeout(this.scrollIdleTimer);
        }

        this.scrollIdleTimer = window.setTimeout(() => {
            this.isScrollActive = false;
            document.body.classList.remove('is-scroll-active');
        }, 140);
    }

    applyPointerParallax() {
        if (this.currentPhase !== 'main') {
            this.pointerCurrentX += (this.pointerTargetX - this.pointerCurrentX) * 0.04;
            this.pointerCurrentY += (this.pointerTargetY - this.pointerCurrentY) * 0.04;
            return;
        }

        const isMobile = this.isMobileViewport || this.isCoarsePointer;
        if (isMobile) {
            return;
        }

        this.pointerCurrentX += (this.pointerTargetX - this.pointerCurrentX) * 0.08;
        this.pointerCurrentY += (this.pointerTargetY - this.pointerCurrentY) * 0.08;

        const scaleMultiplier = 1.065;
        const translateMultiplier = 24;
        const translateYMultiplier = 16;
        const rotateMultiplier = 2.4;
        const rotateYMultiplier = 1.6;

        const translateX = this.pointerCurrentX * translateMultiplier;
        const translateY = this.pointerCurrentY * translateYMultiplier;
        const rotateY = this.pointerCurrentX * rotateMultiplier;
        const rotateX = -this.pointerCurrentY * rotateYMultiplier;
        const transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleMultiplier}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        const activeVideo = this.phaseVideos[this.currentPhase];
        if (activeVideo) {
            activeVideo.style.transform = transform;
        }

        if (this.videoFocusHalo) {
            const haloTranslateX = this.pointerCurrentX * 32;
            const haloTranslateY = this.pointerCurrentY * 22;
            const baseHaloOpacity = this.isScrollActive ? 0.66 : 0.82;
            const haloOpacity = baseHaloOpacity + Math.min(0.16, Math.abs(this.pointerCurrentX) * 0.2 + Math.abs(this.pointerCurrentY) * 0.2);
            this.videoFocusHalo.style.transform = `translate3d(${haloTranslateX}px, ${haloTranslateY}px, 0)`;
            this.videoFocusHalo.style.opacity = `${Math.min(0.9, haloOpacity)}`;
        }

        if (this.videoStage) {
            this.videoStage.style.transform = `translate3d(${-translateX * 0.08}px, ${-translateY * 0.08}px, 0)`;
        }
    }

    updateBeatByTime(time) {
        const activeBeat = this.beats.find((beat) => {
            const start = Number(beat.dataset.start);
            const end = Number(beat.dataset.end);
            return time >= start && time < end;
        }) || this.beats[this.beats.length - 1];

        if (activeBeat === this.lastActiveBeat) {
            return;
        }

        this.beats.forEach((beat) => {
            beat.classList.toggle('is-active', beat === activeBeat);
        });

        this.lastActiveBeat = activeBeat;
    }

    tick() {
        const now = performance.now();
        const isMobile = this.isMobileViewport || this.isCoarsePointer;
        const mainSeekIntervalMs = isMobile ? 1000 / 24 : 1000 / 30;
        const mainSeekThreshold = isMobile ? 0.06 : 0.04;
        const easing = isMobile ? 0.11 : 0.09;
        const seekLerp = isMobile ? 0.3 : 0.22;

        this.easedProgress += (this.scrollProgress - this.easedProgress) * easing;
        this.applyPointerParallax();

        if (this.currentPhase === 'main' && Number.isFinite(this.mainVideo.duration)) {
            const duration = this.mainVideo.duration || 11.61;
            this.targetTime = this.easedProgress * duration;
            this.updateBeatByTime(this.targetTime);

            const shouldSeekByThreshold = Math.abs(this.mainVideo.currentTime - this.targetTime) > mainSeekThreshold;
            const shouldSeekByInterval = now - this.lastMainSeekAt >= mainSeekIntervalMs;

            if (shouldSeekByThreshold && shouldSeekByInterval) {
                const delta = this.targetTime - this.mainVideo.currentTime;
                const nextTime = this.mainVideo.currentTime + delta * seekLerp;
                this.mainVideo.currentTime = Math.min(duration, Math.max(0, nextTime));
                this.lastMainSeekAt = now;
            }
        } else if (this.currentPhase === 'intro') {
            this.updateBeatByTime(0);
        } else if (this.currentPhase === 'outro') {
            const duration = this.mainVideo.duration || 11.61;
            this.updateBeatByTime(duration);
        }

        this.rafId = window.requestAnimationFrame(this.tick);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ScrollytellingPage();

    // Nav link click glow effect
    document.querySelectorAll('.topnav a').forEach((link) => {
        link.addEventListener('pointerdown', () => {
            link.classList.add('is-clicking');
            link.addEventListener('animationend', () => {
                link.classList.remove('is-clicking');
            }, { once: true });
        });
    });
});
