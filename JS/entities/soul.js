import { drawFrame, hasSprite } from '../core/sprites.js';

// Alma suelta por un demonio: sale disparada, y cuando te acercas
// es atraída hacia ti y se suma a tu contador.
export class Soul {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.age = 0;
    this.collected = false;

    // Pequeño impulso al aparecer, en una dirección al azar
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 80;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt, player) {
    this.age += dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const decay = Math.max(0, 1 - 6 * dt);
    this.vx *= decay;
    this.vy *= decay;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Atracción hacia el jugador cuando está cerca
    if (this.age > 0.35 && dist <= 150) {
      this.x += (dx / dist) * 400 * dt;
      this.y += (dy / dist) * 400 * dt;
    }

    if (dist <= 26) {
      this.collected = true;
      player.addSouls(this.value);
    }
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y + Math.sin(this.age * 6) * 3);

    ctx.fillStyle = 'rgba(143, 216, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    if (hasSprite('soul')) {
      drawFrame(ctx, 'soul', Math.floor(this.age * 4) % 2, 0, cx, cy);
    } else {
      ctx.fillStyle = '#8fd8ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}