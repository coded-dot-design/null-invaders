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
  await page.evaluate(() => window.game.destroy());
  assert.equal(await page.locator("[data-fizlet-host]").count(), 0);
  await page.close();

  where = "game over";
  // No factories: invaders drop from the top and home in on a ship that never moves or fires.
  const over = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await over.goto(url + "?bare");
  const bare = await snapshot(over);
  await over.evaluate(() => window.launch({ controls: "keyboard" }));
  await over.waitForFunction(() => window.game.getSnapshot().status === "gameover", null, { timeout: 60000 });
  s = await state(over);
  assert.equal(s.lives, 0);
  assert.match(await over.locator("[data-fizlet-host]").evaluate((h) => h.shadowRoot.textContent), /GAME OVER/);
  const host = await over.locator("[data-fizlet-host]").count();
  assert.equal(host, 1, "the scoreboard stays with the result");
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
  console.log("Null Invaders browser: play, links and fields, pause, Recall restores exactly, frame time, game over (Escape closes it), failed start leaves nothing, phone stick passed.");
} catch (err) {
  console.error(`browser test failed at: ${where}`);
  throw err;
} finally {
  await browser.close();
  server.close();
}
