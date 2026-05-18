document.addEventListener('DOMContentLoaded', () => {
    const targets = {
        phone: document.querySelector('[data-contact-phone]'),
        email: document.querySelector('[data-contact-email]'),
    };

    const labels = {
        phone: '手机号',
        email: '邮箱',
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
                button.textContent = '已显示';
            } catch (error) {
                window.alert(error.message || '查看失败，请稍后再试。');
                button.textContent = originalText;
            } finally {
                button.disabled = false;
            }
        });
    });
});
