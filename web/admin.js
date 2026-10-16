const blixtAdminRoot = document.getElementById('admin-overlay');
const adminThemeData = [
  { key: '80s', label: 'Paper Trail', detail: '80s', styles: [
    { key: 'original', label: 'Original', colors: ['#eedeb5', '#9f5b45', '#263d5d'] },
    { key: 'white', label: 'White Paper', colors: ['#f6f5ef', '#aa5149', '#476780'] },
    { key: 'yellow', label: 'Vintage Yellow', colors: ['#c9aa70', '#864b36', '#604529'] },
  ] },
  { key: '90s', label: 'Desktop 95', detail: '90s', styles: [
    { key: 'classic', label: 'Classic', colors: ['#c0c0c0', '#000080', '#eeeeee'] },
    { key: 'gradient', label: 'Gradient', colors: ['#f0e3b6', '#8c2837', '#123f66'] },
    { key: 'midnight', label: 'Midnight', colors: ['#29313b', '#13395a', '#8aaacf'] },
  ] },
  { key: 'modern', label: 'Modern Minimal', detail: 'Modern', styles: [
    { key: 'graphite', label: 'Graphite', colors: ['#303741', '#469aee', '#202832'] },
    { key: 'frost', label: 'Frost', colors: ['#eef3f8', '#2087cf', '#ffffff'] },
    { key: 'midnight-blue', label: 'Midnight Blue', colors: ['#172940', '#54aff4', '#293f5e'] },
  ] },
];
const adminDefaultStyles = { '80s': 'original', '90s': 'classic', modern: 'graphite' };
const adminState = {
  open: false, view: 'overview', pending: false, saving: false, status: '',
  saved: { theme: document.body.dataset.theme || 'modern', preset: document.body.dataset.preset || 'graphite' },
  draft: null, chosen: { ...adminDefaultStyles }, sample: 'notification',
};

const adminTests = [
  { key: 'context', label: 'Context Menu', detail: 'Options, icons, disabled rows and submenus', icon: 'document' },
  { key: 'list', label: 'List Menu', detail: 'Keyboard navigation, values and checkboxes', icon: 'list-check' },
  { key: 'radial', label: 'Radial Menu', detail: 'Wheel selection, icons and submenus', icon: 'progress-circle' },
  { key: 'inputDialog', label: 'Input Dialog', detail: 'Forms, numbers, lists, dates and controls', icon: 'document' },
  { key: 'alertDialog', label: 'Alert Dialog', detail: 'Confirmation, cancel and custom labels', icon: 'warning' },
  { key: 'textUI', label: 'Text UI', detail: 'On-screen interaction prompt and key hints', icon: 'info' },
  { key: 'skillCheck', label: 'Skill Check', detail: 'Original timing ring, keys and difficulty', icon: 'progress-circle' },
  { key: 'notify', label: 'Notifications', detail: 'Success, warning, error and information', icon: 'bell' },
  { key: 'progressBar', label: 'Progress Bar', detail: 'Linear progress, complete or cancel', icon: 'progress-bar' },
  { key: 'progressCircle', label: 'Progress Circle', detail: 'Circular progress, complete or cancel', icon: 'progress-circle' },
];

function adminEl(tag, className, label) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (label !== undefined) element.textContent = label;
  return element;
}

function adminIcon(name, className) {
  const container = adminEl('span', className);
  addIcon(container, name);
  const icon = container.firstElementChild;
  if (icon) icon.classList.remove('blixt-option-icon');
  return container;
}

function adminRequest(action, data = {}) {
  if (typeof GetParentResourceName !== 'function') return Promise.resolve({ ok: false });
  return fetch(`https://${GetParentResourceName()}/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then(response => response.json()).catch(() => ({ ok: false }));
}

function adminSetAppearance(settings) {
  document.body.dataset.theme = settings.theme;
  document.body.dataset.preset = settings.preset;
}

function adminClose(request = true) {
  adminState.open = false;
  adminState.pending = false;
  adminState.saving = false;
  adminSetAppearance(adminState.saved);
  blixtAdminRoot.replaceChildren();
  if (request) adminRequest('blixtAdminClose');
}

function adminButton(label, handler, className = 'blixt-admin-button') {
  const button = adminEl('button', className, label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function switchAdmin(view) {
  if (adminState.saving) return;
  adminState.view = view;
  renderAdmin();
}

function runAdminTest(key) {
  if (adminState.pending || adminState.saving || !adminState.open || !adminTests.some(test => test.key === key)) return;
  adminState.pending = true;
  adminClose(false);
  adminRequest('blixtAdminTest', { test: key });
}

function addMacDots(header) {
  const dots = adminEl('div', 'blixt-admin-dots');
  ['red', 'yellow', 'green'].forEach((color, index) => {
    const dot = index === 0
      ? adminButton('', () => adminClose(), `blixt-admin-dot ${color}`)
      : adminEl('span', `blixt-admin-dot ${color}`);
    if (index === 0) dot.setAttribute('aria-label', 'Close');
    else dot.setAttribute('aria-hidden', 'true');
    dots.appendChild(dot);
  });
  header.appendChild(dots);
}

function adminIsDirty() {
  return adminState.draft && (adminState.draft.theme !== adminState.saved.theme ||
    adminState.draft.preset !== adminState.saved.preset);
}

function adminPickTheme(key) {
  if (adminState.saving) return;
  adminState.draft = { theme: key, preset: adminState.chosen[key] };
  adminState.status = '';
  adminSetAppearance(adminState.draft);
  renderAdmin();
}

function adminPickStyle(key) {
  if (adminState.saving) return;
  adminState.chosen[adminState.draft.theme] = key;
  adminState.draft = { theme: adminState.draft.theme, preset: key };
  adminState.status = '';
  adminSetAppearance(adminState.draft);
  renderAdmin();
}

function adminSaveSettings() {
  if (adminState.saving || !adminIsDirty()) return;
  adminState.saving = true;
  adminState.status = 'Saving...';
  renderAdmin();
  adminRequest('blixtAdminSaveSettings', adminState.draft).then(response => {
    if (!adminState.open || !adminState.saving || response.ok === true) return;
    adminState.saving = false;
    adminState.status = 'Could not send the request. Please try again.';
    renderAdmin();
  });
}

function adminSample(kind) {
  const wrap = adminEl('div', 'blixt-editor-sample');
  if (kind === 'notification') {
    const note = adminEl('div', 'notice');
    note.dataset.type = 'success';
    note.appendChild(adminEl('div', 'notice-title', 'Blixt UI'));
    note.appendChild(adminEl('div', 'notice-body', 'Your changes are looking good.'));
    note.appendChild(adminEl('div', 'notice-bar'));
    wrap.appendChild(note);
  } else if (kind === 'dialog') {
    const frame = adminEl('div', 'bd-window');
    const head = adminEl('div', 'bd-header');
    head.appendChild(adminEl('span', 'bd-title', 'Confirm Action'));
    head.appendChild(adminEl('span', 'bd-close', '×'));
    frame.appendChild(head);
    const body = adminEl('div', 'bd-body');
    body.appendChild(adminEl('div', 'bd-alert-text', 'Would you like to continue?'));
    frame.appendChild(body);
    const actions = adminEl('div', 'bd-actions');
    actions.appendChild(adminEl('span', 'bd-button', 'Cancel'));
    actions.appendChild(adminEl('span', 'bd-button bd-primary', 'Confirm'));
    frame.appendChild(actions);
    wrap.appendChild(frame);
  } else if (kind === 'menu') {
    const menu = adminEl('div', 'blixt-menu-frame blixt-context-frame');
    const head = adminEl('div', 'blixt-menu-header');
    head.appendChild(adminEl('div', 'blixt-menu-title', 'Sample Menu'));
    menu.appendChild(head);
    const items = adminEl('div', 'blixt-menu-items');
    for (const [label, detail] of [['View details', 'A sample menu option'], ['Open settings', 'Choose a different option']]) {
      const option = adminEl('div', 'blixt-option read-only');
      option.appendChild(adminEl('div', 'blixt-option-name', label));
      option.appendChild(adminEl('div', 'blixt-option-description', detail));
      items.appendChild(option);
    }
    menu.appendChild(items);
    wrap.appendChild(menu);
  } else {
    const hint = adminEl('div', 'blixt-textui');
    hint.dataset.position = 'left-center';
    hint.appendChild(adminEl('span', 'blixt-textui-key', 'E'));
    hint.appendChild(adminEl('span', 'blixt-textui-message', 'Interact with object'));
    wrap.appendChild(hint);
  }
  return wrap;
}

function renderEditor(content) {
  content.appendChild(adminEl('h2', '', 'Theme Editor'));
  content.appendChild(adminEl('p', 'blixt-admin-intro', 'Choose a theme and colour preset. Preview changes here before applying them to everyone.'));

  content.appendChild(adminEl('div', 'blixt-editor-label', 'SELECT THEME'));
  const themes = adminEl('div', 'blixt-editor-themes');
  adminThemeData.forEach(item => {
    const button = adminButton('', () => adminPickTheme(item.key), 'blixt-editor-theme');
    button.classList.toggle('active', item.key === adminState.draft.theme);
    button.setAttribute('aria-pressed', String(item.key === adminState.draft.theme));
    button.disabled = adminState.saving;
    button.appendChild(adminEl('strong', '', item.label));
    button.appendChild(adminEl('small', '', item.detail));
    themes.appendChild(button);
  });
  content.appendChild(themes);

  content.appendChild(adminEl('div', 'blixt-editor-label', 'COLOUR PRESET'));
  const styles = adminThemeData.find(item => item.key === adminState.draft.theme).styles;
  const cards = adminEl('div', 'blixt-editor-presets');
  styles.forEach(style => {
    const selected = style.key === adminState.draft.preset;
    const button = adminButton('', () => adminPickStyle(style.key), 'blixt-editor-preset');
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = adminState.saving;
    const swatches = adminEl('span', 'blixt-editor-swatches');
    style.colors.forEach(color => {
      const swatch = adminEl('span', 'blixt-editor-swatch');
      swatch.style.background = color;
      swatches.appendChild(swatch);
    });
    if (style.key === 'gradient') swatches.classList.add('gradient');
    button.appendChild(swatches);
    button.appendChild(adminEl('strong', '', style.label));
    cards.appendChild(button);
  });
  content.appendChild(cards);

  const previewTitle = adminEl('div', 'blixt-editor-preview-top');
  previewTitle.appendChild(adminEl('div', 'blixt-editor-label', 'LIVE PREVIEW'));
  const selector = adminEl('select', 'blixt-editor-select');
  [['notification', 'Notification'], ['dialog', 'Dialog'], ['menu', 'Menu'], ['textui', 'Text UI']].forEach(([key, label]) => {
    const option = adminEl('option', '', label);
    option.value = key;
    selector.appendChild(option);
  });
  selector.value = adminState.sample;
  selector.addEventListener('change', event => { adminState.sample = event.target.value; renderAdmin(); });
  previewTitle.appendChild(selector);
  content.appendChild(previewTitle);
  content.appendChild(adminSample(adminState.sample));

  const footer = adminEl('div', 'blixt-editor-footer');
  if (adminState.status) footer.appendChild(adminEl('div', 'blixt-editor-status', adminState.status));
  const actions = adminEl('div', 'blixt-editor-actions');
  const revert = adminButton('Discard', () => {
    adminState.draft = { ...adminState.saved };
    adminState.chosen[adminState.saved.theme] = adminState.saved.preset;
    adminState.status = '';
    adminSetAppearance(adminState.saved);
    renderAdmin();
  }, 'blixt-editor-discard');
  revert.disabled = adminState.saving || !adminIsDirty();
  actions.appendChild(revert);
  const save = adminButton(adminState.saving ? 'Saving...' : 'Save & Apply', adminSaveSettings, 'blixt-admin-primary blixt-editor-save');
  save.disabled = adminState.saving || !adminIsDirty();
  actions.appendChild(save);
  footer.appendChild(actions);
  content.appendChild(footer);
  content.appendChild(adminEl('p', 'blixt-admin-hint', 'Preview affects you only. Save & Apply updates all connected players immediately and survives restarts.'));
}

function renderAdmin() {
  if (!adminState.open) return;
  const oldContent = blixtAdminRoot.querySelector('.blixt-admin-main');
  const priorScroll = oldContent ? oldContent.scrollTop : 0;
  const frame = adminEl('section', 'blixt-admin-window');
  frame.setAttribute('role', 'dialog');
  frame.setAttribute('aria-label', 'Blixt UI Admin Menu');
  const head = adminEl('header', 'blixt-admin-header');
  addMacDots(head);
  head.appendChild(adminEl('span', 'blixt-admin-caption', 'Blixt UI Admin Menu'));
  head.appendChild(adminButton('×', () => adminClose(), 'blixt-admin-close'));
  frame.appendChild(head);

  const layout = adminEl('div', 'blixt-admin-layout');
  const sidebar = adminEl('nav', 'blixt-admin-sidebar');
  sidebar.appendChild(adminEl('div', 'blixt-admin-sidebar-label', 'BLIXT UI'));
  const choices = [
    { key: 'overview', icon: 'house', label: 'Overview' },
    { key: 'editor', icon: 'wrench', label: 'Theme Editor' },
    { key: 'tests', icon: 'list-check', label: 'Component Testing' },
  ];
  choices.forEach(choice => {
    const selected = adminState.view === choice.key;
    const button = adminButton('', () => switchAdmin(choice.key), `blixt-admin-tab${selected ? ' selected' : ''}`);
    button.appendChild(adminIcon(choice.icon, 'blixt-admin-tab-icon'));
    button.appendChild(adminEl('span', '', choice.label));
    sidebar.appendChild(button);
  });
  sidebar.appendChild(adminEl('div', 'blixt-admin-side-note', 'Server-wide appearance settings'));
  layout.appendChild(sidebar);

  const content = adminEl('main', 'blixt-admin-main');
  if (adminState.view === 'editor') {
    renderEditor(content);
  } else if (adminState.view === 'tests') {
    content.appendChild(adminEl('h2', '', 'Component Testing'));
    content.appendChild(adminEl('p', 'blixt-admin-intro', 'Test ox-lib components using the active theme.'));
    const list = adminEl('div', 'blixt-admin-test-list');
    adminTests.forEach(test => {
      const row = adminButton('', () => runAdminTest(test.key), 'blixt-admin-test');
      row.appendChild(adminIcon(test.icon, 'blixt-admin-test-icon'));
      const details = adminEl('span', 'blixt-admin-test-info');
      details.appendChild(adminEl('strong', '', test.label));
      details.appendChild(adminEl('small', '', test.detail));
      row.appendChild(details);
      row.appendChild(adminEl('span', 'blixt-admin-test-arrow', '›'));
      list.appendChild(row);
    });
    content.appendChild(list);
  } else {
    content.appendChild(adminEl('h2', '', 'Overview'));
    const info = adminEl('div', 'blixt-admin-overview');
    const themeNames = { '80s': 'Paper Trail', '90s': 'Desktop 95', modern: 'Modern Minimal' };
    const style = adminThemeData.find(item => item.key === adminState.saved.theme)?.styles.find(item => item.key === adminState.saved.preset);
    const rows = [
      ['Active theme', themeNames[adminState.saved.theme] || 'Modern Minimal'],
      ['Colour preset', style?.label || 'Default'],
    ];
    rows.forEach(([name, value]) => {
      const row = adminEl('div', 'blixt-admin-info-row');
      row.appendChild(adminEl('span', '', name));
      row.appendChild(adminEl('strong', '', value));
      info.appendChild(row);
    });
    content.appendChild(info);
    content.appendChild(adminButton('Open theme editor  →', () => switchAdmin('editor'), 'blixt-admin-primary'));
  }
  layout.appendChild(content);
  frame.appendChild(layout);
  blixtAdminRoot.replaceChildren(frame);
  content.scrollTop = priorScroll;
}

window.addEventListener('message', event => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.action === 'configure') {
    const theme = adminThemeData.find(item => item.key === msg.theme);
    if (!theme) return;
    const preset = theme.styles.some(style => style.key === msg.preset) ? msg.preset : theme.styles[0].key;
    adminState.saved = { theme: msg.theme, preset };
    adminState.chosen[msg.theme] = preset;
    if (adminState.open) {
      adminState.draft = { ...adminState.saved };
      if (adminState.saving) adminState.status = 'Applied to all connected players.';
      adminSetAppearance(adminState.draft);
      renderAdmin();
    }
  } else if (msg.action === 'blixtAdminOpen') {
    adminState.open = true;
    adminState.view = msg.view === 'tests' ? 'tests' : 'overview';
    adminState.pending = false;
    adminState.saving = false;
    adminState.status = '';
    adminState.draft = { ...adminState.saved };
    renderAdmin();
  } else if (msg.action === 'blixtAdminClose') {
    adminClose(false);
  } else if (msg.action === 'blixtAdminSaveResult' && adminState.open) {
    adminState.saving = false;
    adminState.status = msg.ok ? 'Saved and applied to all players.' : (msg.error || 'Could not save settings.');
    if (!msg.ok) adminSetAppearance(adminState.draft);
    renderAdmin();
  }
});

window.addEventListener('keydown', event => {
  if (!adminState.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    adminClose();
  }
}, true);
