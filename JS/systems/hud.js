// Lo que se dibuja encima de todo: vida, esquive, almas y ayuda de controles.
export class Hud {
  draw(ctx, player, viewHeight, enemiesLeft) {
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

    // Almas
    ctx.fillStyle = '#8fd8ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`Almas: ${player.souls}`, x, y + h + 40);

    // Demonios que quedan
    ctx.fillStyle = 'rgba(232, 232, 240, 0.8)';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Demonios: ${enemiesLeft}`, x, y + h + 62);

    // Ayuda temporal de controles
    ctx.fillStyle = 'rgba(232, 232, 240, 0.6)';
    ctx.fillText('WASD mover · Clic izquierdo atacar · Espacio rodar', x, viewHeight - 20);
  }
}