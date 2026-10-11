import { SCALE, obstaclesFor, type BattleConfig } from '../content/catalog';
import { State, UNIT_STRIDE } from '../sim/battle';
/** Snapshot-only view. Painting and camera navigation never issue combat commands. */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  data: Int32Array,
  config: BattleConfig,
  selected: number,
): void {
  const c = canvas.getContext('2d');
  if (!c || !data.length) return;
  const w = canvas.width,
    h = canvas.height,
    project = (v: number, size: number) => ((v / SCALE + 72) / 144) * size;
  c.fillStyle = '#17241de8';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#73816b';
  c.lineWidth = 1;
  c.strokeRect(10, 10, w - 20, h - 20);
  for (const o of obstaclesFor(config.terrain)) {
    c.fillStyle = '#777c6c';
    c.beginPath();
    c.ellipse(
      project(o.x, w),
      project(o.z, h),
      (o.radius / SCALE / 144) * w,
      (o.radius / SCALE / 144) * h,
      0,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  for (let i = 0; i < data[1]; i++) {
    const b = 3 + i * UNIT_STRIDE,
      state = data[b + 4];
    if (state >= State.Dead) continue;
    c.fillStyle = state === State.Routing ? '#cfbf8f' : data[b + 8] < 3 ? '#de8167' : '#86c9b0';
    c.fillRect(project(data[b], w) - 1, project(data[b + 1], h) - 1, 2.4, 2.4);
  }
  if (selected >= 0) {
    const b = 3 + selected * UNIT_STRIDE;
    c.strokeStyle = '#fff3c2';
    c.beginPath();
    c.arc(project(data[b], w), project(data[b + 1], h), 5, 0, Math.PI * 2);
    c.stroke();
  }
}
