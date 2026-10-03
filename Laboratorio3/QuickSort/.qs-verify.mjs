import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const targets = await (await fetch('http://127.0.0.1:9226/json/list')).json();
const target = targets.find(item => item.url.includes('/Laboratorio3/QuickSort/'));
assert.ok(target);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
  const request = pending.get(data.id);
  if (!request) return;
  pending.delete(data.id);
  if (data.error) request.reject(data.error); else request.resolve(data.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id;
  pending.set(requestId, { resolve, reject });
  socket.send(JSON.stringify({ id: requestId, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });

async function runCase(input, expected, stepThrough) {
  const get = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (test, label) => {
    const deadline = performance.now() + 16000;
    while (!test()) {
      if (performance.now() > deadline) throw Error('Timeout: ' + label + ' / ' + get('counter').textContent);
      await sleep(20);
    }
  };
  const values = selector => [...document.querySelectorAll(selector)].map(cell => Number(cell.textContent));
  const rows = () => [...document.querySelectorAll('.change-row')].map(row => [...row.querySelectorAll('.tree-number')].map(cell => Number(cell.textContent)));
  await wait(() => !get('start').disabled, 'ready');
  get('array').value = input;
  get('speed').value = '250';
  get('start').click();
  let during = null;
  let first = null;
  let previous = null;
  let next = null;
  if (expected.length > 1 && stepThrough) {
    await wait(() => get('partition-board').classList.contains('is-animating'), 'animation');
    await sleep(90);
    during = { rows: rows(), top: values('.partition-cell'), moving: [...document.querySelectorAll('.partition-cell')].filter(cell => cell.getAnimations().length > 0).length };
    get('pause').click();
    await wait(() => !get('start').disabled, 'pause finished');
    first = { rows: rows(), top: values('.partition-cell'), history: get('history-body').children.length };
    get('previous').click();
    await wait(() => !get('next').disabled, 'previous');
    previous = { rows: rows(), top: values('.partition-cell') };
    get('next').click();
    await wait(() => !get('previous').disabled, 'next');
    next = { rows: rows(), top: values('.partition-cell') };
    get('start').click();
  }
  await wait(() => get('counter').textContent === `Cambio ${expected.length - 1} / ${expected.length - 1}` && !get('start').disabled && get('pause').disabled, 'completed');
  const completed = { rows: rows(), top: values('.partition-cell'), history: get('history-body').children.length, final: get('final-array').textContent, counter: get('counter').textContent };
  if (stepThrough) {
    for (const speed of ['1200', '600', '250']) {
      get('reset').click();
      get('speed').value = speed;
      get('next').click();
      await wait(() => get('partition-board').classList.contains('is-animating'), 'speed animation');
      await sleep(60);
      const animation = document.querySelector('.moved-cell').getAnimations()[0];
      if (animation.effect.getTiming().duration !== Number(speed)) throw Error('Incorrect animation speed');
      await wait(() => !get('previous').disabled, 'speed step completed');
    }
    get('start').click();
    await wait(() => get('pause').disabled && !get('start').disabled, 'resume after speeds');
  }
  return { input, during, first, previous, next, completed };
}

for (const [input, detailed] of [['8,1,2,6,5', true], ['67,9,7,12,15,6,3,1,4,2', false], ['3,1,3,1,2', false], ['1,2,3', false], ['8', false]]) {
  const response = await (await fetch('http://localhost:8080/lab3/quicksort', { method: 'POST', body: new URLSearchParams({ arreglo: input }) })).json();
  const expected = response.estados.filter((values, index, all) => !index || JSON.stringify(values) !== JSON.stringify(all[index - 1]));
  const result = await evaluate(`(${runCase.toString()})(${JSON.stringify(input)}, ${JSON.stringify(expected)}, ${detailed})`);
  assert.deepEqual(result.completed.rows, expected.slice(1));
  assert.deepEqual(result.completed.top, expected.at(-1));
  assert.equal(result.completed.history, expected.length - 1);
  if (detailed) {
    assert.equal(result.during.rows.length, 0);
    assert.deepEqual(result.during.top, expected[0]);
    assert.equal(result.during.moving, 2);
    assert.deepEqual(result.first.rows, [expected[1]]);
    assert.deepEqual(result.previous, { rows: [], top: expected[0] });
    assert.deepEqual(result.next, { rows: [expected[1]], top: expected[1] });
    await evaluate('document.querySelector(".quick-stage").scrollIntoView({block:"start"})');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL('.qs-verify.png', import.meta.url), Buffer.from(screenshot.data, 'base64'));
  }
  console.log(JSON.stringify({ input, changes: expected.length - 1, passed: true, detailed }));
}

const visualResult = await evaluate(`(async () => {
  const get = id => document.getElementById(id);
  const states = [];
  for (const design of ['uni', 'escolar', 'futurista']) {
    get('design').value = design;
    get('design').dispatchEvent(new Event('change'));
    states.push(document.querySelector('.quick-card').dataset.style);
  }
  get('btnThemeToggle').click();
  get('tree-zoom-in').click();
  const zoom = get('tree-zoom-label').textContent;
  get('tree-fit').click();
  await new Promise(resolve => setTimeout(resolve, 100));
  return { designs: states, zoom, fitted: get('tree-fit').classList.contains('active') };
})()`);
assert.deepEqual(visualResult.designs, ['uni', 'escolar', 'futurista']);
assert.equal(visualResult.fitted, true);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate('new Promise(resolve => setTimeout(resolve, 100))');
assert.equal(await evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'), 0);
assert.deepEqual(errors, []);
console.log(JSON.stringify({ controls: visualResult, mobileOverflow: 0, errors }));
socket.close();
