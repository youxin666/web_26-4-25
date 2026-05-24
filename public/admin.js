document.addEventListener('DOMContentLoaded', () => {
    const loginPanel = document.querySelector('[data-admin-login-panel]');
    const loginForm = document.querySelector('[data-admin-login-form]');
    const loginStatus = document.querySelector('[data-admin-login-status]');
    const consolePanel = document.querySelector('[data-admin-console]');
    const refreshButton = document.querySelector('[data-admin-refresh]');
    const logoutButton = document.querySelector('[data-admin-logout]');
    const stats = document.querySelector('[data-admin-stats]');
    const interviewList = document.querySelector('[data-admin-interviews]');
    const feedbackList = document.querySelector('[data-admin-feedback]');
    const interviewCount = document.querySelector('[data-admin-interview-count]');
    const feedbackCount = document.querySelector('[data-admin-feedback-count]');

    const statusLabels = {
        new: '待处理',
        contacted: '已联系',
        scheduled: '已安排',
        closed: '已关闭',
    };

    const setLoginStatus = (message, type = 'muted') => {
        if (!loginStatus) return;
        loginStatus.textContent = message;
        loginStatus.dataset.state = type;
    };

    const formatDate = (value) => {
        if (!value) return '暂无';
        const date = new Date(`${String(value).replace(' ', 'T')}Z`);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const requestJson = async (url, options = {}) => {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            },
            ...options,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }
        return data;
    };

    const setAuthed = (authed) => {
        if (loginPanel) loginPanel.hidden = authed;
        if (consolePanel) consolePanel.hidden = !authed;
    };

    const createEmpty = (message) => {
        const empty = document.createElement('p');
        empty.className = 'feedback-empty';
        empty.textContent = message;
        return empty;
    };

    const renderStats = (summary) => {
        if (!stats) return;
        const values = [
            summary.feedbackCount || 0,
            summary.feedbackAverage ? `${summary.feedbackAverage}/5` : '--',
            summary.interviewCount || 0,
            summary.newInterviewCount || 0,
        ];

        Array.from(stats.querySelectorAll('strong')).forEach((node, index) => {
            node.textContent = values[index];
        });
    };

    const createMeta = (items) => {
        const meta = document.createElement('div');
        meta.className = 'admin-card-meta';
        items.filter(Boolean).forEach((item) => {
            const span = document.createElement('span');
            span.textContent = item;
            meta.append(span);
        });
        return meta;
    };

    const createInterviewCard = (item) => {
        const article = document.createElement('article');
        article.className = 'admin-data-card';

        const head = document.createElement('div');
        head.className = 'admin-data-head';

        const title = document.createElement('div');
        const company = document.createElement('strong');
        company.textContent = item.company || '未填写公司';
        const position = document.createElement('p');
        position.textContent = item.position || '未填写岗位';
        title.append(company, position);

        const select = document.createElement('select');
        select.className = 'admin-status-select';
        Object.entries(statusLabels).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = (item.status || 'new') === value;
            select.append(option);
        });
        select.addEventListener('change', async () => {
            select.disabled = true;
            try {
                await requestJson('/api/admin/interview-status', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: item.id, status: select.value }),
                });
            } catch (error) {
                setLoginStatus(error.message || '状态更新失败', 'error');
            } finally {
                select.disabled = false;
            }
        });

        head.append(title, select);

        const meta = createMeta([
            `联系人：${item.recruiter || '未填写'}`,
            `方式：${item.channel || '未填写'}`,
            `时间：${item.interview_time || '未填写'}`,
            formatDate(item.created_at),
        ]);

        const contact = document.createElement('p');
        contact.className = 'admin-card-contact';
        contact.textContent = `联系方式：${item.contact || '未填写'}`;

        const message = document.createElement('p');
        message.className = 'admin-card-message';
        message.textContent = item.message || '无补充说明';

        article.append(head, meta, contact, message);
        return article;
    };

    const createFeedbackCard = (item) => {
        const article = document.createElement('article');
        article.className = 'admin-data-card';

        const head = document.createElement('div');
        head.className = 'admin-data-head';
        const title = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = item.name || '访客';
        const category = document.createElement('p');
        category.textContent = `${item.category || '其他'} · ${item.rating || 5}/5`;
        title.append(name, category);

        const time = document.createElement('time');
        time.textContent = formatDate(item.created_at);
        head.append(title, time);

        const comment = document.createElement('p');
        comment.className = 'admin-card-message';
        comment.textContent = item.comment || '';

        const contact = document.createElement('p');
        contact.className = 'admin-card-contact';
        contact.textContent = `回访信息：${item.contact || '未填写'}`;

        article.append(head, comment, contact);
        return article;
    };

    const renderList = (target, items, countNode, emptyMessage, renderer) => {
        if (!target) return;
        target.replaceChildren();
        if (countNode) countNode.textContent = `${items.length} 条`;
        if (!items.length) {
            target.append(createEmpty(emptyMessage));
            return;
        }
        items.forEach((item) => target.append(renderer(item)));
    };

    const loadDashboard = async () => {
        const [summary, interviews, feedback] = await Promise.all([
            requestJson('/api/admin/summary'),
            requestJson('/api/admin/interviews'),
            requestJson('/api/admin/feedback'),
        ]);
        renderStats(summary);
        renderList(interviewList, interviews.items || [], interviewCount, '暂时没有面试邀约。', createInterviewCard);
        renderList(feedbackList, feedback.items || [], feedbackCount, '暂时没有反馈。', createFeedbackCard);
    };

    const checkSession = async () => {
        try {
            const data = await requestJson('/api/admin/session');
            setAuthed(Boolean(data.authenticated));
            if (data.authenticated) {
                await loadDashboard();
            }
        } catch {
            setAuthed(false);
        }
    };

    loginForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const payload = Object.fromEntries(new FormData(loginForm).entries());

        setLoginStatus('正在登录...', 'muted');
        if (submitButton) submitButton.disabled = true;

        try {
            await requestJson('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            loginForm.reset();
            setAuthed(true);
            setLoginStatus('登录成功。', 'success');
            await loadDashboard();
        } catch (error) {
            setLoginStatus(error.message || '登录失败', 'error');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

    refreshButton?.addEventListener('click', async () => {
        refreshButton.disabled = true;
        try {
            await loadDashboard();
        } finally {
            refreshButton.disabled = false;
        }
    });

    logoutButton?.addEventListener('click', async () => {
        await requestJson('/api/admin/logout', { method: 'POST' });
        setAuthed(false);
    });

    checkSession();
});
