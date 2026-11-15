import type { ElementId } from '../model/element';
import { Emitter } from '../util/emitter';

type SelectionEvents = { change: ReadonlySet<ElementId> };

/** Ids seleccionados. Se notifica cada cambio para que la UI y el overlay se actualicen. */
export class Selection {
  private ids = new Set<ElementId>();
  private readonly events = new Emitter<SelectionEvents>();

  get current(): ReadonlySet<ElementId> {
    return this.ids;
  }

  get size(): number {
    return this.ids.size;
  }

  has(id: ElementId): boolean {
    return this.ids.has(id);
  }

  onChange(listener: (ids: ReadonlySet<ElementId>) => void): () => void {
    return this.events.on('change', listener);
  }

  set(ids: Iterable<ElementId>): void {
    const next = new Set(ids);
    if (sameSet(next, this.ids)) return;
    this.ids = next;
    this.events.emit('change', this.ids);
  }

  toggle(id: ElementId): void {
    const next = new Set(this.ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.set(next);
  }

  clear(): void {
    this.set([]);
  }

  /** Quita ids que ya no existen (p. ej. tras deshacer). */
  retain(exists: (id: ElementId) => boolean): void {
    this.set([...this.ids].filter(exists));
  }
}

function sameSet<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}
