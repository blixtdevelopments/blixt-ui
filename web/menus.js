const blixtMenuRoot = document.getElementById('menu-overlay');
const blixtMenuState = { type: null, data: null, selected: 0, indexes: [], checks: [], timer: null };

function sendBlixtMenu(type, action, payload) {
  if (typeof GetParentResourceName !== 'function') return;
  fetch(`https://${GetParentResourceName()}/${type === 'context' ? 'blixtContextAction' : 'blixtMenuAction'}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  }).catch(() => {});
}

function clearBlixtMenu() {
  clearTimeout(blixtMenuState.timer);
  blixtMenuState.timer = null;
  blixtMenuState.type = null;
  blixtMenuState.data = null;
  blixtMenuRoot.replaceChildren();
}

function dom(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function simpleText(value) {
  return String(value ?? '').replace(/\*\*|__|~~|`/g, '').trim();
}

// Local SVG symbols; no web requests or external icon font.
const blixtIconPaths = {
  truck: '<path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  car: '<path d="m5 17-1 2m15-2 1 2M4 11l2-5h12l2 5M3 11h18v7H3z"/><path d="M5 15h2m10 0h2"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6h-6a3 3 0 0 1 0-6h7"/>',
  chart: '<path d="M3 3v18h18M7 16l4-5 3 3 5-7"/>',
  trophy: '<path d="M8 21h8m-4-4v4M7 3h10v7a5 5 0 0 1-10 0zM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4"/>',
  ranking: '<path d="M3 21v-6h5v6M10 21V8h5v13M17 21V12h4v9M2 21h20"/><path d="M12.5 2l.8 2 2.2.2-1.7 1.4.5 2.1-1.8-1.1-1.8 1.1.5-2.1-1.7-1.4 2.2-.2z"/>',
  flag: '<path d="M5 3v18M5 4h14l-3 4 3 4H5"/>',
  check: '<path d="m4 12 5 5 11-11"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  wrench: '<path d="M14 6a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 3-3-3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="m10 2-.4 2.1-2 .8-1.8-1-2.2 2.2 1 1.8-.8 2L2 10v4l2.1.4.8 2-1 1.8 2.2 2.2 1.8-1 2 .8L10 22h4l.4-2.1 2-.8 1.8 1 2.2-2.2-1-1.8.8-2L22 14v-4l-2.1-.4-.8-2 1-1.8-2.2-2.2-1.8 1-2-.8L14 2z"/>',
  house: '<path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6m2 4a6 6 0 0 1 4 6"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-4 0 4 4m-7-1 4 4"/>',
  phone: '<path d="M6 2H3a2 2 0 0 0-2 2c0 10.5 8.5 19 19 19a2 2 0 0 0 2-2v-3l-5-2-3 3a16 16 0 0 1-9-9l3-3z"/>',
  star: '<path d="m12 2 3.1 6.4 7 .9-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-.9z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  warning: '<path d="M12 3 2 21h20zM12 10v4M12 18h.01"/>',
  document: '<path d="M5 2h10l4 4v16H5zM15 2v5h4M8 11h8M8 15h8M8 19h6"/>',
  newspaper: '<path d="M4 3h15v15H7V6H3v13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6M9 7h6v4H9zM9 14h7M9 17h7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  'list-check': '<path d="m2.5 6 2 2 3-3M10 6h11m-18.5 6 2 2 3-3M10 12h11m-18.5 6 2 2 3-3M10 18h11"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/>',
  'progress-bar': '<rect x="2.5" y="8" width="19" height="8" rx="1"/><path d="M5 10.5v3M8 10.5v3M11 10.5v3M14 10.5v3"/>',
  'progress-circle': '<circle cx="12" cy="12" r="9" opacity=".3"/><path d="M12 3a9 9 0 1 1-9 9"/>',

  clipboard: '<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 2h6v4H9zM8 11h8M8 15h8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 2v6M17 2v6M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  money: '<rect x="2" y="5" width="20" height="14" rx="1"/><circle cx="12" cy="12" r="4"/><path d="M5 9v6M19 9v6"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M15 12h6v5h-6z"/>',
  bag: '<path d="M4 8h16l-1 13H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
  box: '<path d="m3 6 9-4 9 4v12l-9 4-9-4zM3 6l9 5 9-5M12 11v11"/>',
  heart: '<path d="M12 21 3 12a5.5 5.5 0 0 1 8-7l1 1 1-1a5.5 5.5 0 0 1 8 7z"/>',
  shield: '<path d="M12 2 4 5v6c0 6 4 9 8 11 4-2 8-5 8-11V5zM8 12l3 3 5-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 6 6"/>',
  edit: '<path d="M4 20l5-.8L20 8l-4-4L5 16zM13 7l4 4"/>',
  map: '<path d="M3 5 9 3l6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="M7 2h4l1 7-5-2zM13 2h4l1 5-5 2zM12 12l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 14.3l2-.3z"/>',
  bolt: '<path d="m14 2-10 12h7l-1 8 10-12h-7z"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3h.01"/>',
  gift: '<rect x="3" y="8" width="18" height="13"/><path d="M2 8h20M12 8v13M12 8c-7 0-7-6-3-6 2 0 3 2 3 6zm0 0c7 0 7-6 3-6-2 0-3 2-3 6z"/>',
};

const blixtIconAliases = {
  'truck-fast': 'truck', 'truck-moving': 'truck', 'truck-pickup': 'truck', 'truck-ramp-box': 'truck', 'van-shuttle': 'truck',
  'car-side': 'car', 'car-rear': 'car', 'car-burst': 'car', 'road': 'route', 'location-arrow': 'route',
  'map-location-dot': 'map', 'map-marked-alt': 'map', 'location-dot': 'map',
  'chart-line': 'chart', 'chart-simple': 'chart', 'chart-bar': 'chart', 'chart-column': 'chart', 'chart-pie': 'chart',
  'ranking-star': 'ranking', 'ranking-star-solid': 'ranking', 'ranking-star-alt': 'ranking', 'bars-progress': 'chart',
  'award': 'medal', 'certificate': 'medal', 'flag-checkered': 'flag', 'flag-usa': 'flag',
  'check-circle': 'check', 'circle-check': 'check', 'check-double': 'check', 'circle-xmark': 'close',
  'xmark': 'close', 'times': 'close', 'cancel': 'close', 'ban': 'close',
  'screwdriver-wrench': 'wrench', 'tools': 'wrench', 'gears': 'gear', 'cog': 'gear', 'cogs': 'gear',
  'home': 'house', 'user-group': 'users', 'user-friends': 'users', 'user-check': 'user',
  'lock-open': 'lock', 'key-skeleton': 'key', 'phone-volume': 'phone', 'phone-flip': 'phone',
  'star-half': 'star', 'circle-info': 'info', 'info-circle': 'info', 'exclamation-triangle': 'warning',
  'triangle-exclamation': 'warning', 'file': 'document', 'file-lines': 'document',
  'file-alt': 'document', 'file-circle-check': 'document', 'book': 'document', 'book-open': 'document',
  'clipboard-list': 'clipboard', 'clipboard-check': 'clipboard', 'calendar-days': 'calendar',
  'clock-rotate-left': 'clock', 'history': 'clock', 'stopwatch': 'clock',
  'dollar-sign': 'money', 'coins': 'money', 'money-bill': 'money', 'money-bill-wave': 'money',
  'credit-card': 'wallet', 'cart-shopping': 'bag', 'shopping-bag': 'bag', 'store': 'bag',
  'box-open': 'box', 'boxes-stacked': 'box', 'package': 'box',
  'heart-pulse': 'heart', 'heart-circle-check': 'heart', 'shield-halved': 'shield',
  'magnifying-glass': 'search', 'search-plus': 'search', 'pen': 'edit', 'pencil': 'edit',
  'pen-to-square': 'edit', 'edit': 'edit', 'file-pen': 'edit',
  'map-location': 'map', 'map-pin': 'map', 'compass': 'map',
  'bolt-lightning': 'bolt', 'play-circle': 'play', 'circle-question': 'question', 'gift': 'gift',
};

function normaliseIconName(value) {
  if (Array.isArray(value)) value = value[1] || value[0];
  if (typeof value !== 'string') return '';
  const parts = value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const fontAwesome = parts.find(part => part.startsWith('fa-') && !['fa-solid','fa-regular','fa-light','fa-thin','fa-duotone','fa-brands'].includes(part));
  const name = (fontAwesome || parts[parts.length - 1] || '').replace(/^fa-/, '');
  return blixtIconAliases[name] || name;
}

function iconForLabel(label) {
  const text = String(label || '').toLowerCase();
  if (/deliver|courier|truck|transport/.test(text)) return 'truck';
  if (/route|navigate|destination/.test(text)) return 'route';
  if (/progress|statistic|level|experience|xp/.test(text)) return 'chart';
  if (/achievement|reward|award|troph/.test(text)) return 'trophy';
  if (/leaderboard|ranking|rank|top 5|top five/.test(text)) return 'ranking';
  if (/finish|complete|clock out/.test(text)) return 'flag';
  if (/vehicle|garage|car/.test(text)) return 'car';
  if (/repair|mechanic/.test(text)) return 'wrench';
  if (/money|cash|bank|pay|salary/.test(text)) return 'money';
  if (/inventory|item|stock/.test(text)) return 'box';
  if (/settings|options|config/.test(text)) return 'gear';
  if (/search|find/.test(text)) return 'search';
  if (/profile|citizen|character|player/.test(text)) return 'user';
  if (/map|location/.test(text)) return 'map';
  if (/health|heal/.test(text)) return 'heart';
  if (/report|document|record/.test(text)) return 'clipboard';
  return '';
}

function addIcon(container, icon, tint, label) {
  const remoteUrl = typeof icon === 'string' && /^https?:\/\//i.test(icon) ? icon : null;
  const candidate = normaliseIconName(icon);
  const mapped = blixtIconPaths[candidate] ? candidate : iconForLabel(label);
  if (!remoteUrl && !mapped && !icon) return;
  const el = dom('span', 'blixt-option-icon');
  if (remoteUrl) {
    const image = dom('img');
    image.src = remoteUrl;
    image.alt = '';
    image.loading = 'lazy';
    el.appendChild(image);
  } else {
    const name = mapped || 'document';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = blixtIconPaths[name];
    el.appendChild(svg);
  }
  if (tint && /^#[0-9a-f]{3,8}$/i.test(tint)) el.style.color = tint;
  container.appendChild(el);
}

function makeGauge(value) {
  const track = dom('div', 'blixt-option-gauge');
  const fill = dom('span', 'blixt-option-fill');
  fill.style.width = `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
  track.appendChild(fill);
  return track;
}

function normaliseContextOptions(options) {
  if (Array.isArray(options)) return options.map((item, i) => [String(i), item]);
  return Object.entries(options || {});
}

function formatMetadata(metadata) {
  if (typeof metadata === 'string') return metadata;
  if (!metadata || typeof metadata !== 'object') return '';
  return Object.entries(metadata).map(([key, entry]) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') return `${simpleText(entry.label || key)}: ${simpleText(entry.value)}`;
    return `${key}: ${simpleText(entry)}`;
  }).join('\n');
}

function addMacWindowControls(header, kind, canClose) {
  const controls = dom('div', 'blixt-mac-controls');
  const red = dom(canClose ? 'button' : 'span', 'blixt-mac-dot blixt-mac-red');
  if (canClose) {
    red.type = 'button';
    red.title = 'Close';
    red.setAttribute('aria-label', 'Close window');
    red.addEventListener('click', () => sendBlixtMenu(kind, kind === 'context' ? 'closeContext' : 'closeMenu', kind === 'context' ? null : 'Escape'));
  } else {
    red.classList.add('inactive');
    red.setAttribute('aria-hidden', 'true');
  }
  controls.appendChild(red);
  for (const color of ['yellow', 'green']) {
    const dot = dom('span', `blixt-mac-dot blixt-mac-${color}`);
    dot.setAttribute('aria-hidden', 'true');
    controls.appendChild(dot);
  }
  header.appendChild(controls);
}

function showBlixtContext(data) {
  if (!data || typeof data !== 'object') return;
  clearBlixtMenu();
  blixtMenuState.type = 'context';
  blixtMenuState.data = data;
  const frame = dom('div', 'blixt-menu-frame blixt-context-frame');
  frame.dataset.menu = 'context';
  const head = dom('div', 'blixt-menu-header');
  addMacWindowControls(head, 'context', data.canClose !== false);
  if (data.menu) {
    const back = dom('button', 'blixt-menu-back', '‹');
    back.type = 'button'; back.title = 'Back';
    back.addEventListener('click', () => sendBlixtMenu('context', 'openContext', { id: data.menu, back: true }));
    head.appendChild(back);
  }
  head.appendChild(dom('div', 'blixt-menu-title', simpleText(data.title) || 'Menu'));
  if (data.canClose !== false) {
    const close = dom('button', 'blixt-menu-close', '×');
    close.type = 'button'; close.title = 'Close';
    close.addEventListener('click', () => sendBlixtMenu('context', 'closeContext', null));
    head.appendChild(close);
  }
  frame.appendChild(head);
  const body = dom('div', 'blixt-menu-items');
  for (const [key, option] of normaliseContextOptions(data.options)) {
    if (!option || typeof option !== 'object') continue;
    const button = dom('button', 'blixt-option');
    button.type = 'button';
    button.disabled = !!option.disabled;
    if (option.readOnly) button.classList.add('read-only');
    const row = dom('div', 'blixt-option-row');
    addIcon(row, option.icon, option.iconColor, option.title || key);
    const copy = dom('div', 'blixt-option-copy');
    copy.appendChild(dom('div', 'blixt-option-name', simpleText(option.title || (Number.isNaN(Number(key)) ? key : 'Option'))));
    if (option.description) copy.appendChild(dom('div', 'blixt-option-description', simpleText(option.description)));
    if (option.progress !== undefined) copy.appendChild(makeGauge(option.progress));
    row.appendChild(copy);
    if ((option.menu || option.arrow) && option.arrow !== false) row.appendChild(dom('span', 'blixt-option-chevron', '›'));
    button.appendChild(row);
    if (option.metadata || option.image) {
      const details = dom('div', 'blixt-option-details');
      if (option.metadata) details.appendChild(dom('div', 'blixt-option-meta', formatMetadata(option.metadata)));
      if (typeof option.image === 'string' && /^https?:\/\//i.test(option.image)) {
        const image = dom('img'); image.src = option.image; image.loading = 'lazy'; image.alt = '';
        details.appendChild(image);
      }
      button.appendChild(details);
    }
    if (!option.disabled && !option.readOnly) {
      button.addEventListener('click', () => {
        if (option.menu) sendBlixtMenu('context', 'openContext', { id: option.menu, back: false });
        else sendBlixtMenu('context', 'clickContext', key);
      });
    }
    body.appendChild(button);
  }
  frame.appendChild(body);
  blixtMenuRoot.appendChild(frame);
}

function listSelectedPayload(index) {
  const item = blixtMenuState.data?.items?.[index];
  if (!item) return [index, null, null];
  if (Array.isArray(item.values)) return [index, blixtMenuState.indexes[index] ?? 0, 'isScroll'];
  if (item.checked !== undefined) return [index, blixtMenuState.checks[index], 'isCheck'];
  return [index, null, null];
}

function listSelectedCallback() {
  clearTimeout(blixtMenuState.timer);
  const selected = blixtMenuState.selected;
  blixtMenuState.timer = setTimeout(() => {
    if (blixtMenuState.type === 'list' && selected === blixtMenuState.selected)
      sendBlixtMenu('list', 'changeSelected', listSelectedPayload(selected));
  }, 100);
}

function showBlixtList(data) {
  if (!data || !Array.isArray(data.items) || !data.items.length) return;
  clearBlixtMenu();
  blixtMenuState.type = 'list';
  blixtMenuState.data = data;
  blixtMenuState.selected = Math.min(data.items.length - 1, Math.max(0, data.startItemIndex || 0));
  blixtMenuState.indexes = data.items.map(item => Array.isArray(item.values)
    ? Math.min(item.values.length - 1, Math.max(0, (Number(item.defaultIndex) || 1) - 1)) : null);
  blixtMenuState.checks = data.items.map(item => !!item.checked);
  const frame = dom('div', 'blixt-menu-frame blixt-list-frame');
  frame.dataset.menu = 'list';
  frame.dataset.position = ['top-right', 'bottom-right', 'bottom-left'].includes(data.position) ? data.position : 'top-left';
  const head = dom('div', 'blixt-menu-header');
  addMacWindowControls(head, 'list', data.canClose !== false);
  head.appendChild(dom('div', 'blixt-menu-title', simpleText(data.title) || 'Menu'));
  frame.appendChild(head);
  const body = dom('div', 'blixt-menu-items');
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!item) continue;
    const row = dom('div', 'blixt-option blixt-list-option');
    row.dataset.index = String(i);
    row.tabIndex = -1;
    addIcon(row, item.icon, item.iconColor, item.label);
    const content = dom('div', 'blixt-option-copy');
    content.appendChild(dom('div', 'blixt-option-name', simpleText(item.label)));
    if (item.description) content.appendChild(dom('div', 'blixt-option-description', simpleText(item.description)));
    if (item.progress !== undefined) content.appendChild(makeGauge(item.progress));
    if (Array.isArray(item.values) && item.values.length) {
      const detail = dom('div', 'blixt-list-side');
      detail.appendChild(dom('span', 'blixt-list-value', valueLabel(item.values[blixtMenuState.indexes[i]])));
      detail.appendChild(dom('span', 'blixt-list-arrows', '‹   ›'));
      content.appendChild(detail);
    } else if (item.checked !== undefined) {
      const tick = dom('span', 'blixt-list-checkbox', blixtMenuState.checks[i] ? '✓' : '');
      row.appendChild(tick);
    }
    row.appendChild(content);
    body.appendChild(row);
  }
  frame.appendChild(body);
  const foot = dom('div', 'blixt-list-footer', '↑ ↓  Select     ← →  Adjust     Enter  Confirm     Esc  Close');
  frame.appendChild(foot);
  blixtMenuRoot.appendChild(frame);
  updateListSelection();
  listSelectedCallback();
}

function valueLabel(value) {
  return value && typeof value === 'object' ? String(value.label ?? '') : String(value ?? '');
}

function updateListSelection() {
  const rows = blixtMenuRoot.querySelectorAll('.blixt-list-option');
  rows.forEach((row, index) => {
    const selected = index === blixtMenuState.selected;
    row.classList.toggle('selected', selected);
    if (selected) row.scrollIntoView({ block: 'nearest' });
    const item = blixtMenuState.data.items[index];
    const value = row.querySelector('.blixt-list-value');
    if (value && Array.isArray(item.values)) value.textContent = valueLabel(item.values[blixtMenuState.indexes[index]]);
    const checkbox = row.querySelector('.blixt-list-checkbox');
    if (checkbox) checkbox.textContent = blixtMenuState.checks[index] ? '✓' : '';
  });
}

function changeListSelection(delta) {
  const length = blixtMenuState.data.items.length;
  blixtMenuState.selected = (blixtMenuState.selected + delta + length) % length;
  updateListSelection();
  listSelectedCallback();
}

function listSide(delta) {
  const i = blixtMenuState.selected;
  const item = blixtMenuState.data.items[i];
  if (!Array.isArray(item.values) || !item.values.length) return;
  blixtMenuState.indexes[i] = (blixtMenuState.indexes[i] + delta + item.values.length) % item.values.length;
  updateListSelection();
  sendBlixtMenu('list', 'changeIndex', [i, blixtMenuState.indexes[i]]);
}

function listAccept() {
  const i = blixtMenuState.selected;
  const item = blixtMenuState.data.items[i];
  if (item.checked !== undefined && !Array.isArray(item.values)) {
    blixtMenuState.checks[i] = !blixtMenuState.checks[i];
    updateListSelection();
    sendBlixtMenu('list', 'changeChecked', [i, blixtMenuState.checks[i]]);
    return;
  }
  sendBlixtMenu('list', 'confirmSelected', [i, Array.isArray(item.values) ? blixtMenuState.indexes[i] : null]);
}

window.addEventListener('keydown', event => {
  if (!blixtMenuState.type) return;
  const key = event.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Backspace', 'Enter', ' '].includes(key)) event.preventDefault();
  if (blixtMenuState.type === 'context') {
    if (key === 'Escape' && blixtMenuState.data.canClose !== false) sendBlixtMenu('context', 'closeContext', null);
    else if (key === 'Backspace' && blixtMenuState.data.menu)
      sendBlixtMenu('context', 'openContext', { id: blixtMenuState.data.menu, back: true });
  } else if (blixtMenuState.type === 'list') {
    if ((key === 'Escape' || key === 'Backspace') && blixtMenuState.data.canClose !== false)
      sendBlixtMenu('list', 'closeMenu', key);
    else if (key === 'ArrowDown') changeListSelection(1);
    else if (key === 'ArrowUp') changeListSelection(-1);
    else if (key === 'ArrowLeft') listSide(-1);
    else if (key === 'ArrowRight') listSide(1);
    else if (key === 'Enter' || key === ' ') listAccept();
  }
});

window.addEventListener('message', event => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.action === 'blixtShowContext') showBlixtContext(message.data);
  else if (message.action === 'blixtShowMenu') showBlixtList(message.data);
  else if (message.action === 'blixtHideContext' && blixtMenuState.type === 'context') clearBlixtMenu();
  else if (message.action === 'blixtHideMenu' && blixtMenuState.type === 'list') clearBlixtMenu();
});
