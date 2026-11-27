import { hasSprite, drawTile, drawFrame, drawShadow, SCALE } from '../core/sprites.js';
import { LAYOUT, WORLD_SIZE } from './layout.js';

const T = 16 * SCALE;            // cada cuadro mide 32 px en pantalla
const COLS = WORLD_SIZE / T;     // 200 cuadros por lado
const CELL = 128;                // tamaño de las celdas donde se guardan árboles y rocas
const CELLS = Math.ceil(WORLD_SIZE / CELL);

// Número "al azar" siempre igual para un mismo punto (el mapa no cambia entre partidas)
function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruido suave entre 0 y 1: sirve para hacer bosques espesos y claros abiertos
function noise(x, y, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const v = (ix, iy) => (hash(ix + seed, iy - seed) % 1000) / 1000;
  const a = v(x0, y0);
  const b = v(x0 + 1, y0);
  const c = v(x0, y0 + 1);
  const d = v(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function rectsTouch(a, b, pad = 0) {
  return a.x0 - pad < b.x1 && a.x1 + pad > b.x0 && a.y0 - pad < b.y1 && a.y1 + pad > b.y0;
}

function inRect(x, y, r, pad = 0) {
  return x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad;
}

// El mapa del primer reino: bosque oscuro, ruinas, claros y el castillo del jefe.
// Se genera con una semilla fija, así que es siempre el mismo.
export class World {
  constructor() {
    this.width = WORLD_SIZE;
    this.height = WORLD_SIZE;
    this.tile = T;

    this.bossBase = { x: LAYOUT.boss.x, y: LAYOUT.boss.y, radius: 110 };
    const half = LAYOUT.castle.half;
    this.castle = {
      x0: LAYOUT.boss.x - half,
      y0: LAYOUT.boss.y - half,
      x1: LAYOUT.boss.x + half,
      y1: LAYOUT.boss.y + half,
    };

    this.hazards = []; // brasas: se generan en scatterHazards()
    this.camps = LAYOUT.camps;

    this.wallGrid = new Uint8Array(COLS * COLS); // 0 = libre, 1..5 = muro (1 + tipo de bloque)
    this.cells = new Array(CELLS * CELLS);        // árboles, rocas y pilares por celda
    this.floorRects = [];                         // pisos de las ruinas
    this.dirtCircles = [
      { x: LAYOUT.altar.x, y: LAYOUT.altar.y, r: 150 },
      ...LAYOUT.camps.map((c) => ({ x: c.x, y: c.y, r: 70 })),
    ];
    this.gateTiles = [];

    this.generate();
  }

  // ---------- Generación ----------
  generate() {
    const rnd = mulberry32(20261123);
    this.buildCastle();
    for (const ruin of LAYOUT.ruins) this.buildRuin(ruin, rnd);
    this.scatterHazards();
    this.scatterProps(rnd);
  }

  setWall(tx, ty, type) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= COLS) return;
    this.wallGrid[ty * COLS + tx] = type + 1;
  }

  wallAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= COLS) return 0;
    return this.wallGrid[ty * COLS + tx];
  }

  // Muros del castillo con una puerta de 3 cuadros en el lado sur
  buildCastle() {
    const c = this.castle;
    const tx0 = Math.round(c.x0 / T);
    const tx1 = Math.round(c.x1 / T) - 1;
    const ty0 = Math.round(c.y0 / T);
    const ty1 = Math.round(c.y1 / T) - 1;
    const midX = Math.round(LAYOUT.boss.x / T);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx !== tx0 && tx !== tx1 && ty !== ty0 && ty !== ty1) continue;
        if (ty === ty1 && Math.abs(tx - midX) <= 1) {
          this.gateTiles.push({ tx, ty });
          continue;
        }
        this.setWall(tx, ty, hash(tx, ty) % 3 === 0 ? 1 : 0);
      }
    }
  }

  // Abre o cierra la puerta del castillo (en la 0.15 la abrirán las 2 llaves)
  setGateOpen(open) {
    for (const g of this.gateTiles) {
      if (open) this.wallGrid[g.ty * COLS + g.tx] = 0;
      else this.setWall(g.tx, g.ty, 4);
    }
  }

  // Ruinas: muros con huecos, una puerta en cada lado y pilares rotos adentro
  buildRuin(ruin, rnd) {
    const left = Math.round(ruin.x / T - ruin.w / 2);
    const top = Math.round(ruin.y / T - ruin.h / 2);
    const right = left + ruin.w - 1;
    const bottom = top + ruin.h - 1;
    const midX = left + Math.floor(ruin.w / 2);
    const midY = top + Math.floor(ruin.h / 2);

    this.floorRects.push({ x0: left * T, y0: top * T, x1: (right + 1) * T, y1: (bottom + 1) * T });

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (tx !== left && tx !== right && ty !== top && ty !== bottom) continue;
        const sideDoor = (ty === top || ty === bottom) && Math.abs(tx - midX) <= 1;
        const endDoor = (tx === left || tx === right) && Math.abs(ty - midY) <= 1;
        if (sideDoor || endDoor) continue;
        if (rnd() < 0.18) continue; // muro caído
        const r = rnd();
        this.setWall(tx, ty, r < 0.2 ? 1 : r < 0.4 ? 2 : 0);
      }
    }

    // Pilares rotos adentro, sin tapar el centro (ahí irán el tesoro o el guardián)
    const pillars = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < pillars; i++) {
      const px = (left + 2 + rnd() * (ruin.w - 4)) * T;
      const py = (top + 2 + rnd() * (ruin.h - 4)) * T;
      if (Math.hypot(px - ruin.x, py - ruin.y) < 110) continue;
      this.addProp('pillar', px, py, 11, 0);
    }
  }

  addProp(type, x, y, r, variant) {
    const index = Math.floor(y / CELL) * CELLS + Math.floor(x / CELL);
    (this.cells[index] ||= []).push({ type, x, y, r, variant });
  }

  // ¿Esta zona debe quedar despejada? (altar, campamentos, ruinas, castillo...)
  isCleared(x, y) {
    const a = LAYOUT.altar;
    if (Math.hypot(x - a.x, y - a.y) < 320) return true;
    if (Math.hypot(x - LAYOUT.relic.x, y - LAYOUT.relic.y) < 140) return true;
    for (const c of LAYOUT.camps) if (Math.hypot(x - c.x, y - c.y) < 150) return true;
    if (inRect(x, y, this.castle, 330)) return true;
    for (const f of this.floorRects) if (inRect(x, y, f, 70)) return true;
    for (const h of this.hazards) {
      if (inRect(x, y, { x0: h.x, y0: h.y, x1: h.x + h.w, y1: h.y + h.h }, 64)) return true;
    }
    return false;
  }

  // Brasas repartidas por el mapa: grupos de 2x2 a 4x4 cuadros. La mitad aparece cerca de los
  // campamentos de demonios, para que un mal paso en plena pelea te cueste vida.
  scatterHazards() {
    const cfg = LAYOUT.hazardPatches;
    const rnd = mulberry32(777); // semilla propia: no cambia el bosque
    const spread = cfg.maxSize - cfg.minSize + 1;
    let tries = 0;

    while (this.hazards.length < cfg.count && tries < 5000) {
      tries++;
      const w = cfg.minSize + Math.floor(rnd() * spread);
      const h = cfg.minSize + Math.floor(rnd() * spread);

      let cx;
      let cy;
      if (this.hazards.length % 2 === 0 && LAYOUT.camps.length) {
        const camp = LAYOUT.camps[Math.floor(rnd() * LAYOUT.camps.length)];
        const angle = rnd() * Math.PI * 2;
        const dist = 130 + rnd() * 110;
        cx = camp.x + Math.cos(angle) * dist;
        cy = camp.y + Math.sin(angle) * dist;
      } else {
        cx = 250 + rnd() * (WORLD_SIZE - 500);
        cy = 250 + rnd() * (WORLD_SIZE - 500);
      }

      const rect = {
        x: Math.round((cx - (w * T) / 2) / T) * T,
        y: Math.round((cy - (h * T) / 2) / T) * T,
        w: w * T,
        h: h * T,
        damage: cfg.damage,
      };
      if (this.patchFits(rect)) this.hazards.push(rect);
    }
  }

  // ¿Cabe este grupo de brasas sin estorbar al altar, las ruinas, el castillo o un campamento?
  patchFits(r) {
    const x1 = r.x + r.w;
    const y1 = r.y + r.h;
    const mx = r.x + r.w / 2;
    const my = r.y + r.h / 2;

    if (r.x < 200 || r.y < 200 || x1 > WORLD_SIZE - 200 || y1 > WORLD_SIZE - 200) return false;

    // Lejos del altar, de la reliquia y del castillo
    if (Math.hypot(mx - LAYOUT.altar.x, my - LAYOUT.altar.y) < 450) return false;
    if (Math.hypot(mx - LAYOUT.relic.x, my - LAYOUT.relic.y) < 260) return false;
    if (Math.hypot(mx - LAYOUT.boss.x, my - LAYOUT.boss.y) < 760) return false;

    // Sin tocar ruinas ni otras brasas
    const box = { x0: r.x, y0: r.y, x1, y1 };
    for (const f of this.floorRects) if (rectsTouch(box, f, 80)) return false;
    for (const h of this.hazards) {
      if (rectsTouch(box, { x0: h.x, y0: h.y, x1: h.x + h.w, y1: h.y + h.h }, 64)) return false;
    }

    // Sin tapar a los demonios de un campamento
    for (const c of LAYOUT.camps) {
      if (c.x > r.x - 70 && c.x < x1 + 70 && c.y > r.y - 70 && c.y < y1 + 70) return false;
    }
    return true;
  }

  // Árboles y rocas: más espesos en unas zonas y casi vacíos en otras (claros)
  scatterProps(rnd) {
    const step = 112;
    const n = Math.ceil(WORLD_SIZE / step);

    for (let cy = 0; cy < n; cy++) {
      for (let cx = 0; cx < n; cx++) {
        const x = cx * step + step / 2 + (rnd() - 0.5) * 40;
        const y = cy * step + step / 2 + (rnd() - 0.5) * 40;
        const roll = rnd();
        const kind = rnd();
        const pick = rnd();
        // Más pinos y robles; los árboles carmesí y los muertos son más escasos
        const treeVariant = pick < 0.35 ? 0 : pick < 0.65 ? 1 : pick < 0.87 ? 2 : 3;
        const rockVariant = Math.floor(pick * 3);

        if (x < 30 || y < 30 || x > WORLD_SIZE - 30 || y > WORLD_SIZE - 30) continue;
        if (this.isCleared(x, y)) continue;

        const edge = Math.min(x, y, WORLD_SIZE - x, WORLD_SIZE - y) < 220;
        const density = edge ? 0.95 : 0.12 + 0.75 * Math.pow(noise(x, y, 900, 7), 1.6);

        if (roll < density) this.addProp('tree', x, y, 12, treeVariant);
        else if (kind < 0.07) this.addProp('rock', x, y, 12, rockVariant);
      }
    }
  }

  // ---------- Choques ----------
  // ¿Un círculo en (x, y) con radio r toca un muro, un árbol, una roca o el borde?
  collides(x, y, r) {
    if (x < r || y < r || x > this.width - r || y > this.height - r) return true;

    const tx0 = Math.floor((x - r) / T);
    const tx1 = Math.floor((x + r) / T);
    const ty0 = Math.floor((y - r) / T);
    const ty1 = Math.floor((y + r) / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!this.wallAt(tx, ty)) continue;
        const cx = Math.min(Math.max(x, tx * T), tx * T + T);
        const cy = Math.min(Math.max(y, ty * T), ty * T + T);
        if (Math.hypot(x - cx, y - cy) < r) return true;
      }
    }

    return this.propNear(x, y, r) !== null;
  }

  propNear(x, y, r) {
    const c0x = Math.max(0, Math.floor((x - r - 24) / CELL));
    const c1x = Math.min(CELLS - 1, Math.floor((x + r + 24) / CELL));
    const c0y = Math.max(0, Math.floor((y - r - 24) / CELL));
    const c1y = Math.min(CELLS - 1, Math.floor((y + r + 24) / CELL));
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const list = this.cells[cy * CELLS + cx];
        if (!list) continue;
        for (const p of list) {
          if (Math.hypot(x - p.x, y - p.y) < r + p.r) return p;
        }
      }
    }
    return null;
  }

  // Para proyectiles: ¿hay algo sólido en este punto?
  isBlocked(x, y, r = 2) {
    return this.collides(x, y, r);
  }

  // Igual que resolve, pero avanzando poco a poco desde donde estaba (px, py) hasta donde
  // quedó. Así un movimiento rápido (rodar, la embestida del jefe) no atraviesa un muro.
  resolveMove(e, r, px, py) {
    const dx = e.x - px;
    const dy = e.y - py;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
    e.x = px;
    e.y = py;
    for (let i = 0; i < steps; i++) {
      e.x += dx / steps;
      e.y += dy / steps;
      this.resolve(e, r);
    }
  }

  // Saca a una entidad (con x, y) de los muros, árboles y rocas con los que choca
  resolve(e, r) {
    for (let i = 0; i < 2; i++) {
      this.pushOutOfWalls(e, r);
      this.pushOutOfProps(e, r);
    }
    e.x = Math.min(Math.max(e.x, r), this.width - r);
    e.y = Math.min(Math.max(e.y, r), this.height - r);
  }

  pushOutOfWalls(e, r) {
    const tx0 = Math.floor((e.x - r) / T);
    const tx1 = Math.floor((e.x + r) / T);
    const ty0 = Math.floor((e.y - r) / T);
    const ty1 = Math.floor((e.y + r) / T);

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!this.wallAt(tx, ty)) continue;

        const rx = tx * T;
        const ry = ty * T;
        const cx = Math.min(Math.max(e.x, rx), rx + T);
        const cy = Math.min(Math.max(e.y, ry), ry + T);
        const dx = e.x - cx;
        const dy = e.y - cy;
        const d = Math.hypot(dx, dy);
        if (d >= r) continue;

        if (d > 0.0001) {
          const push = r - d;
          e.x += (dx / d) * push;
          e.y += (dy / d) * push;
        } else {
          // El centro quedó dentro del bloque: sale por el lado libre más cercano
          const exits = [
            { d: e.x - rx, free: !this.wallAt(tx - 1, ty), apply: () => (e.x = rx - r) },
            { d: rx + T - e.x, free: !this.wallAt(tx + 1, ty), apply: () => (e.x = rx + T + r) },
            { d: e.y - ry, free: !this.wallAt(tx, ty - 1), apply: () => (e.y = ry - r) },
            { d: ry + T - e.y, free: !this.wallAt(tx, ty + 1), apply: () => (e.y = ry + T + r) },
          ];
          const open = exits.filter((x) => x.free);
          const pool = open.length ? open : exits;
          pool.sort((a, b) => a.d - b.d)[0].apply();
        }
      }
    }
  }

  pushOutOfProps(e, r) {
    const c0x = Math.max(0, Math.floor((e.x - r - 24) / CELL));
    const c1x = Math.min(CELLS - 1, Math.floor((e.x + r + 24) / CELL));
    const c0y = Math.max(0, Math.floor((e.y - r - 24) / CELL));
    const c1y = Math.min(CELLS - 1, Math.floor((e.y + r + 24) / CELL));

    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const list = this.cells[cy * CELLS + cx];
        if (!list) continue;
        for (const p of list) {
          const min = r + p.r;
          let dx = e.x - p.x;
          let dy = e.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 0.0001) {
            dx = 1;
            dy = 0;
          }
          const len = Math.hypot(dx, dy);
          e.x = p.x + (dx / len) * min;
          e.y = p.y + (dy / len) * min;
        }
      }
    }
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

  // ---------- Dibujo ----------
  // Qué dibujo de la hoja de pisos corresponde al cuadro (tx, ty)
  tileColumn(tx, ty, emberFrame) {
    const px = tx * T + T / 2;
    const py = ty * T + T / 2;
    const h = hash(tx, ty);

    for (const hz of this.hazards) {
      if (px >= hz.x && px < hz.x + hz.w && py >= hz.y && py < hz.y + hz.h) return 6 + emberFrame;
    }
    if (inRect(px, py, this.castle)) return 4 + (h % 2); // piedra dentro del castillo
    for (const f of this.floorRects) if (inRect(px, py, f)) return 10 + (h % 2); // piso de ruinas
    for (const d of this.dirtCircles) {
      const dist = Math.hypot(px - d.x, py - d.y);
      if (dist < d.r && !(dist > d.r * 0.75 && h % 100 < 45)) return 8 + (h % 2); // tierra
    }

    const r = h % 100;
    if (r < 62) return 0;
    if (r < 78) return 1;
    if (r < 92) return 2;
    return 3;
  }

  // Piso, muros y bordes (los árboles y rocas se dibujan aparte, ordenados con los personajes)
  draw(ctx, camera, viewWidth, viewHeight) {
    const camX = Math.round(camera.x);
    const camY = Math.round(camera.y);
    const useTiles = hasSprite('tiles');
    const useWalls = hasSprite('walls');
    const emberFrame = Math.floor(performance.now() / 500) % 2;

    const startX = Math.max(0, Math.floor(camX / T));
    const startY = Math.max(0, Math.floor(camY / T));
    const endX = Math.min(COLS, Math.ceil((camX + viewWidth) / T));
    const endY = Math.min(COLS, Math.ceil((camY + viewHeight) / T));

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const x = tx * T - camX;
        const y = ty * T - camY;

        if (useTiles) {
          drawTile(ctx, this.tileColumn(tx, ty, emberFrame), x, y);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#1a1a24' : '#1e1e2a';
          ctx.fillRect(x, y, T, T);
        }

        const wall = this.wallAt(tx, ty);
        if (wall) {
          if (useWalls) {
            drawFrame(ctx, 'walls', wall - 1, 0, x + T / 2, y + T / 2);
          } else {
            ctx.fillStyle = '#5a5a74';
            ctx.fillRect(x, y, T, T);
          }
        }
      }
    }

    if (!useTiles) {
      // Sin sprites: zonas de daño dibujadas con formas
      ctx.fillStyle = 'rgba(216, 90, 30, 0.55)';
      for (const hz of this.hazards) ctx.fillRect(hz.x - camX, hz.y - camY, hz.w, hz.h);
    }

    // Borde del reino
    ctx.strokeStyle = '#7a1f2b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camX, -camY, this.width, this.height);
  }

  // Árboles, rocas y pilares que se ven en pantalla
  visibleProps(camera, viewWidth, viewHeight) {
    const out = [];
    const c0x = Math.max(0, Math.floor((camera.x - 64) / CELL));
    const c1x = Math.min(CELLS - 1, Math.floor((camera.x + viewWidth + 64) / CELL));
    const c0y = Math.max(0, Math.floor((camera.y - 64) / CELL));
    const c1y = Math.min(CELLS - 1, Math.floor((camera.y + viewHeight + 96) / CELL));

    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const list = this.cells[cy * CELLS + cx];
        if (list) for (const p of list) out.push(p);
      }
    }
    return out;
  }

  // focus: el jugador; los árboles se vuelven transparentes si estás detrás de ellos
  drawProp(ctx, prop, camera, focus) {
    const sx = Math.round(prop.x - camera.x);
    const sy = Math.round(prop.y - camera.y);

    if (prop.type === 'tree') {
      if (hasSprite('trees')) {
        drawShadow(ctx, sx, sy + 2, 16, 6);
        let alpha = 1;
        if (focus && focus.y < prop.y && focus.y > prop.y - 72 && Math.abs(focus.x - prop.x) < 30) {
          alpha = 0.5;
        }
        drawFrame(ctx, 'trees', prop.variant, 0, sx, sy + 6 - 32, { alpha });
      } else {
        ctx.fillStyle = '#3a2616';
        ctx.fillRect(sx - 4, sy - 6, 8, 10);
        ctx.fillStyle = '#17331f';
        ctx.beginPath();
        ctx.arc(sx, sy - 22, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (prop.type === 'rock') {
      if (hasSprite('rocks')) {
        drawShadow(ctx, sx, sy + 2, 12, 4);
        drawFrame(ctx, 'rocks', prop.variant, 0, sx, sy - 8);
      } else {
        ctx.fillStyle = '#4a4a5c';
        ctx.beginPath();
        ctx.arc(sx, sy - 6, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hasSprite('walls')) {
      drawShadow(ctx, sx, sy + 3, 12, 4);
      drawFrame(ctx, 'walls', 3, 0, sx, sy - 9);
    } else {
      ctx.fillStyle = '#64647e';
      ctx.fillRect(sx - 8, sy - 20, 16, 22);
    }
  }
}