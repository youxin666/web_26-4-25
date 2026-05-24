document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-interview-form]');
    const status = document.querySelector('[data-interview-status]');
    const submitButton = form?.querySelector('button[type="submit"]');

    const setStatus = (message, type = 'muted') => {
        if (!status) return;
        status.textContent = message;
        status.dataset.state = type;
    };

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        setStatus('正在发送邀约...', 'muted');
        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '发送邀约失败');
            }
            form.reset();
            const position = data.item?.position ? `「${data.item.position}」` : '';
            setStatus(`面试邀约已提交${position}，感谢你的联系。`, 'success');
        } catch (error) {
            setStatus(error.message || '发送邀约失败，请稍后再试。', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
});
