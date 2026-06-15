const storedTheme = localStorage.getItem('site-theme');
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const introTheme = storedTheme || (systemThemeQuery.matches ? 'dark' : 'light');
document.documentElement.dataset.theme = introTheme;
document.documentElement.style.colorScheme = introTheme;

const statusNode = document.querySelector('[data-intro-status]');
const steps = ['连接 Worker...', '加载 D1 数据...', '准备 AI 模块...', '进入主界面...'];
let stepIndex = 0;

const statusTimer = window.setInterval(() => {
  if (statusNode) {
    statusNode.textContent = steps[Math.min(stepIndex, steps.length - 1)];
  }
  stepIndex += 1;
  if (stepIndex >= steps.length) {
    window.clearInterval(statusTimer);
  }
}, 760);

window.setTimeout(() => {
  document.body.classList.add('is-leaving');
  window.setTimeout(() => {
    window.location.href = '/home';
  }, 620);
}, 3800);
