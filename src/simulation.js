import { clamp, distance, segmentHit } from "@coded-design/dom-virus";
import {
  MAX_ENEMIES,
  MAX_BULLETS,
  weaponAngles,
  spawnInterval,
  waveHealth,
} from "./rules.js";

export function createGame(api) {
  let player,
    enemies = [],
    bullets = [],
    enemyPool = [],
    bulletPool = [],
    score = 0,
    lives = 3,
    wave = 1,
    kills = 0,
    shotIn = 0,
    spawnIn = 1,
    shield = 2,
    intermission = 0;
  const spawn = () => {
    const gates = api.board.targets.filter((t) => t.health > 0 && t.visible);
    if (api.board.targets.length && !gates.length) return;
    if (enemies.length >= MAX_ENEMIES) return;
    const gate = gates[Math.floor(api.random() * gates.length)],
      rect = gate?.rect;
    const e = enemyPool.pop() || {};
    Object.assign(e, {
      x: rect ? (rect.left + rect.right) / 2 : api.random() * api.width,
      y: rect ? (rect.top + rect.bottom) / 2 : 8,
      age: 0,
      type: Math.floor(api.random() * Math.min(3, wave)),
      phase: api.random() * 6.28,
      hp: wave >= 3 ? 2 : 1,
    });
    enemies.push(e);
    api.emit("spawn", { target: gate?.id });
  };
  const reset = () => {
    player = { x: api.width * 0.5, y: api.height * 0.7, angle: -Math.PI / 2 };
    enemies = [];
    bullets = [];
    enemyPool = [];
    bulletPool = [];
    score = 0;
    lives = 3;
    wave = 1;
    kills = 0;
    shotIn = 0;
    spawnIn = 1;
    shield = 2;
    intermission = 0;
    api.board.resetTargets(waveHealth(wave));
  };
  function update(dt) {
    shield = Math.max(0, shield - dt);
    api.move(player, dt, 360);
    if (intermission > 0) {
      intermission -= dt;
      if (intermission <= 0) {
        wave++;
        api.board.resetTargets(waveHealth(wave));
        spawnIn = 1;
        shield = 1.5;
        api.emit("wave", { wave });
      }
      return;
    }
    spawnIn -= dt;
    shotIn -= dt;
    if (spawnIn <= 0) {
      spawnIn = spawnInterval(wave);
      for (let i = 0; i < Math.min(wave, 3); i++) spawn();
    }
    if (api.firing && shotIn <= 0) {
      shotIn = wave === 4 ? 0.12 : 0.19;
      for (const offset of weaponAngles(wave)) {
        if (bullets.length >= MAX_BULLETS) break;
        const b = bulletPool.pop() || {},
          a = player.angle + offset;
        Object.assign(b, {
          x: player.x + Math.cos(a) * 16,
          y: player.y + Math.sin(a) * 16,
          vx: Math.cos(a) * 660,
          vy: Math.sin(a) * 660,
          life: 1.5,
        });
        bullets.push(b);
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i],
        old = { x: b.x, y: b.y };
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let hit = api.board.hitSegment(old, b),
        nearest = hit?.t ?? Infinity,
        kind = hit ? "glyph" : null,
        target = hit?.glyph;
      for (const e of enemies) {
        const t = segmentHit(
          old,
          b,
          { left: e.x - 13, right: e.x + 13, top: e.y - 12, bottom: e.y + 12 },
          2,
        );
        if (t !== null && t < nearest) {
          nearest = t;
          kind = "enemy";
          target = e;
        }
      }
      for (const gate of api.board.targets)
        if (gate.visible && gate.health > 0) {
          const t = segmentHit(old, b, gate.rect, 2);
          if (t !== null && t < nearest) {
            nearest = t;
            kind = "gate";
            target = gate;
          }
        }
      if (kind) {
        const x = old.x + (b.x - old.x) * nearest,
          y = old.y + (b.y - old.y) * nearest;
        if (kind === "glyph" && api.board.consume(target, "binary")) {
          score += 2;
          api.burst(x, y, "#5ef2df", 5);
          api.emit("letter", { score });
        }
        if (kind === "enemy") {
          target.hp--;
          api.burst(x, y, "#f18eff", 6);
          if (target.hp <= 0) {
            const ix = enemies.indexOf(target);
            if (ix >= 0) {
              enemies.splice(ix, 1);
              enemyPool.push(target);
              score += 25;
              kills++;
              api.emit("kill", { score });
            }
          }
        }
        if (kind === "gate") {
          api.board.damage(target, 20);
          api.burst(x, y, "#ffaf7a", 8);
          if (target.health === 0) {
            score += 150;
            api.emit("gate-destroyed", { target: target.id });
          }
        }
      }
      if (
        kind ||
        b.life <= 0 ||
        b.x < -30 ||
        b.y < -30 ||
        b.x > api.width + 30 ||
        b.y > api.height + 30
      ) {
        bullets.splice(i, 1);
        bulletPool.push(b);
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.age += dt;
      const a = Math.atan2(player.y - e.y, player.x - e.x),
        speed = 45 + wave * 13 + e.type * 12;
      const sway = Math.sin(e.age * 3 + e.phase) * 24;
      e.x += (Math.cos(a) * speed + Math.cos(a + Math.PI / 2) * sway) * dt;
      e.y += (Math.sin(a) * speed + Math.sin(a + Math.PI / 2) * sway) * dt;
      if (shield <= 0 && distance(player, e) < 24) {
        lives--;
        shield = 2;
        api.burst(player.x, player.y, "#ff896f", 18);
        enemies.splice(i, 1);
        enemyPool.push(e);
        api.emit("hurt", { lives });
        if (lives <= 0) {
          api.finish();
          return;
        }
      } else if (
        e.y < -api.height ||
        e.y > api.height * 2 ||
        e.x < -api.width ||
        e.x > api.width * 2
      ) {
        enemies.splice(i, 1);
        enemyPool.push(e);
      }
    }
    const cleared = api.board.targets.length
      ? api.board.targets.every((t) => t.health <= 0)
      : kills >= wave * 18;
    if (cleared && !enemies.length) {
      if (wave >= 4) {
        api.finish(true);
        return;
      }
      intermission = 2;
      score += 250;
      bullets.length = 0;
      api.emit("wave-clear", { wave });
    }
  }
  function draw(ctx) {
    for (const t of api.board.targets)
      if (t.visible && t.rect) {
        const r = t.rect;
        ctx.save();
        ctx.strokeStyle = t.health > 0 ? "#ee93ff" : "#5ef2df";
        ctx.lineWidth = 2;
        ctx.strokeRect(r.left - 4, r.top - 4, r.width + 8, r.height + 8);
        ctx.fillStyle = "#071515";
        ctx.fillRect(r.left, r.bottom + 7, r.width, 3);
        ctx.fillStyle = t.health > 0 ? "#ee93ff" : "#5ef2df";
        ctx.fillRect(
          r.left,
          r.bottom + 7,
          (r.width * t.health) / t.maxHealth,
          3,
        );
        if (t.health > 0) {
          const pulse = api.reducedMotion
            ? 1
            : 0.6 + 0.4 * Math.sin(api.time * 4);
          ctx.globalAlpha = pulse;
          ctx.fillRect(r.left - 7, r.top - 7, 6, 6);
          ctx.fillRect(r.right + 1, r.bottom + 1, 6, 6);
        }
        ctx.restore();
      }
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    for (const b of bullets) {
      ctx.strokeStyle = "#071c21";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
      ctx.stroke();
      ctx.strokeStyle = "#d7fff4";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = "#180f27";
      ctx.lineWidth = 3;
      ctx.fillStyle = ["#dc91ff", "#ff8da2", "#ffc480"][e.type];
      const flap = api.reducedMotion ? 3 : Math.sin(e.age * 10 + e.phase) * 4;
      ctx.beginPath();
      ctx.moveTo(-13, flap);
      ctx.lineTo(-6, -9);
      ctx.lineTo(6, -9);
      ctx.lineTo(13, flap);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#161121";
      ctx.fillRect(-6, -3, 3, 4);
      ctx.fillRect(3, -3, 3, 4);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (shield > 0) {
      ctx.strokeStyle = "#a8fff0";
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#81ffdf";
    ctx.strokeStyle = "#07191b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, -2, 8, 4);
    ctx.fillStyle = "#ffbc75";
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(-18 - (api.reducedMotion ? 0 : Math.sin(api.time * 30) * 4), 0);
    ctx.lineTo(-9, 4);
    ctx.fill();
    ctx.restore();
  }
  return {
    reset,
    update,
    draw,
    scroll(dx, dy) {
      for (const e of [...enemies, ...bullets]) {
        e.x -= dx;
        e.y -= dy;
      }
    },
    snapshot() {
      return {
        score,
        lives,
        wave,
        kills,
        alive: enemies.length,
        bullets: bullets.length,
        weapon: wave,
        player: { ...player },
        detail:
          intermission > 0
            ? "Wave clear · weapon upgrade incoming"
            : `${weaponAngles(wave).length} SHOT · ${api.board.targets.filter((t) => t.health > 0).length} FACTORIES · Space / click to fire`,
      };
    },
  };
}
