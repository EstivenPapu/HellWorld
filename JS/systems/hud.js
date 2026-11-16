// Lo que se dibuja encima de todo: vida, esquive y ayuda de controles.
export class Hud {
  draw(ctx, player, viewHeight) {
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

    // Ayuda temporal de controles
    ctx.fillStyle = 'rgba(232, 232, 240, 0.6)';
    ctx.font = '14px sans-serif';
    ctx.fillText('WASD mover · Clic izquierdo atacar · Espacio rodar', x, viewHeight - 20);
  }
}