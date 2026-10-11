import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgs} from '../src/cli/index.js';

test('no command defaults to dev and accepts the same launch options',()=>{
  assert.deepEqual(parseArgs([]),{command:'dev',options:{}});
  const options=['--project','/website with spaces','--no-open','--port','4410'];
  assert.deepEqual(parseArgs([...options]),parseArgs(['dev',...options]));
  assert.deepEqual(parseArgs(['dev']),parseArgs([]));
  for(const command of ['inspect','apply','export-skill','presets','preset','registry-validate','rollback','recover','history']) assert.equal(parseArgs([command]).command,command);
  for(const help of ['help','--help','-h']) assert.equal(parseArgs([help]).command,'help');
});

test('implicit dev retains strict option validation',()=>{
  assert.throws(()=>parseArgs(['--port']),/needs a value/);
  assert.throws(()=>parseArgs(['--no-open','--no-open']),/Duplicate/);
  assert.throws(()=>parseArgs(['--config','design.json']),/Unsupported/);
  assert.throws(()=>parseArgs(['unknown']),/Unknown command/);
  assert.throws(()=>parseArgs(['inspect','--no-open']),/Unsupported/);
});
