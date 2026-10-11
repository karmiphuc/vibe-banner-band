import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createUnitModel } from '../src/render/unit-models';

test('all six original articulated recipes have repeatable finite geometry and equipment bounds', () => {
  const signatures = new Set<string>();
  for (let type = 0; type < 6; type++) {
    const build = () => {
      const model = createUnitModel(type),
        hash = createHash('sha256');
      let vertices = 0;
      for (const [name, geometry] of Object.entries(model.parts)) {
        geometry.computeBoundingBox();
        assert(geometry.boundingBox);
        const positions = geometry.getAttribute('position');
        const colors = geometry.getAttribute('color');
        assert.equal(positions.count, colors.count);
        for (const value of positions.array) assert(Number.isFinite(value));
        hash.update(name);
        hash.update(new Uint8Array(positions.array.buffer));
        hash.update(new Uint8Array(colors.array.buffer));
        vertices += positions.count;
        if (name === 'body') {
          assert(geometry.boundingBox.max.y > 1.7);
          assert(geometry.boundingBox.max.y < 2.5);
        }
        geometry.dispose();
      }
      assert(vertices > 1000 && vertices < 30000);
      return hash.digest('hex');
    };
    const signature = build();
    assert.equal(signature, build());
    signatures.add(signature);
  }
  assert.equal(signatures.size, 6);
});

test('crowd LOD reduces geometry while keeping every articulated equipment part', async () => {
  const { createCrowdModel } = await import('../src/render/unit-models');
  for (let type = 0; type < 6; type++)
    for (const sidearm of [false, true]) {
      const near = createUnitModel(type, sidearm),
        far = createCrowdModel(type, sidearm);
      assert.deepEqual(Object.keys(far.parts), Object.keys(near.parts));
      const vertices = (model: typeof near) =>
        Object.values(model.parts).reduce((sum, g) => sum + g.getAttribute('position').count, 0);
      assert(vertices(far) < vertices(near) * 0.35);
      for (const geometry of [...Object.values(near.parts), ...Object.values(far.parts)])
        geometry.dispose();
    }
});
