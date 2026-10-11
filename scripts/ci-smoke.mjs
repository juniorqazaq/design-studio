import assert from 'node:assert/strict';
import {spawn, execFile} from 'node:child_process';
import {mkdtemp, mkdir, readFile, writeFile, rm, access, rename} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join, resolve, basename} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {promisify} from 'node:util';

// Invoke npm's JS entry point so spaces and Windows .cmd wrappers need no shell.
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this script with npm run ci:smoke (after npm run build).');
const exec = promisify(execFile);
const repository = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'design studio CI '));
let tools = join(temporary, 'tools');
const project = join(temporary, 'website with spaces');
let child, exited, logs = '';
const interrupted = new AbortController();
const onSignal = () => interrupted.abort(new Error('Smoke test interrupted.'));
process.once('SIGINT', onSignal);
process.once('SIGTERM', onSignal);

async function npm(args, cwd) {
  const {stdout} = await exec(process.execPath, [npmCli, ...args], {
    cwd, timeout: 180_000, maxBuffer: 4_000_000, signal: interrupted.signal,
  });
  return stdout;
}

async function freePorts() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const first = createServer(), second = createServer();
    try {
      await new Promise((yes, no) => {first.once('error', no); first.listen(0, '127.0.0.1', yes);});
      const port = first.address().port;
      if (port > 65534) continue;
      await new Promise((yes, no) => {second.once('error', no); second.listen(port + 1, '127.0.0.1', yes);});
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    } finally {
      await Promise.all([first, second].map(server => new Promise(done => server.close(done))));
    }
  }
  throw new Error('Could not find two free consecutive ports.');
}

function launch(executable,port) {
  child = spawn(process.execPath, [executable, '--port', String(port), '--no-open'], {
    cwd: project, stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, TMPDIR: temporary, TEMP: temporary, TMP: temporary, DESIGN_STUDIO_FONT_CACHE: join(temporary, 'font-cache')},
  });
  exited = new Promise((done, fail) => {child.once('error', fail); child.once('exit', (code, signal) => done({code, signal}));});
  // Attach immediately, including before the first HTTP request.
  void exited.catch(() => {});
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {logs = (logs + chunk).slice(-64_000);});
}
async function stopCLI(){if(!child)return;child.kill('SIGTERM');if(await Promise.race([exited.then(()=>true),delay(5000).then(()=>false)])===false){child.kill('SIGKILL');await exited;}child=undefined;}

async function get(url) {
  const response = await fetch(url, {signal: AbortSignal.any([interrupted.signal, AbortSignal.timeout(5000)])});
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return response;
}

try {
  await Promise.all([tools, project].map(path => mkdir(path)));
  const packed = JSON.parse(await npm(['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], repository));
  assert.equal(packed.length, 1);
  const filename = packed[0].filename;
  assert.equal(basename(filename), filename, 'npm pack must return a tarball filename.');
  assert.ok(filename.endsWith('.tgz'));
  const tarball = join(temporary, filename);
  await access(tarball);
  await npm(['install', '--prefix', tools, '--no-audit', '--no-fund', tarball], tools);
  const moved=join(temporary,'relocated tools with spaces');await rename(tools,moved);tools=moved;
  const installed = join(tools, 'node_modules', packed[0].name);
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(typeof manifest.bin['design-studio'], 'string');
  const executable = resolve(installed, manifest.bin['design-studio']);
  const {stdout: help} = await exec(process.execPath, [executable, '--help'], {
    cwd: tools, timeout: 30_000, signal: interrupted.signal,
  });
  assert.match(help, /Design Studio/);
  assert.match(help, /Usage: design-studio/);

  const lock = JSON.parse(await readFile(join(repository, 'package-lock.json'), 'utf8'));
  const dependencies = Object.fromEntries(['react', 'react-dom', 'vite'].map(name => [name, lock.packages[`node_modules/${name}`].version]));
  await writeFile(join(project, 'package.json'), JSON.stringify({name: 'ci-website', private: true, type: 'module', scripts:{dev:'vite',build:'vite build'}, dependencies}));
  await writeFile(join(project, 'index.html'), '<html><head><title>CI actual website</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>');
  await mkdir(join(project, 'src'));
  const source = "import React from 'react';import {createRoot} from 'react-dom/client';import './tokens.css';createRoot(document.getElementById('root')).render(<><h1>My actual website</h1><button>Real action</button></>);";
  const css = ':root {--text:#111111;--background:#fff;--primary:#356854;}body {color:var(--text);background:var(--background);}button{background:var(--primary);}';
  await writeFile(join(project, 'src/main.jsx'), source);
  await writeFile(join(project, 'src/tokens.css'), css);
  await npm(['install', '--no-audit', '--no-fund'], project);

  const port = await freePorts(), origin = `http://127.0.0.1:${port}`;
  launch(executable,port);
  let html, lastError;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    interrupted.signal.throwIfAborted();
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Installed CLI exited early.\n${logs}`);
    try {html = await (await get(origin)).text(); break;} catch (error) {lastError = error;}
    await delay(250, undefined, {signal: interrupted.signal});
  }
  assert.ok(html, `Editor did not become ready in 60 seconds: ${lastError}`);
  assert.match(html, /Design Studio/);
  assert.doesNotMatch(html, /src\/web\//);
  const assets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(match => match[1]);
  assert.ok(assets.some(path => path.endsWith('.js')), 'Missing built editor JS.');
  assert.ok(assets.some(path => path.endsWith('.css')), 'Missing built editor CSS.');
  for (const path of assets) {
    const response = await get(origin + path), body = await response.text();
    assert.ok(body.length > 0, `Empty editor asset: ${path}`);
    assert.doesNotMatch(response.headers.get('content-type') ?? '', /text\/html/, `Asset returned HTML: ${path}`);
  }
  assert.match(await (await get(origin + '/@vite/client')).text(), /WebSocket/, 'Vite client must also be accessible.');
  for (const name of ['design-studio-logo.png', 'design-studio-favicon.png']) {
    const expected = await readFile(join(repository, 'public', name));
    assert.deepEqual(await readFile(join(installed, 'dist', name)), expected, `Missing or changed packaged branding: ${name}`);
    assert.deepEqual(Buffer.from(await (await get(origin + '/' + name)).arrayBuffer()), expected, `Branding not served correctly: ${name}`);
  }
  assert.match(html, /rel="icon" href="\/design-studio-favicon\.png"/);
  const font = Buffer.from(await (await get(origin + '/fonts/noto-sans-latin-400-normal.woff2')).arrayBuffer());
  assert.equal(font.subarray(0, 4).toString(), 'wOF2', 'Bundled font missing from package.');
  const report = await (await get(origin + '/api/project')).json();
  assert.equal(report.name, 'ci-website');
  assert.equal(report.config.tokenMappings.primary,'--primary');
  assert.equal(report.config.tokenMappings.background,'--background');
  assert.equal(report.preview?.url, `http://127.0.0.1:${port + 1}`, report.preview?.reason);
  assert.match(await (await get(report.preview.url)).text(), /CI actual website/);
  assert.match(await (await get(report.preview.url + '/src/main.jsx')).text(), /My actual website/);
  assert.equal(await readFile(join(project, 'src/main.jsx'), 'utf8'), source);
  assert.equal(await readFile(join(project, 'src/tokens.css'), 'utf8'), css);
  if(process.argv.includes('--browser')){const {verifyBrowserWorkflow}=await import('./browser-workflow.mjs');await verifyBrowserWorkflow({origin,project,installed,port,stopCLI,restartCLI:()=>launch(executable,port),npm,interrupted});}
  console.log(`Packaged CLI passed on ${process.platform}, Node ${process.version}: ${filename}, help, built editor assets, bundled font, actual React/Vite preview, project preserved.`);
} catch (error) {
  if (logs) console.error(logs);
  throw error;
} finally {
  try {
    await stopCLI();
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await rm(temporary, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  }
}
