import test from 'node:test';
import assert from 'node:assert/strict';
import {randomizeColors,randomFontCandidates,colorSchemes} from '../src/shared/randomize.js';
import {defaultConfig,roles,validateConfig} from '../src/shared/design.js';
import {fonts} from '../src/shared/font-catalog.js';
import {toHSV} from '../src/shared/color.js';
test('random color schemes preserve locked roles, other theme, overrides and provenance',()=>{
 for(const scheme of colorSchemes){const c=structuredClone(defaultConfig);c.overrides.light.focus='#123456';const before=JSON.stringify(c),next=randomizeColors(c,'light',scheme,['primary','text']);validateConfig(next);assert.equal(JSON.stringify(c),before);assert.equal(next.palettes.light.primary,c.palettes.light.primary);assert.equal(next.palettes.light.text,c.palettes.light.text);assert.deepEqual(next.palettes.dark,c.palettes.dark);assert.deepEqual(next.overrides,c.overrides);assert.deepEqual(next.typography,c.typography);assert.notEqual(next.palettes.light.accent,c.palettes.light.accent);}
 assert.deepEqual(randomizeColors(defaultConfig,'dark','triadic',[...roles]),defaultConfig);
 const mono=randomizeColors(defaultConfig,'dark','monochromatic',[]);assert.ok(Math.abs(toHSV(mono.palettes.dark.primary).h-toHSV(mono.palettes.dark.accent).h)<2);
});
test('font filters restrict candidates to actual categories and verified glyph families',()=>{
 assert.deepEqual(randomFontCandidates('',true,true).sort(),['notoSans','notoSerif']);
 assert.deepEqual(randomFontCandidates('serif',true,true),['notoSerif']);assert.deepEqual(randomFontCandidates('display',true,true),[]);
 assert.ok(randomFontCandidates('display',false,true).length>0);assert.equal(randomFontCandidates('display',false,false).length,0);
 for(const id of randomFontCandidates('monospace',false,true))assert.equal(fonts[id].category,'monospace');
 assert.ok(randomFontCandidates('',false,false).every(id=>!id.startsWith('fs-')));
});
