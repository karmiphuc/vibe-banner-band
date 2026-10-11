/** Exact integer square root with an integer power-of-two initial bound. */
export function isqrt(n: number): number {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error('isqrt requires a non-negative safe integer.');
  if (n < 2) return n;
  const bits = n < 4294967296 ? 32 - Math.clz32(n) : 64 - Math.clz32(Math.trunc(n / 4294967296));
  let x = 2 ** Math.ceil(bits / 2);
  let next = Math.trunc((x + Math.trunc(n / x)) / 2);
  while (next < x) {
    x = next;
    next = Math.trunc((x + Math.trunc(n / x)) / 2);
  }
  return x;
}
export const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));
export function distance2(ax: number, az: number, bx: number, bz: number): number {
  return (ax - bx) ** 2 + (az - bz) ** 2;
}
export function normalize(x: number, z: number, length: number): [number, number] {
  const d = isqrt(x * x + z * z);
  return d === 0 ? [0, 0] : [Math.trunc((x * length) / d), Math.trunc((z * length) / d)];
}
/** xorshift32, with an explicit nonzero replacement for seed zero. */
export class Random {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
  below(bound: number): number {
    const limit = Math.floor(4294967296 / bound) * bound;
    let n: number;
    do {
      n = this.next();
    } while (n >= limit);
    return n % bound;
  }
}
export function hashWords(words: Iterable<number>, initial = 2166136261): number {
  let h = initial;
  for (const value of words) {
    const u = value >>> 0;
    for (let shift = 0; shift < 32; shift += 8)
      h = Math.imul(h ^ ((u >>> shift) & 255), 16777619) >>> 0;
  }
  return h;
}
export function hashText(text: string): string {
  return hashWords(Array.from(text, (char) => char.charCodeAt(0)))
    .toString(16)
    .padStart(8, '0');
}
