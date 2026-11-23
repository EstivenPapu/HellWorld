import { drawFrame, drawShadow, hasSprite } from '../core/sprites.js';

// Altar del reino: aquí reapareces al morir y gastas las almas.
export class Altar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.interactRange = 90;
  }

  isNear(player) {
    return Math.hypot(player.x - this.x, player.y - this.y) <= this.interactRange;
  }

  draw(ctx, camera, showPrompt, touch = false) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    // Zona de interacción
    ctx.strokeStyle = 'rgba(143, 216, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, this.interactRange, 0, Math.PI * 2);
    ctx.stroke();

    if (hasSprite('altar')) {
      drawShadow(ctx, cx, cy + 19, 24, 6);
      drawFrame(ctx, 'altar', Math.floor(performance.now() / 700) % 2, 0, cx, cy);
    } else {
      // Sin sprites: piedra y cristal simples
      ctx.fillStyle = '#2a2a38';
      ctx.fillRect(cx - 26, cy - 26, 52, 52);
      ctx.strokeStyle = '#8fd8ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 26, cy - 26, 52, 52);

      ctx.fillStyle = '#8fd8ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 10, cy);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx - 10, cy);
      ctx.closePath();
      ctx.fill();
    }

    if (showPrompt) {
      const text = touch ? 'Descansar y mejorar' : 'F · Descansar y mejorar';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(cx - w / 2, cy - 64, w, 26);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(text, cx, cy - 46);
      ctx.textAlign = 'left';
    }
  }
}