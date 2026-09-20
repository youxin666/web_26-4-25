const storedTheme = localStorage.getItem('site-theme');
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const introTheme = storedTheme || (systemThemeQuery.matches ? 'dark' : 'light');
document.documentElement.dataset.theme = introTheme;
document.documentElement.style.colorScheme = introTheme;

const statusNode = document.querySelector('[data-intro-status]');
const enterButton = document.querySelector('.intro-button');

if (statusNode) {
  statusNode.textContent = '准备进入 858846.xyz';
}

function enterHome(event) {
  event?.preventDefault();
  document.body.classList.add('is-leaving');
  window.setTimeout(() => {
    window.location.href = '/home';
  }, 460);
}

enterButton?.addEventListener('click', enterHome);

window.setTimeout(() => {
  enterHome();
}, 2700);
