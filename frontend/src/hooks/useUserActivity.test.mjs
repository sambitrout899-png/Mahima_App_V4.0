import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./useUserActivity.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");

function setup(token = "test-token") {
  let cleanup, timer, now = 0, sequence = 0;
  const requests = [], events = new Map();
  const document = { visibilityState: "visible", addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) };
  const window = { ...document, setInterval: fn => { timer = fn; return 1; }, clearInterval: () => { timer = null; } };
  const context = vm.createContext({ document, window, AbortController, API_BASE: "/api",
    Date: { now: () => now }, crypto: { randomUUID: () => `client-${++sequence}` },
    useEffect: fn => { cleanup = fn(); },
    fetch: async (url, options) => { requests.push({ url, ...options }); },
  });
  vm.runInContext(source, context);
  context.useUserActivity(token);
  return { requests, document, events, cleanup, advance: async time => { now = time; await timer?.(); }, flush: () => new Promise(resolve => setImmediate(resolve)) };
}

test("authenticated foreground activity sends heartbeats and pauses in background", async () => {
  const app = setup();
  await app.flush();
  assert.equal(app.requests.length, 1);
  await app.advance(15000);
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[0].body, app.requests[1].body);
  app.document.visibilityState = "hidden";
  app.events.get("visibilitychange")();
  await app.advance(30000);
  assert.equal(app.requests.length, 2);
  app.document.visibilityState = "visible";
  app.events.get("visibilitychange")();
  await app.flush();
  assert.equal(app.requests.length, 3);
  assert.notEqual(app.requests[2].body, app.requests[1].body);
  app.cleanup();
  assert.equal(app.events.size, 0);
  assert.equal(app.requests[0].signal.aborted, true);
});

test("idle cutoff stops tracking and interaction begins a fresh interval", async () => {
  const app = setup();
  await app.flush();
  await app.advance(300000);
  assert.equal(app.requests.length, 1);
  app.events.get("pointerdown")();
  await app.flush();
  assert.equal(app.requests.length, 2);
  assert.notEqual(app.requests[0].body, app.requests[1].body);
  app.cleanup();
});

test("signed-out users are not tracked", () => {
  assert.equal(setup("").requests.length, 0);
});
