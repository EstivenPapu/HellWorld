// Números del combate: cámbialos aquí para ajustar cómo se siente.
const ATTACK = {
  duration: 0.18,   // segundos que dura el golpe
  cooldown: 0.45,   // espera antes de poder golpear otra vez
  range: 80,        // alcance en píxeles
  halfArc: Math.PI / 3, // mitad del ángulo del golpe (60° a cada lado)
  damage: 10,
  moveFactor: 0.6,  // velocidad al atacar (60%)
};

const ROLL = {
  duration: 0.25,
  cooldown: 0.8,
  speed: 560,
};

const HIT_INVULN = 0.5; // segundos sin recibir daño después de un golpe

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 32;
    this.speed = 220; // píxeles por segundo
    this.color = '#e8e8f0';

    this.maxHp = 100;
    this.hp = this.maxHp;

    this.souls = 0;

    this.facing = { x: 1, y: 0 };

    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackAngle = 0;
    this.hitTargets = new Set();

    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.rollDir = { x: 0, y: 0 };

    this.invulnTimer = 0;
  }

  get isRolling() {
    return this.rollTimer > 0;
  }

  get isAttacking() {
    return this.attackTimer > 0;
  }

  get invulnerable() {
    return this.isRolling || this.invulnTimer > 0;
  }

  // 0 = recién usado, 1 = listo para rodar otra vez
  get rollReadiness() {
    return 1 - Math.max(0, this.rollCooldown) / ROLL.cooldown;
  }

  update(dt, input, world, camera, targets) {
    // Órdenes de este cuadro
    const wantsAttack = input.consumeAttack();
    const wantsRoll = input.consumeRoll();
    const move = input.getMove();

    // Temporizadores
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.rollTimer = Math.max(0, this.rollTimer - dt);
    this.rollCooldown = Math.max(0, this.rollCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);

    // Hacia dónde mira: hacia el mouse
    if (!this.isRolling) {
      const aim = input.getAimWorld(camera);
      const dx = aim.x - this.x;
      const dy = aim.y - this.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) this.facing = { x: dx / len, y: dy / len };
    }

    // Rodar
    if (wantsRoll && this.rollCooldown <= 0 && !this.isRolling) {
      const dir = move.x !== 0 || move.y !== 0 ? move : this.facing;
      this.rollDir = { x: dir.x, y: dir.y };
      this.rollTimer = ROLL.duration;
      this.rollCooldown = ROLL.cooldown;
      this.attackTimer = 0; // rodar cancela el ataque
    }

    // Atacar
    if (wantsAttack && this.attackCooldown <= 0 && !this.isRolling) {
      this.attackTimer = ATTACK.duration;
      this.attackCooldown = ATTACK.cooldown;
      this.attackAngle = Math.atan2(this.facing.y, this.facing.x);
      this.hitTargets.clear();
    }

    // Movimiento
    let vx;
    let vy;
    if (this.isRolling) {
      vx = this.rollDir.x * ROLL.speed;
      vy = this.rollDir.y * ROLL.speed;
    } else {
      const factor = this.isAttacking ? ATTACK.moveFactor : 1;
      vx = move.x * this.speed * factor;
      vy = move.y * this.speed * factor;
    }
    this.x += vx * dt;
    this.y += vy * dt;

    // No salirse del mundo
    const half = this.size / 2;
    this.x = Math.min(Math.max(this.x, half), world.width - half);
    this.y = Math.min(Math.max(this.y, half), world.height - half);

    if (this.isAttacking) this.applyAttack(targets);
  }

  // Golpea a todos los objetivos dentro del arco, una sola vez por golpe
  applyAttack(targets) {
    for (const t of targets) {
      if (!t.alive || this.hitTargets.has(t)) continue;

      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > ATTACK.range + t.radius) continue;

      // Si está pegado al jugador cuenta como impacto sin revisar el ángulo
      let inArc = dist <= t.radius;
      if (!inArc) {
        let diff = Math.atan2(dy, dx) - this.attackAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // a rango -PI..PI
        inArc = Math.abs(diff) <= ATTACK.halfArc;
      }

      if (inArc) {
        t.takeDamage(ATTACK.damage, this.x, this.y);
        this.hitTargets.add(t);
      }
    }
  }

  addSouls(amount) {
    this.souls += amount;
  }

  // Devuelve true si el daño entró (no entra si está rodando o con invulnerabilidad)
  takeDamage(amount) {
    if (this.invulnerable) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = HIT_INVULN;
    return true;
  }

  // Temporal: en el hito 5 aquí se pierden las almas
  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.invulnTimer = 0;
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);
    const half = this.size / 2;

    // Arco del golpe
    if (this.isAttacking) {
      const alpha = 0.4 * (this.attackTimer / ATTACK.duration);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(
        cx,
        cy,
        ATTACK.range,
        this.attackAngle - ATTACK.halfArc,
        this.attackAngle + ATTACK.halfArc
      );
      ctx.closePath();
      ctx.fill();
    }

    // Cuerpo: semitransparente al rodar, parpadea al recibir daño
    let alpha = 1;
    if (this.isRolling) {
      alpha = 0.45;
    } else if (this.invulnTimer > 0) {
      alpha = Math.floor(this.invulnTimer * 20) % 2 === 0 ? 0.35 : 1;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(cx - half, cy - half, this.size, this.size);
    ctx.globalAlpha = 1;

    // Marca que indica hacia dónde mira
    ctx.fillStyle = '#d8344d';
    ctx.fillRect(
      Math.round(cx + this.facing.x * half) - 3,
      Math.round(cy + this.facing.y * half) - 3,
      6,
      6
    );
  }
}