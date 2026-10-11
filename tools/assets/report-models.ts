import { createHash } from 'node:crypto';
import {
  ASSET_RECIPE_VERSION,
  JOINTS,
  createCrowdModel,
  createUnitModel,
} from '../../src/render/unit-models';
import { UNITS } from '../../src/content/catalog';
const models = [];
for (let type = 0; type < UNITS.length; type++)
  for (const sidearm of UNITS[type].role === 'skirmisher' ? [false, true] : [false]) {
    for (const lod of ['near', 'crowd'] as const) {
      const generate = () => {
        const model = (lod === 'near' ? createUnitModel : createCrowdModel)(type, sidearm);
        const hash = createHash('sha256').update(JSON.stringify(JOINTS));
        let vertices = 0;
        for (const [name, g] of Object.entries(model.parts)) {
          hash.update(name);
          for (const attribute of ['position', 'normal', 'color']) {
            const data = g.getAttribute(attribute).array;
            hash
              .update(attribute)
              .update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
          }
          vertices += g.getAttribute('position').count;
          g.dispose();
        }
        return { sha256: hash.digest('hex'), triangles: vertices / 3 };
      };
      const a = generate(),
        b = generate();
      if (a.sha256 !== b.sha256) throw Error('Non-repeatable model recipe');
      models.push({ unit: UNITS[type].id, sidearm, lod, ...a, repeatBuild: true });
    }
  }
console.log(
  JSON.stringify(
    {
      recipe: ASSET_RECIPE_VERSION,
      runtime: process.version,
      source: 'src/render/unit-models.ts',
      license: 'Repository GPL v3; geometry authored in this repository',
      coverage:
        'Exact local position/normal/color bytes and joint transforms, pinned toolchain. Not pixel, animation or production-rig qualification.',
      models,
    },
    null,
    2,
  ),
);
