import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { World } from './systems/world.js';
import { Hud } from './systems/hud.js';
import { SpellSystem } from './systems/spells.js';
import { AltarMenu } from './systems/altar-menu.js';
import { Player } from './entities/player.js';
import { Enemy, separateEnemies } from './entities/enemy.js';
import { Boss } from './entities/boss.js';
import { Soul } from './entities/soul.js';
import { Altar } from './entities/altar.js';
import { LostSouls } from './entities/lostsouls.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = new Input(canvas);
const world = new World();
const camera = new Camera(world.width, world.height);
const hud = new Hud();
const spells = new SpellSystem();

// El altar es el punto de inicio y de reaparición
const altar = new Altar(1600, 1440);
const spawn = { x: altar.x, y: altar.y + 80 };
const player = new Player(spawn.x, spawn.y);

// Los demonios rondan la base del jefe, repartidos en círculo a su alrededor
function spawnEnemies(base, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + 0.3;
    const distance = base.radius + 330;
    list.push(
      new Enemy(
        base.x + Math.cos(angle) * distance,
        base.y + Math.sin(angle) * distance
      )
    );
  }
  return list;
}

const enemies = [];
let boss = null;
let bossDefeated = false; // el jefe derrotado ya no vuelve
let victoryTimer = 0;

// Devuelve a su lugar a los demonios y al jefe (si sigue vivo)
function resetEncounters() {
  enemies.length = 0;
  enemies.push(...spawnEnemies(world.bossBase, 5));
  boss = bossDefeated ? null : new Boss(world.bossBase.x, world.bossBase.y);
}
resetEncounters();

const souls = [];     // almas sueltas por los demonios
let lostSouls = null; // las almas que perdiste al morir

// Estados del juego: 'playing', 'dead' o 'altar' (menú abierto)
let state = 'playing';
let deathTimer = 0;
const DEATH_TIME = 2.4;
const VICTORY_TIME = 4;

const menu = new AltarMenu(player, () => {
  state = 'playing';
});

// Descansar en el altar: cura, devuelve a los enemigos y abre el menú
function openAltar() {
  player.rest();
  resetEncounters();
  souls.length = 0;
  spells.reset();
  state = 'altar';
  menu.open();
}

// Al morir, las almas se quedan donde caíste
function startDeath() {
  if (player.souls > 0) {
    lostSouls = new LostSouls(player.x, player.y, player.souls);
    player.souls = 0;
  }
  state = 'dead';
  deathTimer = DEATH_TIME;
}

function respawnAtAltar() {
  player.respawn(spawn.x, spawn.y);
  resetEncounters();
  souls.length = 0;
  spells.reset();
  state = 'playing';
}

function onBossDefeated() {
  // 5 esferas de 30 almas = 150
  for (let i = 0; i < 5; i++) souls.push(new Soul(boss.x, boss.y, boss.souls / 5));
  boss = null;
  bossDefeated = true;
  victoryTimer = VICTORY_TIME;
}

function updatePlaying(dt, wantsInteract) {
  if (wantsInteract && altar.isNear(player)) {
    openAltar();
    return;
  }

  // Todo lo que se puede golpear: demonios y jefe
  const targets = boss ? [...enemies, boss] : enemies;

  player.update(dt, input, world, camera, targets);
  spells.update(dt, player, input, camera, targets, world);
  for (const e of enemies) e.update(dt, player, world);
  separateEnemies(enemies);

  if (boss) {
    boss.update(dt, player, world);
    if (!boss.alive) onBossDefeated();
  }

  // Los demonios derrotados sueltan almas
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) {
      souls.push(new Soul(e.x, e.y, e.souls));
      enemies.splice(i, 1);
    }
  }

  // Las almas se recogen al acercarse
  for (let i = souls.length - 1; i >= 0; i--) {
    souls[i].update(dt, player);
    if (souls[i].collected) souls.splice(i, 1);
  }

  // Recuperar las almas perdidas
  if (lostSouls) {
    lostSouls.update(dt, player);
    if (lostSouls.collected) lostSouls = null;
  }

  const hazardDamage = world.getHazardDamage(player);
  if (hazardDamage > 0) player.takeDamage(hazardDamage);

  if (player.hp <= 0) startDeath();
}

function drawDeathOverlay() {
  const elapsed = DEATH_TIME - deathTimer;
  const fade = Math.min(1, elapsed / 0.8);

  ctx.fillStyle = `rgba(30, 0, 5, ${0.75 * fade})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `rgba(216, 52, 77, ${fade})`;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HAS MUERTO', canvas.width / 2, canvas.height / 2);
  ctx.textAlign = 'left';
}

function drawVictory() {
  const alpha = Math.min(1, victoryTimer); // se desvanece el último segundo
  ctx.fillStyle = `rgba(255, 210, 122, ${alpha})`;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DEMONIO DERROTADO', canvas.width / 2, canvas.height / 2 - 70);
  ctx.textAlign = 'left';
}

let last = performance.now();

function loop(now) {
  // dt en segundos, con tope para que no haya saltos si la pestaña se pausa
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const wantsInteract = input.consumeInteract();
  victoryTimer = Math.max(0, victoryTimer - dt);

  // 1. Actualizar
  if (state === 'playing') {
    updatePlaying(dt, wantsInteract);
  } else {
    // En pausa las teclas no se guardan para después
    input.clearActions();
    if (state === 'altar' && wantsInteract) menu.close();
    if (state === 'dead') {
      deathTimer -= dt;
      if (deathTimer <= 0) respawnAtAltar();
    }
  }

  camera.follow(player, canvas.width, canvas.height);

  // 2. Dibujar
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world.draw(ctx, camera, canvas.width, canvas.height);
  altar.draw(ctx, camera, state === 'playing' && altar.isNear(player));
  if (lostSouls) lostSouls.draw(ctx, camera);
  souls.forEach((s) => s.draw(ctx, camera));
  enemies.forEach((e) => e.draw(ctx, camera));
  if (boss) boss.draw(ctx, camera);
  spells.draw(ctx, camera);
  player.draw(ctx, camera);
  hud.draw(ctx, player, spells, canvas.width, canvas.height, enemies.length, boss);
  if (victoryTimer > 0) drawVictory();
  if (state === 'dead') drawDeathOverlay();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);