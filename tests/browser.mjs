// The built package in a real browser: play, the page's own clicks and fields, pause, game over,
// touch controls on a phone, and Recall giving the page back byte for byte.
// Run after `npm run build`: node tests/browser.mjs (CHROMIUM_PATH picks a browser binary).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(".");
if (!existsSync("dist/index.js")) throw new Error("Build first: npm run build");
const types = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(root, path === "/" ? "tests/fixtures/page.html" : path);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const snapshot = (page) => page.evaluate(() => document.documentElement.outerHTML);
const state = (page) => page.evaluate(() => window.game.getSnapshot());
// Every text the screen-reader region shows, in order (the region is created on the first write).
const listen = (page) => page.evaluate(() => {
  window.said = [];
  new MutationObserver(() => {
    const t = document.querySelector("[data-fz-announce]")?.textContent;
    if (t && t !== window.said.at(-1)) window.said.push(t);
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
});
// The focused element, through the overlay's shadow root.
const focused = (page) => page.evaluate(() => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return { id: a?.id, key: a?.dataset?.a ?? null, visible: !!a?.matches(":focus-visible") };
});
let where = "start";
try {
  where = "play and recall";
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const before = await snapshot(page);
  await page.evaluate(() => window.launch());
  assert.equal((await state(page)).status, "running");
  assert.equal(await page.locator("[data-fizlet-host=null-invaders]").count(), 1, "the overlay is on the page");
  // Fly up the middle firing: letters turn into bits, a factory takes hits.
  await page.mouse.move(640, 260);
  await page.keyboard.down("Space");
  await page.waitForTimeout(2500);
  await page.keyboard.up("Space");
  let s = await state(page);
  assert.ok(s.score > 0 && s.weaponXP > 0, `scored (${s.score})`);
  assert.match(await page.locator("#board").innerText(), /[01]/, "letters became bits");
  assert.ok(s.board.spent > 0 && s.board.spent <= s.board.indexed, `bits counted (${JSON.stringify(s.board)})`);
  assert.notEqual(await snapshot(page), before, "the page is in play");
  // A click on a link fires instead of following it.
  await page.click("#link");
  assert.ok(!page.url().endsWith("#away"), "links don't navigate while playing");
  // Typing in the page's own field stays the page's: no shots, the text lands.
  await page.click("#field");
  await page.keyboard.type("hi there");
  assert.equal(await page.inputValue("#field"), "hi there");
  await page.locator("#field").blur();
  // Pause and resume (P), then Recall (Escape) gives every letter and button back.
  await page.mouse.move(600, 400);
  await page.keyboard.press("KeyP");
  assert.equal((await state(page)).status, "paused");
  const t = (await state(page)).elapsed;
  await page.waitForTimeout(300);
  assert.equal((await state(page)).elapsed, t, "paused time stands still");
  await page.keyboard.press("KeyP");
  assert.equal((await state(page)).status, "running");
  await page.keyboard.press("Escape");
  assert.equal((await state(page)).status, "idle");
  await page.fill("#field", "");
  assert.equal(await snapshot(page), before, "Recall restores the page exactly");
  assert.deepEqual(errors, []);

  where = "frame time";
  await page.evaluate(() => window.launch());
  await page.mouse.move(640, 300);
  await page.keyboard.down("Space");
  await page.waitForTimeout(3000);
  await page.keyboard.up("Space");
  s = await state(page);
  assert.ok(s.frameMs < 4, `average frame work ${s.frameMs.toFixed(2)} ms`);
  // The 0.7.x snapshot fields the hub reads: board measurements on budget, sparks capped.
  assert.ok(s.board.indexed > 0 && s.board.measurements <= 900, JSON.stringify(s.board));
  assert.ok(s.particles >= 0 && s.particles <= 100);
  await page.evaluate(() => window.game.destroy());
  assert.equal(await page.locator("[data-fizlet-host]").count(), 0);
  await page.close();

  where = "game over";
  // No factories: invaders drop from the top and home in on a ship that never moves or fires.
  const over = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await over.goto(url + "?bare");
  const bare = await snapshot(over);
  await listen(over);
  await over.evaluate(() => window.launch({ controls: "keyboard" }));
  await over.waitForFunction(() => window.game.getSnapshot().status === "gameover", null, { timeout: 60000 });
  s = await state(over);
  assert.equal(s.lives, 0);
  assert.match(await over.locator("[data-fizlet-host]").evaluate((h) => h.shadowRoot.textContent), /GAME OVER/);
  const host = await over.locator("[data-fizlet-host]").count();
  assert.equal(host, 1, "the scoreboard stays with the result");
  // Screen readers heard the shields go and the result; keyboard focus is on Restart.
  const said = await over.evaluate(() => window.said);
  assert.ok(said.some((t) => /\b[0-2] shields? left/.test(t)), JSON.stringify(said));
  assert.match(said.at(-1), /Game over\. Final score \d+/);
  assert.equal((await focused(over)).key, "restart", "the result focuses Restart");
  // Escape still closes the result (the run's keys outlive its engine).
  await over.keyboard.press("Escape");
  assert.equal((await state(over)).status, "idle");
  assert.equal(await snapshot(over), bare, "the page is back after the run ends");
  // A run that fails to start (a bad selector) leaves nothing behind.
  const failed = await over.evaluate(() => {
    try {
      window.launch({ targetSelector: "[[bad" });
      return "started";
    } catch {
      return window.game.getSnapshot().status;
    }
  });
  assert.equal(failed, "idle");
  assert.equal(await snapshot(over), bare, "a failed start changes nothing");
  await over.close();

  where = "keyboard only";
  // Start, fly, fire, pause and resume from the scoreboard, and Recall, with keys alone.
  const kb = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await kb.goto(url);
  await listen(kb);
  await kb.keyboard.press("Tab");
  assert.deepEqual(await focused(kb), { id: "start", key: null, visible: true });
  await kb.keyboard.press("Enter");
  assert.equal((await state(kb)).status, "running");
  await kb.keyboard.down("ArrowUp");
  await kb.keyboard.down("Space");
  await kb.waitForTimeout(1500);
  await kb.keyboard.up("Space");
  await kb.keyboard.up("ArrowUp");
  assert.ok((await state(kb)).score > 0, "keys alone score");
  // Tab reaches the scoreboard's keys, with a visible focus ring.
  let f;
  for (let i = 0; i < 20 && (f = await focused(kb)).key !== "pause"; i++) await kb.keyboard.press("Tab");
  assert.deepEqual(f, { id: "", key: "pause", visible: true });
  await kb.keyboard.press("Enter");
  assert.equal((await state(kb)).status, "paused");
  await kb.waitForTimeout(1100); // one write per second: let "Paused" out before "Resumed" replaces it
  await kb.keyboard.press("Enter");
  assert.equal((await state(kb)).status, "running");
  await kb.waitForTimeout(1200);
  const region = await kb.evaluate(() => {
    const r = document.querySelector("[data-fz-announce]");
    const toast = document.querySelector("[data-fizlet-host]").shadowRoot.querySelector(".msg");
    return { role: r.getAttribute("role"), live: r.getAttribute("aria-live"), atomic: r.getAttribute("aria-atomic"), w: r.getBoundingClientRect().width, regions: document.querySelectorAll("[data-fz-announce]").length, toast: toast.getAttribute("role") };
  });
  assert.deepEqual(region, { role: "status", live: "polite", atomic: "true", w: 1, regions: 1, toast: null }, "one polite region; the toast is not a second one");
  const heard = await kb.evaluate(() => window.said);
  assert.match(heard[0], /^Game started\./);
  assert.ok(heard.includes("Paused") && heard.includes("Resumed") && heard.some((t) => /Score [1-9]\d*/.test(t)), JSON.stringify(heard));
  // Recall: the overlay and the region go, focus returns to what started the game.
  await kb.keyboard.press("Escape");
  assert.equal((await state(kb)).status, "idle");
  assert.equal((await focused(kb)).id, "start", "focus goes back to Play");
  assert.equal(await kb.locator("[data-fz-announce]").count(), 0);
  await kb.close();

  where = "phone";
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  await pp.goto(url);
  await pp.evaluate(() => window.launch());
  assert.equal(await pp.evaluate(() => !!document.querySelector("[data-fizlet-host]").shadowRoot.querySelector(".bui-stick")), true, "the touch stick is there");
  const x0 = (await state(pp)).player.x;
  const stick = await pp.evaluate(() => {
    const r = document.querySelector("[data-fizlet-host]").shadowRoot.querySelector(".bui-stick").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const cdp = await phone.newCDPSession(pp);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
  await touch("touchStart", stick.x, stick.y);
  for (let k = 1; k <= 6; k++) await touch("touchMove", stick.x + k * 10, stick.y);
  await pp.waitForTimeout(600);
  await touch("touchEnd");
  assert.ok((await state(pp)).player.x > x0 + 40, "the stick flies the ship");
  await phone.close();
  console.log("Null Invaders browser: play, links and fields, pause, Recall restores exactly, frame time, game over (announced, Restart focused, Escape closes it), keyboard only (start, play, pause from the scoreboard, Recall returns focus; announcements), failed start leaves nothing, phone stick passed.");
} catch (err) {
  console.error(`browser test failed at: ${where}`);
  throw err;
} finally {
  await browser.close();
  server.close();
}
