const blixtSkillRoot = document.getElementById('skillcheck-overlay');
const SKILL_CIRCLE = 2 * Math.PI * 76;
const SKILL_SPEEDS = { easy: 1, medium: 1.5, hard: 1.75 };
const SKILL_ARCS = { easy: 50, medium: 40, hard: 25 };
let blixtSkill = null;

function skillInput(event) {
  const code = event.code || '';
  if (event.key && event.key.charCodeAt(0) >= 880) {
    if (/^Key[A-Z]$/.test(code)) return code.charAt(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.charAt(5);
  }
  return String(event.key || '').toLowerCase();
}

function skillDifficulty(value) {
  if (typeof value === 'string' && Object.hasOwn(SKILL_ARCS, value)) {
    return { area: SKILL_ARCS[value], speed: SKILL_SPEEDS[value] };
  }
  if (value && typeof value === 'object') {
    const area = Number(value.areaSize);
    const speed = Number(value.speedMultiplier);
    return {
      area: Number.isFinite(area) ? Math.min(239, Math.max(1, area)) : 40,
      speed: Number.isFinite(speed) ? Math.max(0.0001, speed) : 1,
    };
  }
  return { area: 50, speed: 1 };
}

function skillView() {
  blixtSkillRoot.innerHTML = `
    <section class="blixt-skill-panel" role="group" aria-label="Skill check">
      <div class="blixt-skill-header">Skill Check</div>
      <div class="blixt-skill-paper-lines" aria-hidden="true"></div>
      <div class="blixt-skill-face">
        <svg class="blixt-skill-dial" viewBox="0 0 220 220" aria-hidden="true">
          <circle class="blixt-skill-track" cx="110" cy="110" r="76"/>
          <circle class="blixt-skill-target" cx="110" cy="110" r="76" />
          <g class="blixt-skill-indicator" transform="rotate(-90 110 110)">
            <rect class="blixt-skill-indicator-notch" x="180" y="104" width="17" height="12" rx="2" />
            <circle class="blixt-skill-indicator-dot" cx="186" cy="110" r="5" />
          </g>
        </svg>
        <div class="blixt-skill-key" aria-live="off">E</div>
      </div>
    </section>`;
  return {
    target: blixtSkillRoot.querySelector('.blixt-skill-target'),
    indicator: blixtSkillRoot.querySelector('.blixt-skill-indicator'),
    key: blixtSkillRoot.querySelector('.blixt-skill-key'),
  };
}

function endSkill(success) {
  const state = blixtSkill;
  if (!state) return;
  blixtSkill = null;
  if (state.frame) cancelAnimationFrame(state.frame);
  window.removeEventListener('keydown', onSkillKey, true);
  blixtSkillRoot.replaceChildren();
  const parent = typeof GetParentResourceName === 'function' ? GetParentResourceName() : null;
  if (!parent) return;
  fetch(`https://${parent}/blixtSkillCheckOver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(success === true),
  }).catch(() => {});
}

function startSkillRound() {
  const state = blixtSkill;
  if (!state) return;
  if (state.frame) cancelAnimationFrame(state.frame);

  const settings = skillDifficulty(state.difficulties[state.index]);
  // Match ox_lib's existing range: -90 + random(120, 360 - areaSize).
  const maxStart = Math.max(121, 360 - settings.area);
  const offset = Math.floor(Math.random() * (maxStart - 120)) + 120;
  state.targetStart = -90 + offset;
  state.targetEnd = state.targetStart + settings.area;
  state.duration = 2000 / settings.speed;
  state.startedAt = null;
  state.angle = -90;
  state.finishedRound = false;
  state.expected = state.inputs && state.inputs.length
    ? state.inputs[Math.floor(Math.random() * state.inputs.length)] : 'e';

  const arcLength = SKILL_CIRCLE * settings.area / 360;
  state.view.target.style.strokeDasharray = `${arcLength} ${SKILL_CIRCLE}`;
  state.view.target.style.transform = `rotate(${state.targetStart}deg)`;
  state.view.key.textContent = state.expected.toUpperCase();
  state.view.indicator.setAttribute('transform', 'rotate(-90 110 110)');

  const tick = (now) => {
    if (blixtSkill !== state || state.finishedRound) return;
    if (state.startedAt === null) state.startedAt = now;
    const ratio = Math.min(1, Math.max(0, (now - state.startedAt) / state.duration));
    state.angle = -90 + ratio * 360;
    state.view.indicator.setAttribute('transform', `rotate(${state.angle} 110 110)`);
    if (ratio >= 1) {
      endSkill(false);
      return;
    }
    state.frame = requestAnimationFrame(tick);
  };
  state.frame = requestAnimationFrame(tick);
}

function onSkillKey(event) {
  const state = blixtSkill;
  if (!state || state.finishedRound) return;
  const pressed = skillInput(event);
  if (state.inputs && !state.inputs.includes(pressed)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  state.finishedRound = true;
  const success = pressed === state.expected &&
    state.angle >= state.targetStart && state.angle <= state.targetEnd;
  if (!success) {
    endSkill(false);
  } else if (state.index + 1 >= state.difficulties.length) {
    endSkill(true);
  } else {
    state.index += 1;
    startSkillRound();
  }
}

function startSkill(data) {
  if (!data || typeof data !== 'object') return;
  if (blixtSkill) endSkill(false);
  const difficulties = Array.isArray(data.difficulty) ? data.difficulty : [data.difficulty];
  if (!difficulties.length) return;
  const inputs = Array.isArray(data.inputs) && data.inputs.length
    ? data.inputs.map(input => String(input).toLowerCase()) : null;
  blixtSkill = {
    difficulties, inputs, index: 0, frame: 0,
    targetStart: 0, targetEnd: 0, angle: -90, expected: 'e',
    startedAt: null, duration: 2000, finishedRound: false,
    view: skillView(),
  };
  window.addEventListener('keydown', onSkillKey, true);
  startSkillRound();
}

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.action === 'blixtSkillCheckStart') startSkill(message.data);
  else if (message.action === 'blixtSkillCheckCancel') endSkill(false);
});
