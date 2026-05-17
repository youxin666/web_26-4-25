document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-feedback-form]');
    const list = document.querySelector('[data-feedback-list]');
    const status = document.querySelector('[data-feedback-status]');
    const count = document.querySelector('[data-feedback-count]');
    const submitButton = form?.querySelector('button[type="submit"]');

    const setStatus = (message, type = 'muted') => {
        if (!status) return;
        status.textContent = message;
        status.dataset.state = type;
    };

    const formatDate = (value) => {
        if (!value) return '刚刚';
        const date = new Date(`${value.replace(' ', 'T')}Z`);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const createCommentCard = (item) => {
        const article = document.createElement('article');
        article.className = 'feedback-card';

        const meta = document.createElement('div');
        meta.className = 'feedback-card-meta';

        const person = document.createElement('strong');
        person.textContent = item.name || '访客';

        const tags = document.createElement('span');
        tags.textContent = `${item.category || '其他'} · ${item.rating || 5}/5`;

        meta.append(person, tags);

        const body = document.createElement('p');
        body.textContent = item.comment || '';

        const time = document.createElement('time');
        time.dateTime = item.created_at || '';
        time.textContent = formatDate(item.created_at);

        article.append(meta, body, time);
        return article;
    };

    const renderList = (items) => {
        if (!list) return;
        list.replaceChildren();

        if (count) {
            count.textContent = `${items.length} 条反馈`;
        }

        if (!items.length) {
            const empty = document.createElement('p');
            empty.className = 'feedback-empty';
            empty.textContent = '暂时还没有公开反馈。';
            list.append(empty);
            return;
        }

        items.forEach((item) => list.append(createCommentCard(item)));
    };

    const loadFeedback = async () => {
        try {
            const response = await fetch('/api/feedback', { headers: { Accept: 'application/json' } });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '读取反馈失败');
            }
            renderList(data.items || []);
        } catch (error) {
            renderList([]);
            setStatus(error.message || '读取反馈失败', 'error');
        }
    };

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        setStatus('正在提交反馈...', 'muted');
        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '提交反馈失败');
            }
            form.reset();
            setStatus('反馈已提交，感谢你的建议。', 'success');
            await loadFeedback();
        } catch (error) {
            setStatus(error.message || '提交反馈失败，请稍后再试。', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });

    loadFeedback();
});
