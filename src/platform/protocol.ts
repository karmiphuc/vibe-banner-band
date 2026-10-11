import type { BattleConfig } from '../content/catalog';
import type { BattleSummary } from '../sim/battle';
import type { Replay } from '../sim/replay';

export const PROTOCOL_VERSION = 1;
export type ToWorker =
  | { kind: 'init'; session: number; protocol: number; config: BattleConfig }
  | { kind: 'play' | 'pause' | 'step' | 'export'; session: number }
  | { kind: 'speed'; session: number; speed: number }
  | { kind: 'recycle'; session: number; buffer: ArrayBuffer }
  | { kind: 'replay'; session: number; protocol: number; replay: Replay };
export type FromWorker =
  | {
      kind: 'snapshot';
      session: number;
      buffer: ArrayBuffer;
      length: number;
      summary: BattleSummary;
      running: boolean;
      simMs: number;
    }
  | { kind: 'status'; session: number; running: boolean; summary: BattleSummary }
  | { kind: 'export'; session: number; replay: Replay }
  | { kind: 'verified'; session: number; matches: boolean; hash: string; expected: string }
  | { kind: 'progress'; session: number; tick: number; total: number }
  | { kind: 'error'; session: number; message: string };
