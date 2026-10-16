const blixtDialogRoot = document.getElementById('dialog-overlay');
const dialogState = { kind: null, data: null, pending: false };

function dialogNode(tag, cls, text) {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text != null) element.textContent = String(text);
  return element;
}

function dialogText(value) {
  return String(value ?? '').replace(/\*\*|__|~~|`/g, '').trim();
}

function dialogRequest(kind, value) {
  if (!dialogState.kind || dialogState.pending || kind !== dialogState.kind) return;
  dialogState.pending = true;
  const parent = typeof GetParentResourceName === 'function' ? GetParentResourceName() : null;
  if (parent) {
    fetch(`https://${parent}/blixtDialogResult`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, value }),
    }).catch(() => { dialogState.pending = false; });
  } else {
    hideBlixtDialog();
  }
}

function hideBlixtDialog() {
  dialogState.kind = null;
  dialogState.data = null;
  dialogState.pending = false;
  blixtDialogRoot.replaceChildren();
}

function dialogHeader(frame, heading, allowCancel) {
  const header = dialogNode('header', 'bd-header');
  const controls = dialogNode('div', 'bd-mac-controls');
  for (const [index, color] of ['red', 'yellow', 'green'].entries()) {
    const dot = dialogNode(index === 0 && allowCancel ? 'button' : 'span', `bd-mac-dot bd-mac-${color}`);
    if (index === 0 && allowCancel) {
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Cancel dialog');
      dot.addEventListener('click', () => dialogRequest(dialogState.kind, null));
    }
    controls.appendChild(dot);
  }
  header.appendChild(controls);
  header.appendChild(dialogNode('span', 'bd-title', dialogText(heading)));
  if (allowCancel) {
    const close = dialogNode('button', 'bd-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close dialog');
    close.addEventListener('click', () => dialogRequest(dialogState.kind, null));
    header.appendChild(close);
  }
  frame.appendChild(header);
}

function dialogLabel(text, input) {
  const label = dialogNode('label', 'bd-label', text);
  label.appendChild(input);
  return label;
}

function dialogSelectOptions(select, options, currentValue) {
  for (const [index, entry] of (Array.isArray(options) ? options : []).entries()) {
    const opt = document.createElement('option');
    const data = entry && typeof entry === 'object' ? entry : { value: entry, label: entry };
    opt.value = String(index);
    opt.textContent = dialogText(data.label ?? data.value ?? entry);
    select.appendChild(opt);
    if (data.value === currentValue || String(data.value) === String(currentValue)) select.value = String(index);
  }
}

function fieldValue(field) {
  const { type, control, second, options, row } = field;
  if (type === 'checkbox') return control.checked;
  if (type === 'number' || type === 'slider') return control.value === '' ? null : Number(control.value);
  if (type === 'select') {
    if (control.value === '') return null;
    const item = options[Number(control.value)];
    return item && typeof item === 'object' ? item.value : item;
  }
  if (type === 'multi-select') {
    return [...control.selectedOptions].map(option => {
      const item = options[Number(option.value)];
      return item && typeof item === 'object' ? item.value : item;
    });
  }
  if (type === 'date' || type === 'date-range') {
    const parse = el => !el.value ? null : (row.returnString ? el.value : new Date(`${el.value}T00:00:00`).getTime());
    return type === 'date' ? parse(control) : [parse(control), parse(second)];
  }
  if (type === 'time') return control.value || null;
  return control.value;
}

function makeDialogField(rawRow, index) {
  const row = typeof rawRow === 'string' ? { type: 'input', label: rawRow } : (rawRow || {});
  const type = row.type || 'input';
  const group = dialogNode('div', 'bd-field');
  const options = Array.isArray(row.options) ? row.options : [];
  const field = { row, type, options, control: null, second: null, group };

  let control;
  if (type === 'select' || type === 'multi-select') {
    control = document.createElement('select');
    control.multiple = type === 'multi-select';
    if (type === 'multi-select') control.size = Math.min(Math.max(options.length, 2), 5);
    if (type === 'select' && !row.required && row.clearable !== false) {
      control.appendChild(new Option(row.placeholder || 'Select an option', ''));
    }
    dialogSelectOptions(control, options, row.default);
    if (type === 'multi-select' && Array.isArray(row.default)) {
      for (const option of control.options) {
        const data = options[Number(option.value)];
        option.selected = row.default.some(value => value === (data && typeof data === 'object' ? data.value : data));
      }
    }
  } else if (type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = 3;
    control.value = row.default == null ? '' : String(row.default);
  } else {
    control = document.createElement('input');
    const inputType = {
      input: row.password ? 'password' : 'text', number: 'number', slider: 'range',
      checkbox: 'checkbox', date: 'date', 'date-range': 'date', time: 'time', color: 'color',
    };
    control.type = inputType[type] || 'text';
    if (type === 'checkbox') control.checked = row.checked === true || row.default === true;
    else if (type === 'color') control.value = /^#[a-f\d]{6}$/i.test(String(row.default)) ? String(row.default) : '#459fff';
    else if (row.default != null) control.value = String(row.default);
    if (type === 'slider' && row.default == null) control.value = String(row.min ?? 0);
  }
  control.id = `bd-field-${index}`;
  control.className = `bd-control bd-${type}`;
  control.disabled = row.disabled === true;
  control.required = row.required === true;
  if (row.placeholder != null && 'placeholder' in control) control.placeholder = String(row.placeholder);
  if (row.min != null && (type === 'number' || type === 'slider' || type === 'date')) control.min = row.min;
  if (row.max != null && (type === 'number' || type === 'slider' || type === 'date')) control.max = row.max;
  if (row.step != null && (type === 'number' || type === 'slider')) control.step = row.step;
  if (row.minLength != null && 'minLength' in control) control.minLength = row.minLength;
  if (row.maxLength != null && 'maxLength' in control) control.maxLength = row.maxLength;
  field.control = control;

  const header = dialogNode('label', 'bd-field-name', row.label || `Field ${index + 1}`);
  header.htmlFor = control.id;
  if (row.required) header.appendChild(dialogNode('span', 'bd-required', ' *'));
  if (type === 'checkbox') {
    const checkboxLine = dialogNode('div', 'bd-check-row');
    checkboxLine.appendChild(control);
    checkboxLine.appendChild(header);
    group.appendChild(checkboxLine);
  } else {
    group.appendChild(header);
    group.appendChild(control);
  }
  if (type === 'slider') {
    const display = dialogNode('output', 'bd-slider-val', control.value);
    control.addEventListener('input', () => { display.textContent = control.value; });
    group.appendChild(display);
  }
  if (type === 'date-range') {
    const second = document.createElement('input');
    second.type = 'date';
    second.className = 'bd-control bd-date-range';
    second.disabled = control.disabled;
    second.required = control.required;
    if (Array.isArray(row.default)) {
      control.value = row.default[0] || '';
      second.value = row.default[1] || '';
    }
    second.setAttribute('aria-label', `${row.label || 'Date'} end`);
    group.appendChild(second);
    field.second = second;
  }
  if (row.description) group.appendChild(dialogNode('small', 'bd-field-hint', dialogText(row.description)));
  return field;
}

function showInputDialog(frame, data) {
  const settings = data.options || {};
  const allowCancel = settings.allowCancel !== false;
  dialogHeader(frame, data.heading || 'Input', allowCancel);
  const form = dialogNode('form', 'bd-input-form');
  const body = dialogNode('div', 'bd-body bd-input-body');
  const fields = (Array.isArray(data.rows) ? data.rows : []).map(makeDialogField);
  fields.forEach(f => body.appendChild(f.group));
  form.appendChild(body);
  const actions = dialogNode('div', 'bd-actions');
  if (allowCancel) {
    const cancel = dialogNode('button', 'bd-button bd-secondary', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => dialogRequest('input', null));
    actions.appendChild(cancel);
  }
  const submit = dialogNode('button', 'bd-button bd-primary', 'Submit');
  submit.type = 'submit';
  actions.appendChild(submit);
  form.appendChild(actions);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (dialogState.pending || !form.reportValidity()) return;
    for (const f of fields) {
      if (f.type === 'multi-select' && f.row.maxSelectedValues > 0 && f.control.selectedOptions.length > f.row.maxSelectedValues) {
        f.control.setCustomValidity(`Choose up to ${f.row.maxSelectedValues} options`);
        f.control.reportValidity();
        f.control.addEventListener('change', () => f.control.setCustomValidity(''), { once: true });
        return;
      }
      if (f.type === 'date-range' && f.control.value && f.second.value && f.second.value < f.control.value) {
        f.second.setCustomValidity('End date cannot be before start date');
        f.second.reportValidity();
        f.second.addEventListener('change', () => f.second.setCustomValidity(''), { once: true });
        return;
      }
    }
    dialogRequest('input', fields.map(fieldValue));
  });
  frame.appendChild(form);
  requestAnimationFrame(() => { if (dialogState.kind === 'input') form.querySelector('input:not([type=hidden]),select,textarea')?.focus(); });
}

function showAlertDialog(frame, data) {
  dialogHeader(frame, data.header || 'Notification', data.cancel === true);
  const body = dialogNode('div', `bd-body bd-alert-body${data.centered ? ' bd-centered' : ''}`);
  const content = dialogNode('div', 'bd-alert-text', dialogText(data.content));
  body.appendChild(content);
  frame.appendChild(body);
  const actions = dialogNode('div', 'bd-actions');
  if (data.cancel === true) {
    const cancel = dialogNode('button', 'bd-button bd-secondary', dialogText(data.labels?.cancel || 'Cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', () => dialogRequest('alert', 'cancel'));
    actions.appendChild(cancel);
  }
  const confirm = dialogNode('button', 'bd-button bd-primary', dialogText(data.labels?.confirm || 'Confirm'));
  confirm.type = 'button';
  confirm.addEventListener('click', () => dialogRequest('alert', 'confirm'));
  actions.appendChild(confirm);
  frame.appendChild(actions);
  requestAnimationFrame(() => { if (dialogState.kind === 'alert') confirm.focus(); });
}

function showBlixtDialog(kind, data) {
  if (!['input', 'alert'].includes(kind) || !data || typeof data !== 'object') return;
  hideBlixtDialog();
  dialogState.kind = kind;
  dialogState.data = data;
  const backdrop = dialogNode('div', 'bd-backdrop');
  const frame = dialogNode('section', `bd-window bd-${kind}-window`);
  frame.setAttribute('role', 'dialog');
  frame.setAttribute('aria-modal', 'true');
  frame.setAttribute('aria-label', dialogText(data.heading || data.header || 'Blixt UI'));
  const size = kind === 'input' ? data.options?.size : data.size;
  frame.dataset.size = ['xs','sm','md','lg','xl'].includes(size) ? size : 'md';
  if (kind === 'input') showInputDialog(frame, data);
  else showAlertDialog(frame, data);
  backdrop.appendChild(frame);
  blixtDialogRoot.appendChild(backdrop);
}

window.addEventListener('message', event => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.action === 'blixtDialogShow') showBlixtDialog(message.kind, message.data);
  if (message.action === 'blixtDialogHide') hideBlixtDialog();
});

window.addEventListener('keydown', event => {
  if (!dialogState.kind) return;
  if (event.key === 'Escape') {
    const cancellable = dialogState.kind === 'alert' ? dialogState.data?.cancel === true : dialogState.data?.options?.allowCancel !== false;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (cancellable) dialogRequest(dialogState.kind, dialogState.kind === 'alert' ? 'cancel' : null);
  }
}, true);
