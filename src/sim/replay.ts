import { SIM_VERSION, validateConfig, type BattleConfig } from '../content/catalog';
import { validateOrderLog, type RecordedOrder } from './orders';
import { CONTENT_HASH, MAX_TICKS } from './battle';

export interface Replay {
  format: 'banner-band-replay';
  version: string;
  content: string;
  config: BattleConfig;
  tick: number;
  expectedHash: string;
  orders?: RecordedOrder[];
}
export function validateReplay(input: unknown): Replay {
  if (!input || typeof input !== 'object') throw new Error('Invalid replay file.');
  const data = input as Record<string, unknown>;
  if (
    data.format !== 'banner-band-replay' ||
    data.version !== SIM_VERSION ||
    data.content !== CONTENT_HASH
  )
    throw new Error('This replay uses an incompatible game/content version.');
  if (
    typeof data.tick !== 'number' ||
    !Number.isInteger(data.tick) ||
    data.tick < 0 ||
    data.tick > MAX_TICKS
  )
    throw new Error('Invalid replay length.');
  if (typeof data.expectedHash !== 'string' || !/^[a-f0-9]{8}$/.test(data.expectedHash))
    throw new Error('Invalid replay checksum.');
  return {
    format: 'banner-band-replay',
    version: SIM_VERSION,
    content: CONTENT_HASH,
    config: validateConfig(data.config),
    tick: data.tick,
    expectedHash: data.expectedHash,
    orders: validateOrderLog(data.orders, data.tick),
  };
}
