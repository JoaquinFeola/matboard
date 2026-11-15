import type { PathSink } from '../render/strokeOutline';
import type { ShapeSink } from '../render/shapePath';

const n = (value: number) => +value.toFixed(2);

/** Arma el atributo `d` de SVG con la misma interfaz que `Path2D`. */
export class SvgPath implements PathSink, ShapeSink {
  private parts: string[] = [];

  moveTo(x: number, y: number): void {
    this.parts.push(`M${n(x)} ${n(y)}`);
  }
  lineTo(x: number, y: number): void {
    this.parts.push(`L${n(x)} ${n(y)}`);
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.parts.push(`Q${n(cpx)} ${n(cpy)} ${n(x)} ${n(y)}`);
  }
  closePath(): void {
    this.parts.push('Z');
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.parts.push(`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number): void {
    // Dos arcos de media vuelta forman la elipse completa.
    this.parts.push(
      `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0Z`,
    );
  }

  toString(): string {
    return this.parts.join('');
  }
}
