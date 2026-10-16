const blixtRadialRoot = document.getElementById('radial-overlay');
const blixtRadial = { open: false, submenu: false, items: [], selected: -1, locked: false };

function radialSend(action, payload) {
  if (!blixtRadial.open || typeof GetParentResourceName !== 'function') return;
  fetch(`https://${GetParentResourceName()}/blixtRadialAction`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  }).catch(() => {});
}

function radialElement(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value != null) el.textContent = String(value);
  return el;
}

function radialPoint(radius, angle) {
  const radians = angle * Math.PI / 180;
  return [250 + Math.cos(radians) * radius, 250 + Math.sin(radians) * radius];
}

function radialSector(start, end) {
  const p1 = radialPoint(79, start);
  const p2 = radialPoint(217, start);
  const p3 = radialPoint(217, end);
  const p4 = radialPoint(79, end);
  const large = end - start > 180 ? 1 : 0;
  return `M${p1.join(' ')} L${p2.join(' ')} A217 217 0 ${large} 1 ${p3.join(' ')} L${p4.join(' ')} A79 79 0 ${large} 0 ${p1.join(' ')} Z`;
}

function radialSelect(index) {
  blixtRadial.selected = index;
  const sectors = blixtRadialRoot.querySelectorAll('.blixt-radial-sector');
  sectors.forEach((sector, i) => sector.classList.toggle('selected', i === index));
  const labels = blixtRadialRoot.querySelectorAll('.blixt-radial-item');
  labels.forEach((label, i) => label.classList.toggle('selected', i === index));
}

function radialClick(index) {
  if (blixtRadial.locked || index < 0 || !blixtRadial.items[index]) return;
  blixtRadial.locked = true;
  radialSend('click', index);
  // Some ox_lib radial items use keepOpen=true and won't cause a new menu render.
  setTimeout(() => { if (blixtRadial.open) blixtRadial.locked = false; }, 240);
}

function radialDismiss(action) {
  if (blixtRadial.locked) return;
  blixtRadial.locked = true;
  radialSend(action);
}

function radialDraw(data) {
  const items = Array.isArray(data.items) ? data.items.filter(item => item && typeof item === 'object') : [];
  blixtRadial.items = items;
  blixtRadial.submenu = !!data.sub;
  blixtRadial.selected = -1;
  blixtRadial.locked = false;
  blixtRadialRoot.replaceChildren();
  blixtRadialRoot.classList.add('open');

  const backdrop = radialElement('div', 'blixt-radial-backdrop');
  backdrop.addEventListener('click', () => radialDismiss('close'));
  blixtRadialRoot.appendChild(backdrop);

  const shell = radialElement('div', 'blixt-radial-shell');

  const disc = radialElement('div', 'blixt-radial-disc');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'blixt-radial-svg');
  svg.setAttribute('viewBox', '0 0 500 500');
  svg.setAttribute('aria-label', 'Radial actions');
  svg.setAttribute('role', 'group');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const metallic = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  metallic.setAttribute('id', 'blixt-radial-graphite');
  metallic.setAttribute('x1', '0%'); metallic.setAttribute('y1', '0%');
  metallic.setAttribute('x2', '40%'); metallic.setAttribute('y2', '100%');
  for (const [offset, color] of [['0%', '#454b56'], ['55%', '#343a45'], ['100%', '#292f38']]) {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    metallic.appendChild(stop);
  }
  defs.appendChild(metallic);
  svg.appendChild(defs);

  const count = Math.max(items.length, 1);
  disc.dataset.count = String(count);
  for (let index = 0; index < items.length; index++) {
    const gap = document.body.dataset.theme === '90s' ? 0 : document.body.dataset.theme === 'modern' ? .08 : .6;
    const start = -90 - (360 / count) / 2 + index * (360 / count) + gap;
    const end = start + 360 / count - gap * 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', radialSector(start, end));
    path.setAttribute('class', 'blixt-radial-sector');
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', String(items[index].label || `Option ${index + 1}`));
    path.addEventListener('mouseenter', () => radialSelect(index));
    path.addEventListener('focus', () => radialSelect(index));
    path.addEventListener('click', () => radialClick(index));
    svg.appendChild(path);

    const angle = -90 + index * (360 / count);
    const [x, y] = radialPoint(count > 8 ? 156 : 153, angle);
    const item = radialElement('div', 'blixt-radial-item');
    item.style.left = `${x / 5}%`;
    item.style.top = `${y / 5}%`;
    if (count > 7) item.classList.add('compact');
    if (items[index].icon) addIcon(item, items[index].icon, items[index].iconColor, items[index].label);
    item.appendChild(radialElement('span', 'blixt-radial-label', items[index].label || `Option ${index + 1}`));
    if (items[index].menu) item.appendChild(radialElement('span', 'blixt-radial-submark', '›'));
    disc.appendChild(item);
  }
  disc.prepend(svg);

  const center = radialElement('button', 'blixt-radial-center');
  center.type = 'button';
  center.appendChild(radialElement('span', 'blixt-radial-center-symbol', data.sub ? '‹' : '×'));
  center.appendChild(radialElement('span', 'blixt-radial-center-label', data.sub ? 'Back' : 'Close'));
  center.addEventListener('click', () => radialDismiss(data.sub ? 'back' : 'close'));
  disc.appendChild(center);
  shell.appendChild(disc);
  blixtRadialRoot.appendChild(shell);
}

window.addEventListener('message', event => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.action === 'blixtRadialBegin') {
    blixtRadial.open = true;
    blixtRadial.locked = false;
  } else if (msg.action === 'blixtRadialUpdate' && blixtRadial.open) {
    if (msg.data === false) {
      blixtRadialRoot.replaceChildren();
      blixtRadialRoot.classList.remove('open');
    } else if (msg.data && typeof msg.data === 'object') {
      radialDraw(msg.data);
    }
  } else if (msg.action === 'blixtRadialEnd') {
    blixtRadial.open = false;
    blixtRadialRoot.classList.remove('open');
    blixtRadialRoot.replaceChildren();
  }
});

window.addEventListener('keydown', event => {
  if (!blixtRadial.open) return;
  if (event.key === 'Escape') {
    event.preventDefault(); event.stopPropagation(); radialDismiss('close');
  } else if (event.key === 'Backspace' && blixtRadial.submenu) {
    event.preventDefault(); event.stopPropagation(); radialDismiss('back');
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); event.stopPropagation();
    if (blixtRadial.items.length) {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = (blixtRadial.selected + direction + blixtRadial.items.length) % blixtRadial.items.length;
      radialSelect(next);
    }
  } else if (event.key === 'Enter' && blixtRadial.selected >= 0) {
    event.preventDefault(); event.stopPropagation(); radialClick(blixtRadial.selected);
  }
}, true);
