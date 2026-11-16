import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { World } from './systems/world.js';
import { Hud } from './systems/hud.js';
import { Player } from './entities/player.js';
import { Dummy } from './entities/dummy.js';

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

// Muñecos de práctica para probar el golpe
const dummies = [
  new Dummy(1800, 1600),
  new Dummy(1800, 1760),
];

let last = performance.now();

function loop(now) {
  // dt en segundos, con tope para que no haya saltos si la pestaña se pausa
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // 1. Actualizar
  player.update(dt, input, world, camera, dummies);
  dummies.forEach((d) => d.update(dt));

  const hazardDamage = world.getHazardDamage(player);
  if (hazardDamage > 0) player.takeDamage(hazardDamage);

  // Temporal: al morir reaparece en el centro (el hito 5 lo reemplaza)
  if (player.hp <= 0) player.respawn(world.width / 2, world.height / 2);

  camera.follow(player, canvas.width, canvas.height);

  // 2. Dibujar
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world.draw(ctx, camera, canvas.width, canvas.height);
  dummies.forEach((d) => d.draw(ctx, camera));
  player.draw(ctx, camera);
  hud.draw(ctx, player, canvas.height);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);