import { UNIT_STRIDE, PROJECTILE_STRIDE, State } from '../sim/battle';
import { ENGINE_STRIDE } from '../sim/siege';
/** Optional synthesized observer sound; consumes snapshots, never changes authority. */
export class BattleAudio {
  private context?: AudioContext;
  private previous: Int32Array = new Int32Array(0);
  private lastTick = -1;
  enabled = false;
  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.context ??= new AudioContext();
      await this.context.resume();
    }
    return this.enabled;
  }
  private sound(frequency: number, duration: number, gain: number, pan: number): void {
    const c = this.context;
    if (!c) return;
    const o = c.createOscillator(),
      g = c.createGain(),
      p = c.createStereoPanner();
    o.type = 'triangle';
    o.frequency.setValueAtTime(frequency, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(frequency * 0.35, c.currentTime + duration);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    p.pan.value = pan;
    o.connect(g).connect(p).connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  update(data: Int32Array, running: boolean): void {
    if (!this.enabled || !running || data[0] === this.lastTick) {
      this.previous = data;
      this.lastTick = data[0];
      return;
    }
    const valid = this.previous.length === data.length && data[0] > this.lastTick;
    let sounds = 0;
    if (valid)
      for (let i = 0; i < data[1] && sounds < 5; i++) {
        const b = 3 + i * UNIT_STRIDE;
        if (data[b + 4] >= State.Dead) continue;
        const pan = Math.max(-1, Math.min(1, data[b] / 150000));
        if (data[b + 15] > this.previous[b + 15]) {
          this.sound(900, 0.08, 0.018, pan);
          sounds++;
        } else if (data[b + 2] < this.previous[b + 2]) {
          this.sound(150, 0.11, 0.025, pan);
          sounds++;
        } else if (data[b + 21] > 0 && data[b + 22] > 100 && (data[0] + i) % 18 < 3) {
          this.sound(75, 0.05, 0.008, pan);
          sounds++;
        }
      }
    const start = 3 + data[1] * UNIT_STRIDE + data[2] * PROJECTILE_STRIDE,
      old = 3 + this.previous[1] * UNIT_STRIDE + this.previous[2] * PROJECTILE_STRIDE;
    if (valid)
      for (let i = 0; i < data[start]; i++)
        if (
          data[start + 1 + i * ENGINE_STRIDE + 7] > this.previous[old + 1 + i * ENGINE_STRIDE + 7]
        ) {
          this.sound(65, 0.35, 0.06, 0);
          break;
        }
    this.previous = data;
    this.lastTick = data[0];
  }
}
