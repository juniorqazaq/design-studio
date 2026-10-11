import test from 'node:test';
import assert from 'node:assert/strict';
import {posix,win32} from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorPaths} from '../src/cli/editor-paths.js';
test('installed editor paths resolve on Windows and POSIX independently of cwd',()=>{
 assert.deepEqual(editorPaths('C:\\tools with spaces\\design-studio\\dist-cli\\cli\\server.js',win32),{toolRoot:'C:\\tools with spaces\\design-studio',root:'C:\\tools with spaces\\design-studio\\dist',compiled:true});
 assert.deepEqual(editorPaths('/tools with spaces/design-studio/dist-cli/cli/server.js',posix),{toolRoot:'/tools with spaces/design-studio',root:'/tools with spaces/design-studio/dist',compiled:true});
 assert.equal(editorPaths('/repo/src/cli/server.ts',posix).root,'/repo');
 assert.equal(editorPaths(fileURLToPath('file:///C:/tools%20with%20spaces/design-studio/dist-cli/cli/server.js',{windows:true}),win32).root,'C:\\tools with spaces\\design-studio\\dist');
});
