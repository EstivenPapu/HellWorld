// El mapa del primer reino: piso de cuadros, borde, la base del jefe
// y una zona de daño para probar la vida y el esquive.
export class World {
  constructor() {
    this.width = 3200;
    this.height = 3200;
    this.tile = 64;

    // Base del demonio del reino: de aquí salen los enemigos
    this.bossBase = { x: 2500, y: 800, radius: 110 };

    // Zonas que hacen daño (temporal, solo para probar)
    this.hazards = [{ x: 1300, y: 1500, w: 200, h: 200, damage: 15 }];
  }

  // Daño que recibe una entidad cuadrada si está pisando una zona de daño
  getHazardDamage(entity) {
    const half = entity.size / 2;
    for (const hz of this.hazards) {
      const overlaps =
        entity.x + half > hz.x &&
        entity.x - half < hz.x + hz.w &&
        entity.y + half > hz.y &&
        entity.y - half < hz.y + hz.h;
      if (overlaps) return hz.damage;
    }
    return 0;
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

    // Zonas de daño
    ctx.fillStyle = 'rgba(216, 90, 30, 0.55)';
    for (const hz of this.hazards) {
      ctx.fillRect(hz.x - camX, hz.y - camY, hz.w, hz.h);
    }

    // Base del jefe
    const b = this.bossBase;
    ctx.fillStyle = '#2a0f14';
    ctx.beginPath();
    ctx.arc(b.x - camX, b.y - camY, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a1f2b';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#4a1520';
    ctx.beginPath();
    ctx.arc(b.x - camX, b.y - camY, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Borde del reino
    ctx.strokeStyle = '#7a1f2b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camX, -camY, this.width, this.height);
  }
}