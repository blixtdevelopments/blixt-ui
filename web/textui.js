const blixtTextRoot = document.getElementById('textui-overlay');
const blixtTextPositions = new Set(['left-center', 'right-center', 'top-center', 'bottom-center']);

function renderBlixtTextUI(data) {
  if (!data || typeof data.text !== 'string') return;

  const panel = document.createElement('div');
  panel.className = 'blixt-textui';
  panel.dataset.position = blixtTextPositions.has(data.position) ? data.position : 'right-center';
  panel.setAttribute('role', 'status');

  if (data.alignIcon === 'top') panel.dataset.alignIcon = 'top';

  if (data.icon && typeof addIcon === 'function') {
    const icon = document.createElement('span');
    icon.className = 'blixt-textui-symbol';
    if (typeof normaliseIconName === 'function' && normaliseIconName(data.icon) === 'info') {
      icon.classList.add('blixt-textui-info');
    }
    addIcon(icon, data.icon, data.iconColor);
    if (icon.firstChild) panel.appendChild(icon);
  }

  const content = document.createElement('span');
  content.className = 'blixt-textui-message';
  const hint = /\[([a-z0-9]{1,10})\]/i.exec(data.text);

  if (hint) {
    if (hint.index > 0) content.appendChild(document.createTextNode(data.text.slice(0, hint.index)));
    const key = document.createElement('span');
    key.className = 'blixt-textui-key';
    key.textContent = hint[1].toUpperCase();
    content.appendChild(key);
    content.appendChild(document.createTextNode(data.text.slice(hint.index + hint[0].length)));
  } else {
    content.textContent = data.text;
  }

  panel.appendChild(content);
  blixtTextRoot.replaceChildren(panel);
}

window.addEventListener('message', event => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.action === 'blixtTextUIShow') renderBlixtTextUI(data.data);
  else if (data.action === 'blixtTextUIHide') blixtTextRoot.replaceChildren();
});
