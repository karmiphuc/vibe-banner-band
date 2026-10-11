import { isBannerSlot, type BannerSlot } from '../content/banners';
import type { TacticKind, TacticState } from './tactics';
import { TACTICS } from './tactics';
import { ORDER_LIMIT, type Team, type FormationRole } from '../content/catalog';
export type Group = 'all' | number;
export type Formation = 'line' | 'shieldwall' | 'loose' | 'skein';
export type Movement =
  | 'advance'
  | 'charge'
  | 'hold'
  | 'fallback'
  | 'flank-left'
  | 'flank-right'
  | 'skirmish'
  | 'brace';
export type Order = { team: Team; group: Group } & (
  | { kind: Movement; x?: number; z?: number }
  | { kind: 'banner'; item: BannerSlot }
  | { kind: 'tactic'; tactic: TacticKind }
  | { kind: 'formation'; formation: Formation }
  | { kind: 'fire'; enabled: boolean }
  | { kind: 'face'; heading: number }
  | { kind: 'frontage'; files: number }
);
export interface RecordedOrder {
  tick: number;
  sequence: number;
  order: Order;
}
export interface FormationState {
  team: Team;
  id: number;
  role: FormationRole;
  movement: Movement;
  formation: Formation;
  fireAtWill: boolean;
  heading: number;
  files: number;
  strength: number;
  tactic?: TacticState;
  bannerItem?: BannerSlot;
  bannerBearer?: number;
  route: { x: number; z: number }[];
  x: number;
  z: number;
}
export const MAX_ORDERS = 256;
export function validateOrder(input: unknown): Order {
  if (!input || typeof input !== 'object') throw Error('Missing tactical order.');
  const d = input as Record<string, unknown>;
  if (d.team !== 0 && d.team !== 1) throw Error('Unknown army.');
  if (
    d.group !== 'all' &&
    (!Number.isInteger(d.group) || Number(d.group) < 0 || Number(d.group) > 4)
  )
    throw Error('Unknown formation group.');
  const base = { team: d.team as Team, group: d.group as Group };
  if (d.kind === 'face' || d.kind === 'frontage') {
    const value = d.kind === 'face' ? d.heading : d.files;
    if (
      !Number.isInteger(value) ||
      Number(value) < (d.kind === 'face' ? 0 : 2) ||
      Number(value) > (d.kind === 'face' ? 7 : 64)
    )
      throw Error('Invalid facing or frontage.');
    return d.kind === 'face'
      ? { ...base, kind: 'face', heading: Number(value) }
      : { ...base, kind: 'frontage', files: Number(value) };
  }
  if (d.kind === 'banner') {
    if (!isBannerSlot(d.item)) throw Error('Unknown banner equipment.');
    return { ...base, kind: 'banner', item: d.item };
  }
  if (d.kind === 'tactic') {
    if (!TACTICS.includes(d.tactic as TacticKind)) throw Error('Unknown tactic.');
    return { ...base, kind: 'tactic', tactic: d.tactic as TacticKind };
  }
  if (d.kind === 'fire') {
    if (typeof d.enabled !== 'boolean') throw Error('Invalid fire order.');
    return { ...base, kind: 'fire', enabled: d.enabled };
  }
  if (d.kind === 'formation') {
    if (!['line', 'shieldwall', 'loose', 'skein'].includes(d.formation as string))
      throw Error('Unknown formation.');
    return { ...base, kind: 'formation', formation: d.formation as Formation };
  }
  if (
    ![
      'advance',
      'charge',
      'hold',
      'fallback',
      'flank-left',
      'flank-right',
      'skirmish',
      'brace',
    ].includes(d.kind as string)
  )
    throw Error('Unknown movement order.');
  const kind = d.kind as Movement;
  if (d.x !== undefined || d.z !== undefined) {
    if (kind !== 'hold') throw Error('Only placement orders accept coordinates.');
    for (const v of [d.x, d.z])
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || Math.abs(v) > ORDER_LIMIT)
        throw Error('Order position must be within the battlefield.');
    return { ...base, kind, x: d.x as number, z: d.z as number };
  }
  return { ...base, kind };
}
export function validateOrderLog(input: unknown, tick: number): RecordedOrder[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_ORDERS) throw Error('Too many tactical orders.');
  let previousTick = 0;
  return input.map((value, index) => {
    if (!value || typeof value !== 'object') throw Error('Invalid order record.');
    const d = value as Record<string, unknown>;
    if (
      !Number.isSafeInteger(d.tick) ||
      (d.tick as number) < previousTick ||
      (d.tick as number) > tick ||
      d.sequence !== index + 1
    )
      throw Error('Order history is out of sequence.');
    previousTick = d.tick as number;
    return { tick: previousTick, sequence: index + 1, order: validateOrder(d.order) };
  });
}
