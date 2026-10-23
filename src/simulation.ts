import type {
  GameContext,
  GameSimulation,
  GameStats,
  Player,
  Point,
  Glyph,
  BoardTarget,
} from "@coded-design/dom-virus";
interface Enemy extends Point {
  age: number;
  type: number;
  phase: number;
  hp: number;
  hitUntil: number;
}
interface Bullet extends Point {
  vx: number;
  vy: number;
  life: number;
}
export interface NullInvadersStats extends GameStats {
  score: number;
  lives: number;
  wave: number;
  kills: number;
  alive: number;
  bullets: number;
  weapon: number;
  weaponXP: number;
  nextWeaponXP: number | null;
  combo: number;
  player: Player;
  detail: string;
}
type Collision =
  | { kind: "glyph"; target: Glyph }
  | { kind: "enemy"; target: Enemy }
  | { kind: "gate"; target: BoardTarget };
import {
  distance,
  segmentHit,
  EntityPool,
  chooseSpawn,
  translateEntities,
} from "@coded-design/dom-virus";
import {
  MAX_ENEMIES,
  MAX_BULLETS,
  weaponAngles,
  spawnInterval,
  waveHealth,
  weaponLevel,
  fireInterval,
  WEAPON_XP,
  WEAPON_NAMES,
} from "./rules.js";

import { drawSprite, enemySprites } from "./sprites.js";

export function createGame(
  api: GameContext,
): GameSimulation<NullInvadersStats> {
  let player: Player = { x: 0, y: 0, angle: 0 };
  const enemyPool = new EntityPool<Enemy>(MAX_ENEMIES, () => ({
    x: 0,
    y: 0,
    age: 0,
    type: 0,
    phase: 0,
    hp: 0,
    hitUntil: 0,
  }));
  const bulletPool = new EntityPool<Bullet>(MAX_BULLETS, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
  }));
  const enemies = enemyPool.active,
    bullets = bulletPool.active;
  const old: Point = { x: 0, y: 0 };
  let score = 0,
    lives = 3,
    wave = 1,
    kills = 0,
    shotIn = 0,
    spawnIn = 1,
    shield = 2,
    intermission = 0,
    xp = 0,
    weapon = 1,
    streak = 0,
    comboIn = 0,
    upgradeUntil = 0;
  const combo = () => Math.min(5, 1 + Math.floor(streak / 3));
  function award(points: number, experience: number, x: number, y: number) {
    score += points;
    xp += experience;
    api.popup(x, y, `+${points}`);
    const next = weaponLevel(xp);
    if (next > weapon) {
      weapon = next;
      shotIn = 0;
      upgradeUntil = api.time + 2.2;
      api.popup(
        player.x,
        player.y - 26,
        `${WEAPON_NAMES[weapon - 1]} ONLINE`,
        "upgrade",
      );
      api.emit("weapon-upgrade", {
        weapon,
        xp,
        name: WEAPON_NAMES[weapon - 1],
      });
    }
  }
  const spawn = () => {
    if (enemyPool.size >= MAX_ENEMIES) return;
    const spawn = chooseSpawn(api.board.targets, api.random, api.width);
    if (!spawn) return;
    const e = enemyPool.acquire();
    if (!e) return;
    Object.assign(e, {
      x: spawn.x,
      y: spawn.y,
      age: 0,
      type: Math.floor(api.random() * 3),
      phase: api.random() * 6.28,
      hp: wave >= 3 ? 2 : 1,
      hitUntil: 0,
    });
    api.emit("spawn", { target: spawn.target?.id });
  };
  const reset = () => {
    player = { x: api.width * 0.5, y: api.height * 0.7, angle: -Math.PI / 2 };
    enemyPool.clear();
    bulletPool.clear();
    score = 0;
    lives = 3;
    wave = 1;
    kills = 0;
    shotIn = 0;
    spawnIn = 1;
    shield = 2;
    intermission = 0;
    xp = 0;
    weapon = 1;
    streak = 0;
    comboIn = 0;
    upgradeUntil = 0;
    api.board.resetTargets(waveHealth(wave));
  };
  function update(dt: number) {
    shield = Math.max(0, shield - dt);
    comboIn = Math.max(0, comboIn - dt);
    if (!comboIn) streak = 0;
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
      shotIn = fireInterval(weapon);
      for (const offset of weaponAngles(weapon)) {
        if (bullets.length >= MAX_BULLETS) break;
        const b = bulletPool.acquire();
        if (!b) break;
        const a = player.angle + offset;
        Object.assign(b, {
          x: player.x + Math.cos(a) * 16,
          y: player.y + Math.sin(a) * 16,
          vx: Math.cos(a) * 660,
          vy: Math.sin(a) * 660,
          life: 1.5,
        });
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]!;
      old.x = b.x;
      old.y = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const hit = api.board.hitSegment(old, b);
      let nearest = hit?.t ?? Infinity;
      let collision: Collision | null = hit
        ? { kind: "glyph", target: hit.glyph }
        : null;
      for (const e of enemies) {
        const t = segmentHit(
          old,
          b,
          { left: e.x - 13, right: e.x + 13, top: e.y - 12, bottom: e.y + 12 },
          2,
        );
        if (t !== null && t < nearest) {
          nearest = t;
          collision = { kind: "enemy", target: e };
        }
      }
      for (const gate of api.board.targets)
        if (gate.visible && gate.health > 0 && gate.rect) {
          const t = segmentHit(old, b, gate.rect, 2);
          if (t !== null && t < nearest) {
            nearest = t;
            collision = { kind: "gate", target: gate };
          }
        }
      if (collision) {
        const x = old.x + (b.x - old.x) * nearest,
          y = old.y + (b.y - old.y) * nearest;
        if (
          collision.kind === "glyph" &&
          api.board.consume(collision.target, "binary")
        ) {
          award(2, 1, x, y);
          if (streak) comboIn = 3;
          api.burst(x, y, "#5ef2df", 5);
          api.emit("letter", { score });
        }
        if (collision.kind === "enemy") {
          const target = collision.target;
          target.hp--;
          target.hitUntil = api.time + 0.08;
          api.burst(x, y, "#f18eff", 6);
          if (target.hp <= 0) {
            const ix = enemies.indexOf(target);
            if (ix >= 0) {
              enemyPool.releaseAt(ix);
              const points = 25 * combo();
              award(points, 4, x, y);
              streak++;
              comboIn = 3;
              kills++;
              api.emit("kill", { score, combo: combo(), kills });
            }
          }
        }
        if (collision.kind === "gate") {
          const target = collision.target;
          api.board.damage(target, 20, { x, y });
          award(5, 2, x, y);
          api.burst(x, y, "#ffaf7a", 8);
          if (target.health === 0) {
            award(150, 8, x, y - 10);
            api.emit("gate-destroyed", { target: target.id });
          }
        }
      }
      if (
        collision ||
        b.life <= 0 ||
        b.x < -30 ||
        b.y < -30 ||
        b.x > api.width + 30 ||
        b.y > api.height + 30
      ) {
        bulletPool.releaseAt(i);
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]!;
      e.age += dt;
      const a = Math.atan2(player.y - e.y, player.x - e.x),
        speed = 45 + wave * 13 + e.type * 12;
      const sway = Math.sin(e.age * 3 + e.phase) * 24;
      e.x += (Math.cos(a) * speed + Math.cos(a + Math.PI / 2) * sway) * dt;
      e.y += (Math.sin(a) * speed + Math.sin(a + Math.PI / 2) * sway) * dt;
      if (shield <= 0 && distance(player, e) < 24) {
        lives--;
        streak = 0;
        comboIn = 0;
        api.popup(player.x, player.y, "SHIELD LOST", "hurt");
        shield = 2;
        api.burst(player.x, player.y, "#ff896f", 18);
        enemyPool.releaseAt(i);
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
        enemyPool.releaseAt(i);
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
      award(250, 4, player.x, player.y - 20);
      bulletPool.clear();
      api.emit("wave-clear", { wave });
    }
  }
  function draw(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = "square";
    ctx.lineWidth = 3;
    for (const b of bullets) {
      ctx.strokeStyle = "#071c21";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
      ctx.stroke();
      ctx.strokeStyle =
        weapon === 4 ? "#fff1a4" : weapon === 3 ? "#c8bbff" : "#d7fff4";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const e of enemies) {
      const frame = api.reducedMotion ? 0 : Math.floor(e.age * 6 + e.phase) % 2;
      drawSprite(
        ctx,
        enemySprites[e.type]!,
        frame,
        e.x,
        e.y,
        0,
        !api.reducedMotion && e.hitUntil > api.time,
      );
      if (e.hp > 1) {
        ctx.fillStyle = "#201329";
        ctx.fillRect(e.x - 5, e.y - 19, 10, 4);
        ctx.fillStyle = "#fff1c1";
        ctx.fillRect(e.x - 4, e.y - 18, 3, 2);
        ctx.fillRect(e.x + 1, e.y - 18, 3, 2);
      }
    }
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle + Math.PI / 2);
    if (shield > 0) {
      ctx.strokeStyle = "#a8fff0";
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // The silhouette grows weapon pods as firepower increases.
    ctx.fillStyle = weapon === 4 ? "#fff1a4" : "#b9fff4";
    if (weapon >= 2) {
      ctx.fillRect(-12, -10, 4, 10);
      ctx.fillRect(8, -10, 4, 10);
    }
    if (weapon >= 3) ctx.fillRect(-2, -20, 4, 8);
    if (weapon === 4) {
      ctx.fillRect(-17, -4, 4, 10);
      ctx.fillRect(13, -4, 4, 10);
    }
    ctx.fillStyle = "#ffad66";
    const flame = api.reducedMotion
      ? 5
      : 4 + (Math.floor(api.time * 18) % 3) * 2;
    ctx.fillRect(-7, 9, 4, flame);
    ctx.fillRect(3, 9, 4, flame);
    drawSprite(ctx, "ship", 0, 0, 0);
    ctx.restore();
  }
  return {
    reset,
    update,
    draw,
    scroll(dx, dy) {
      translateEntities(enemies, dx, dy);
      translateEntities(bullets, dx, dy);
    },
    snapshot() {
      return {
        score,
        lives,
        wave,
        kills,
        alive: enemies.length,
        bullets: bullets.length,
        weapon,
        weaponXP: xp,
        nextWeaponXP: WEAPON_XP[weapon] ?? null,
        combo: combo(),
        hud: {
          kills,
          alive: enemies.length,
          combo: combo(),
          label: `${WEAPON_NAMES[weapon - 1]} / LV ${weapon}`,
          progress:
            weapon === 4
              ? 1
              : (xp - WEAPON_XP[weapon - 1]!) /
                (WEAPON_XP[weapon]! - WEAPON_XP[weapon - 1]!),
          progressText:
            weapon === 4 ? "MAX POWER" : `${xp} / ${WEAPON_XP[weapon]} XP`,
        },
        player: { ...player },
        detail:
          intermission > 0
            ? "Wave clear · +250 · next wave incoming"
            : upgradeUntil > api.time
              ? `${WEAPON_NAMES[weapon - 1]} ONLINE · ${weaponAngles(weapon).length} shots per burst`
              : `${weaponAngles(weapon).length} SHOT · ${api.board.targets.filter((t) => t.health > 0).length} FACTORIES · Space / click to fire`,
      };
    },
  };
}
