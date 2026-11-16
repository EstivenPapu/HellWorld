// El mapa del primer reino. Por ahora es un piso de cuadros y un borde,
// lo justo para ver que la cámara se mueve.
export class World {
  constructor() {
    this.width = 3200;
    this.height = 3200;
    this.tile = 64;
  }

  draw(ctx, camera, viewWidth, viewHeight) {
    const t = this.tile;
    const camX = Math.round(camera.x);
    const camY = Math.round(camera.y);

    // Dibujar solo los cuadros que se ven en pantalla
    const startX = Math.max(0, Math.floor(camX / t));
    const startY = Math.max(0, Math.floor(camY / t));
    const endX = Math.min(this.width / t, Math.ceil((camX + viewWidth) / t));
    const endY = Math.min(this.height / t, Math.ceil((camY + viewHeight) / t));

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#1a1a24' : '#1e1e2a';
        ctx.fillRect(tx * t - camX, ty * t - camY, t, t);
      }
    }

    // Borde del reino
    ctx.strokeStyle = '#7a1f2b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camX, -camY, this.width, this.height);
  }
}
