import { sfx } from '../core/audio.js';
import { drawFrame, drawShadow, hasSprite } from '../core/sprites.js';
import { BossOrb } from './bossorb.js';

// Tipos de demonio. Para cambiar la dificultad ajusta estos números.
//   attack: cómo ataca
//     melee  = golpe cuerpo a cuerpo con aviso
//     shoot  = dispara una esfera de sombra y se mantiene a distancia
//     dash   = embiste en línea recta
//     slam   = golpe en área, lento y fuerte
//     summon = invoca esbirros y se mantiene a distancia
//   sheet/row: de dónde sale su dibujo en assets/sprites
export const ENEMY_TYPES = {
  menor: {
    name: 'Demonio menor', sheet: 'enemy', row: 0, color: '#a32339', tint: '#ff7a45',
    hp: 25, speed: 110, radius: 18, body: 12, souls: 2, aggro: 300, lose: 620, bar: 40,
    shadow: { y: 14, rx: 14, ry: 5 },
    attack: 'melee', range: 52, strike: 70, damage: 10, windup: 0.45, recover: 0.9,
  },
  lanzador: {
    name: 'Lanzador', sheet: 'enemy', row: 1, color: '#8b3bd1', tint: '#c070ff',
    hp: 30, speed: 85, radius: 16, body: 11, souls: 5, aggro: 420, lose: 700, bar: 40,
    shadow: { y: 14, rx: 12, ry: 4 },
    attack: 'shoot', range: 400, keepAway: 230, prefer: 320, damage: 8,
    windup: 0.55, recover: 0.6, cooldown: 2.4, shotSpeed: 270,
  },
  veloz: {
    name: 'Veloz', sheet: 'enemy', row: 2, color: '#d8602a', tint: '#ffe27a',
    hp: 25, speed: 130, radius: 13, body: 10, souls: 5, aggro: 360, lose: 650, bar: 32,
    shadow: { y: 14, rx: 10, ry: 4 },
    attack: 'dash', range: 240, damage: 9, windup: 0.35, recover: 0.9, cooldown: 0.5,
    dashSpeed: 560, dashTime: 0.32,
  },
  tanque: {
    name: 'Tanque', sheet: 'tank', row: 0, color: '#5a5a70', tint: '#ff7a45',
    hp: 100, speed: 55, radius: 24, body: 20, souls: 10, aggro: 280, lose: 600, bar: 56,
    shadow: { y: 20, rx: 22, ry: 7 },
    attack: 'slam', range: 80, slamRadius: 100, damage: 22, windup: 0.9, recover: 1.4, cooldown: 0.5,
    knockback: 0.25, armor: true, // casi no lo empujan y no se le interrumpe el ataque
  },
  invocador: {
    name: 'Invocador', sheet: 'enemy', row: 3, color: '#2a9a82', tint: '#7affc8',
    hp: 20, speed: 75, radius: 15, body: 11, souls: 20, aggro: 450, lose: 700, bar: 40,
    shadow: { y: 14, rx: 12, ry: 4 },
    attack: 'summon', range: 520, keepAway: 260, prefer: 380,
    windup: 0.9, recover: 0.8, cooldown: 7, minions: 2, maxMinions: 3,
  },
  esbirro: {
    name: 'Esbirro', sheet: 'enemy', row: 4, color: '#d86a7a', tint: '#ff7a45',
    hp: 10, speed: 150, radius: 11, body: 9, souls: 0, aggro: 600, lose: 900, bar: 24,
    shadow: { y: 13, rx: 9, ry: 3 },
    attack: 'melee', range: 34, strike: 46, damage: 5, windup: 0.3, recover: 0.7,
  },
};

const MAX_ENEMIES = 90; // tope para que las invocaciones no se desborden

// Estados: idle -> chase -> windup (aviso) -> [dash] -> recover -> chase
export class Enemy {
  constructor(x, y, type = 'menor') {
    this.type = ENEMY_TYPES[type] ? type : 'menor';
    const t = ENEMY_TYPES[this.type];
    this.t = t;

    this.x = x;
    this.y = y;
    this.radius = t.radius; // para que lo golpeen
    this.body = t.body;     // para chocar con árboles y muros
    this.maxHp = t.hp;
    this.hp = t.hp;
    this.speed = t.speed;
    this.souls = t.souls;   // almas que suelta al morir
    this.barWidth = t.bar;  // ancho de su barra de vida sobre la cabeza

    this.state = 'idle';
    this.stateTimer = 0;
    this.cooldown = 0.5 + Math.random(); // para que no ataquen todos a la vez
    this.hitFlash = 0;
    this.kbx = 0; // empuje al recibir un golpe
    this.kby = 0;
    this.animTime = Math.random() * 2;

    this.dir = { x: 1, y: 0 };   // hacia dónde va a embestir
    this.aim = { x, y };         // a dónde apunta mientras prepara un ataque
    this.dashHit = false;
    this.shockTimer = 0;
    this.minions = [];
  }

  get alive() {
    return this.hp > 0;
  }

  takeDamage(amount, fromX, fromY, force = 260) {
    if (!this.alive) return;

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.12;
    sfx(this.alive ? 'hit' : 'enemyDie');

    // Empuje en dirección contraria a quien golpeó
    const push = force * (this.t.knockback ?? 1);
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.kbx = (dx / len) * push;
    this.kby = (dy / len) * push;

    if (this.state === 'idle') this.state = 'chase';

    // Un golpe interrumpe su ataque (menos al tanque, y nunca en plena embestida)
    if (this.state === 'windup' && !this.t.armor) {
      this.state = 'recover';
      this.stateTimer = 0.4;
    }
  }

  update(dt, player, world, game) {
    const t = this.t;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.shockTimer = Math.max(0, this.shockTimer - dt);
    this.stateTimer -= dt;
    this.cooldown -= dt;
    this.animTime += dt;
    const startX = this.x;
    const startY = this.y;

    // Empuje que se va apagando
    this.x += this.kbx * dt;
    this.y += this.kby * dt;
    const decay = Math.max(0, 1 - 8 * dt);
    this.kbx *= decay;
    this.kby *= decay;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    switch (this.state) {
      case 'idle':
        if (dist <= t.aggro) this.state = 'chase';
        break;

      case 'chase':
        if (dist > t.lose) this.state = 'idle';
        else this.chase(dt, dist, ux, uy, game);
        break;

      case 'windup':
        this.aim.x = player.x;
        this.aim.y = player.y;
        if (this.stateTimer <= 0) this.strike(player, dist, ux, uy, world, game);
        break;

      case 'dash':
        this.x += this.dir.x * t.dashSpeed * dt;
        this.y += this.dir.y * t.dashSpeed * dt;
        if (!this.dashHit && dist <= this.radius + 16) {
          this.dashHit = true;
          player.takeDamage(t.damage); // rodando no te hace nada
        }
        if (this.stateTimer <= 0) this.recover();
        break;

      case 'recover':
        if (this.stateTimer <= 0) this.state = 'chase';
        break;
    }

    // Chocar con árboles, rocas y muros (y no salirse del mundo)
    world.resolveMove(this, this.body, startX, startY);
  }

  // Cómo se mueve y cuándo decide atacar, según su tipo
  chase(dt, dist, ux, uy, game) {
    const t = this.t;

    switch (t.attack) {
      case 'melee':
      case 'slam':
        if (dist <= t.range) {
          if (this.cooldown <= 0) this.startWindup(ux, uy);
        } else {
          this.moveToward(dt, ux, uy, 1);
        }
        break;

      case 'dash':
        if (dist <= t.range && this.cooldown <= 0) this.startWindup(ux, uy);
        else if (dist > 90) this.moveToward(dt, ux, uy, 1);
        break;

      case 'shoot':
      case 'summon':
        // Se mantiene a distancia: se aleja si te acercas y se acerca si te alejas
        if (dist < t.keepAway) this.moveToward(dt, ux, uy, -0.9);
        else if (dist > t.prefer) this.moveToward(dt, ux, uy, 1);
        if (this.cooldown <= 0 && dist <= t.range && this.canAct(game)) this.startWindup(ux, uy);
        break;
    }
  }

  // El invocador no invoca si ya tiene sus esbirros vivos
  canAct(game) {
    if (this.t.attack !== 'summon') return true;
    this.minions = this.minions.filter((m) => m.alive);
    return Boolean(game) && this.minions.length < this.t.maxMinions;
  }

  moveToward(dt, ux, uy, factor) {
    this.x += ux * this.speed * factor * dt;
    this.y += uy * this.speed * factor * dt;
  }

  startWindup(ux, uy) {
    this.state = 'windup';
    this.stateTimer = this.t.windup;
    this.dir = { x: ux, y: uy }; // la embestida queda apuntada desde aquí
    sfx('warn');
  }

  // Termina el aviso y ejecuta el ataque
  strike(player, dist, ux, uy, world, game) {
    const t = this.t;

    switch (t.attack) {
      case 'melee':
        if (dist <= t.strike) player.takeDamage(t.damage);
        break;

      case 'slam':
        if (dist <= t.slamRadius) player.takeDamage(t.damage);
        this.shockTimer = 0.25;
        sfx('slam');
        break;

      case 'shoot':
        if (game) {
          game.shots.push(new BossOrb(this.x, this.y, ux, uy, t.shotSpeed, t.damage, 22));
          sfx('orbs');
        }
        break;

      case 'summon':
        if (game) this.summon(world, game);
        break;

      case 'dash':
        this.state = 'dash';
        this.stateTimer = t.dashTime;
        this.dashHit = false;
        sfx('charge');
        return; // sigue embistiendo
    }

    this.recover();
  }

  recover() {
    this.state = 'recover';
    this.stateTimer = this.t.recover;
    this.cooldown = this.t.cooldown ?? 0;
  }

  summon(world, game) {
    sfx('quest');
    // Solo invoca los que le faltan para llegar a su tope
    this.minions = this.minions.filter((m) => m.alive);
    const count = Math.min(this.t.minions, this.t.maxMinions - this.minions.length);
    for (let i = 0; i < count; i++) {
      if (game.enemies.length >= MAX_ENEMIES) break;
      const angle = Math.random() * Math.PI * 2;
      const imp = new Enemy(this.x + Math.cos(angle) * 36, this.y + Math.sin(angle) * 36, 'esbirro');
      world.resolve(imp, imp.body);
      imp.state = 'chase'; // nacen ya persiguiéndote
      game.enemies.push(imp);
      this.minions.push(imp);
    }
  }

  // Lo que se dibuja en el suelo mientras prepara un ataque
  drawTelegraph(ctx, cx, cy) {
    const t = this.t;

    if (this.state === 'windup') {
      const progress = 1 - Math.max(0, this.stateTimer) / t.windup;

      if (t.attack === 'melee') {
        ctx.fillStyle = `rgba(255, 90, 60, ${0.15 + 0.25 * progress})`;
        ctx.beginPath();
        ctx.arc(cx, cy, t.strike, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.attack === 'slam') {
        ctx.fillStyle = `rgba(255, 90, 60, ${0.12 + 0.25 * progress})`;
        ctx.beginPath();
        ctx.arc(cx, cy, t.slamRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 90, 60, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (t.attack === 'dash') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(this.dir.y, this.dir.x));
        ctx.fillStyle = `rgba(255, 226, 122, ${0.15 + 0.3 * progress})`;
        ctx.fillRect(0, -14, t.dashSpeed * t.dashTime, 28);
        ctx.restore();
      } else if (t.attack === 'shoot') {
        // Una línea hacia donde va a disparar y un aro alrededor
        ctx.strokeStyle = `rgba(200, 120, 255, ${0.15 + 0.4 * progress})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(Math.round(this.aim.x - (this.x - cx)), Math.round(this.aim.y - (this.y - cy)));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius + 6 + progress * 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (t.attack === 'summon') {
        ctx.strokeStyle = `rgba(122, 255, 200, ${0.25 + 0.5 * progress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 20 + progress * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Onda del golpe del tanque
    if (this.shockTimer > 0) {
      const p = 1 - this.shockTimer / 0.25;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - p)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius + (t.slamRadius - this.radius) * p, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  draw(ctx, camera) {
    const t = this.t;
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    this.drawTelegraph(ctx, cx, cy);

    if (hasSprite(t.sheet)) {
      drawShadow(ctx, cx, cy + t.shadow.y, t.shadow.rx, t.shadow.ry);

      // Se mueve más rápido mientras persigue o embiste
      const fps = this.state === 'chase' || this.state === 'dash' ? 7 : 3;
      const frame = Math.floor(this.animTime * fps) % 2;
      drawFrame(ctx, t.sheet, frame, t.row, cx, cy);
      if (this.state === 'windup') {
        drawFrame(ctx, t.sheet, frame, t.row, cx, cy, { tint: t.tint, alpha: 0.55 });
      }
      if (this.hitFlash > 0) {
        drawFrame(ctx, t.sheet, frame, t.row, cx, cy, { tint: '#ffffff' });
      }
    } else {
      // Sin sprites: un círculo del color de su tipo
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.state === 'windup' ? t.tint : t.color;
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Barra de vida (solo si ya recibió daño)
    if (this.hp < this.maxHp) {
      const w = this.barWidth;
      ctx.fillStyle = '#2a0f14';
      ctx.fillRect(cx - w / 2, cy - this.radius - 20, w, 5);
      ctx.fillStyle = '#d8344d';
      ctx.fillRect(cx - w / 2, cy - this.radius - 20, w * (this.hp / this.maxHp), 5);
    }
  }
}

// Evita que los demonios se amontonen en el mismo punto
export function separateEnemies(list) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = a.radius + b.radius;

      if (dist > 0 && dist < min) {
        const push = (min - dist) / 2;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push;
      }
    }
  }
}