import { createHorseModel, createBallistaModel } from '../../src/render/combined-models';
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
  for (const sidearm of ['skirmisher', 'horse-archer'].includes(UNITS[type].role)
    ? [false, true]
    : [false]) {
    for (const brokenShield of [false, true])
      for (const lod of ['near', 'crowd'] as const) {
        const generate = () => {
          const model = (lod === 'near' ? createUnitModel : createCrowdModel)(
            type,
            sidearm,
            brokenShield,
          );
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
        models.push({ unit: UNITS[type].id, sidearm, brokenShield, lod, ...a, repeatBuild: true });
      }
  }
for (const [name, build] of [
  ['horse-near', () => Object.values(createHorseModel())],
  ['horse-crowd', () => Object.values(createHorseModel(true))],
  ['ballista', () => [createBallistaModel()]],
] as const) {
  const generate = () => {
    const hash = createHash('sha256');
    let triangles = 0;
    for (const g of build()) {
      for (const a of ['position', 'normal', 'color']) {
        const v = g.attributes[a].array;
        hash.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
      }
      triangles += (g.index?.count ?? g.attributes.position.count) / 3;
      g.dispose();
    }
    return { sha256: hash.digest('hex'), triangles };
  };
  const a = generate(),
    b = generate();
  if (a.sha256 !== b.sha256) throw Error('Non-repeatable equipment recipe');
  models.push({
    unit: name,
    sidearm: false,
    brokenShield: false,
    lod: 'equipment',
    ...a,
    repeatBuild: true,
  });
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
