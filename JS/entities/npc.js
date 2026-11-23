import { drawFrame, drawShadow, hasSprite } from '../core/sprites.js';

// Personaje con el que se puede hablar. Muestra "!" si tiene una misión
// para ti y "?" si ya puedes entregarla.
export class Npc {
  constructor(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.interactRange = 80;
  }

  isNear(player) {
    return Math.hypot(player.x - this.x, player.y - this.y) <= this.interactRange;
  }

  draw(ctx, camera, showPrompt, questState, touch = false) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    if (hasSprite('npc')) {
      drawShadow(ctx, cx, cy + 14, 13, 4);
      drawFrame(ctx, 'npc', Math.floor(performance.now() / 600) % 2, 0, cx, cy);
    } else {
      // Sin sprites: capucha y cuerpo simples
      ctx.fillStyle = '#8a7a4a';
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 8);
      ctx.lineTo(cx, cy - 30);
      ctx.lineTo(cx + 14, cy - 8);
      ctx.fill();
      ctx.fillStyle = '#c9b27a';
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Marca de misión
    const mark = questState === 'available' ? '!' : questState === 'ready' ? '?' : '';
    if (mark) {
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mark, cx, cy - 38);
      ctx.textAlign = 'left';
    }

    if (showPrompt) {
      const text = touch ? `Hablar con ${this.name}` : `F · Hablar con ${this.name}`;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(cx - w / 2, cy + 28, w, 26);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(text, cx, cy + 46);
      ctx.textAlign = 'left';
    }
  }
}