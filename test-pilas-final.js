const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html' : (ext === '.js' ? 'application/javascript' : (ext === '.css' ? 'text/css' : 'text/plain'));
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(5500, async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9238',
    '--disable-gpu',
    'http://127.0.0.1:5500/Laboratorio4/Pilas/index.html'
  ]);

  await sleep(2000);
  try {
    const r = await fetch('http://127.0.0.1:9238/json/list');
    const list = await r.json();
    const target = list.find(t => t.url.includes('/Laboratorio4/Pilas/index.html'));
    if (!target) throw new Error('Target no encontrado');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    function send(method, params = {}) {
      return new Promise(resolve => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise(res => ws.onopen = res);
    await send('Page.enable');
    await send('DOM.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true });
      return res.result && res.result.result ? res.result.result.value : null;
    }

    async function waitFor(condExpr, maxMs = 8000, interval = 150) {
      const start = Date.now();
      while (Date.now() - start < maxMs) {
        const val = await evaluate(condExpr);
        if (val) return true;
        await sleep(interval);
      }
      return false;
    }

    await sleep(2000);
    console.log('--- 1. Insertar Plaza Inter ---');
    await evaluate(`
      document.getElementById('mall-name-input').value = 'Plaza Inter';
      document.getElementById('btn-push').click();
    `);
    await waitFor(`document.getElementById('capacity-display').textContent.includes('1 / 5')`, 8000);
    const snap1 = await evaluate(`JSON.stringify({
      capacidad: document.getElementById('capacity-display').textContent,
      mensaje: document.getElementById('message').textContent,
      slot0: document.querySelector('.stack-slot[data-index="0"]').textContent.replace(/\\s+/g, ' ').trim(),
      slot0Top: Boolean(document.querySelector('.stack-slot[data-index="0"].is-top'))
    })`);
    console.log('Snap 1:', JSON.parse(snap1));

    console.log('\n--- 2. Insertar Multicentro Las Americas ---');
    await evaluate(`
      document.getElementById('mall-name-input').value = 'Multicentro';
      document.getElementById('btn-push').click();
    `);
    await waitFor(`document.getElementById('capacity-display').textContent.includes('2 / 5')`, 8000);
    const snap2 = await evaluate(`JSON.stringify({
      capacidad: document.getElementById('capacity-display').textContent,
      mensaje: document.getElementById('message').textContent,
      slot0: document.querySelector('.stack-slot[data-index="0"]').textContent.replace(/\\s+/g, ' ').trim(),
      slot1: document.querySelector('.stack-slot[data-index="1"]').textContent.replace(/\\s+/g, ' ').trim(),
      slot1Top: Boolean(document.querySelector('.stack-slot[data-index="1"].is-top'))
    })`);
    console.log('Snap 2:', JSON.parse(snap2));

    console.log('\n--- 3. Consultar Cima (Peek) ---');
    await evaluate(`document.getElementById('btn-peek').click();`);
    await sleep(1500);
    console.log('Peek:', await evaluate(`document.getElementById('message').textContent`));

    console.log('\n--- 4. Eliminar Cima (Pop) ---');
    await evaluate(`document.getElementById('btn-pop').click();`);
    await waitFor(`document.getElementById('capacity-display').textContent.includes('1 / 5')`, 8000);
    const snap3 = await evaluate(`JSON.stringify({
      capacidad: document.getElementById('capacity-display').textContent,
      mensaje: document.getElementById('message').textContent,
      slot0: document.querySelector('.stack-slot[data-index="0"]').textContent.replace(/\\s+/g, ' ').trim(),
      slot0Top: Boolean(document.querySelector('.stack-slot[data-index="0"].is-top')),
      slot1Empty: Boolean(document.querySelector('.stack-slot[data-index="1"] .slot-empty-label'))
    })`);
    console.log('Snap 3 (tras Pop):', JSON.parse(snap3));

    ws.close();
    edge.kill();
    server.close();
    console.log('\nVERIFICACIÓN FINAL EXITOSA');
  } catch (err) {
    console.error(err);
    edge.kill();
    server.close();
  }
});

