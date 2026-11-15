import RBush from 'rbush';
import type { Bounds } from '../math/bounds';
import type { Element, ElementId } from '../model/element';
import { getElementBounds } from '../model/geometry';
import { Emitter } from '../util/emitter';

interface IndexEntry extends Bounds {
  id: ElementId;
}

type SceneEvents = { change: { version: number } };

/**
 * Elementos de la pizarra abierta con un índice espacial (R-tree) para
 * recortar por vista y encontrar rápido qué toca la goma o la selección.
 */
export class Scene {
  private readonly elements = new Map<ElementId, Element>();
  private readonly entries = new Map<ElementId, IndexEntry>();
  private readonly tree = new RBush<IndexEntry>();
  private readonly events = new Emitter<SceneEvents>();
  private maxZ = 0;
  private _version = 0;

  get version(): number {
    return this._version;
  }

  get size(): number {
    return this.elements.size;
  }

  onChange(listener: (e: { version: number }) => void): () => void {
    return this.events.on('change', listener);
  }

  get(id: ElementId): Element | undefined {
    return this.elements.get(id);
  }

  has(id: ElementId): boolean {
    return this.elements.has(id);
  }

  all(): Element[] {
    return sortByZ([...this.elements.values()]);
  }

  nextZ(): number {
    return this.maxZ + 1;
  }

  /** Reemplaza todo el contenido (al abrir una pizarra). */
  load(elements: readonly Element[]): void {
    this.elements.clear();
    this.entries.clear();
    this.tree.clear();
    this.maxZ = 0;
    const entries: IndexEntry[] = [];
    for (const element of elements) {
      this.elements.set(element.id, element);
      const entry = toEntry(element);
      this.entries.set(element.id, entry);
      entries.push(entry);
      this.maxZ = Math.max(this.maxZ, element.z);
    }
    this.tree.load(entries);
    this.bump();
  }

  /** Agrega o reemplaza elementos (por id). */
  upsert(elements: readonly Element[]): void {
    if (elements.length === 0) return;
    for (const element of elements) {
      this.removeFromIndex(element.id);
      this.elements.set(element.id, element);
      const entry = toEntry(element);
      this.entries.set(element.id, entry);
      this.tree.insert(entry);
      this.maxZ = Math.max(this.maxZ, element.z);
    }
    this.bump();
  }

  remove(ids: Iterable<ElementId>): void {
    let changed = false;
    for (const id of ids) {
      if (!this.elements.delete(id)) continue;
      this.removeFromIndex(id);
      changed = true;
    }
    if (changed) this.bump();
  }

  /** Elementos cuya caja toca `bounds`, en orden de dibujo. */
  query(bounds: Bounds): Element[] {
    const found: Element[] = [];
    for (const entry of this.tree.search(bounds)) {
      const element = this.elements.get(entry.id);
      if (element) found.push(element);
    }
    return sortByZ(found);
  }

  private removeFromIndex(id: ElementId): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.tree.remove(entry);
    this.entries.delete(id);
  }

  private bump(): void {
    this._version++;
    this.events.emit('change', { version: this._version });
  }
}

function toEntry(element: Element): IndexEntry {
  return { ...getElementBounds(element), id: element.id };
}

function sortByZ(list: Element[]): Element[] {
  return list.sort((a, b) => a.z - b.z);
}
