import './style.css';
import { CommandPanel } from './ui/command-panel';
import { SCENARIOS } from './content/scenarios';
import { drawMinimap } from './render/minimap';
import {
  DEFAULT_CONFIG,
  SIM_VERSION,
  TICK_RATE,
  UNITS,
  validateConfig,
  shieldDurability,
  formationRoster,
  DEFAULT_FORMATIONS,
  type FormationRole,
  type BattleConfig,
  type Doctrine,
} from './content/catalog';
import { CONTENT_HASH, STATE_NAMES, UNIT_STRIDE, type BattleSummary } from './sim/battle';
import { validateReplay, type Replay } from './sim/replay';
import { Battlefield } from './render/battlefield';
import { PROTOCOL_VERSION, type FromWorker, type ToWorker } from './platform/protocol';

const icon = (name: string) => {
  const paths: Record<string, string> = {
    play: 'm9 5 11 7-11 7Z',
    pause: 'M8 5v14M16 5v14',
    reset: 'M4 10a8 8 0 1 1 1 8M4 4v6h6',
    step: 'm5 5 10 7-10 7ZM19 5v14',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    expand: 'M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4',
    download: 'M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5',
    upload: 'M12 16V4m-5 5 5-5 5 5M5 17v4h14v-4',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z',
    flag: 'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',
    chevron: 'm8 5 7 7-7 7',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.shield}"/></svg>`;
};
const armyForm = (
  team: 'romans' | 'gauls',
  title: string,
  subtitle: string,
  color: string,
) => `<section class="army-builder ${color}">
  <div class="army-heading"><span class="faction-mark">${team === 'romans' ? 'Ⅰ' : 'ᛉ'}</span><div><h2>${title}</h2><p>${subtitle}</p></div><span class="army-side">${team === 'romans' ? 'WEST' : 'EAST'}</span></div>
  <div class="count-row"><label for="${team}-count">Army strength <span>incl. commander</span></label><input id="${team}-count" type="number" min="2" max="1000" step="1" value="${DEFAULT_CONFIG[team].count}" /></div>
  <div class="preset-row" aria-label="${title} army size presets">${[50, 100, 300, 1000].map((n) => `<button type="button" data-count="${n}" data-army="${team}">${n === 1000 ? '1,000' : n}</button>`).join('')}</div>
  <div class="mix-label"><label for="${team}-mix">Javelineers</label><output id="${team}-mix-value">${DEFAULT_CONFIG[team].skirmishers}%</output></div>
  <input id="${team}-mix" type="range" min="0" max="80" step="5" value="${DEFAULT_CONFIG[team].skirmishers}" />
  <div class="roster-breakdown"><span id="${team}-infantry-count"></span><span id="${team}-ranged-count"></span></div>
  <div id="${team}-formations" class="formation-builder"></div>
  <label class="select-label" for="${team}-doctrine">Doctrine</label><select id="${team}-doctrine"><option value="balanced">Balanced advance</option><option value="shieldwall" ${team === 'romans' ? 'selected' : ''}>Shield discipline</option><option value="charge" ${team === 'gauls' ? 'selected' : ''}>Aggressive charge</option></select>
  <div class="commander-template"><span class="commander-icon">${icon('flag')}</span><div><strong>${team === 'romans' ? 'Roman legate' : 'Gallic warlord'}</strong><span>${team === 'romans' ? 'Rally the line · Morale & stamina' : 'War cry · Morale & attack'}</span></div><span class="ai-tag">AI</span></div>
</section>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="topbar"><a class="brand" href="./" aria-label="Banner Band home"><span class="brand-symbol">${icon('flag')}</span><span>BANNER<span class="brand-slash">/</span>BAND</span></a><div class="page-title">CUSTOM BATTLE <span class="title-divider">/</span> <span>THE GALLIC FRONTIER</span></div><a class="build-tag" href="https://github.com/karmiphuc/vibe-banner-band" target="_blank" rel="noopener" title="Source code and project documentation"><i></i> PROOF OF CONCEPT <b>0.4 ↗</b></a></header>
<main class="workspace">
  <aside class="setup-panel"><div class="panel-intro"><span class="eyebrow">01 / BATTLE SETUP</span><h1>Set the field.</h1><p>Build two armies. Watch their commanders lead.</p></div>
  <form id="battle-form"><fieldset id="setup-fields"><legend class="sr-only">Battle configuration</legend>
    <section class="scenario-picker"><label for="scenario">CHOOSE AN ENCOUNTER</label><select id="scenario">${SCENARIOS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}<option value="custom">Custom battle</option></select><p id="scenario-detail">${SCENARIOS.find((s) => s.id === 'frontier')!.description}</p><button type="button" id="try-tactics">Try the reserve &amp; flank battle →</button></section>
    ${armyForm('romans', 'Roman Republic', 'Discipline. Armor. Resolve.', 'roman')}
    ${armyForm('gauls', 'Gallic warband', 'Momentum. Reach. Ferocity.', 'gaul')}
    <section class="world-settings"><div class="field"><label for="terrain">Battlefield</label><select id="terrain"><option value="meadow">Open meadow</option><option value="crossroads">Old crossroads</option><option value="rocky-pass">Rocky passage</option></select></div><div class="field seed-field"><label for="seed">World seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" value="7541" /><button type="button" id="new-seed" aria-label="Use next seed" title="Use next seed">↻</button></div></section>
  </fieldset></form>
  <div class="setup-note" id="setup-note">Changes redeploy the armies. Both commanders are autonomous.</div>
  <div class="setup-footer"><button id="start" class="primary">${icon('play')}<span>Begin battle</span><kbd>SPACE</kbd></button><p id="scale-note">Early unit models · no direct hero control</p></div>
  </aside>
  <section class="battle-panel" aria-label="Custom battle observer">
    <div class="battle-top"><div class="battle-location"><span class="eyebrow">02 / LIVE FIELD</span><strong id="location">Open meadow</strong></div><div class="live-controls"><span id="battle-status" class="status-badge">DEPLOYMENT</span><button id="reset" class="icon-button" title="Reset same seed" aria-label="Reset battle">${icon('reset')}</button><button id="step" class="icon-button" title="Advance one simulation tick" aria-label="Step one tick">${icon('step')}</button><div class="speed-control" aria-label="Simulation speed"><button data-speed="1" class="active" aria-pressed="true">1×</button><button data-speed="2" aria-pressed="false">2×</button><button data-speed="4" aria-pressed="false">4×</button></div></div></div>
    <div class="field-viewport" id="viewport">
      <div class="army-score"><div class="score roman"><span class="score-label">ROMANS</span><strong id="roman-standing">80</strong><span id="roman-losses">0 fallen</span><div class="strength-bar"><i id="roman-bar"></i></div></div><div class="score-center"><span>VS</span><strong id="clock">00:00</strong></div><div class="score gaul"><span class="score-label">GAULS</span><strong id="gaul-standing">100</strong><span id="gaul-losses">0 fallen</span><div class="strength-bar"><i id="gaul-bar"></i></div></div></div>
      <div class="observer-toolbar" aria-label="Observer tools"><button id="tactical" aria-pressed="false">${icon('shield')}<span>Tactical</span></button><button id="follow" aria-pressed="false">${icon('flag')}<span>Follow</span></button><button id="rotate" title="Rotate camera 90 degrees" aria-label="Rotate camera">↻</button><button id="fullscreen" title="Expand battlefield" aria-label="Expand battlefield">${icon('expand')}</button></div>
      <div class="field-phase"><span id="phase-label">DEPLOYMENT</span><span id="phase-description">Two armies. One field.</span></div>
      <div class="minimap-wrap"><canvas id="minimap" width="180" height="140" aria-label="Battle overview. Romans in terracotta, Gauls in teal. Selected unit circled."></canvas><span>FIELD OVERVIEW <b>N ↑</b></span></div>
      <div class="viewport-note" id="viewport-note"><span class="note-dot"></span>Armies ready. Begin battle to release the commanders.</div>
      <div class="result-card" id="result" hidden><span class="eyebrow">BATTLE CONCLUDED</span><h2 id="result-title"></h2><p id="result-detail"></p><div id="result-stats" class="result-stats"></div><button id="result-replay">${icon('reset')}Run this battle again</button></div>
      <div class="camera-tools"><button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button><button id="overview" class="icon-button" aria-label="Fit battlefield" title="Fit battlefield">${icon('expand')}</button></div>
      <div class="compass"><span>N</span><svg viewBox="0 0 50 50" aria-hidden="true"><path d="M25 5 32 29 25 25 18 29Z" fill="currentColor"/><path d="M25 45 18 21 25 25 32 21Z" fill="currentColor" opacity=".3"/></svg><small>ISOMETRIC</small></div>
      <div class="camera-hint">DRAG TO PAN <span>·</span> SCROLL TO ZOOM <span>·</span> CLICK TO INSPECT</div>
      <div id="loading" class="loading">Preparing the battlefield…</div>
    </div>
    <section id="command-panel" class="command-panel" aria-label="Tactical formation commands"></section>
    <div class="field-bottom"><div class="battle-log"><span class="log-label">FIELD REPORT</span><span id="latest-event">Commanders await deployment.</span></div><div class="replay-actions"><button id="export" title="Export this configuration and exact battle state for replay">${icon('download')}<span>Export replay</span></button><button id="import">${icon('upload')}<span>Import</span></button><input id="replay-file" type="file" accept=".json,application/json" hidden /></div></div>
  </section>
  <aside class="inspect-panel"><div class="inspect-heading"><span class="eyebrow">03 / INSPECT</span><span class="small-label">AI OBSERVER</span></div>
    <div class="inspect-tabs"><button id="inspect-roman" class="active">Roman legate</button><button id="inspect-gaul">Gallic warlord</button></div>
    <div class="unit-emblem roman" id="unit-emblem">${icon('shield')}<span id="unit-role">COMMANDER</span></div>
    <h2 id="unit-name">Roman legate</h2><p class="unit-description" id="unit-description"></p>
    <div class="unit-state"><span id="unit-state">Ready</span><span id="unit-id">UNIT #80</span></div>
    <div class="unit-stat"><div><span>Health</span><strong id="unit-health"></strong></div><div class="meter"><i id="health-meter"></i></div></div>
    <div class="unit-stat"><div><span>Morale</span><strong id="unit-morale"></strong></div><div class="meter morale"><i id="morale-meter"></i></div></div>
    <div class="unit-stat"><div><span>Stamina</span><strong id="unit-stamina"></strong></div><div class="meter stamina"><i id="stamina-meter"></i></div></div>
    <div class="unit-facts"><div><span>Armor</span><strong id="unit-armor"></strong></div><div><span>Damage</span><strong id="unit-damage"></strong></div><div><span>Ammo</span><strong id="unit-ammo"></strong></div><div><span>Kills</span><strong id="unit-kills"></strong></div></div>
    <div class="unit-stat"><div><span>Shield integrity</span><strong id="unit-shield"></strong></div><div class="meter shield"><i id="shield-meter"></i></div></div>
    <div class="combat-readout"><div><span>Shield support</span><b id="unit-support">—</b></div><div><span>Charge impact</span><b id="unit-impact">—</b></div><div><span>Shield blocks</span><b id="unit-blocks">0</b></div></div>
    <section class="equipment"><h3>EQUIPMENT</h3><ul id="unit-equipment"></ul></section>
    <section class="ability"><span>${icon('flag')}</span><div><h3 id="unit-ability"></h3><p id="ability-detail"></p></div></section>
    <button id="open-workshop" class="secondary workshop-launch">Open model workshop ↗</button>
    <button id="focus-unit" class="secondary">Inspect model ${icon('expand')}</button>
    <details class="event-history"><summary>Battle chronicle</summary><ol id="event-list"></ol></details>
    <div class="unit-library"><h3>UNIT DESIGNS</h3><div>${UNITS.map((u, i) => `<button data-unit-type="${i}" title="Inspect ${u.name}"><i class="${i < 3 ? 'roman' : 'gaul'}"></i>${u.name}${icon('chevron')}</button>`).join('')}</div></div>
    <details class="diagnostics"><summary>Diagnostics <span id="fps">— fps</span></summary><dl><dt>Simulation tick</dt><dd id="diag-tick">0</dd><dt>Worker tick cost</dt><dd id="diag-cost">—</dd><dt>State fingerprint</dt><dd id="diag-hash">—</dd><dt>Draw calls</dt><dd id="diag-draws">—</dd><dt>Projectiles</dt><dd id="diag-projectiles">0</dd><dt>Largest spatial cell</dt><dd id="diag-cell">—</dd></dl><p>Measured on your device. This prototype is not a qualified 2,000-unit performance result.</p></details>
  </aside>
</main><div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let config = validateConfig(DEFAULT_CONFIG),
  session = 0,
  running = false,
  replaying = false,
  selected = config.romans.count - 1;
let summary: BattleSummary | null = null,
  lastData = new Int32Array(0),
  renderer: Battlefield | null = null;
let simMs = 0,
  speed = 1,
  toastTimer: ReturnType<typeof setTimeout>;
const worker = new Worker(new URL('./platform/battle.worker.ts', import.meta.url), {
  type: 'module',
});
const send = (message: ToWorker) => worker.postMessage(message);
const commands = new CommandPanel(
  $('command-panel'),
  (order) => send({ kind: 'order', session, order }),
  (active) => renderer?.setPlacement(active),
  (team, group) => renderer?.setCommandSelection(team, group),
);
function toast(text: string): void {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 6500);
}
function readConfig(): BattleConfig {
  const army = (team: 'romans' | 'gauls') => ({
    count: Number($<HTMLInputElement>(`${team}-count`).value),
    skirmishers: Number($<HTMLInputElement>(`${team}-mix`).value),
    doctrine: $<HTMLSelectElement>(`${team}-doctrine`).value as Doctrine,
    formations: Array.from(
      $(`${team}-formations`).querySelectorAll<HTMLElement>('[data-formation-id]'),
    ).map((row) => ({
      id: Number(row.dataset.formationId),
      role: row.querySelector<HTMLSelectElement>('select')!.value as FormationRole,
      reserve: row.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
      weight: Number(row.querySelector<HTMLInputElement>('input[type="number"]')!.value),
    })),
  });
  return validateConfig({
    seed: Number($<HTMLInputElement>('seed').value),
    terrain: $<HTMLSelectElement>('terrain').value,
    romans: army('romans'),
    gauls: army('gauls'),
  });
}
function writeConfig(): void {
  for (const team of ['romans', 'gauls'] as const) {
    $<HTMLInputElement>(`${team}-count`).value = String(config[team].count);
    $<HTMLInputElement>(`${team}-mix`).value = String(config[team].skirmishers);
    $<HTMLSelectElement>(`${team}-doctrine`).value = config[team].doctrine;
    const roster = formationRoster(config[team]);
    $(`${team}-formations`).innerHTML =
      `<div class="formation-builder-heading">Formations <small>${roster.length}/5</small></div>${roster.map((f) => `<div class="formation-row" data-formation-id="${f.id}"><b>${f.id + 1}</b><select aria-label="${team} formation ${f.id + 1} role"><option value="infantry" ${f.role === 'infantry' ? 'selected' : ''}>Infantry</option><option value="ranged" ${f.role === 'ranged' ? 'selected' : ''}>Javelineers</option></select><input aria-label="${team} formation ${f.id + 1} share" title="Relative share within this troop role" type="number" min="1" max="100" value="${f.weight}" /><output title="Assigned soldiers, including commander">${f.count}</output><input type="checkbox" title="Deploy behind the line and hold as a reserve" aria-label="${team} formation ${f.id + 1} reserve" ${f.reserve ? 'checked' : ''} /><button type="button" data-remove-formation="${f.id}" data-team="${team}" aria-label="Remove ${team} formation ${f.id + 1}">×</button></div>`).join('')}<button type="button" data-add-formation="${team}" ${roster.length === 5 ? 'disabled' : ''}>+ Add formation</button><small>Share divides troops of the same role. Right number: soldiers. Check the box to hold as a rear reserve.</small>`;
  }
  $<HTMLInputElement>('seed').value = String(config.seed);
  $<HTMLSelectElement>('terrain').value = config.terrain;
  const preset = SCENARIOS.find(
    (s) => JSON.stringify(validateConfig(s.config)) === JSON.stringify(config),
  );
  $<HTMLSelectElement>('scenario').value = preset?.id ?? 'custom';
  $('scenario-detail').textContent =
    preset?.description ?? 'Your army sizes, doctrines, terrain and seed.';
  updateRoster();
}
function updateRoster(): void {
  for (const team of ['romans', 'gauls'] as const) {
    const a = config[team],
      ranged = Math.floor(((a.count - 1) * a.skirmishers) / 100);
    $(`${team}-mix-value`).textContent = `${a.skirmishers}%`;
    $(`${team}-infantry-count`).textContent = `${a.count - 1 - ranged} infantry`;
    $(`${team}-ranged-count`).textContent = `${ranged} javelineers + 1 leader`;
  }
  $('scale-note').textContent =
    config.romans.count + config.gauls.count > 1000
      ? 'Large-army experiment · watch Diagnostics'
      : 'Early unit models · no direct hero control';
  $('location').textContent = {
    meadow: 'Open meadow',
    crossroads: 'Old crossroads',
    'rocky-pass': 'Rocky passage',
  }[config.terrain];
}
function deploy(newConfig: BattleConfig = config): void {
  config = validateConfig(newConfig);
  session++;
  running = false;
  replaying = false;
  summary = null;
  lastData = new Int32Array(0);
  speed = 1;
  selected = config.romans.count - 1;
  writeConfig();
  $('viewport').classList.remove('inspecting');
  commands.cancelPlacement();
  renderer?.configure(config);
  renderer?.select(selected);
  $('result').hidden = true;
  $('loading').hidden = false;
  $('loading').textContent = 'Deploying armies…';
  send({ kind: 'init', session, protocol: PROTOCOL_VERSION, config });
  updateControls();
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => {
    b.classList.toggle('active', b.dataset.speed === '1');
    b.setAttribute('aria-pressed', String(b.dataset.speed === '1'));
  });
}
function updateControls(): void {
  $<HTMLFieldSetElement>('setup-fields').disabled =
    running || replaying || (summary?.tick ?? 0) > 0;
  $<HTMLButtonElement>('start').disabled =
    replaying || (summary?.winner !== null && summary?.winner !== undefined) || !summary;
  $('start').innerHTML =
    `${icon(running ? 'pause' : 'play')}<span>${running ? 'Pause battle' : summary?.tick ? 'Resume battle' : 'Begin battle'}</span><kbd>SPACE</kbd>`;
  $<HTMLButtonElement>('step').disabled =
    running || replaying || !summary || summary.winner !== null;
  $<HTMLButtonElement>('export').disabled = replaying || !summary;
  $('battle-status').textContent = replaying
    ? 'VERIFYING'
    : summary?.winner !== null && summary?.winner !== undefined
      ? 'CONCLUDED'
      : running
        ? 'LIVE BATTLE'
        : summary?.tick
          ? 'PAUSED'
          : 'DEPLOYMENT';
  $('battle-status').classList.toggle('live', running);
  $('setup-note').textContent =
    (summary?.tick ?? 0) > 0
      ? 'Reset the battle to change army setup. The same seed repeats the experiment.'
      : 'Changes redeploy the armies. Both commanders are autonomous.';
  $('viewport-note').hidden = (summary?.tick ?? 0) > 0;
  renderer?.setRunning(running);
  commands.update(summary, replaying);
  $('follow').setAttribute('aria-pressed', String(renderer?.isFollowing ?? false));
}
function updateSummary(s: BattleSummary): void {
  summary = s;
  for (const [team, key] of [
    [s.romans, 'roman'],
    [s.gauls, 'gaul'],
  ] as const) {
    $(`${key}-standing`).textContent = String(team.standing);
    $(`${key}-losses`).textContent =
      `${team.fallen} fallen · ${team.routing + team.escaped} routed`;
    $(`${key}-bar`).style.width =
      `${(team.standing / (key === 'roman' ? config.romans.count : config.gauls.count)) * 100}%`;
  }
  const seconds = Math.floor(s.tick / TICK_RATE);
  $('clock').textContent = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  $('latest-event').textContent = s.events.at(-1)?.text ?? 'Armies await orders.';
  $('diag-tick').textContent = String(s.tick);
  $('diag-hash').textContent = s.hash;
  $('diag-cost').textContent = `${simMs.toFixed(2)} ms`;
  $('diag-projectiles').textContent = String(s.projectiles);
  $('diag-cell').textContent = String(s.maxCell);
  if (s.winner !== null) {
    $('result').hidden = false;
    $('result-title').textContent =
      s.winner === -1
        ? 'An unresolved field.'
        : s.winner === 0
          ? 'Rome holds the field.'
          : 'The warband prevails.';
    $('result-detail').textContent =
      `${s.romans.fallen + s.gauls.fallen} fallen · ${s.romans.routing + s.gauls.routing + s.romans.escaped + s.gauls.escaped} routed · ${seconds}s of battle`;
  }
  if (lastData.length) {
    let fighting = 0;
    for (let i = 0; i < lastData[1]; i++)
      if (lastData[3 + i * UNIT_STRIDE + 4] === 1 && lastData[3 + i * UNIT_STRIDE + 19] === 0)
        fighting++;
    const routed = s.romans.routing + s.gauls.routing;
    const phase =
      s.winner !== null
        ? 'CONCLUDED'
        : routed > Math.max(5, (s.romans.standing + s.gauls.standing) * 0.15)
          ? 'LINES BREAKING'
          : fighting > 0
            ? 'CLOSE COMBAT'
            : s.projectiles > 0
              ? 'JAVELIN EXCHANGE'
              : s.tick
                ? 'ADVANCING'
                : 'DEPLOYMENT';
    $('phase-label').textContent = phase;
    $('phase-description').textContent =
      phase === 'CLOSE COMBAT'
        ? 'Shields, stamina and leadership decide the line.'
        : phase === 'LINES BREAKING'
          ? 'Morale collapses. Watch troops leave the field.'
          : phase === 'JAVELIN EXCHANGE'
            ? 'Finite ammunition. Watch the ranged screen.'
            : phase === 'ADVANCING'
              ? 'Disciplined files against a gathering charge.'
              : 'Inspect the commanders. Choose your experiment.';
    drawMinimap($<HTMLCanvasElement>('minimap'), lastData, config, selected, s.formations);
  }
  $('event-list').replaceChildren(
    ...s.events
      .slice(-8)
      .reverse()
      .map((e) => {
        const li = document.createElement('li');
        li.textContent = `${(e.tick / 30).toFixed(1)}s · ${e.text}`;
        return li;
      }),
  );
  if (s.winner !== null)
    $('result-stats').innerHTML =
      `<div><b>Romans</b><span>${s.romans.standing} standing</span><span>${s.romans.damage} damage dealt</span><span>${s.rallies[0]} rallies</span></div><div><b>Gauls</b><span>${s.gauls.standing} standing</span><span>${s.gauls.damage} damage dealt</span><span>${s.rallies[1]} war cries</span></div>`;
  updateControls();
  updateInspector();
}
function selectUnit(id: number): void {
  selected = id;
  renderer?.select(id);
  updateInspector();
}
function updateInspector(): void {
  if (!lastData.length || selected < 0) return;
  const b = 3 + selected * UNIT_STRIDE,
    type = lastData[b + 8],
    design = UNITS[type];
  if (!design) return;
  $('unit-name').textContent = design.name;
  $('unit-description').textContent = design.description;
  $('unit-role').textContent = design.role.toUpperCase();
  $('unit-emblem').className = `unit-emblem ${design.team === 0 ? 'roman' : 'gaul'}`;
  $('unit-state').textContent =
    lastData[b + 2] > 0 && lastData[b + 18] > 0 ? 'Staggered' : STATE_NAMES[lastData[b + 4]];
  $('unit-shield').textContent =
    lastData[b + 17] > 0 ? `${lastData[b + 17]} / ${shieldDurability(type)}` : 'BROKEN';
  $('shield-meter').style.width = `${(lastData[b + 17] / shieldDurability(type)) * 100}%`;
  $('unit-id').textContent = `UNIT #${selected + 1}`;
  $('unit-health').textContent = `${lastData[b + 2]} / ${design.hp}`;
  $('health-meter').style.width = `${(lastData[b + 2] / design.hp) * 100}%`;
  $('unit-morale').textContent = String(lastData[b + 3]);
  $('morale-meter').style.width = `${lastData[b + 3]}%`;
  $('unit-stamina').textContent = String(lastData[b + 10]);
  $('stamina-meter').style.width = `${lastData[b + 10]}%`;
  $('unit-armor').textContent = String(design.armor);
  $('unit-damage').textContent = String(design.damage);
  $('unit-ammo').textContent = design.role === 'skirmisher' ? String(lastData[b + 9]) : '—';
  $('unit-kills').textContent = String(lastData[b + 11]);
  $('unit-support').textContent = `${lastData[b + 14]} nearby allies`;
  $('unit-impact').textContent = `+${Math.trunc(lastData[b + 13] / 6)} damage`;
  $('unit-blocks').textContent = String(lastData[b + 15]);
  $('unit-equipment').replaceChildren(
    ...design.equipment.map((name) => {
      const li = document.createElement('li');
      li.textContent =
        lastData[b + 17] === 0 && /shield|scutum|buckler/i.test(name) ? `${name} (broken)` : name;
      return li;
    }),
  );
  $('unit-ability').textContent = design.ability;
  $('ability-detail').textContent =
    design.role === 'commander'
      ? `14m radius · 12s cadence · ${summary?.rallies[design.team] ?? 0} activations`
      : design.role === 'skirmisher'
        ? 'Limited ammunition · switches to melee'
        : 'Protection and reach follow equipped weapons.';
  $('inspect-roman').classList.toggle('active', design.team === 0);
  $('inspect-gaul').classList.toggle('active', design.team === 1);
}
function downloadReplay(replay: Replay): void {
  const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `banner-band-${replay.config.seed}-tick-${replay.tick}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Replay exported with its exact tick and state fingerprint.');
}
worker.onmessage = (event: MessageEvent<FromWorker>) => {
  const data = event.data;
  if (data.session !== session) return;
  if (data.kind === 'snapshot') {
    running = data.running;
    simMs = data.simMs;
    const view = new Int32Array(data.buffer);
    lastData = new Int32Array(view);
    renderer?.snapshot(view, running);
    worker.postMessage({ kind: 'recycle', session, buffer: data.buffer } satisfies ToWorker, [
      data.buffer,
    ]);
    $('loading').hidden = true;
    renderer?.setFormations(data.summary.formations);
    updateSummary(data.summary);
  } else if (data.kind === 'status') {
    running = data.running;
    renderer?.setFormations(data.summary.formations);
    updateSummary(data.summary);
  } else if (data.kind === 'export') downloadReplay(data.replay);
  else if (data.kind === 'progress') {
    $('loading').hidden = false;
    $('loading').textContent =
      `Replaying tick ${data.tick.toLocaleString()} / ${data.total.toLocaleString()}…`;
  } else if (data.kind === 'verified') {
    replaying = false;
    $('loading').hidden = true;
    updateControls();
    toast(
      data.matches
        ? `Replay verified. State ${data.hash} matches exactly.`
        : `Replay mismatch: expected ${data.expected}, got ${data.hash}.`,
    );
    $('battle-status').textContent = data.matches ? 'REPLAY VERIFIED' : 'REPLAY MISMATCH';
  } else if (data.kind === 'error') {
    running = false;
    replaying = false;
    $('loading').hidden = true;
    updateControls();
    toast(data.message);
  }
};
worker.onerror = () => {
  running = false;
  replaying = false;
  updateControls();
  $('loading').hidden = false;
  $('loading').textContent = 'The simulation worker stopped. Reload to recover.';
};

try {
  renderer = new Battlefield($('viewport'));
  renderer.onSelect = selectUnit;
  renderer.onFormation = (team, id) => commands.selectFormation(team, id);
  renderer.onPlace = (x, z) => commands.place(x, z);
  renderer.onContext = (lost) => {
    if (lost) {
      send({ kind: 'pause', session });
      toast('Graphics context lost. Battle paused.');
    } else toast('Graphics restored. Resume when ready.');
  };
} catch (error) {
  $('loading').textContent =
    'WebGL2 is unavailable. Try a current desktop browser with graphics acceleration enabled.';
  toast(error instanceof Error ? error.message : 'Renderer unavailable.');
}

$('battle-form').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    '[data-add-formation],[data-remove-formation]',
  );
  if (!button || button.disabled) return;
  try {
    const next = readConfig();
    const team = (button.dataset.addFormation ?? button.dataset.team) as 'romans' | 'gauls';
    const list = next[team].formations ?? structuredClone(DEFAULT_FORMATIONS);
    if (button.dataset.addFormation) {
      if (list.length >= 5) return;
      const id = [0, 1, 2, 3, 4].find((id) => !list.some((f) => f.id === id))!;
      list.push({ id, role: 'infantry', weight: 1 });
      next[team].formations = list;
    } else
      next[team].formations = list.filter((f) => f.id !== Number(button.dataset.removeFormation));
    deploy(validateConfig(next));
  } catch (error) {
    toast((error as Error).message);
  }
});
$('try-tactics').addEventListener('click', () =>
  deploy(SCENARIOS.find((s) => s.id === 'hammer')!.config),
);
$('battle-form').addEventListener('submit', (e) => e.preventDefault());
$('battle-form').addEventListener('change', (event) => {
  try {
    const scenario =
      (event.target as HTMLElement).id === 'scenario'
        ? SCENARIOS.find((s) => s.id === $<HTMLSelectElement>('scenario').value)
        : null;
    deploy(scenario?.config ?? readConfig());
  } catch (error) {
    toast((error as Error).message);
  }
});
for (const team of ['romans', 'gauls'])
  $(`${team}-mix`).addEventListener('input', () => {
    $(`${team}-mix-value`).textContent = `${$<HTMLInputElement>(`${team}-mix`).value}%`;
  });
document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach((button) =>
  button.addEventListener('click', () => {
    $<HTMLInputElement>(`${button.dataset.army}-count`).value = button.dataset.count!;
    try {
      deploy(readConfig());
    } catch (error) {
      toast((error as Error).message);
    }
  }),
);
$('new-seed').addEventListener('click', () => {
  $<HTMLInputElement>('seed').value = String((config.seed + 1) >>> 0);
  deploy(readConfig());
});
const toggle = () => {
  if (!summary || replaying || summary.winner !== null) return;
  send({ kind: running ? 'pause' : 'play', session });
};
$('start').addEventListener('click', toggle);
$('reset').addEventListener('click', () => deploy());
$('result-replay').addEventListener('click', () => {
  deploy();
});
$('step').addEventListener('click', () => send({ kind: 'step', session }));
document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) =>
  button.addEventListener('click', () => {
    speed = Number(button.dataset.speed);
    send({ kind: 'speed', session, speed });
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => {
      const active = Number(b.dataset.speed) === speed;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }),
);
$('overview').addEventListener('click', () => {
  renderer?.overview();
  $('viewport').classList.remove('inspecting');
});
$('tactical').addEventListener('click', () => {
  const on = $('tactical').getAttribute('aria-pressed') !== 'true';
  $('tactical').setAttribute('aria-pressed', String(on));
  renderer?.setTactical(on);
});
$('follow').addEventListener('click', () => {
  if (renderer?.isFollowing) renderer.overview();
  else renderer?.followSelected();
  $('follow').setAttribute('aria-pressed', String(renderer?.isFollowing));
});
$('rotate').addEventListener('click', () => renderer?.rotateView());
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector('.battle-panel')?.requestFullscreen();
  } catch {
    toast('Full-screen mode is unavailable in this browser.');
  }
});
$('zoom-in').addEventListener('click', () => renderer?.zoomBy(1.3));
$('zoom-out').addEventListener('click', () => renderer?.zoomBy(1 / 1.3));
$('inspect-roman').addEventListener('click', () => selectUnit(config.romans.count - 1));
$('inspect-gaul').addEventListener('click', () =>
  selectUnit(config.romans.count + config.gauls.count - 1),
);
$('open-workshop').addEventListener('click', async () => {
  send({ kind: 'pause', session });
  const { openWorkshop } = await import('./render/workshop');
  openWorkshop(lastData.length ? lastData[3 + selected * UNIT_STRIDE + 8] : 2);
});
$('focus-unit').addEventListener('click', () => {
  send({ kind: 'pause', session });
  renderer?.focus(selected);
  $('viewport').classList.add('inspecting');
});
document.querySelectorAll<HTMLButtonElement>('[data-unit-type]').forEach((button) =>
  button.addEventListener('click', () => {
    const type = Number(button.dataset.unitType);
    let found = -1;
    for (let i = 0; i < config.romans.count + config.gauls.count; i++)
      if (lastData[3 + i * UNIT_STRIDE + 8] === type && lastData[3 + i * UNIT_STRIDE + 2] > 0) {
        found = i;
        break;
      }
    if (found < 0) {
      toast('No surviving unit of this type. Add javelineers in battle setup if needed.');
      return;
    }
    send({ kind: 'pause', session });
    selectUnit(found);
    renderer?.focus(found);
    $('viewport').classList.add('inspecting');
  }),
);
$('export').addEventListener('click', () => send({ kind: 'export', session }));
$('import').addEventListener('click', () => $<HTMLInputElement>('replay-file').click());
$('replay-file').addEventListener('change', async () => {
  const input = $<HTMLInputElement>('replay-file'),
    file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('Replay files must be smaller than 64 KB.');
    const replay = validateReplay(JSON.parse(await file.text()));
    config = replay.config;
    session++;
    speed = 1;
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => {
      b.classList.toggle('active', b.dataset.speed === '1');
      b.setAttribute('aria-pressed', String(b.dataset.speed === '1'));
    });
    running = false;
    replaying = true;
    summary = null;
    selected = config.romans.count - 1;
    lastData = new Int32Array(0);
    writeConfig();
    renderer?.configure(config);
    renderer?.select(selected);
    $('result').hidden = true;
    $('loading').hidden = false;
    updateControls();
    send({ kind: 'replay', session, protocol: PROTOCOL_VERSION, replay });
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Could not load replay.');
  }
});
document.addEventListener('keydown', (e) => {
  if (commands.handleKey(e)) {
    e.preventDefault();
    return;
  }
  if (
    e.code === 'Space' &&
    !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY'].includes(
      (e.target as HTMLElement).tagName,
    )
  ) {
    e.preventDefault();
    toggle();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) send({ kind: 'pause', session });
});
setInterval(() => {
  if (renderer) {
    $('fps').textContent = running ? `${renderer.fps} fps` : 'Paused';
    $('diag-draws').textContent = String(renderer.renderer.info.render.calls);
  }
}, 1000);
window.addEventListener('pagehide', () => {
  worker.terminate();
  renderer?.dispose();
});
if (renderer) deploy();
else {
  $<HTMLButtonElement>('start').disabled = true;
  $<HTMLButtonElement>('step').disabled = true;
}

// Read-only test/diagnostic surface. No mutation bypasses the worker.
Object.defineProperty(window, 'battleLab', {
  value: {
    get summary() {
      return summary;
    },
    get config() {
      return structuredClone(config);
    },
    get version() {
      return SIM_VERSION;
    },
    get content() {
      return CONTENT_HASH;
    },
    get renderFrames() {
      return renderer?.renderer.info.render.frame ?? 0;
    },
    get running() {
      return running;
    },
  },
});
