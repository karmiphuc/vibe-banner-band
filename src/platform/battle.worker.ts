/// <reference lib="webworker" />
import { SIM_VERSION, TICK_RATE } from '../content/catalog';
import { Battle, CONTENT_HASH } from '../sim/battle';
import { validateReplay } from '../sim/replay';
import { PROTOCOL_VERSION, type FromWorker, type ToWorker } from './protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let battle: Battle | null = null,
  session = 0,
  running = false,
  speed = 1;
let pool: ArrayBuffer[] = [],
  expectedBytes = 0,
  simMs = 0,
  replaying = false;
const post = (message: FromWorker, transfer: Transferable[] = []) =>
  scope.postMessage(message, transfer);
function snapshot(): void {
  if (!battle || !pool.length) return;
  const buffer = pool.pop()!;
  const length = battle.writeSnapshot(buffer);
  post({ kind: 'snapshot', session, buffer, length, summary: battle.summary(), running, simMs }, [
    buffer,
  ]);
}
function status(): void {
  if (battle) post({ kind: 'status', session, running, summary: battle.summary() });
}
function initialize(config: import('../content/catalog').BattleConfig): void {
  running = false;
  replaying = false;
  battle = new Battle(config);
  speed = 1;
  simMs = 0;
  expectedBytes = battle.snapshotBytes();
  pool = Array.from({ length: 3 }, () => new ArrayBuffer(expectedBytes));
}
scope.onmessage = (event: MessageEvent<ToWorker>) => {
  const data = event.data;
  try {
    if (!data || typeof data !== 'object') return;
    if (data.kind === 'init' || data.kind === 'replay') {
      if (data.protocol !== PROTOCOL_VERSION || !Number.isSafeInteger(data.session))
        throw new Error('Worker protocol mismatch.');
      session = data.session;
      if (data.kind === 'init') {
        initialize(data.config);
        snapshot();
        status();
      } else {
        const replay = validateReplay(data.replay);
        initialize(replay.config);
        replaying = true;
        const replaySession = session;
        let orderIndex = 0;
        const applyOrders = () => {
          while (
            orderIndex < (replay.orders?.length ?? 0) &&
            replay.orders![orderIndex].tick === battle!.tick
          ) {
            battle!.issueOrder(replay.orders![orderIndex].order);
            orderIndex++;
          }
        };
        const advance = () => {
          if (session !== replaySession || !battle || !replaying) return;
          try {
            applyOrders();
            const started = performance.now();
            while (
              battle.tick < replay.tick &&
              battle.winner === null &&
              performance.now() - started < 12
            ) {
              battle.step();
              applyOrders();
            }
            post({ kind: 'progress', session, tick: battle.tick, total: replay.tick });
            if (battle.tick < replay.tick && battle.winner === null) setTimeout(advance, 0);
            else {
              replaying = false;
              const hash = battle.hash();
              snapshot();
              status();
              post({
                kind: 'verified',
                session,
                matches: battle.tick === replay.tick && hash === replay.expectedHash,
                hash,
                expected: replay.expectedHash,
              });
            }
          } catch (error) {
            replaying = false;
            running = false;
            post({
              kind: 'error',
              session,
              message: error instanceof Error ? error.message : 'Replay failed.',
            });
          }
        };
        setTimeout(advance, 0);
      }
      return;
    }
    if (data.session !== session || !battle) return;
    if (data.kind === 'recycle') {
      if (
        data.buffer instanceof ArrayBuffer &&
        data.buffer.byteLength === expectedBytes &&
        pool.length < 3
      )
        pool.push(data.buffer);
      return;
    }
    if (replaying) return;
    switch (data.kind) {
      case 'order':
        battle.issueOrder(data.order);
        snapshot();
        status();
        break;
      case 'play':
        if (battle.winner === null) running = true;
        status();
        break;
      case 'pause':
        running = false;
        snapshot();
        status();
        break;
      case 'step':
        if (!running) {
          battle.step();
          snapshot();
          status();
        }
        break;
      case 'speed':
        if (![1, 2, 4].includes(data.speed)) throw new Error('Unsupported speed.');
        speed = data.speed;
        break;
      case 'export':
        post({
          kind: 'export',
          session,
          replay: {
            format: 'banner-band-replay',
            version: SIM_VERSION,
            content: CONTENT_HASH,
            config: battle.config,
            tick: battle.tick,
            expectedHash: battle.hash(),
            orders: structuredClone(battle.orders),
          },
        });
        break;
    }
  } catch (error) {
    running = false;
    replaying = false;
    post({
      kind: 'error',
      session,
      message: error instanceof Error ? error.message : 'Simulation failed.',
    });
  }
};
setInterval(() => {
  if (!running || !battle || replaying) return;
  try {
    const start = performance.now();
    let steps = 0;
    for (let i = 0; i < speed && battle.winner === null; i++) {
      battle.step();
      steps++;
    }
    simMs = (performance.now() - start) / Math.max(1, steps);
    if (battle.winner !== null) {
      running = false;
      snapshot();
      status();
    } else if (battle.tick % 2 === 0 || speed > 1) snapshot();
  } catch (error) {
    running = false;
    post({
      kind: 'error',
      session,
      message: error instanceof Error ? error.message : 'Simulation failed.',
    });
  }
}, 1000 / TICK_RATE);
