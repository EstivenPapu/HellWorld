import { WORLD_SIZE } from './layout.js';

const TILE = 32;
const COLS = WORLD_SIZE / TILE; // 200: el minimapa guarda 1 pixel por cuadro del mundo

const COLORS = {
  grass: '#1b2c21',
  stone: '#4a4a66',
  ruin: '#383852',
  dirt: '#6a4a2a',
  ember: '#d8501a',
  wall: '#b4b4d4',
  tree: '#2f8a4e',
  rock: '#8a8aa2',
  pillar: '#a0a0be',
};

// Minimapa abajo a la izquierda y mapa grande (tecla N). Muestra todo el terreno
// desde el inicio; las marcas son el altar, el Peregrino, la reliquia de la misión
// activa y tú. El terreno se dibuja una sola vez en un lienzo aparte.
export class Minimap {
  constructor(world) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = COLS;
    this.canvas.height = COLS;
    const c = this.canvas.getContext('2d');

    for (let ty = 0; ty < COLS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const col = world.tileColumn(tx, ty, 0);
        let color = COLORS.ruin;
        if (col <= 3) color = COLORS.grass;
        else if (col <= 5) color = COLORS.stone;
        else if (col <= 7) color = COLORS.ember;
        else if (col <= 9) color = COLORS.dirt;
        if (world.wallAt(tx, ty)) color = COLORS.wall;
        c.fillStyle = color;
        c.fillRect(tx, ty, 1, 1);
      }
    }

    for (const cell of world.cells) {
      if (!cell) continue;
      for (const p of cell) {
        const tx = Math.floor(p.x / TILE);
        const ty = Math.floor(p.y / TILE);
        if (p.type === 'tree') {
          c.fillStyle = COLORS.tree;
          c.fillRect(tx, ty, 2, 2); // un poco más grande para que el bosque se note
        } else {
          c.fillStyle = p.type === 'rock' ? COLORS.rock : COLORS.pillar;
          c.fillRect(tx, ty, 1, 1);
        }
      }
    }
  }

  // Minimapa chico. Devuelve su rectángulo en pantalla (para detectar toques).
  draw(ctx, viewW, viewH, touch, s) {
    const size = touch ? 150 : 200;
    const x = 16;
    const y = viewH - size - 16;
    this.paint(ctx, x, y, size, s, false);
    return { x, y, w: size, h: size };
  }

  // Mapa grande: pausa el juego (el cambio de estado lo hace main.js)
  drawBig(ctx, viewW, viewH, touch, s) {
    ctx.fillStyle = 'rgba(5, 5, 10, 0.82)';
    ctx.fillRect(0, 0, viewW, viewH);

    // Escala entera (2x, 3x...) para que los pixeles queden parejos
    const scale = Math.max(1, Math.floor(Math.min(viewW - 40, viewH - 110) / COLS));
    const size = scale * COLS;
    const x = Math.round((viewW - size) / 2);
    const y = Math.round((viewH - size) / 2) + 12;
    this.paint(ctx, x, y, size, s, true);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e8f0';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Mapa del reino', viewW / 2, y - 18);
    ctx.fillStyle = 'rgba(232, 232, 240, 0.7)';
    ctx.font = '14px sans-serif';
    ctx.fillText(touch ? 'Toca para cerrar' : 'N o Esc para cerrar', viewW / 2, y + size + 28);
    ctx.textAlign = 'left';
  }

  // Dibuja el terreno y las marcas (igual para el chico y el grande)
  paint(ctx, x, y, size, s, big) {
    const k = size / WORLD_SIZE; // píxeles de pantalla por píxel del mundo
    const pulse = 1 + Math.sin(performance.now() / 250) * 0.25;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 4, y - 4, size + 8, size + 8);

    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false; // sin suavizado se ve nítido
    ctx.drawImage(this.canvas, x, y, size, size);
    ctx.imageSmoothingEnabled = smoothing;

    ctx.strokeStyle = '#7a1f2b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);

    // Lo que se ve ahora en pantalla (solo en el minimapa chico)
    //if (!big) {
    //  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    //  ctx.lineWidth = 1;
    //  ctx.strokeRect(
    //    Math.round(x + s.camera.x * k) + 0.5,
    //    Math.round(y + s.camera.y * k) + 0.5,
    //    Math.round(s.viewW * k),
    //    Math.round(s.viewH * k)
    //  );
    //}

    const r = big ? 5 : 3; // tamaño de las marcas
    const label = (text, px, py) => {
      if (!big) return;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, px + r + 6, py + 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, px + r + 6, py + 4);
    };

    // Altar (rombo celeste)
    const ax = x + s.altar.x * k;
    const ay = y + s.altar.y * k;
    ctx.fillStyle = '#8fd8ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay - r - 1);
    ctx.lineTo(ax + r + 1, ay);
    ctx.lineTo(ax, ay + r + 1);
    ctx.lineTo(ax - r - 1, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    label('Altar', ax, ay);

    // Peregrino (círculo dorado; late cuando ya puedes entregarle la misión)
    const nx = x + s.npc.x * k;
    const ny = y + s.npc.y * k;
    if (s.questState === 'ready') {
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nx, ny, (r + 3) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd27a';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(nx, ny, r - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(s.questState === 'ready' ? 'Peregrino (entrega)' : 'Peregrino', nx, ny);

    // Reliquia de la misión activa (violeta que late)
    if (s.relic) {
      const rx = x + s.relic.x * k;
      const ry = y + s.relic.y * k;
      ctx.fillStyle = '#b48cff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label('Reliquia', rx, ry);
    }

    // Tú: flecha blanca hacia donde miras
    const px = x + s.player.x * k;
    const py = y + s.player.y * k;
    const angle = Math.atan2(s.player.facing.y, s.player.facing.x);
    const a = r + 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(angle) * a, py + Math.sin(angle) * a);
    ctx.lineTo(px + Math.cos(angle + 2.5) * a, py + Math.sin(angle + 2.5) * a);
    ctx.lineTo(px + Math.cos(angle - 2.5) * a, py + Math.sin(angle - 2.5) * a);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
