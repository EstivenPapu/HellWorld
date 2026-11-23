import { BossOrb } from './bossorb.js';
import { sfx } from '../core/audio.js';
import { drawFrame, drawShadow, hasSprite } from '../core/sprites.js';

// Los ataques del jefe. Todos avisan antes de golpear. Ajusta los números aquí.
const ATTACKS = {
  // Golpe en el suelo alrededor del jefe: sal del círculo o rueda
  slam: { windup: 0.85, radius: 150, damage: 22 },
  // Embestida en línea recta hacia donde estabas al empezar el aviso
  charge: { windup: 0.7, speed: 650, duration: 0.55, damage: 18, width: 50 },
  // Tres orbes de sombra en abanico
  orbs: { windup: 0.6, count: 3, spread: 0.35, speed: 320, damage: 10 },
};

const RECOVER_TIME = 0.9; // descanso después de cada ataque: tu momento para golpear
const SHOCK_TIME = 0.25;

// Jefe del primer reino: una sola fase, tres ataques.
// Estados: idle -> chase -> windup (aviso) -> attack -> recover -> chase
export class Boss {
  constructor(x, y) {
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;

    this.name = 'Demonio del Primer Reino'; // nombre provisional
    this.radius = 40;
    this.maxHp = 300;
    this.hp = this.maxHp;
    this.speed = 90;
    this.souls = 150;

    this.aggroRange = 340;  // a qué distancia despierta
    this.leashRange = 1100; // si te alejas tanto, se reinicia

    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 0.6;
    this.attack = null;
    this.lastAttack = null;
    this.dir = { x: 1, y: 0 };
    this.chargeHit = false;

    this.hitFlash = 0;
    this.shockTimer = 0;
    this.orbs = [];
    this.animTime = 0;
  }

  get alive() {
    return this.hp > 0;
  }

  // true cuando la pelea ya empezó (para mostrar su barra de vida)
  get engaged() {
    return this.state !== 'idle';
  }

  takeDamage(amount, fromX, fromY, force = 260) {
    if (!this.alive) return;

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.1;
    sfx('bossHit');
    if (this.state === 'idle') this.state = 'chase';

    // Casi no se mueve al golpearlo y nunca se le interrumpe un ataque
    if (this.state === 'chase' || this.state === 'recover') {
      const dx = this.x - fromX;
      const dy = this.y - fromY;
      const len = Math.hypot(dx, dy) || 1;
      this.x += (dx / len) * force * 0.04;
      this.y += (dy / len) * force * 0.04;
    }
  }

  update(dt, player, world) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.shockTimer = Math.max(0, this.shockTimer - dt);
    this.stateTimer -= dt;
    this.animTime += dt;

    for (const orb of this.orbs) orb.update(dt, player, world);
    this.orbs = this.orbs.filter((o) => o.alive);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    switch (this.state) {
      case 'idle':
        if (dist <= this.aggroRange) this.state = 'chase';
        break;

      case 'chase':
        if (dist > this.leashRange) {
          this.resetFight();
          break;
        }
        // Se acerca, pero sin pegarse al jugador
        if (dist > this.radius + 90) {
          this.x += (dx / dist) * this.speed * dt;
          this.y += (dy / dist) * this.speed * dt;
        }
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) this.startAttack(dist, dx, dy);
        break;

      case 'windup':
        if (this.stateTimer <= 0) this.executeAttack(player);
        break;

      case 'attack': // solo la embestida dura tiempo
        this.x += this.dir.x * ATTACKS.charge.speed * dt;
        this.y += this.dir.y * ATTACKS.charge.speed * dt;
        if (!this.chargeHit && dist <= this.radius + player.size / 2 + 6) {
          this.chargeHit = true;
          player.takeDamage(ATTACKS.charge.damage);
        }
        if (this.stateTimer <= 0) this.enterRecover();
        break;

      case 'recover':
        if (this.stateTimer <= 0) {
          this.state = 'chase';
          this.attackCooldown = 0.5;
        }
        break;
    }

    // No salirse del mundo
    this.x = Math.min(Math.max(this.x, this.radius), world.width - this.radius);
    this.y = Math.min(Math.max(this.y, this.radius), world.height - this.radius);
  }

  startAttack(dist, dx, dy) {
    // De cerca prefiere el golpe en el suelo; de lejos, embestida y orbes
    const pool = dist < 190 ? ['slam', 'slam', 'charge', 'orbs'] : ['charge', 'orbs', 'orbs'];
    let options = pool.filter((a) => a !== this.lastAttack); // evita repetir
    if (options.length === 0) options = pool;

    this.attack = options[Math.floor(Math.random() * options.length)];
    this.lastAttack = this.attack;
    this.state = 'windup';
    this.stateTimer = ATTACKS[this.attack].windup;
    sfx('warn');

    // La embestida queda apuntada hacia donde estabas al empezar el aviso
    const len = Math.hypot(dx, dy) || 1;
    this.dir = { x: dx / len, y: dy / len };
  }

  executeAttack(player) {
    switch (this.attack) {
      case 'slam': {
        const a = ATTACKS.slam;
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (d <= a.radius) player.takeDamage(a.damage); // rodando no te hace nada
        this.shockTimer = SHOCK_TIME;
        sfx('slam');
        this.enterRecover();
        break;
      }

      case 'charge':
        this.state = 'attack';
        this.stateTimer = ATTACKS.charge.duration;
        sfx('charge');
        this.chargeHit = false;
        break;

      case 'orbs': {
        const a = ATTACKS.orbs;
        const base = Math.atan2(player.y - this.y, player.x - this.x);
        sfx('orbs');
        for (let i = 0; i < a.count; i++) {
          const angle = base + (i - (a.count - 1) / 2) * a.spread;
          this.orbs.push(
            new BossOrb(this.x, this.y, Math.cos(angle), Math.sin(angle), a.speed, a.damage)
          );
        }
        this.enterRecover();
        break;
      }
    }
  }

  enterRecover() {
    this.state = 'recover';
    this.stateTimer = RECOVER_TIME;
    this.attack = null;
  }

  // Si te alejas demasiado, vuelve a su base con la vida llena
  resetFight() {
    this.hp = this.maxHp;
    this.x = this.homeX;
    this.y = this.homeY;
    this.state = 'idle';
    this.attack = null;
    this.attackCooldown = 0.6;
    this.orbs = [];
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    // Avisos de los ataques
    if (this.state === 'windup') {
      const a = ATTACKS[this.attack];
      const progress = 1 - Math.max(0, this.stateTimer) / a.windup;

      if (this.attack === 'slam') {
        ctx.fillStyle = `rgba(255, 90, 60, ${0.12 + 0.25 * progress})`;
        ctx.beginPath();
        ctx.arc(cx, cy, a.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 90, 60, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (this.attack === 'charge') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(this.dir.y, this.dir.x));
        ctx.fillStyle = `rgba(255, 90, 60, ${0.12 + 0.25 * progress})`;
        ctx.fillRect(0, -a.width, a.speed * a.duration, a.width * 2);
        ctx.restore();
      }
    }

    // Onda del golpe en el suelo
    if (this.shockTimer > 0) {
      const p = 1 - this.shockTimer / SHOCK_TIME;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - p)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius + (ATTACKS.slam.radius - this.radius) * p, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Color con el que se tiñe mientras prepara un ataque
    const preparing = this.state === 'windup' || this.state === 'attack';
    const prepColor = this.attack === 'orbs' ? '#8b3bd1' : '#ff7a45';

    if (hasSprite('boss')) {
      drawShadow(ctx, cx, cy + 38, 38, 10);

      const frame = Math.floor(this.animTime * 2) % 2; // respira
      drawFrame(ctx, 'boss', frame, 0, cx, cy);
      if (preparing) {
        drawFrame(ctx, 'boss', frame, 0, cx, cy, { tint: prepColor, alpha: 0.5 });
      }
      if (this.hitFlash > 0) {
        drawFrame(ctx, 'boss', frame, 0, cx, cy, { tint: '#ffffff' });
      }
    } else {
      // Sin sprites: cuernos, cuerpo y ojos simples
      ctx.fillStyle = '#3a0a14';
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy - 18);
      ctx.lineTo(cx - 20, cy - 58);
      ctx.lineTo(cx - 6, cy - 32);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 30, cy - 18);
      ctx.lineTo(cx + 20, cy - 58);
      ctx.lineTo(cx + 6, cy - 32);
      ctx.fill();

      let color = '#6b1426';
      if (preparing) color = prepColor;
      if (this.hitFlash > 0) color = '#ffffff';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(cx - 16, cy - 8, 10, 6);
      ctx.fillRect(cx + 6, cy - 8, 10, 6);
    }

    for (const orb of this.orbs) orb.draw(ctx, camera);
  }
}