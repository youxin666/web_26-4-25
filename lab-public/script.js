const STORAGE_KEY = 'resume-web-lab-workorders';

const defaultWorkorders = [
  {
    area: '弱电机房',
    type: '设备运行异常',
    priority: '较高',
    note: '交换机端口指示灯偶发异常，已记录端口号并建议复测链路稳定性。',
    createdAt: 'Demo',
  },
  {
    area: '家庭宽带现场',
    type: '网络连接不稳定',
    priority: '普通',
    note: '用户反馈客厅 Wi-Fi 信号弱，建议调整路由器位置并检查光猫状态。',
    createdAt: 'Demo',
  },
];

function readWorkorders() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(stored) && stored.length ? stored : defaultWorkorders;
  } catch {
    return defaultWorkorders;
  }
}

function saveWorkorders(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderWorkorders(items) {
  const list = document.querySelector('[data-workorder-list]');
  if (!list) return;

  list.innerHTML = items.map((item) => `
    <article class="workorder-item">
      <header>
        <strong>${item.area} · ${item.type}</strong>
        <span class="status-pill">${item.priority}</span>
      </header>
      <p>${item.note}</p>
      <small>${item.createdAt}</small>
    </article>
  `).join('');
}

const form = document.querySelector('[data-workorder-form]');
const clearButton = document.querySelector('[data-clear-workorders]');
let workorders = readWorkorders();

renderWorkorders(workorders);

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const note = String(formData.get('note') || '').trim();

  if (note.length < 8) {
    form.querySelector('textarea')?.focus();
    return;
  }

  workorders = [{
    area: formData.get('area'),
    type: formData.get('type'),
    priority: formData.get('priority'),
    note,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }, ...workorders].slice(0, 6);

  saveWorkorders(workorders);
  renderWorkorders(workorders);
  form.reset();
});

clearButton?.addEventListener('click', () => {
  workorders = defaultWorkorders;
  saveWorkorders(workorders);
  renderWorkorders(workorders);
});
