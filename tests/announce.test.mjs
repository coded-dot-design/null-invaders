// The announcer (src/announce.ts, fizlet/announce's contract): one polite region, coalescing, rate limit.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { announcer } from "../src/announce.ts";

// Just enough document: elements with attributes, a body, and a log of every region write.
function fakeDoc() {
  const writes = [];
  const body = { children: [], append(el) { this.children.push(el); el.isConnected = true; } };
  const createElement = (tag) => {
    let text = "";
    const el = {
      tag, attrs: {}, style: {}, isConnected: false,
      setAttribute(k, v) { this.attrs[k] = v; },
      remove() { body.children.splice(body.children.indexOf(el), 1); el.isConnected = false; },
      get textContent() { return text; },
      set textContent(v) { text = v; writes.push(v); },
    };
    return el;
  };
  return { body, writes, createElement, querySelector: (s) => (s === "[data-fz-announce]" && body.children.find((e) => "data-fz-announce" in e.attrs)) || null };
}

test("announce: one polite, atomic, visually hidden region, created on the first write", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const doc = fakeDoc(), a = announcer({ doc });
    assert.equal(doc.body.children.length, 0, "nothing before a write");
    a.say("score", "Score 10");
    mock.timers.tick(0);
    const [el] = doc.body.children;
    assert.deepEqual(el.attrs, { "data-fz-announce": "", role: "status", "aria-live": "polite", "aria-atomic": "true" });
    assert.match(el.style.cssText, /position:fixed/);
    assert.match(el.style.cssText, /width:1px;height:1px/);
    assert.match(el.style.cssText, /clip-path:inset\(50%\)/);
    assert.doesNotMatch(el.style.cssText, /display:\s*none/);
    assert.equal(el.textContent, "Score 10");
    // A second announcer shares the region and doesn't remove it.
    const b = announcer({ doc });
    b.say("x", "Hello");
    mock.timers.tick(0);
    assert.equal(doc.body.children.length, 1);
    assert.equal(el.textContent, "Hello");
    b.destroy();
    assert.equal(doc.body.children.length, 1, "only its creator removes the region");
    a.destroy();
    assert.equal(doc.body.children.length, 0);
  } finally {
    mock.timers.reset();
  }
});

test("announce: coalesces by key, at most one write per gap, joined in first-queued order", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const doc = fakeDoc(), a = announcer({ doc, gap: 1 });
    a.say("score", "Score 1");
    a.say("lives", "2 shields left");
    a.say("score", "Score 2"); // replaces the pending score, keeps its place
    mock.timers.tick(0);
    assert.deepEqual(doc.writes, ["Score 2. 2 shields left"]);
    for (let i = 3; i <= 50; i++) a.say("score", `Score ${i}`), mock.timers.tick(10); // 480 ms of rapid changes
    assert.equal(doc.writes.length, 1, "no write inside the gap");
    mock.timers.tick(520);
    assert.deepEqual(doc.writes, ["Score 2. 2 shields left", "Score 50"], "one write, the latest score");
    // The same words again are still re-announced (a trailing space toggles).
    a.say("score", "Score 50");
    mock.timers.tick(1000);
    assert.equal(doc.writes[2], "Score 50 ");
    a.say("score", "Score 50");
    mock.timers.tick(1000);
    assert.equal(doc.writes[3], "Score 50");
    // flush() writes now; destroy() clears what is pending and its timer.
    a.say("status", "Game over");
    a.flush();
    assert.equal(doc.writes[4], "Game over");
    a.say("score", "Score 99");
    a.destroy();
    mock.timers.tick(5000);
    assert.equal(doc.writes.length, 5);
  } finally {
    mock.timers.reset();
  }
});
