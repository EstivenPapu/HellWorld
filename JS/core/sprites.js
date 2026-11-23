// Sprites en pixel art. Cada hoja es un PNG con cuadros del mismo tamaño
// (se generan con tools/generate_sprites.py). Se dibujan ampliados x2 y sin
// suavizar, así un cuadro de 16x16 ocupa 32x32 en pantalla.
export const SCALE = 2;

const SHEETS = {
  player: { src: 'assets/sprites/player.png', w: 16, h: 16 }, // 4 cuadros x 4 filas (abajo, arriba, izquierda, rodar)
  enemy: { src: 'assets/sprites/enemy.png', w: 16, h: 16 },
  boss: { src: 'assets/sprites/boss.png', w: 40, h: 40 },
  npc: { src: 'assets/sprites/npc.png', w: 16, h: 16 },
  altar: { src: 'assets/sprites/altar.png', w: 24, h: 24 },
  relic: { src: 'assets/sprites/relic.png', w: 16, h: 16 },
  soul: { src: 'assets/sprites/soul.png', w: 8, h: 8 },
  tiles: { src: 'assets/sprites/tiles.png', w: 16, h: 16 },
};

const images = {};
const tintCache = {};

// Carga todas las hojas. Si alguna falla, el juego sigue con formas simples.
export function loadSprites() {
  const jobs = Object.entries(SHEETS).map(
    ([name, sheet]) =>
      new Promise((resolve) => {
        if (typeof Image === 'undefined') {
          resolve();
          return;
        }
        const img = new Image();
        img.onload = () => {
          images[name] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`No se pudo cargar ${sheet.src}: se usan formas simples.`);
          resolve();
        };
        img.src = sheet.src;
      })
  );
  return Promise.all(jobs);
}

export function hasSprite(name) {
  return Boolean(images[name]);
}

// Copia de la hoja pintada de un solo color (para el destello blanco al recibir
// un golpe o el tinte naranja de un aviso). Se crea una vez y se guarda.
function tinted(name, color) {
  const key = `${name}|${color}`;
  if (tintCache[key]) return tintCache[key];

  const source = images[name];
  if (!source) return null;

  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const c = canvas.getContext('2d');
  c.drawImage(source, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = color;
  c.fillRect(0, 0, canvas.width, canvas.height);

  tintCache[key] = canvas;
  return canvas;
}

// Dibuja un cuadro de la hoja centrado en (cx, cy). Devuelve false si la hoja
// no cargó, para que quien llama dibuje una forma simple en su lugar.
// opciones: flip (reflejar), tint (color), alpha (transparencia)
export function drawFrame(ctx, name, col, row, cx, cy, { flip = false, tint = null, alpha = 1 } = {}) {
  const sheet = SHEETS[name];
  const img = tint ? tinted(name, tint) : images[name];
  if (!sheet || !img) return false;

  const dw = sheet.w * SCALE;
  const dh = sheet.h * SCALE;
  const sx = col * sheet.w;
  const sy = row * sheet.h;
  const top = Math.round(cy - dh / 2);

  const previousAlpha = ctx.globalAlpha;
  ctx.globalAlpha = previousAlpha * alpha;

  if (flip) {
    ctx.save();
    ctx.translate(Math.round(cx), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sheet.w, sheet.h, -dw / 2, top, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, sx, sy, sheet.w, sheet.h, Math.round(cx - dw / 2), top, dw, dh);
  }

  ctx.globalAlpha = previousAlpha;
  return true;
}

// Un cuadro de piso (esquina superior izquierda en x, y)
export function drawTile(ctx, col, x, y) {
  const img = images.tiles;
  if (!img) return false;
  const size = SHEETS.tiles.w * SCALE;
  ctx.drawImage(img, col * SHEETS.tiles.w, 0, SHEETS.tiles.w, SHEETS.tiles.h, x, y, size, size);
  return true;
}

// Sombra suave bajo los personajes, para que no floten
export function drawShadow(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}