document.addEventListener('DOMContentLoaded', () => {
    const targets = {
        phone: document.querySelector('[data-contact-phone]'),
        email: document.querySelector('[data-contact-email]'),
    };

    const labels = {
        phone: '手机号',
        email: '邮箱',
    };

    const copyButtons = {
        phone: document.querySelector('[data-copy-contact="phone"]'),
        email: document.querySelector('[data-copy-contact="email"]'),
    };

    const copyText = async (value) => {
        if (!value) return false;
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }

        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        return copied;
    };

    const setCopied = (button, text) => {
        if (!button) return;
        const originalText = button.dataset.originalText || button.textContent;
        button.dataset.originalText = originalText;
        button.textContent = text;
        window.setTimeout(() => {
            button.textContent = originalText;
        }, 1600);
    };

    document.querySelectorAll('[data-reveal-contact]').forEach((button) => {
        button.addEventListener('click', async () => {
            const type = button.dataset.revealContact;
            const code = window.prompt(`请输入查看码查看完整${labels[type] || '联系方式'}`);
            if (!code) return;

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = '验证中';

            try {
                const response = await fetch('/api/contact-reveal', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ type, code }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || '查看码错误');
                }
                if (targets[type]) {
                    targets[type].textContent = data.value;
                }
                if (copyButtons[type]) {
                    copyButtons[type].disabled = false;
                    copyButtons[type].dataset.copyValue = data.value;
                }
                button.textContent = '已显示';
            } catch (error) {
                window.alert(error.message || '查看失败，请稍后再试。');
                button.textContent = originalText;
            } finally {
                button.disabled = false;
            }
        });
    });

    document.querySelectorAll('[data-copy-contact]').forEach((button) => {
        button.addEventListener('click', async () => {
            const value = button.dataset.copyValue;
            try {
                const copied = await copyText(value);
                setCopied(button, copied ? '已复制' : '复制失败');
            } catch {
                setCopied(button, '复制失败');
            }
        });
    });

    document.querySelector('[data-copy-link]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
            const copied = await copyText(window.location.href);
            setCopied(button, copied ? '已复制链接' : '复制失败');
        } catch {
            setCopied(button, '复制失败');
        }
    });
});
