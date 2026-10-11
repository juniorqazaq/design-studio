import {writeFile} from 'node:fs/promises';
import {buildRegistry} from '../src/registry/build.js';
import {validatePreset} from '../src/registry/registry.js';
const items=buildRegistry();items.forEach(validatePreset);await writeFile('src/registry/data/presets.json',JSON.stringify(items,null,2)+'\n');console.log(`Built ${items.length} curated original compositions from reviewed snapshots.`);
