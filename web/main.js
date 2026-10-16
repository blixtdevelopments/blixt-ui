const root = document.getElementById('notifications');
const allowedPositions = new Set([
  'top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right',
  'center-left', 'center-right',
]);
const allowedThemes = new Set(['80s', '90s', 'modern']);
const zones = new Map();
const active = new Map();
const MAX_VISIBLE = 6;
let nextKey = 0;

function zoneFor(position) {
  if (zones.has(position)) return zones.get(position);
  const element = document.createElement('div');
  element.className = 'zone';
  element.dataset.position = position;
  root.appendChild(element);
  zones.set(position, element);
  return element;
}

function clearNotice(key) {
  const old = active.get(key);
  if (!old) return;
  clearTimeout(old.timer);
  old.element.remove();
  active.delete(key);
}

function showNotice(data) {
  if (!data || typeof data !== 'object') return;
  const position = allowedPositions.has(data.position) ? data.position : 'top-right';
  const key = typeof data.id === 'string' && data.id ? `id:${data.id}` : `anonymous:${++nextKey}`;
  clearNotice(key);

  if (active.size >= MAX_VISIBLE) clearNotice(active.keys().next().value);

  const element = document.createElement('div');
  element.className = 'notice';
  element.dataset.type = ['success', 'warning', 'error'].includes(data.type) ? data.type : 'info';
  element.dataset.showDuration = data.showDuration === false ? 'false' : 'true';

  const currentTheme = document.body.dataset.theme;
  const rawTitle = data.title != null ? String(data.title).trim() : '';
  const titleText = rawTitle || (currentTheme === '90s' ? 'Notification' : '');

  if (titleText) {
    const title = document.createElement('div');
    title.className = 'notice-title';
    title.textContent = titleText;
    element.appendChild(title);
  }
  if (data.description != null && data.description !== '') {
    const description = document.createElement('div');
    description.className = 'notice-body';
    description.textContent = String(data.description);
    element.appendChild(description);
  }

  const duration = Number.isFinite(data.duration) ? Math.min(120000, Math.max(300, data.duration)) : 5000;
  element.style.setProperty('--duration', `${duration}ms`);
  const bar = document.createElement('div');
  bar.className = 'notice-bar';
  element.appendChild(bar);

  zoneFor(position).appendChild(element);
  const timer = setTimeout(() => clearNotice(key), duration);
  active.set(key, { element, timer });
}

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.action === 'configure' && allowedThemes.has(message.theme)) {
    const validPresets = { '80s': ['original', 'white', 'yellow'], '90s': ['classic', 'gradient', 'midnight'], modern: ['graphite', 'frost', 'midnight-blue'] };
    document.body.dataset.theme = message.theme;
    document.body.dataset.preset = validPresets[message.theme].includes(message.preset) ? message.preset : validPresets[message.theme][0];
  } else if (message.action === 'notify') {
    showNotice(message.data);
  } else if (message.action === 'startProgress') {
    startProgress(message.data);
  } else if (message.action === 'stopProgress') {
    stopProgress(message.id);
  }
});

const progressRoot = document.getElementById('progress-overlay');
let activeProgress = null;

function stopProgress(id) {
  if (!activeProgress || activeProgress.id !== id) return;
  cancelAnimationFrame(activeProgress.frame);
  activeProgress = null;
  progressRoot.replaceChildren();
}

function startProgress(data) {
  if (!data || typeof data !== 'object' || !Number.isFinite(data.duration) || data.duration <= 0) return;
  if (activeProgress) stopProgress(activeProgress.id);

  const id = data.id;
  const duration = data.duration;
  const label = String(data.label || 'Processing...');
  const isCircle = data.kind === 'circle';
  const position = isCircle ? 'bottom' : (data.position === 'middle' ? 'middle' : 'bottom');
  const panel = document.createElement('div');
  panel.className = isCircle ? 'progress-panel progress-circle-panel' : 'progress-panel';
  panel.dataset.position = position;
  panel.setAttribute('role', 'progressbar');
  panel.setAttribute('aria-label', label);
  panel.setAttribute('aria-valuemin', '0');
  panel.setAttribute('aria-valuemax', '100');
  panel.setAttribute('aria-valuenow', '0');

  if (isCircle) {
    panel.innerHTML = `
      <div class="circle-paper">
        <div class="stamp-face">
          <svg viewBox="0 0 164 164" aria-hidden="true">
            <defs>
              <path id="stamp-top-arc" d="M 45 82 A 37 37 0 0 1 119 82"></path>
              <pattern id="stamp-rough" width="29" height="31" patternUnits="userSpaceOnUse">
                <rect width="29" height="31" fill="white"></rect>
                <circle cx="4" cy="6" r="1.4" fill="black"></circle>
                <circle cx="21" cy="13" r="1.0" fill="black"></circle>
                <rect x="12" y="25" width="4" height="1.2" fill="black" transform="rotate(-14 14 25)"></rect>
                <circle cx="27" cy="29" r="0.8" fill="black"></circle>
              </pattern>
              <mask id="stamp-worn-ink" maskUnits="userSpaceOnUse" x="0" y="0" width="164" height="164">
                <rect width="164" height="164" fill="url(#stamp-rough)"></rect>
              </mask>
            </defs>
            <g mask="url(#stamp-worn-ink)">
              <circle class="stamp-guide" cx="82" cy="82" r="66"></circle>
              <circle class="stamp-ring stamp-outer" cx="82" cy="82" r="66" pathLength="100"></circle>
              <circle class="stamp-ring stamp-inner" cx="82" cy="82" r="55" pathLength="100"></circle>
              <text class="stamp-head"><textPath href="#stamp-top-arc" startOffset="50%" text-anchor="middle">IN PROGRESS</textPath></text>
              <path class="stamp-rule" d="M49 111H115"></path>
              <text class="stamp-percent" x="82" y="99" text-anchor="middle">0%</text>
            </g>
          </svg>
        </div>
      </div>
      <div class="circle-windows">
        <div class="windows-title">Processing...<span class="windows-close">×</span></div>
        <div class="hourglass-ring">
          <div class="hourglass-blocks"></div>
          <svg class="pixel-hourglass" viewBox="0 0 100 100" shape-rendering="crispEdges" aria-hidden="true">
            <path fill="#101010" d="M29 15H71V23H67V32L57 44L54 50L57 56L67 68V77H71V85H29V77H33V68L43 56L46 50L43 44L33 32V23H29Z"></path>
            <path fill="#ededed" d="M39 23H61V31L50 44L39 31Z M50 56L61 71V77H39V71Z"></path>
            <path fill="#000080" d="M41 25H59V30L50 40L41 30Z"></path>
            <path fill="#101010" d="M29 15H71V20H29Z M29 80H71V85H29Z"></path>
          </svg>
        </div>
        <div class="circle-windows-percent">0%</div>
      </div>
      <div class="circle-modern">
        <div class="modern-radial">
          <div class="modern-radial-segments"></div>
          <div class="modern-radial-percent">0%</div>
        </div>
        <div class="circle-modern-task"></div>
      </div>`;

    panel.querySelector('.circle-modern-task').textContent = label;
  } else {
    panel.innerHTML = `
      <div class="progress-paper">
        <div class="paper-text"><span class="paper-written"></span><span class="paper-pen"></span></div>
        <div class="paper-footer">PROGRESSING</div>
      </div>
      <div class="progress-windows">
        <div class="windows-title">Processing...<span class="windows-close">×</span></div>
        <div class="windows-task"></div>
        <div class="windows-row"><div class="windows-segments"></div><span class="windows-pct">0%</span></div>
      </div>
      <div class="progress-modern">
        <div class="modern-task"></div>
        <div class="modern-track"><div class="modern-fill"></div></div>
      </div>`;

    panel.querySelector('.windows-task').textContent = label;
    panel.querySelector('.modern-task').textContent = label;
  }

  const blocks = [];
  let text;
  let characters;
  let pctText;
  let fill;
  let stampRings;
  let stampHead;
  let stampRule;
  let stampPercent;
  let modernPercent;

  if (isCircle) {
    const winRing = panel.querySelector('.hourglass-blocks');
    const modernRing = panel.querySelector('.modern-radial-segments');

    for (let i = 0; i < 24; i++) {
      const block = document.createElement('span');
      block.className = 'hourglass-segment';
      block.style.transform = `translate(-50%, -50%) rotate(${i * 15}deg) translateY(-48px)`;
      winRing.appendChild(block);
      blocks.push(block);
    }

    for (let i = 0; i < 12; i++) {
      const segment = document.createElement('span');
      segment.className = 'modern-radial-segment';
      segment.style.transform = `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-38px)`;
      modernRing.appendChild(segment);
    }

    stampRings = panel.querySelectorAll('.stamp-ring');
    stampHead = panel.querySelector('.stamp-head');
    stampRule = panel.querySelector('.stamp-rule');
    stampPercent = panel.querySelector('.stamp-percent');
    pctText = panel.querySelector('.circle-windows-percent');
    modernPercent = panel.querySelector('.modern-radial-percent');
  } else {
    const segments = panel.querySelector('.windows-segments');
    for (let i = 0; i < 20; i++) {
      const block = document.createElement('span');
      block.className = 'windows-block';
      segments.appendChild(block);
      blocks.push(block);
    }
    text = panel.querySelector('.paper-written');
    characters = Array.from(label);
    pctText = panel.querySelector('.windows-pct');
    fill = panel.querySelector('.modern-fill');
  }

  progressRoot.replaceChildren(panel);
  const progress = { id, frame: 0, startedAt: performance.now() };
  activeProgress = progress;
  let lastChars = -1;
  let lastBlocks = -1;
  let lastPercent = -1;
  let lastModernSegments = -1;

  const tick = (now) => {
    if (activeProgress !== progress) return;
    const ratio = Math.min(1, Math.max(0, (now - progress.startedAt) / duration));
    const percent = Math.min(100, Math.floor(ratio * 100));
    const blockCount = Math.min(blocks.length, Math.floor(ratio * blocks.length));

    if (!isCircle) {
      const shown = Math.min(characters.length, Math.ceil(ratio * characters.length));
      if (shown !== lastChars) {
        text.textContent = characters.slice(0, shown).join('');
        lastChars = shown;
      }
    }

    if (blockCount !== lastBlocks) {
      blocks.forEach((block, index) => block.classList.toggle('filled', index < blockCount));
      lastBlocks = blockCount;
    }

    if (percent !== lastPercent) {
      pctText.textContent = `${percent}%`;
      panel.setAttribute('aria-valuenow', String(percent));
      if (isCircle) {
        stampPercent.textContent = `${percent}%`;
        modernPercent.textContent = `${percent}%`;
        stampRings.forEach(ring => ring.style.strokeDashoffset = String(100 - percent));
        const impressionOpacity = (0.25 + ratio * 0.75).toFixed(3);
        stampHead.style.opacity = impressionOpacity;
        stampRule.style.opacity = impressionOpacity;
        stampPercent.style.opacity = impressionOpacity;
      } else {
        fill.style.width = `${percent}%`;
      }
      lastPercent = percent;
    }

    if (isCircle) {
      const count = Math.min(12, Math.floor(ratio * 12));
      if (count !== lastModernSegments) {
        panel.querySelectorAll('.modern-radial-segment').forEach((segment, index) => {
          segment.classList.toggle('filled', index < count);
        });
        lastModernSegments = count;
      }
    }

    if (ratio < 1) {
      progress.frame = requestAnimationFrame(tick);
      return;
    }

    stopProgress(id);
    if (parentResource) {
      fetch(`https://${parentResource}/blixtProgressComplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }
  };
  progress.frame = requestAnimationFrame(tick);
}

const parentResource = typeof GetParentResourceName === 'function' ? GetParentResourceName() : null;
if (parentResource) {
  fetch(`https://${parentResource}/ready`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .catch(() => {});
}
