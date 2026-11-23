import { hasSprite, drawTile, SCALE } from '../core/sprites.js';

const TILE = 16 * SCALE; // cada cuadro de piso mide 32 px en pantalla

// Número "al azar" siempre igual para un mismo cuadro (así el piso no cambia al moverte)
function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// El mapa del primer reino: piso de bosque oscuro, la base del jefe
// (piso de piedra) y una zona de brasas para probar la vida y el esquive.
export class World {
  constructor() {
    this.width = 3200;
    this.height = 3200;
    this.tile = TILE;

    // Base del demonio del reino: de aquí salen los enemigos
    this.bossBase = { x: 2500, y: 800, radius: 110 };

    // Zonas que hacen daño (alineadas al piso de 32 px)
    this.hazards = [{ x: 1312, y: 1504, w: 192, h: 192, damage: 15 }];
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

  // Qué dibujo de la hoja de pisos corresponde al cuadro (tx, ty)
  tileColumn(tx, ty, emberFrame) {
    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;

    for (const hz of this.hazards) {
      if (px >= hz.x && px < hz.x + hz.w && py >= hz.y && py < hz.y + hz.h) {
        return 6 + emberFrame; // brasas (2 cuadros animados)
      }
    }

    const b = this.bossBase;
    const h = hash(tx, ty);
    if (Math.hypot(px - b.x, py - b.y) <= b.radius) return 4 + (h % 2); // piedra

    const r = h % 100;
    if (r < 62) return 0;
    if (r < 78) return 1;
    if (r < 92) return 2;
    return 3;
  }

  draw(ctx, camera, viewWidth, viewHeight) {
    const t = TILE;
    const camX = Math.round(camera.x);
    const camY = Math.round(camera.y);
    const useTiles = hasSprite('tiles');
    const emberFrame = Math.floor(performance.now() / 500) % 2;

    // Dibujar solo los cuadros que se ven en pantalla
    const startX = Math.max(0, Math.floor(camX / t));
    const startY = Math.max(0, Math.floor(camY / t));
    const endX = Math.min(this.width / t, Math.ceil((camX + viewWidth) / t));
    const endY = Math.min(this.height / t, Math.ceil((camY + viewHeight) / t));

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const x = tx * t - camX;
        const y = ty * t - camY;
        if (useTiles) {
          drawTile(ctx, this.tileColumn(tx, ty, emberFrame), x, y);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#1a1a24' : '#1e1e2a';
          ctx.fillRect(x, y, t, t);
        }
      }
    }

    const b = this.bossBase;
    if (useTiles) {
      // Con piso de piedra solo hace falta el anillo
      ctx.strokeStyle = '#7a1f2b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(b.x - camX, b.y - camY, b.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Sin sprites: zonas de daño y base dibujadas con formas
      ctx.fillStyle = 'rgba(216, 90, 30, 0.55)';
      for (const hz of this.hazards) {
        ctx.fillRect(hz.x - camX, hz.y - camY, hz.w, hz.h);
      }

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
    }

    // Borde del reino
    ctx.strokeStyle = '#7a1f2b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camX, -camY, this.width, this.height);
  }
}