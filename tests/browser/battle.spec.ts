import { test, expect } from '@playwright/test';
import { Battle } from '../../src/sim/battle';
import { DEFAULT_CONFIG } from '../../src/content/catalog';
import type { BattleSummary } from '../../src/sim/battle';
import { readdirSync } from 'node:fs';

type LabWindow = Window & {
  battleLab: { summary: BattleSummary | null; running: boolean; renderFrames: number };
};
test('deploy, inspect, pause, step, export/import and verify the worker against headless state', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Begin battle' })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/local/deployment.png', fullPage: true });
  await page.locator('#focus-unit').click();
  await page.screenshot({ path: 'artifacts/local/roman-model.png' });
  await page.locator('#overview').click();
  await page.locator('#inspect-gaul').click();
  await expect(page.locator('#unit-name')).toHaveText('Gallic warlord');
  await page.locator('#focus-unit').click();
  await page.screenshot({ path: 'artifacts/local/gaul-model.png' });
  await page.locator('#overview').click();
  await page.getByRole('button', { name: 'Begin battle' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.summary?.tick ?? 0))
    .toBeGreaterThan(15);
  await page.getByRole('button', { name: 'Pause battle' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.running))
    .toBe(false);
  const paused = await page.evaluate(
    () => (window as unknown as LabWindow).battleLab.summary!.tick,
  );
  await page.getByRole('button', { name: 'Step one tick' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!.tick))
    .toBe(paused + 1);
  const snapshot = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  const headless = new Battle(DEFAULT_CONFIG);
  for (let i = 0; i < snapshot.tick; i++) headless.step();
  expect(snapshot.hash).toBe(headless.hash());
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('#replay-file').setInputFiles(path!);
  await expect(page.locator('#battle-status')).toHaveText('REPLAY VERIFIED', { timeout: 60000 });
  await expect(page.locator('#toast')).toContainText('matches exactly');
  expect(errors).toEqual([]);
});
test('custom setup, invalid import, rocky terrain and responsive layout', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#romans-count').fill('24');
  await page.locator('#romans-count').blur();
  await expect(page.locator('#roman-standing')).toHaveText('24');
  await page.locator('#terrain').selectOption('rocky-pass');
  await expect(page.locator('#location')).toHaveText('Rocky passage');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#replay-file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":"wrong"}'),
  });
  await expect(page.locator('#toast')).toContainText('incompatible');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/local/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('#focus-unit')).toBeVisible();
});

test('worker keeps stepping when snapshot buffers are exhausted and ignores stale sessions', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  const workerFile = readdirSync('dist/assets').find(
    (name) => name.startsWith('battle.worker-') && name.endsWith('.js'),
  )!;
  const result = await page.evaluate(
    async ({ workerFile, config }) => {
      const worker = new Worker(new URL(`assets/${workerFile}`, location.href), { type: 'module' });
      return await new Promise<{ tick: number; snapshots: number }>((resolve, reject) => {
        let snapshots = 0,
          phase = 0;
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker test timed out'));
        }, 10000);
        worker.onmessage = (e) => {
          const m = e.data;
          if (m.kind === 'snapshot') snapshots++; // Intentionally never recycle.
          if (m.kind === 'error') {
            clearTimeout(timeout);
            worker.terminate();
            reject(new Error(m.message));
          }
          if (m.kind === 'status' && phase === 0) {
            phase = 1;
            worker.postMessage({ kind: 'play', session: 999 });
            worker.postMessage({ kind: 'step', session: 77 });
          } else if (m.kind === 'status' && phase === 1) {
            if (m.running || m.summary.tick !== 1) {
              reject(new Error('Stale command affected session'));
              return;
            }
            phase = 2;
            worker.postMessage({ kind: 'play', session: 77 });
            setTimeout(() => worker.postMessage({ kind: 'pause', session: 77 }), 700);
          } else if (m.kind === 'status' && phase === 2 && !m.running) {
            clearTimeout(timeout);
            worker.terminate();
            resolve({ tick: m.summary.tick, snapshots });
          }
        };
        worker.postMessage({ kind: 'init', session: 77, protocol: 6, config });
      });
    },
    {
      workerFile,
      config: {
        ...DEFAULT_CONFIG,
        romans: { ...DEFAULT_CONFIG.romans, count: 12 },
        gauls: { ...DEFAULT_CONFIG.gauls, count: 12 },
      },
    },
  );
  expect(result.snapshots).toBe(3);
  expect(result.tick).toBeGreaterThan(3);
});

test('scenario presets, observer tools and isolated equipment workshop', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('pass');
  await expect(page.locator('#roman-standing')).toHaveText('120');
  await expect(page.locator('#gaul-standing')).toHaveText('180');
  await expect(page.locator('#location')).toHaveText('Rocky passage');
  await page.locator('#tactical').click();
  await expect(page.locator('#tactical')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#rotate').click();
  await page.locator('#follow').click();
  await expect(page.locator('#follow')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#overview').click();
  const map = await page.locator('#minimap').boundingBox();
  expect(map!.height).toBeGreaterThan(80);
  await page.locator('#open-workshop').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#workshop-turntable').uncheck();
  await page.screenshot({ path: 'artifacts/local/workshop-roman.png' });
  await page.locator('#workshop-unit').selectOption('4');
  await page.locator('#workshop-pose').selectOption('guard');
  await page.locator('#workshop-sidearm').check();
  const full = Number(
    (await page.locator('#workshop-metrics').innerText()).replaceAll(',', '').split(' ')[0],
  );
  await page.locator('#workshop-lod').check();
  const low = Number(
    (await page.locator('#workshop-metrics').innerText()).replaceAll(',', '').split(' ')[0],
  );
  expect(low).toBeLessThan(full * 0.35);
  await page.locator('#workshop-unit').selectOption('5');
  await page.locator('#workshop-lod').uncheck();
  await page.screenshot({ path: 'artifacts/local/workshop-gaul.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#open-workshop').click();
  await page.getByRole('button', { name: 'Close model workshop' }).click();
  expect(errors).toEqual([]);
});

test('orders issued paused and in battle survive export/import with their exact state', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#command-group').selectOption('all');
  await page.locator('[data-order="hold"]').click();
  await expect(page.locator('#order-ack')).toContainText('Order 1');
  await page.locator('#command-formation').selectOption('shieldwall');
  await expect(page.locator('#order-ack')).toContainText('Order 2');
  await page.locator('#command-group').selectOption('1');
  await page.locator('#fire-order').click();
  await expect(page.locator('#fire-order')).toHaveText('Fire at will');
  await page.locator('#place-order').click();
  const canvas = page.locator('#viewport > canvas');
  await canvas.click({ position: { x: 370, y: 260 } });
  await expect(page.locator('#order-ack')).toContainText('Order 4');
  await page.screenshot({ path: 'artifacts/local/command-deployment.png' });
  await page.getByRole('button', { name: 'Begin battle' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.summary?.tick ?? 0))
    .toBeGreaterThan(20);
  await page.getByRole('button', { name: 'Pause battle' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.running))
    .toBe(false);
  await page.locator('#command-group').selectOption('0');
  await page.locator('[data-order="charge"]').click();
  await expect(page.locator('#order-ack')).toContainText('Order 5');
  const expected = await page.evaluate(
    () => (window as unknown as LabWindow).battleLab.summary!.hash,
  );
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  await page.locator('#replay-file').setInputFiles(file!);
  await expect(page.locator('#battle-status')).toHaveText('REPLAY VERIFIED', { timeout: 60000 });
  const after = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  expect(after.hash).toBe(expected);
  expect(after.orders.length).toBe(5);
  expect(after.formations[0].movement).toBe('charge');
  expect(after.formations[1].fireAtWill).toBe(false);
  expect(errors).toEqual([]);
});

test('five editable formations command independently and round-trip their deployment', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-add-formation="romans"]').click();
    await expect(page.locator('#romans-formations [data-formation-id]')).toHaveCount(3 + i);
  }
  await expect(page.locator('[data-add-formation="romans"]')).toBeDisabled();
  await page.getByLabel('romans formation 5 share', { exact: true }).fill('3');
  await page.getByLabel('romans formation 5 share', { exact: true }).press('Tab');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#command-group').selectOption('4');
  await page.locator('[data-order="hold"]').click();
  await expect(page.locator('#order-ack')).toContainText('formation 5');
  const state = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  expect(state.formations.filter((f) => f.team === 0)).toHaveLength(5);
  expect(state.formations.find((f) => f.team === 0 && f.id === 4)?.movement).toBe('hold');
  expect(state.formations.find((f) => f.team === 0 && f.id === 0)?.movement).toBe('advance');
  expect(state.formations.filter((f) => f.team === 0).reduce((sum, f) => sum + f.total, 0)).toBe(
    state.romans.standing,
  );
  await page.screenshot({ path: 'artifacts/local/five-formations.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  await page.locator('#replay-file').setInputFiles((await (await download).path())!);
  await expect(page.locator('#battle-status')).toHaveText('REPLAY VERIFIED');
  await expect(page.locator('#romans-formations [data-formation-id]')).toHaveCount(5);
  await expect(page.getByLabel('romans formation 5 share', { exact: true })).toHaveValue('3');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/local/five-formations-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('reserve encounter exposes selectable formations, facing, frontage and replayed flank routes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('frontier');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('hammer');
  await expect(page.locator('#roman-standing')).toHaveText('180');
  await page.waitForTimeout(1000);
  const idleFrames = await page.evaluate(
    () => (window as unknown as LabWindow).battleLab.renderFrames,
  );
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as unknown as LabWindow).battleLab.renderFrames)).toBe(
    idleFrames,
  );
  await expect(page.getByLabel('romans formation 3 reserve', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Select Roman formation 3', exact: true }).click();
  await expect(page.locator('#command-group')).toHaveValue('2');
  await page.locator('#command-facing').selectOption('2');
  await expect(page.locator('#order-ack')).toContainText('Order 1');
  await page.locator('#command-files').fill('6');
  await page.locator('#command-files').press('Tab');
  await expect(page.locator('#order-ack')).toContainText('Order 2');
  await page.locator('#flank-left').click();
  await expect(page.locator('#order-ack')).toContainText('Order 3');
  const state = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  const formation = state.formations.find((f) => f.team === 0 && f.id === 2)!;
  expect(formation.movement).toBe('flank-left');
  expect(formation.route).toHaveLength(1);
  expect(formation.heading).toBe(2);
  expect(formation.files).toBe(6);
  await page.screenshot({ path: 'artifacts/local/tactics4-orders.png' });
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  await page.locator('#replay-file').setInputFiles((await (await download).path())!);
  await expect(page.locator('#battle-status')).toHaveText('REPLAY VERIFIED');
  expect(await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!.hash)).toBe(
    state.hash,
  );
  expect(errors).toEqual([]);
});

test('combined arms expose mounted and siege equipment, terrain and recorded role orders', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#roman-standing')).toHaveText('300');
  await expect(page.locator('#romans-formations [data-formation-id]')).toHaveCount(5);
  await page.locator('#command-group').selectOption('3');
  await page.locator('[data-order="skirmish"]').click();
  await page.locator('#command-group').selectOption('0');
  await page.locator('[data-order="brace"]').click();
  await page.locator('#command-group').selectOption('4');
  await page.locator('[data-order="hold"]').click();
  await expect(page.locator('#order-ack')).toContainText('Order 3');
  await page.locator('#step').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!.tick))
    .toBe(1);
  const state = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  expect(state.engines.length).toBe(10);
  expect(state.formations.find((f) => f.team === 0 && f.id === 0)?.movement).toBe('brace');
  const { SCENARIOS } = await import('../../src/content/scenarios');
  const b = new Battle(SCENARIOS[0].config);
  for (const record of state.orders) b.issueOrder(record.order);
  b.step();
  expect(state.hash).toBe(b.hash());
  await page.locator('#open-workshop').click();
  await page.locator('#workshop-turntable').uncheck();
  for (const type of ['6', '7', '8', '9', '10']) {
    await page.locator('#workshop-unit').selectOption(type);
    await expect(page.locator('#workshop-metrics')).toContainText(
      type === '10' ? '6 parts' : '10 parts',
    );
    await page.screenshot({ path: `artifacts/local/combined-model-${type}.png` });
  }
  await page.locator('#close-workshop').click();
  await page.locator('#reset').click();
  await page.locator('#scenario').selectOption('fords');
  await expect(page.locator('#location')).toHaveText('River frontier');
  await expect(page.locator('#loading')).toBeHidden();
  await page.screenshot({ path: 'artifacts/local/river-frontier.png' });
  expect(errors).toEqual([]);
});

test('maximum capacity deploys 5000 soldiers and steps with bounded snapshot transport', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#scenario').selectOption('maximum');
  await expect(page.locator('#roman-standing')).toHaveText('2500', { timeout: 30000 });
  await expect(page.locator('#gaul-standing')).toHaveText('2500', { timeout: 30000 });
  await page.locator('#step').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!.tick), {
      timeout: 30000,
    })
    .toBe(1);
  const state = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  expect(state.engines.length).toBe(98);
  expect(state.formations.length).toBe(10);
  await page.screenshot({ path: 'artifacts/local/maximum-capacity.png' });
  expect(errors).toEqual([]);
});

test('mixed mounted combat and artillery replay match Node after 300 active ticks', async ({
  page,
}) => {
  const { SCENARIOS } = await import('../../src/content/scenarios');
  const { SIM_VERSION } = await import('../../src/content/catalog');
  const { CONTENT_HASH } = await import('../../src/sim/battle');
  const config = structuredClone(SCENARIOS[0].config);
  config.terrain = 'meadow';
  config.romans.count = config.gauls.count = 60;
  const b = new Battle(config);
  b.issueOrder({ team: 0, group: 2, kind: 'charge' });
  b.issueOrder({ team: 1, group: 4, kind: 'hold' });
  for (let i = 0; i < 300; i++) b.step();
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#replay-file').setInputFiles({
    name: 'combined-v5.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'banner-band-replay',
        version: SIM_VERSION,
        content: CONTENT_HASH,
        config,
        tick: b.tick,
        expectedHash: b.hash(),
        orders: b.orders,
      }),
    ),
  });
  await expect(page.locator('#battle-status')).toHaveText('REPLAY VERIFIED', { timeout: 60000 });
  expect(await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!.hash)).toBe(
    b.hash(),
  );
});

test('mounted formation tactics expose phases, enforce roles and replay identically in the worker', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('[data-tactic="skein-charge"]')).toBeDisabled();
  await page.locator('#command-group').selectOption('2');
  await page.locator('[data-tactic="flank-left"]').click();
  await expect(page.locator('#formation-status')).toContainText('forming');
  await expect(page.locator('#command-formation')).toHaveValue('skein');
  await expect(page.locator('[data-tactic="feint"]')).toBeDisabled();
  await page.locator('#command-group').selectOption('3');
  await page.locator('[data-tactic="feint"]').click();
  await expect(page.locator('#order-ack')).toContainText('Order 2');
  const { SCENARIOS } = await import('../../src/content/scenarios');
  const { SIM_VERSION } = await import('../../src/content/catalog');
  const { CONTENT_HASH } = await import('../../src/sim/battle');
  const config = structuredClone(SCENARIOS[0].config);
  config.terrain = 'meadow';
  config.romans.count = config.gauls.count = 60;
  const b = new Battle(config);
  b.issueOrder({ team: 0, group: 2, kind: 'tactic', tactic: 'flank-left' });
  b.issueOrder({ team: 0, group: 3, kind: 'tactic', tactic: 'feint' });
  b.issueOrder({ team: 1, group: 3, kind: 'tactic', tactic: 'circle-right' });
  for (let i = 0; i < 720; i++) b.step();
  await page
    .locator('#replay-file')
    .setInputFiles({
      name: 'mounted-tactics.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          format: 'banner-band-replay',
          version: SIM_VERSION,
          content: CONTENT_HASH,
          config,
          tick: b.tick,
          expectedHash: b.hash(),
          orders: b.orders,
        }),
      ),
    });
  await expect(page.locator('#battle-status')).toHaveText('REPLAY VERIFIED', { timeout: 60000 });
  const state = await page.evaluate(() => (window as unknown as LabWindow).battleLab.summary!);
  expect(state.hash).toBe(b.hash());
  expect(state.formations.find((f) => f.team === 0 && f.id === 2)?.tactic?.phase).not.toBe(
    'forming',
  );
  await page.locator('#command-group').selectOption('2');
  await page.screenshot({ path: 'artifacts/local/mounted-tactics-v6.png' });
  await page.locator('[data-order="hold"]').click();
  await expect(page.locator('[data-tactic="none"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
