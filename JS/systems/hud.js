import { SPELLS } from './spells.js';

// Lo que se dibuja encima de todo: vida, esquive, maná, hechizos, almas y ayuda.
export class Hud {
  draw(ctx, player, spells, viewWidth, viewHeight, enemiesLeft, boss) {
    const x = 20;
    const y = 20;
    const w = 240;
    const h = 18;

    // Vida
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#3a1218';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d8344d';
    ctx.fillRect(x, y, w * (player.hp / player.maxHp), h);

    // Esquive: se llena cuando está listo
    const ready = player.rollReadiness;
    ctx.fillStyle = '#1d2a3a';
    ctx.fillRect(x, y + h + 8, w, 6);
    ctx.fillStyle = ready >= 1 ? '#5fb3ff' : '#2f6a9e';
    ctx.fillRect(x, y + h + 8, w * ready, 6);

    // Maná (parpadea en rojo si intentas un hechizo sin maná)
    const manaY = y + h + 20;
    const manaH = 12;
    ctx.fillStyle = '#1f1535';
    ctx.fillRect(x, manaY, w, manaH);
    ctx.fillStyle = '#9b6bff';
    ctx.fillRect(x, manaY, w * (player.mana / player.maxMana), manaH);
    if (player.noManaTimer > 0) {
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, manaY - 1, w + 2, manaH + 2);
    }

    // Almas
    ctx.fillStyle = '#8fd8ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`Almas: ${player.souls}`, x, manaY + manaH + 28);

    // Demonios que quedan
    ctx.fillStyle = 'rgba(232, 232, 240, 0.8)';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Demonios: ${enemiesLeft}`, x, manaY + manaH + 50);

    this.drawSpellSlots(ctx, player, spells, viewWidth, viewHeight);

    if (boss && boss.engaged) this.drawBossBar(ctx, boss, viewWidth);

    // Ayuda temporal de controles, arriba a la derecha
    ctx.fillStyle = 'rgba(232, 232, 240, 0.6)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('WASD mover · Clic izq. atacar · Espacio rodar', viewWidth - 20, 30);
    ctx.fillText('Clic der. Llama · Q Nova · E Escudo', viewWidth - 20, 52);
    ctx.textAlign = 'left';
  }

  // Barra de vida del jefe, arriba al centro
  drawBossBar(ctx, boss, viewWidth) {
    const w = Math.min(520, viewWidth - 80);
    const x = (viewWidth - w) / 2;
    const y = 44;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 3, y - 3, w + 6, 20);
    ctx.fillStyle = '#2a0f14';
    ctx.fillRect(x, y, w, 14);
    ctx.fillStyle = '#d8344d';
    ctx.fillRect(x, y, w * (boss.hp / boss.maxHp), 14);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, viewWidth / 2, y - 10);
    ctx.textAlign = 'left';
  }

  // Los 3 espacios de hechizos, abajo al centro
  drawSpellSlots(ctx, player, spells, viewWidth, viewHeight) {
    const size = 58;
    const gap = 10;
    const total = SPELLS.length * size + (SPELLS.length - 1) * gap;
    const startX = (viewWidth - total) / 2;
    const top = viewHeight - size - 24;

    ctx.textAlign = 'center';

    SPELLS.forEach((spell, i) => {
      const x0 = startX + i * (size + gap);
      const canAfford = player.mana >= spell.cost;

      // Tecla (arriba del espacio)
      ctx.fillStyle = 'rgba(232, 232, 240, 0.7)';
      ctx.font = '12px sans-serif';
      ctx.fillText(spell.keyLabel, x0 + size / 2, top - 6);

      // Fondo y borde de color
      ctx.fillStyle = 'rgba(20, 20, 28, 0.9)';
      ctx.fillRect(x0, top, size, size);
      ctx.strokeStyle = canAfford ? spell.color : '#555566';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 1.5, top + 1.5, size - 3, size - 3);

      // Nombre y costo de maná
      ctx.fillStyle = canAfford ? '#e8e8f0' : '#777788';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(spell.name, x0 + size / 2, top + 28);
      ctx.fillStyle = '#9b6bff';
      ctx.font = '12px sans-serif';
      ctx.fillText(String(spell.cost), x0 + size / 2, top + 47);

      // Espera: una cortina oscura que va bajando
      const progress = spells.cooldownProgress(i);
      if (progress < 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(x0, top, size, size * (1 - progress));
      }
    });

    ctx.textAlign = 'left';
  }
}