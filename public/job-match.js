document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-job-match-form]');
    if (!form) return;

    const textarea = form.querySelector('textarea[name="jobDescription"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.querySelector('[data-job-match-status]');
    const modal = document.querySelector('[data-match-modal]');
    const score = document.querySelector('[data-match-score]');
    const label = document.querySelector('[data-match-label]');
    const bars = document.querySelector('[data-match-bars]');
    const highlights = document.querySelector('[data-match-highlights]');
    const gaps = document.querySelector('[data-match-gaps]');
    const summary = document.querySelector('[data-match-summary]');
    const source = document.querySelector('[data-match-source]');

    const metrics = [
        ['education', '学历背景'],
        ['experience', '工作经验'],
        ['technical', '技术能力'],
        ['maintenance', '设备维护'],
        ['communication', '沟通服务'],
    ];

    const setStatus = (message, state = 'muted') => {
        if (!status) return;
        status.textContent = message;
        status.dataset.state = state;
    };

    const toggleLoading = (isLoading) => {
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.innerHTML = isLoading ? '匹配中 <span aria-hidden="true">…</span>' : '开始匹配 <span aria-hidden="true">→</span>';
        }
    };

    const fillList = (target, items) => {
        if (!target) return;
        target.replaceChildren();
        const normalized = Array.isArray(items) && items.length ? items : ['暂无明确结论。'];
        normalized.slice(0, 4).forEach((text) => {
            const item = document.createElement('li');
            item.textContent = text;
            target.append(item);
        });
    };

    const renderBars = (scores = {}) => {
        if (!bars) return;
        bars.replaceChildren();
        metrics.forEach(([key, title]) => {
            const value = Math.max(0, Math.min(100, Number(scores[key]) || 0));
            const row = document.createElement('div');
            row.className = 'match-bar-row';
            row.innerHTML = `
                <span>${title}</span>
                <div class="match-bar-track"><i style="width: ${value}%"></i></div>
                <strong>${value}</strong>
            `;
            bars.append(row);
        });
    };

    const openModal = (result) => {
        if (!modal) return;
        const total = Math.max(0, Math.min(100, Number(result.overallScore) || 0));
        if (score) score.textContent = String(total);
        if (label) label.textContent = result.matchLevel || (total >= 82 ? '高度匹配' : total >= 68 ? '较匹配' : '需进一步确认');
        if (summary) summary.textContent = result.summary || '已根据岗位描述和公开简历信息生成匹配结论。';
        if (source) source.textContent = result.isAiPowered ? '结果由 AI 基于岗位描述和公开简历信息生成。' : '当前为本地预评估；接入模型后会升级为 AI 分析。';
        renderBars(result.dimensionScores);
        fillList(highlights, result.highlights);
        fillList(gaps, result.gaps);
        modal.hidden = false;
        document.body.classList.add('has-modal');
    };

    const closeModal = () => {
        if (!modal) return;
        modal.hidden = true;
        document.body.classList.remove('has-modal');
    };

    textarea?.addEventListener('paste', () => {
        setStatus('已读取粘贴内容，点击开始匹配即可生成报告。', 'muted');
    });
    document.querySelectorAll('[data-match-close]').forEach((button) => {
        button.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const jobDescription = textarea?.value.trim() || '';
        if (jobDescription.length < 20) {
            setStatus('请粘贴更完整的岗位描述，至少包含职责或任职要求。', 'error');
            textarea?.focus();
            return;
        }

        toggleLoading(true);
        setStatus('正在分析岗位要求和简历匹配度...', 'muted');

        try {
            const response = await fetch('/api/job-match', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ jobDescription }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '岗位匹配失败');
            }
            openModal(data.result);
            setStatus('匹配报告已生成，可继续粘贴新的岗位描述。', 'success');
        } catch (error) {
            setStatus(error.message || '岗位匹配失败，请稍后再试。', 'error');
        } finally {
            toggleLoading(false);
        }
    });
});
