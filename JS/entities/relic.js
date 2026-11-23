import { drawFrame, hasSprite } from '../core/sprites.js';

// Reliquia de la misión: una luz violeta en el suelo. Se recoge al tocarla.
export class Relic {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.collected = false;
  }

  update(dt, player) {
    this.age += dt;
    if (Math.hypot(player.x - this.x, player.y - this.y) <= 40) this.collected = true;
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);
    const pulse = 1 + Math.sin(this.age * 3) * 0.15;

    ctx.fillStyle = 'rgba(180, 140, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180, 140, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    if (hasSprite('relic')) {
      const bob = Math.round(Math.sin(this.age * 2.5) * 3); // flota suavemente
      drawFrame(ctx, 'relic', Math.floor(this.age * 3) % 2, 0, cx, cy + bob);
    } else {
      ctx.fillStyle = '#b48cff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx + 11, cy);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 11, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
}