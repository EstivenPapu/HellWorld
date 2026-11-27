import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { audio, sfx } from './core/audio.js';
import { loadSprites } from './core/sprites.js';
import { World } from './systems/world.js';
import { LAYOUT } from './systems/layout.js';
import { Hud } from './systems/hud.js';
import { SpellSystem } from './systems/spells.js';
import { Minimap } from './systems/minimap.js';
import { Ambient } from './systems/ambient.js'
import { AltarMenu } from './systems/altar-menu.js';
import { TouchControls } from './systems/touch-controls.js';
import { Dialog } from './systems/dialog.js';
import { Quest, QUEST } from './systems/quest.js';
import { loadSave, writeSave, clearSave } from './systems/save.js';
import { Player } from './entities/player.js';
import { Enemy, separateEnemies } from './entities/enemy.js';
import { Boss } from './entities/boss.js';
import { Soul } from './entities/soul.js';
import { Altar } from './entities/altar.js';
import { Npc } from './entities/npc.js';
import { Relic } from './entities/relic.js';
import { LostSouls } from './entities/lostsouls.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Cambiar el tamaño reinicia el lienzo: sin suavizado el pixel art se ve nítido
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

const input = new Input(canvas);
const touch = new TouchControls(input);
const world = new World();
const camera = new Camera(world.width, world.height);
const hud = new Hud();
const minimap = new Minimap(world);
const ambient = new Ambient();
const spells = new SpellSystem();

// El altar es el punto de inicio y de reaparición; el Peregrino vive cerca
const altar = new Altar(LAYOUT.altar.x, LAYOUT.altar.y);
const npc = new Npc(LAYOUT.npc.x, LAYOUT.npc.y, 'Peregrino');
const spawn = { x: altar.x, y: altar.y + 80 };
const player = new Player(spawn.x, spawn.y);
const quest = new Quest();

const enemies = [];
const shots = []; // esferas de sombra que disparan los demonios
const game = { enemies, shots }; // lo que los demonios pueden usar para disparar o invocar
const souls = [];      // almas sueltas por los demonios
let boss = null;
let bossDefeated = false; // el jefe derrotado ya no vuelve
let relic = null;      // la reliquia de la misión (solo existe con la misión activa)
let lostSouls = null;  // las almas que perdiste al morir

// Estados del juego: 'playing', 'dead', 'altar' (menú), 'dialog' o 'map' (mapa grande)
let state = 'playing';
let deathTimer = 0;
let victoryTimer = 0;
let autosaveTimer = 0;
let resetting = false; // true mientras se borra la partida, para no volver a guardar

const DEATH_TIME = 2.4;
const VICTORY_TIME = 4;
const AUTOSAVE_EVERY = 5; // segundos


// Evitar zoom del navegador con Ctrl + / Ctrl - / Ctrl 0
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) {
    e.preventDefault();
  }
});

// Evitar zoom con Ctrl + rueda del ratón (y pellizco en trackpad)
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

// Esc cierra el mapa grande
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state === 'map') state = 'playing';
});

// ---------- Guardado ----------
function saveGame() {
  if (resetting) return;
  writeSave({
    player: player.serialize(),
    bossDefeated,
    quest: quest.serialize(),
    lostSouls: lostSouls
      ? { x: lostSouls.x, y: lostSouls.y, amount: lostSouls.amount }
      : null,
    muted: audio.muted,
  });
}

const saved = loadSave();
if (saved) {
  player.loadState(saved.player);
  bossDefeated = Boolean(saved.bossDefeated);
  quest.load(saved.quest);
  audio.setMuted(saved.muted);

  const ls = saved.lostSouls;
  if (ls && [ls.x, ls.y, ls.amount].every(Number.isFinite) && ls.amount > 0) {
    // Si la partida es de una versión con otro mapa, las almas pueden quedar dentro de
    // un árbol o muro: en ese caso aparecen junto al altar para poder recogerlas.
    const free = !world.collides(ls.x, ls.y, 20);
    const x = free ? ls.x : spawn.x + 48;
    const y = free ? ls.y : spawn.y;
    lostSouls = new LostSouls(x, y, Math.floor(ls.amount));
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
});
window.addEventListener('pagehide', saveGame);

// ---------- Enemigos ----------
function spawnEnemies() {
  const list = [];

  // Campamentos de demonios repartidos por el reino (cada uno con sus tipos)
  for (const camp of world.camps) {
    camp.types.forEach((type, i) => {
      const angle = (Math.PI * 2 * i) / camp.types.length + camp.x * 0.001;
      list.push(new Enemy(camp.x + Math.cos(angle) * 48, camp.y + Math.sin(angle) * 48, type));
    });
  }

  // Los guardias del castillo, en círculo alrededor de sus muros
  const base = world.bossBase;
  const guardTypes = ['menor', 'lanzador', 'menor', 'veloz', 'tanque'];
  guardTypes.forEach((type, i) => {
    const angle = (Math.PI * 2 * i) / guardTypes.length + 0.3;
    const distance = base.radius + 330;
    list.push(
      new Enemy(base.x + Math.cos(angle) * distance, base.y + Math.sin(angle) * distance, type)
    );
  });

  for (const e of list) world.resolve(e, e.body);
  return list;
}

// Devuelve a su lugar a los demonios y al jefe (si sigue vivo)
function resetEncounters() {
  enemies.length = 0;
  shots.length = 0;
  enemies.push(...spawnEnemies());

  if (bossDefeated) {
    boss = null;
  } else {
    boss = new Boss(world.bossBase.x, world.bossBase.y);
    boss.arena = world.castle;
  }
}
resetEncounters();

// ---------- Menús ----------
const dialog = new Dialog(() => {
  state = 'playing';
});

const menu = new AltarMenu(player, {
  onClose: () => {
    state = 'playing';
    saveGame();
  },
  onChange: saveGame,
  onReset: () => {
    resetting = true;
    clearSave();
    location.reload();
  },
});

// Descansar en el altar: cura, devuelve a los enemigos y abre el menú
function openAltar() {
  player.rest();
  resetEncounters();
  souls.length = 0;
  spells.reset();
  state = 'altar';
  sfx('altar');
  menu.open();
  saveGame();
}

function openNpcDialog() {
  const d = quest.dialog();
  state = 'dialog';

  dialog.open(npc.name, d.text, d.button, () => {
    if (d.action === 'accept') {
      quest.accept();
      hud.notify(`Misión aceptada: ${QUEST.name}`);
      sfx('quest');
    }
    if (d.action === 'reward') {
      quest.complete();
      player.addSouls(QUEST.reward);
      hud.notify(`Misión completada: +${QUEST.reward} almas`);
      sfx('questDone');
    }
    saveGame();
  });
}

// ---------- Muerte y victoria ----------
// Al morir, las almas se quedan donde caíste
function startDeath() {
  if (player.souls > 0) {
    lostSouls = new LostSouls(player.x, player.y, player.souls);
    player.souls = 0;
  }
  state = 'dead';
  deathTimer = DEATH_TIME;
  sfx('death');
  saveGame();
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
  sfx('victory');
  saveGame();
}

// ---------- Interacción ----------
// Qué hay cerca para usar con F (o con el botón en el celular)
function nearestInteractable() {
  const dAltar = altar.isNear(player)
    ? Math.hypot(player.x - altar.x, player.y - altar.y)
    : Infinity;
  const dNpc = npc.isNear(player)
    ? Math.hypot(player.x - npc.x, player.y - npc.y)
    : Infinity;

  if (dAltar === Infinity && dNpc === Infinity) return null;
  return dAltar <= dNpc ? 'altar' : 'npc';
}

// ---------- Actualizar ----------
function updatePlaying(dt, wantsInteract, interactable) {
  if (wantsInteract && interactable === 'altar') {
    openAltar();
    return;
  }
  if (wantsInteract && interactable === 'npc') {
    openNpcDialog();
    return;
  }

  // Todo lo que se puede golpear: demonios y jefe
  const targets = boss ? [...enemies, boss] : enemies;

  player.update(dt, input, world, camera, targets);
  spells.update(dt, player, input, camera, targets, world);
  for (const e of enemies) e.update(dt, player, world, game);
  for (let i = shots.length - 1; i >= 0; i--) {
    shots[i].update(dt, player, world);
    if (!shots[i].alive) shots.splice(i, 1);
  }
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

  // La reliquia solo existe mientras la misión está activa
  if (quest.state === 'active' && !relic) relic = new Relic(QUEST.relic.x, QUEST.relic.y);
  if (quest.state !== 'active') relic = null;
  if (relic) {
    relic.update(dt, player);
    if (relic.collected) {
      quest.collect();
      relic = null;
      hud.notify('Reliquia recogida: vuelve con el Peregrino');
      sfx('quest');
      saveGame();
    }
  }

  const hazardDamage = world.getHazardDamage(player);
  if (hazardDamage > 0) player.takeDamage(hazardDamage);

  if (player.hp <= 0) startDeath();
}

// ---------- Dibujar ----------
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

// ¿Está cerca de la pantalla? (para no dibujar lo que está lejos)
function onScreen(x, y, margin = 140) {
  return (
    x > camera.x - margin &&
    x < camera.x + canvas.width + margin &&
    y > camera.y - margin &&
    y < camera.y + canvas.height + margin
  );
}

// Todo lo que tiene altura (árboles, personajes, altar...) se dibuja ordenado
// de arriba hacia abajo: así puedes pasar por detrás de un árbol y por delante de otro.
function drawWorldObjects() {
  const items = [];

  for (const p of world.visibleProps(camera, canvas.width, canvas.height)) {
    items.push({ y: p.y, draw: () => world.drawProp(ctx, p, camera, player) });
  }
  if (onScreen(altar.x, altar.y)) {
    items.push({
      y: altar.y + 20,
      draw: () => altar.draw(ctx, camera, interactableNow === 'altar', input.isTouch),
    });
  }
  if (onScreen(npc.x, npc.y)) {
    items.push({
      y: npc.y + 12,
      draw: () => npc.draw(ctx, camera, interactableNow === 'npc', quest.state, input.isTouch),
    });
  }
  if (relic && onScreen(relic.x, relic.y)) {
    items.push({ y: relic.y, draw: () => relic.draw(ctx, camera) });
  }
  for (const e of enemies) {
    if (onScreen(e.x, e.y)) items.push({ y: e.y + 12, draw: () => e.draw(ctx, camera) });
  }
  if (boss && onScreen(boss.x, boss.y, 260)) {
    items.push({ y: boss.y + 30, draw: () => boss.draw(ctx, camera) });
  }
  items.push({ y: player.y + 12, draw: () => player.draw(ctx, camera) });

  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.draw();
}

// Lo que necesita el minimapa para dibujar las marcas
function mapInfo() {
  return {
    player,
    camera,
    viewW: canvas.width,
    viewH: canvas.height,
    altar,
    npc,
    relic: quest.state === 'active' ? QUEST.relic : null,
    questState: quest.state,
  };
}

let interactableNow = null;
let last = performance.now();

function loop(now) {
  // dt en segundos, con tope para que no haya saltos si la pestaña se pausa
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const wantsInteract = input.consumeInteract();
  const wantsMap = input.consumeMap();

  // N (o tocar el minimapa) abre y cierra el mapa grande, que pausa el juego
  if (wantsMap && state === 'playing') state = 'map';
  else if (wantsMap && state === 'map') state = 'playing';
  input.mapOpen = state === 'map';
  victoryTimer = Math.max(0, victoryTimer - dt);

  const interactable = state === 'playing' ? nearestInteractable() : null;
  interactableNow = interactable;

  // 1. Actualizar
  if (state === 'playing') {
    updatePlaying(dt, wantsInteract, interactable);

    autosaveTimer += dt;
    if (autosaveTimer >= AUTOSAVE_EVERY) {
      autosaveTimer = 0;
      saveGame();
    }
  } else {
    // En pausa las teclas no se guardan para después
    input.clearActions();
    if (state === 'altar' && wantsInteract) menu.close();
    if (state === 'dialog' && wantsInteract) dialog.confirm();
    if (state === 'dead') {
      deathTimer -= dt;
      if (deathTimer <= 0) respawnAtAltar();
    }
  }

  audio.setIntensity(state === 'playing' && boss && boss.engaged ? 1 : 0);
  camera.follow(player, canvas.width, canvas.height);

  // 2. Dibujar
  hud.touch = input.isTouch;
  hud.objective = quest.objective;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world.draw(ctx, camera, canvas.width, canvas.height);
  if (lostSouls) lostSouls.draw(ctx, camera);
  souls.forEach((s) => s.draw(ctx, camera));
  drawWorldObjects();
  shots.forEach((s) => s.draw(ctx, camera));
  spells.draw(ctx, camera);
    ambient.draw(ctx, camera, canvas.width, canvas.height, dt, input.isTouch);
  hud.draw(ctx, player, spells, canvas.width, canvas.height, enemies.filter((e) => e.type !== 'esbirro').length, boss);
  input.minimapRect = minimap.draw(ctx, canvas.width, canvas.height, input.isTouch, mapInfo());
  if (state === 'map') minimap.drawBig(ctx, canvas.width, canvas.height, input.isTouch, mapInfo());
  if (victoryTimer > 0) drawVictory();
  if (state === 'dead') drawDeathOverlay();

  touch.update({
    player,
    spells,
    interactLabel: interactable === 'altar' ? 'Altar' : interactable === 'npc' ? 'Hablar' : '',
  });

  requestAnimationFrame(loop);
}

// Modo de pruebas: abre el juego con ?debug al final de la dirección y, en la consola
// del navegador (F12), tendrás "hellworld" para teletransportarte, por ejemplo:
//   hellworld.teleport(5312, 1400)   // a la puerta del castillo
if (location.search.includes('debug')) {
  window.hellworld = {
    player,
    world,
    enemies,
    quest,
    input,
    layout: LAYOUT,
    get boss() {
      return boss;
    },
    teleport(x, y) {
      player.x = x;
      player.y = y;
      world.resolve(player, 11);
    },
  };
}

// El juego arranca cuando terminan de cargar los sprites
loadSprites().then(() => {
  last = performance.now();
  requestAnimationFrame(loop);
});