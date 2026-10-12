import { WOODS, FORDS, riverX } from '../content/world';
import { SCALE, UNITS, obstaclesFor, type BattleConfig } from '../content/catalog';
import type { FormationState } from '../sim/orders';
import { State, UNIT_STRIDE } from '../sim/battle';
/** Snapshot-only view. Painting and camera navigation never issue combat commands. */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  data: Int32Array,
  config: BattleConfig,
  selected: number,
  formations: FormationState[] = [],
): void {
  const c = canvas.getContext('2d');
  if (!c || !data.length) return;
  const w = canvas.width,
    h = canvas.height,
    project = (v: number, size: number) => ((v / SCALE + 320) / 640) * size;
  c.fillStyle = '#17241de8';
  c.fillRect(0, 0, w, h);
  if (['river-valley', 'highlands'].includes(config.terrain))
    for (const forest of WOODS) {
      c.fillStyle = '#344c37';
      c.beginPath();
      c.ellipse(
        project(forest.x, w),
        project(forest.z, h),
        (forest.r / SCALE / 640) * w,
        (forest.r / SCALE / 640) * h,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  if (config.terrain === 'river-valley') {
    c.strokeStyle = '#6a939b';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(project(riverX(-320 * SCALE), w), 0);
    c.lineTo(project(riverX(320 * SCALE), w), h);
    c.stroke();
    c.fillStyle = '#c4b88d';
    for (const z of FORDS) c.fillRect(project(riverX(z), w) - 4, project(z, h) - 3, 8, 6);
  }
  c.strokeStyle = '#73816b';
  c.lineWidth = 1;
  c.strokeRect(10, 10, w - 20, h - 20);
  for (const o of obstaclesFor(config.terrain)) {
    c.fillStyle = '#777c6c';
    c.beginPath();
    c.ellipse(
      project(o.x, w),
      project(o.z, h),
      (o.radius / SCALE / 640) * w,
      (o.radius / SCALE / 640) * h,
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
    c.fillStyle =
      state === State.Routing ? '#cfbf8f' : UNITS[data[b + 8]].team === 0 ? '#de8167' : '#86c9b0';
    c.fillRect(project(data[b], w) - 1, project(data[b + 1], h) - 1, 2.4, 2.4);
  }
  for (const f of formations)
    if (f.movement === 'hold' || f.movement === 'fallback') {
      c.strokeStyle = f.team === 0 ? '#eab08d' : '#94d9c1';
      c.setLineDash([2, 2]);
      c.strokeRect(project(f.x, w) - 5, project(f.z, h) - 5, 10, 10);
      c.setLineDash([]);
      c.font = 'bold 10px sans-serif';
      c.fillStyle = c.strokeStyle;
      c.fillText(String(f.id + 1), project(f.x, w) + 7, project(f.z, h) + 3);
    }
  if (selected >= 0) {
    const b = 3 + selected * UNIT_STRIDE;
    c.strokeStyle = '#fff3c2';
    c.beginPath();
    c.arc(project(data[b], w), project(data[b + 1], h), 5, 0, Math.PI * 2);
    c.stroke();
  }
}
