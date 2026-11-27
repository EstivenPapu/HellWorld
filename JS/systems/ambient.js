// Ambiente del mundo: polvo flotando, hojas que caen, nubes que pasan y lluvia ligera
// que va y viene. Todo se dibuja encima del juego con poca opacidad, así que no tapa
// la visibilidad. Ajusta las cantidades aquí (en celular se usa menos de cada cosa).
const CONFIG = {
  dust: 36,     // motas de polvo
  leaves: 30,   // hojas cayendo
  clouds: 6,    // nubes grandes y muy suaves
  rain: 110,    // gotas cuando llueve a todo
};

const LEAF_COLORS = ['#3a5a2a', '#5a3a1e', '#7a1f2b', '#2c4a34'];
const rand = (a, b) => a + Math.random() * (b - a);

// Una nube pequeña que luego se amplía sin suavizar: queda en bloques, como el resto del arte
function makeCloudSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 20;
  const c = canvas.getContext('2d');
  c.fillStyle = '#c8d2e6';
  const blobs = [[12, 11, 9, 5], [22, 9, 11, 6], [30, 12, 8, 4], [18, 14, 12, 4]];
  for (const [x, y, rx, ry] of blobs) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  return canvas;
}

export class Ambient {
  constructor() {
    this.ready = false;
    this.w = 0;
    this.h = 0;
    this.lastCam = null;
    this.time = 0;

    this.rain = 0;                         // 0 = seco, 1 = lluvia completa
    this.rainTarget = 0;
    this.weatherTimer = rand(25, 60);      // segundos hasta el próximo cambio de clima

    this.cloudSprite = makeCloudSprite();
    this.clouds = [];
    this.dust = [];
    this.leaves = [];
    this.drops = [];
  }

  // Reparte las partículas por la pantalla (se repite si cambia el tamaño de la ventana o el modo táctil)
  init(w, h, touch) {
    const k = touch ? 0.6 : 1;
    this.w = w;
    this.h = h;
    this.touch = touch;
    this.ready = true;

    this.clouds = Array.from({ length: Math.ceil(CONFIG.clouds * k) }, () => ({
      x: rand(-200, w + 200), y: rand(-100, h + 100), scale: rand(4, 13), vx: rand(5, 12), alpha: rand(0.04, 0.08),
    }));
    this.dust = Array.from({ length: Math.ceil(CONFIG.dust * k) }, () => ({
      x: rand(0, w), y: rand(0, h), vx: rand(-6, 6), vy: rand(-5, 3), phase: rand(0, 6.3), alpha: rand(0.25, 0.5),
    }));
    this.leaves = Array.from({ length: Math.ceil(CONFIG.leaves * k) }, () => ({
      x: rand(0, w), y: rand(0, h), vy: rand(22, 40), sway: rand(0, 6.3), size: rand(3, 4),
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    }));
    this.drops = Array.from({ length: Math.ceil(CONFIG.rain * k) }, () => ({
      x: rand(0, w), y: rand(0, h), len: rand(9, 16), speed: rand(700, 900),
    }));
  }

  // De vez en cuando empieza a llover un rato y luego para
  updateWeather(dt) {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      if (this.rainTarget === 0 && Math.random() < 0.4) {
        this.rainTarget = 1;
        this.weatherTimer = rand(30, 70);
      } else {
        this.rainTarget = 0;
        this.weatherTimer = rand(35, 80);
      }
    }
    this.rain += (this.rainTarget - this.rain) * Math.min(1, dt / 4);
  }

  // Mueve y dibuja. camera sirve para que el polvo y las nubes se sientan "dentro" del mundo
  draw(ctx, camera, w, h, dt, touch = false) {
    if (!this.ready || w !== this.w || h !== this.h || touch !== this.touch) this.init(w, h, touch);
    dt = Math.min(dt, 0.1);
    this.time += dt;

    const dcx = this.lastCam ? camera.x - this.lastCam.x : 0;
    const dcy = this.lastCam ? camera.y - this.lastCam.y : 0;
    this.lastCam = { x: camera.x, y: camera.y };
    this.updateWeather(dt);

    const wrap = (v, max, margin) => (v < -margin ? v + max + margin * 2 : v > max + margin ? v - max - margin * 2 : v);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Nubes: manchas enormes y suaves que pasan despacio (más oscuras cuando llueve)
    for (const c of this.clouds) {
      c.x = wrap(c.x + c.vx * dt - dcx * 1, w, 260);
      c.y = wrap(c.y - dcy * 1, h, 160);
      ctx.globalAlpha = c.alpha * (1 + this.rain * 0.8);
      ctx.drawImage(this.cloudSprite, Math.round(c.x - 20 * c.scale), Math.round(c.y - 10 * c.scale), 40 * c.scale, 20 * c.scale);
    }

    // Polvo y motas flotando, con un destello suave
    ctx.fillStyle = '#e6e1c8';
    for (const d of this.dust) {
      d.x = wrap(d.x + (d.vx + Math.sin(this.time + d.phase) * 4) * dt - dcx * 1, w, 10);
      d.y = wrap(d.y + (d.vy + Math.cos(this.time * 0.8 + d.phase) * 3) * dt - dcy * 1, h, 10);
      ctx.globalAlpha = d.alpha * (0.6 + 0.4 * Math.sin(this.time * 2 + d.phase));
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }

    // Hojas cayendo y balanceándose
    for (const l of this.leaves) {
      l.y += l.vy * dt;
      l.sway += dt * 1.5;
      l.x = wrap(l.x + Math.sin(l.sway) * 18 * dt - dcx * 1, w, 12);
      l.y = wrap(l.y - dcy * 1, h, 12);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = l.color;
      ctx.save();
      ctx.translate(Math.round(l.x), Math.round(l.y));
      ctx.rotate(Math.sin(l.sway) * 0.9);
      ctx.fillRect(-Math.round(l.size / 2), -1, Math.round(l.size), 2);
      ctx.restore();
    }

    // Lluvia ligera: gotas diagonales (se ven más cuantas más haya)
    const active = Math.floor(this.drops.length * this.rain);
    if (active > 0) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#aabde1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < active; i++) {
        const d = this.drops[i];
        d.x -= 120 * dt;
        d.y += d.speed * dt;
        if (d.y > h + 20) {
          d.y = -d.len;
          d.x = rand(0, w + 100);
        }
        if (d.x < -20) d.x += w + 40;
        ctx.moveTo(Math.round(d.x), Math.round(d.y));
        ctx.lineTo(Math.round(d.x - d.len * 0.15), Math.round(d.y + d.len));
      }
      ctx.stroke();

      // El cielo se oscurece un poco mientras llueve
      ctx.globalAlpha = 0.1 * this.rain;
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }
}
