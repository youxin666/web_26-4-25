class ClickParticles {
    constructor() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animating = false;
        this.themeColor = this.detectThemeColor();

        this.resize();
        window.addEventListener('resize', () => this.resize(), { passive: true });
        document.addEventListener('pointerdown', (e) => this.spawn(e.clientX, e.clientY), { passive: true });
    }

    detectThemeColor() {
        const body = document.body;
        if (body.classList.contains('story-immerse')) return '#FFD56A';
        if (body.classList.contains('story-release')) return '#FF9966';
        if (body.classList.contains('story-rest')) return '#B0C8FF';
        return '#FFFFFF';
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    spawn(x, y) {
        const count = 8 + Math.floor(Math.random() * 5);
        const color = this.themeColor;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1.5 + Math.random() * 2.5,
                opacity: 0.7 + Math.random() * 0.3,
                decay: 0.02 + Math.random() * 0.02,
                color: color,
            });
        }

        if (!this.animating) {
            this.animating = true;
            this.animate();
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.opacity -= p.decay;
            p.vx *= 0.96;
            p.vy *= 0.96;

            if (p.opacity <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;

        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.animating = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ClickParticles();
});