import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { World } from './systems/world.js';
import { Hud } from './systems/hud.js';
import { Player } from './entities/player.js';
import { Enemy, separateEnemies } from './entities/enemy.js';
import { Soul } from './entities/soul.js';

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
const player = new Player(world.width / 2, world.height / 2);

// Los demonios rondan la base del jefe, repartidos en círculo
function spawnEnemies(base, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + 0.3;
    const distance = base.radius + 160;
    list.push(
      new Enemy(
        base.x + Math.cos(angle) * distance,
        base.y + Math.sin(angle) * distance
      )
    );
  }
  return list;
}

const enemies = spawnEnemies(world.bossBase, 5);
const souls = [];

let last = performance.now();

function loop(now) {
  // dt en segundos, con tope para que no haya saltos si la pestaña se pausa
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // 1. Actualizar
  player.update(dt, input, world, camera, enemies);
  for (const e of enemies) e.update(dt, player, world);
  separateEnemies(enemies);

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

  const hazardDamage = world.getHazardDamage(player);
  if (hazardDamage > 0) player.takeDamage(hazardDamage);

  // Temporal: al morir reaparece en el centro (el hito 5 lo reemplaza)
  if (player.hp <= 0) player.respawn(world.width / 2, world.height / 2);

  camera.follow(player, canvas.width, canvas.height);

  // 2. Dibujar
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world.draw(ctx, camera, canvas.width, canvas.height);
  souls.forEach((s) => s.draw(ctx, camera));
  enemies.forEach((e) => e.draw(ctx, camera));
  player.draw(ctx, camera);
  hud.draw(ctx, player, canvas.height, enemies.length);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);