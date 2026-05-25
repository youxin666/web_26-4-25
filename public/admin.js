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
    const matchList = document.querySelector('[data-admin-matches]');
    const interviewCount = document.querySelector('[data-admin-interview-count]');
    const feedbackCount = document.querySelector('[data-admin-feedback-count]');
    const matchCount = document.querySelector('[data-admin-match-count]');
    const searchInput = document.querySelector('[data-admin-search]');
    const interviewFilter = document.querySelector('[data-admin-interview-filter]');
    const feedbackFilter = document.querySelector('[data-admin-feedback-filter]');

    const state = {
        interviews: [],
        feedback: [],
        matches: [],
        query: '',
        interviewStatus: 'all',
        feedbackStatus: 'all',
    };

    const interviewStatusLabels = {
        new: '待处理',
        contacted: '已联系',
        scheduled: '已安排',
        closed: '已关闭',
    };

    const feedbackStatusLabels = {
        new: '未读',
        read: '已读',
        closed: '已处理',
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

    const createEmpty = (message) => {
        const empty = document.createElement('p');
        empty.className = 'feedback-empty';
        empty.textContent = message;
        return empty;
    };

    const matchesQuery = (item, fields) => {
        const query = state.query.trim().toLowerCase();
        if (!query) return true;
        return fields.some((field) => String(item[field] || '').toLowerCase().includes(query));
    };

    const getFilteredInterviews = () => state.interviews.filter((item) => {
        const statusMatch = state.interviewStatus === 'all' || (item.status || 'new') === state.interviewStatus;
        return statusMatch && matchesQuery(item, ['company', 'position', 'recruiter', 'contact', 'channel', 'message']);
    });

    const getFilteredFeedback = () => state.feedback.filter((item) => {
        const statusMatch = state.feedbackStatus === 'all' || (item.status || 'new') === state.feedbackStatus;
        return statusMatch && matchesQuery(item, ['name', 'category', 'comment', 'contact']);
    });

    const getFilteredMatches = () => state.matches.filter((item) => (
        matchesQuery(item, ['job_description', 'match_level', 'summary', 'highlights', 'gaps'])
    ));

    const renderStats = (summary) => {
        if (!stats) return;
        const values = [
            summary.feedbackCount || 0,
            summary.feedbackAverage ? `${summary.feedbackAverage}/5` : '--',
            summary.interviewCount || 0,
            summary.matchReportCount || 0,
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

    const createStatusSelect = (labels, currentValue, onChange) => {
        const select = document.createElement('select');
        select.className = 'admin-status-select';
        Object.entries(labels).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = (currentValue || 'new') === value;
            select.append(option);
        });
        select.addEventListener('change', async () => {
            select.disabled = true;
            try {
                await onChange(select.value);
                setLoginStatus('状态已更新。', 'success');
                await loadDashboard();
            } catch (error) {
                setLoginStatus(error.message || '状态更新失败', 'error');
            } finally {
                select.disabled = false;
            }
        });
        return select;
    };

    const createActionButton = (label, variant, onClick) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `admin-action-button ${variant || ''}`.trim();
        button.textContent = label;
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                await onClick();
                await loadDashboard();
            } catch (error) {
                setLoginStatus(error.message || '操作失败', 'error');
            } finally {
                button.disabled = false;
            }
        });
        return button;
    };

    const parseList = (value) => {
        if (Array.isArray(value)) return value;
        try {
            const parsed = JSON.parse(value || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
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

        const select = createStatusSelect(interviewStatusLabels, item.status, async (status) => {
            await requestJson('/api/admin/interview-status', {
                method: 'PATCH',
                body: JSON.stringify({ id: item.id, status }),
            });
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

        const actions = document.createElement('div');
        actions.className = 'admin-card-actions';
        actions.append(
            createActionButton('删除邀约', 'danger', async () => {
                if (!window.confirm('确定删除这条面试邀约吗？')) return;
                await requestJson('/api/admin/interview-delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ id: item.id }),
                });
                setLoginStatus('邀约已删除。', 'success');
            })
        );

        article.append(head, meta, contact, message, actions);
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

        const select = createStatusSelect(feedbackStatusLabels, item.status, async (status) => {
            await requestJson('/api/admin/feedback-status', {
                method: 'PATCH',
                body: JSON.stringify({ id: item.id, status }),
            });
        });
        head.append(title, select);

        const meta = createMeta([
            formatDate(item.created_at),
            Number(item.is_public) === 1 ? '公开显示' : '已隐藏',
        ]);

        const comment = document.createElement('p');
        comment.className = 'admin-card-message';
        comment.textContent = item.comment || '';

        const contact = document.createElement('p');
        contact.className = 'admin-card-contact';
        contact.textContent = `回访信息：${item.contact || '未填写'}`;

        const actions = document.createElement('div');
        actions.className = 'admin-card-actions';
        actions.append(
            createActionButton(Number(item.is_public) === 1 ? '隐藏公开评论' : '恢复公开评论', 'ghost', async () => {
                await requestJson('/api/admin/feedback-visibility', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: item.id, isPublic: Number(item.is_public) !== 1 }),
                });
                setLoginStatus('公开状态已更新。', 'success');
            }),
            createActionButton('删除反馈', 'danger', async () => {
                if (!window.confirm('确定删除这条反馈吗？')) return;
                await requestJson('/api/admin/feedback-delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ id: item.id }),
                });
                setLoginStatus('反馈已删除。', 'success');
            })
        );

        article.append(head, meta, comment, contact, actions);
        return article;
    };

    const createMatchCard = (item) => {
        const article = document.createElement('article');
        article.className = 'admin-data-card admin-match-card';

        const head = document.createElement('div');
        head.className = 'admin-data-head';
        const title = document.createElement('div');
        const score = document.createElement('strong');
        score.textContent = `${item.overall_score || 0}/100 · ${item.match_level || '未分级'}`;
        const time = document.createElement('p');
        time.textContent = formatDate(item.created_at);
        title.append(score, time);
        head.append(title);

        const meta = createMeta([
            Number(item.is_ai_powered) === 1 ? 'AI 生成' : '本地评估',
        ]);

        const jd = document.createElement('p');
        jd.className = 'admin-card-message admin-card-jd';
        jd.textContent = `JD：${item.job_description || '未记录岗位描述'}`;

        const highlights = document.createElement('p');
        highlights.className = 'admin-card-message';
        const highlightText = parseList(item.highlights).slice(0, 3).join('；');
        highlights.textContent = `亮点：${highlightText || '暂无亮点记录'}`;

        const summary = document.createElement('p');
        summary.className = 'admin-card-contact';
        summary.textContent = `总结：${item.summary || '暂无总结'}`;

        const actions = document.createElement('div');
        actions.className = 'admin-card-actions';
        actions.append(
            createActionButton('删除记录', 'danger', async () => {
                if (!window.confirm('确定删除这条岗位匹配记录吗？')) return;
                await requestJson('/api/admin/job-match-delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ id: item.id }),
                });
                setLoginStatus('匹配记录已删除。', 'success');
            })
        );

        article.append(head, meta, jd, highlights, summary, actions);
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

    const renderDashboardLists = () => {
        renderList(matchList, getFilteredMatches(), matchCount, '当前筛选下没有岗位匹配记录。', createMatchCard);
        renderList(interviewList, getFilteredInterviews(), interviewCount, '当前筛选下没有面试邀约。', createInterviewCard);
        renderList(feedbackList, getFilteredFeedback(), feedbackCount, '当前筛选下没有反馈。', createFeedbackCard);
    };

    const loadDashboard = async () => {
        const [summary, matches, interviews, feedback] = await Promise.all([
            requestJson('/api/admin/summary'),
            requestJson('/api/admin/job-matches'),
            requestJson('/api/admin/interviews'),
            requestJson('/api/admin/feedback'),
        ]);
        state.matches = matches.items || [];
        state.interviews = interviews.items || [];
        state.feedback = feedback.items || [];
        renderStats(summary);
        renderDashboardLists();
    };

    const setAuthed = (authed) => {
        if (loginPanel) loginPanel.hidden = authed;
        if (consolePanel) consolePanel.hidden = !authed;
        if (!authed) {
            state.interviews = [];
            state.feedback = [];
            state.matches = [];
            renderStats({});
            renderList(matchList, [], matchCount, '登录后显示岗位匹配记录。', createMatchCard);
            renderList(interviewList, [], interviewCount, '登录后显示面试邀约。', createInterviewCard);
            renderList(feedbackList, [], feedbackCount, '登录后显示反馈记录。', createFeedbackCard);
        }
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

    searchInput?.addEventListener('input', () => {
        state.query = searchInput.value;
        renderDashboardLists();
    });

    interviewFilter?.addEventListener('change', () => {
        state.interviewStatus = interviewFilter.value;
        renderDashboardLists();
    });

    feedbackFilter?.addEventListener('change', () => {
        state.feedbackStatus = feedbackFilter.value;
        renderDashboardLists();
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
