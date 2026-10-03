import { writeFile } from "node:fs/promises";

const endpoint = "http://127.0.0.1:9223/json/list";
let page;
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const pages = await fetch(endpoint).then(response => response.json());
    page = pages.find(item => item.type === "page" && item.url.includes(".video-analysis/index.html"));
    if (page) break;
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (!page) throw new Error("No se encontró la página de análisis en Chrome.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const response = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

let status = "";
for (let attempt = 0; attempt < 120; attempt += 1) {
  status = await evaluate("document.body.dataset.done || ''");
  if (status) break;
  await new Promise(resolve => setTimeout(resolve, 1000));
}
const text = await evaluate("document.getElementById('result').textContent");
console.log(`STATUS ${status || "timeout"}\n${text}`);
if (status === "true") {
  const dataUrl = await evaluate("document.getElementById('sheet').toDataURL('image/png')");
  await writeFile(new URL("analysis-contact.png", import.meta.url), Buffer.from(dataUrl.split(",")[1], "base64"));
}
socket.close();
