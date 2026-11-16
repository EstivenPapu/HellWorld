import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { World } from './systems/world.js';
import { Player } from './entities/player.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = new Input();
const world = new World();
const player = new Player(world.width / 2, world.height / 2);
const camera = new Camera(world.width, world.height);

let last = performance.now();

function loop(now) {
  // dt en segundos, con tope para que no haya saltos si la pestaña se pausa
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // 1. Actualizar
  player.update(dt, input, world);
  camera.follow(player, canvas.width, canvas.height);

  // 2. Dibujar
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world.draw(ctx, camera, canvas.width, canvas.height);
  player.draw(ctx, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
