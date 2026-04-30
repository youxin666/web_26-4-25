document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-links a').forEach((link) => {
        link.addEventListener('pointerdown', () => {
            link.classList.add('is-clicking');
            link.addEventListener('animationend', () => {
                link.classList.remove('is-clicking');
            }, { once: true });
        });
    });
});