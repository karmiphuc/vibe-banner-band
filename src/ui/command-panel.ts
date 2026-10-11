import type { BattleSummary } from '../sim/battle';
import type { Formation, Group, Movement, Order } from '../sim/orders';
import type { Team } from '../content/catalog';

export class CommandPanel {
  private summary: BattleSummary | null = null;
  private armed = false;
  private available = false;
  constructor(
    private root: HTMLElement,
    private issue: (order: Order) => void,
    private placement: (active: boolean) => void,
  ) {
    root.innerHTML = `<div class="command-heading"><span>FORMATION ORDERS</span><small id="order-ack">Choose an army and formation. Commanders fight autonomously.</small></div><div class="command-row"><label class="sr-only" for="command-team">Command army</label><select id="command-team"><option value="0">Romans</option><option value="1">Gauls</option></select><label class="sr-only" for="command-group">Command group</label><select id="command-group"><option value="all">0 · All troops</option></select><div class="movement-orders">${(['advance', 'hold', 'charge', 'fallback'] as const).map((m, i) => `<button type="button" data-order="${m}" aria-pressed="false" title="${['V', 'H', 'C', 'B'][i]}">${['Advance', 'Hold here', 'Charge', 'Fall back'][i]}<kbd>${['V', 'H', 'C', 'B'][i]}</kbd></button>`).join('')}</div><button id="place-order" type="button" aria-pressed="false">Place line ↗</button></div><div class="command-row command-secondary"><label for="command-formation">Formation</label><select id="command-formation"><option value="line">Line</option><option value="shieldwall">Shield wall</option><option value="loose">Loose</option><option value="" disabled>Mixed formations</option></select><button id="fire-order" type="button" aria-pressed="false">Hold fire</button><span id="formation-status">—</span></div>`;
    this.el<HTMLSelectElement>('command-team').addEventListener('change', () => {
      this.cancelPlacement();
      this.paint();
    });
    this.el<HTMLSelectElement>('command-group').addEventListener('change', () => {
      this.cancelPlacement();
      this.paint();
    });
    root
      .querySelectorAll<HTMLButtonElement>('[data-order]')
      .forEach((b) => b.addEventListener('click', () => this.move(b.dataset.order as Movement)));
    this.el('place-order').addEventListener('click', () => {
      if (!this.available) return;
      this.armed = !this.armed;
      this.placement(this.armed);
      this.paint();
    });
    this.el<HTMLSelectElement>('command-formation').addEventListener('change', () =>
      this.issue({
        ...this.selection(),
        kind: 'formation',
        formation: this.el<HTMLSelectElement>('command-formation').value as Formation,
      }),
    );
    this.el('fire-order').addEventListener('click', () => {
      const selected = this.selected();
      this.issue({
        ...this.selection(),
        kind: 'fire',
        enabled: !selected.every((f) => f.fireAtWill),
      });
    });
  }
  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    return this.root.querySelector<T>(`#${id}`)!;
  }
  private selection(): { team: Team; group: Group } {
    return {
      team: Number(this.el<HTMLSelectElement>('command-team').value) as Team,
      group:
        this.el<HTMLSelectElement>('command-group').value === 'all'
          ? 'all'
          : Number(this.el<HTMLSelectElement>('command-group').value),
    };
  }
  private selected() {
    const { team, group } = this.selection();
    return (
      this.summary?.formations.filter(
        (f) => f.team === team && (group === 'all' || f.id === group),
      ) ?? []
    );
  }
  private move(kind: Movement): void {
    if (!this.available) return;
    this.cancelPlacement();
    this.issue({ ...this.selection(), kind });
  }
  cancelPlacement(): void {
    this.armed = false;
    this.placement(false);
    this.paint();
  }
  place(x: number, z: number): void {
    if (!this.armed || !this.available) return;
    this.issue({ ...this.selection(), kind: 'hold', x, z });
    this.cancelPlacement();
  }
  update(summary: BattleSummary | null, replaying: boolean): void {
    this.summary = summary;
    this.available = !!summary && summary.winner === null && !replaying;
    if (!this.available && this.armed) {
      this.armed = false;
      this.placement(false);
    }
    this.paint();
  }
  private paint(): void {
    const select = this.el<HTMLSelectElement>('command-group'),
      previous = select.value;
    const team = Number(this.el<HTMLSelectElement>('command-team').value);
    const formations = (this.summary?.formations ?? []).filter((f) => f.team === team);
    const keys = formations.map((f) => String(f.id)).concat('all');
    if (
      Array.from(select.options)
        .map((o) => o.value)
        .join(',') !== keys.join(',')
    ) {
      select.replaceChildren(...keys.map((key) => new Option('', key)));
      select.value = previous;
      if (!select.value) select.value = 'all';
    }
    formations.forEach(
      (f, i) =>
        (select.options[i].textContent =
          `${f.id + 1} · ${f.role === 'ranged' ? 'Javelineers' : 'Infantry'} · ${f.standing}/${f.total}`),
    );
    select.options[select.options.length - 1].textContent = '0 · All troops';

    this.root
      .querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button,select')
      .forEach((e) => (e.disabled = !this.available));
    const selected = this.selected(),
      first = selected[0];
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-order]')
      .forEach((b) =>
        b.setAttribute(
          'aria-pressed',
          String(selected.length > 0 && selected.every((f) => f.movement === b.dataset.order)),
        ),
      );
    this.el('place-order').setAttribute('aria-pressed', String(this.armed));
    this.el('place-order').textContent = this.armed ? 'Click field · Esc cancels' : 'Place line ↗';
    this.el<HTMLSelectElement>('command-formation').value =
      first && selected.every((f) => f.formation === first.formation) ? first.formation : '';
    const firing = selected.every((f) => f.fireAtWill);
    this.el('fire-order').textContent = firing ? 'Hold fire' : 'Fire at will';
    this.el('fire-order').setAttribute('aria-pressed', String(!firing));
    this.el('formation-status').textContent = first
      ? `${selected.every((f) => f.movement === first.movement) ? first.movement : 'mixed orders'} · ${selected.every((f) => f.fireAtWill === first.fireAtWill) ? (first.fireAtWill ? 'weapons free' : 'missiles held') : 'mixed fire discipline'}`
      : '—';
    const last = this.summary?.orders.at(-1);
    this.el('order-ack').textContent = this.armed
      ? 'Click a ground position for the selected formation.'
      : last
        ? `Order ${last.sequence} acknowledged at ${(last.tick / 30).toFixed(1)}s · ${last.order.team === 0 ? 'Roman' : 'Gallic'} ${last.order.group === 'all' ? 'all formations' : `formation ${last.order.group + 1}`}: ${last.order.kind}`
        : 'Choose an army and formation. Commanders fight autonomously.';
  }
  handleKey(event: KeyboardEvent): boolean {
    if (event.code === 'Escape' && this.armed) {
      this.cancelPlacement();
      return true;
    }
    if (
      !this.available ||
      event.repeat ||
      document.querySelector('dialog[open]') ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)
    )
      return false;
    const groups: Record<string, Group> = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '0': 'all' };
    if (
      groups[event.key] !== undefined &&
      Array.from(this.el<HTMLSelectElement>('command-group').options).some(
        (o) => o.value === String(groups[event.key]),
      )
    ) {
      this.el<HTMLSelectElement>('command-group').value = String(groups[event.key]);
      this.cancelPlacement();
      return true;
    }
    const movement: Record<string, Movement> = {
      v: 'advance',
      h: 'hold',
      c: 'charge',
      b: 'fallback',
    };
    if (movement[event.key.toLowerCase()]) {
      this.move(movement[event.key.toLowerCase()]);
      return true;
    }
    return false;
  }
}
