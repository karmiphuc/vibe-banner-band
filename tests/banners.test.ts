import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BANNERS, type BannerId } from '../src/content/banners';
import { createBannerModel } from '../src/render/banner-model';
import { createUnitModel, createCrowdModel } from '../src/render/unit-models';
import { Battle } from '../src/sim/battle';
import { SCENARIOS } from '../src/content/scenarios';

test('banner items equip atomically before battle and survive checkpoint/replay', () => {
  const config = structuredClone(SCENARIOS[0].config);
  config.romans.count = config.gauls.count = 60;
  const b = new Battle(config);
  for (const [index, f] of b.formations.entries()) {
    assert((f.bannerBearer ?? -1) >= 0);
    assert.equal(b.formationId[f.bannerBearer!], index);
  }
  const initial = b.hash();
  assert.throws(() => b.issueOrder({ team: 0, group: 'all', kind: 'banner', item: 'gaul-boar' }));
  assert.equal(b.hash(), initial);
  assert.throws(() => b.issueOrder({ team: 0, group: 0, kind: 'banner', item: 'unknown' }));
  b.issueOrder({ team: 0, group: 0, kind: 'banner', item: 'roman-vexillum' });
  b.issueOrder({ team: 1, group: 0, kind: 'banner', item: 'none' });
  const restored = Battle.restore(b.checkpoint()),
    replay = new Battle(config);
  for (const o of b.orders) replay.issueOrder(o.order);
  for (let i = 0; i < 120; i++) {
    b.step();
    restored.step();
    replay.step();
  }
  assert.equal(b.hash(), restored.hash());
  assert.equal(b.hash(), replay.hash());
  const started = b.hash();
  assert.throws(() => b.issueOrder({ team: 0, group: 0, kind: 'banner', item: 'none' }));
  assert.equal(b.hash(), started);
});
test('physical standards rebuild identically with finite bounded geometry', () => {
  for (const item of Object.keys(BANNERS) as BannerId[]) {
    const build = () => {
      const h = createHash('sha256');
      let triangles = 0;
      for (const [part, g] of Object.entries(createBannerModel(item))) {
        g.computeBoundingBox();
        assert(g.boundingBox!.max.y < 3.5);
        assert(g.boundingBox!.min.y > -0.8);
        assert(g.boundingBox!.max.x < 0.8);
        assert(g.boundingBox!.min.x > -0.8);
        for (const name of ['position', 'normal', 'color']) {
          const a = g.getAttribute(name);
          for (const v of a.array) assert(Number.isFinite(v));
          h.update(part + name);
          h.update(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength));
        }
        triangles += (g.index?.count ?? g.attributes.position.count) / 3;
        g.dispose();
      }
      assert(triangles < 5000);
      return h.digest('hex');
    };
    assert.equal(build(), build());
  }
});
test('carrying a standard frees the weapon hand in both detail levels', () => {
  for (const make of [createUnitModel, createCrowdModel])
    for (const type of [0, 3, 6, 7, 8, 9]) {
      const normal = make(type),
        bearer = make(type, false, false, true);
      assert(
        bearer.parts.rightArm.attributes.position.count <
          normal.parts.rightArm.attributes.position.count,
      );
      assert(bearer.parts.rightArm.attributes.position.count > 0);
      for (const g of [...Object.values(normal.parts), ...Object.values(bearer.parts)]) g.dispose();
    }
});
