import { SCALE } from '../content/catalog';

/** Stable insertion by ascending entity ID; queries have explicit cell and ID order. */
export class SpatialGrid {
  readonly cellSize = 4 * SCALE;
  private buckets = new Map<number, number[]>();
  private used: number[] = [];
  maxOccupancy = 0;
  private key(x: number, z: number): number {
    return (z + 256) * 1024 + x + 256;
  }
  rebuild(x: Int32Array, z: Int32Array, included: (id: number) => boolean): void {
    for (const key of this.used) this.buckets.get(key)!.length = 0;
    this.used.length = 0;
    this.maxOccupancy = 0;
    for (let i = 0; i < x.length; i++) {
      if (!included(i)) continue;
      const key = this.key(Math.floor(x[i] / this.cellSize), Math.floor(z[i] / this.cellSize));
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = [];
        this.buckets.set(key, bucket);
      }
      if (bucket.length === 0) this.used.push(key);
      bucket.push(i);
      this.maxOccupancy = Math.max(this.maxOccupancy, bucket.length);
    }
  }
  query(x: number, z: number, radius: number, visit: (id: number) => void): void {
    const minX = Math.floor((x - radius) / this.cellSize),
      maxX = Math.floor((x + radius) / this.cellSize);
    const minZ = Math.floor((z - radius) / this.cellSize),
      maxZ = Math.floor((z + radius) / this.cellSize);
    for (let cz = minZ; cz <= maxZ; cz++)
      for (let cx = minX; cx <= maxX; cx++) {
        const bucket = this.buckets.get(this.key(cx, cz));
        if (bucket) for (const id of bucket) visit(id);
      }
  }
}
