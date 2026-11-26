import { sfx } from '../core/audio.js';
import { drawFrame, drawShadow, hasSprite } from '../core/sprites.js';

// Números del combate: cámbialos aquí para ajustar cómo se siente.
const ATTACK = {
  duration: 0.18,   // segundos que dura el golpe
  cooldown: 0.45,   // espera antes de poder golpear otra vez
  range: 80,        // alcance en píxeles
  halfArc: Math.PI / 3, // mitad del ángulo del golpe (60° a cada lado)
  damage: 5,
  moveFactor: 0.7,  // velocidad al atacar (60%)
};

const ROLL = {
  duration: 0.25,
  cooldown: 0.8,
  speed: 560,
};

const HIT_INVULN = 0.5; // segundos sin recibir daño después de un golpe
const AUTO_AIM_RANGE = 380; // en el celular apunta solo a lo que esté a esta distancia
const BODY_RADIUS = 11;     // qué tan ancho es para chocar con árboles y muros

// Valores base y cuánto crece cada uno por nivel (se ajustan aquí)
const BASE_HP = 30;
const BASE_MANA = 50;
const GROWTH = { hp: 10, melee: 2, mana: 5, spell: 0.10 };

// Estadísticas que se mejoran en el altar con almas
export const STATS = [
  { id: 'vigor', name: 'Vigor', label: 'Vida máxima',
    value: (lvl) => `${BASE_HP + (lvl - 1) * GROWTH.hp}` },
  { id: 'strength', name: 'Fuerza', label: 'Daño del golpe',
    value: (lvl) => `${ATTACK.damage + (lvl - 1) * GROWTH.melee}` },
  { id: 'magic', name: 'Magia', label: 'Maná / poder de hechizos',
    value: (lvl) => `${BASE_MANA + (lvl - 1) * GROWTH.mana} / ${Math.round((1 + (lvl - 1) * GROWTH.spell) * 100)}%` },
];

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

    this.maxMana = 60;
    this.mana = this.maxMana;
    this.manaRegen = 7; // maná por segundo
    this.noManaTimer = 0; // para avisar en pantalla que falta maná
    this.shieldTimer = 0;

    this.levels = { vigor: 1, strength: 1, magic: 1 };
    this.applyStats();
    this.hp = this.maxHp;
    this.mana = this.maxMana;

    this.facing = { x: 1, y: 0 };

    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackAngle = 0;
    this.hitTargets = new Set();

    this.rollTimer = 0;
    this.rollCooldown = 0;
    this.rollDir = { x: 0, y: 0 };

    this.invulnTimer = 0;

    this.animTime = 0; // para animar los pasos
    this.moving = false;
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
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.noManaTimer = Math.max(0, this.noManaTimer - dt);
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);

    // Hacia dónde mira: hacia el mouse
    if (!this.isRolling && input.isTouch) {
      this.aimForTouch(move, targets);
    } else if (!this.isRolling) {
      const aim = input.getAimWorld(camera);
      const dx = aim.x - this.x;
      const dy = aim.y - this.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) this.facing = { x: dx / len, y: dy / len };
    }

    // Rodar
    if (wantsRoll && this.rollCooldown <= 0 && !this.isRolling) {
      const dir = move.x !== 0 || move.y !== 0 ? move : this.facing;
      const dirLength = Math.hypot(dir.x, dir.y) || 1;
      this.rollDir = { x: dir.x / dirLength, y: dir.y / dirLength };
      this.rollTimer = ROLL.duration;
      this.rollCooldown = ROLL.cooldown;
      this.attackTimer = 0; // rodar cancela el ataque
      sfx('roll');
    }

    // Atacar
    if (wantsAttack && this.attackCooldown <= 0 && !this.isRolling) {
      this.attackTimer = ATTACK.duration;
      this.attackCooldown = ATTACK.cooldown;
      this.attackAngle = Math.atan2(this.facing.y, this.facing.x);
      this.hitTargets.clear();
      sfx('attack');
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
    const prevX = this.x;
    const prevY = this.y;
    this.x += vx * dt;
    this.y += vy * dt;

    this.moving = !this.isRolling && (vx !== 0 || vy !== 0);
    this.animTime = this.moving ? this.animTime + dt : 0;

    // No salirse del mundo
    const half = this.size / 2;
    this.x = Math.min(Math.max(this.x, half), world.width - half);
    this.y = Math.min(Math.max(this.y, half), world.height - half);
    world.resolveMove(this, BODY_RADIUS, prevX, prevY);

    if (this.isAttacking) this.applyAttack(targets);
  }

  // En el celular no hay mouse: apunta al demonio más cercano o hacia donde caminas
  aimForTouch(move, targets) {
    let nearest = null;
    let best = AUTO_AIM_RANGE;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < best) {
        best = d;
        nearest = t;
      }
    }

    if (nearest) {
      const len = Math.hypot(nearest.x - this.x, nearest.y - this.y) || 1;
      this.facing = { x: (nearest.x - this.x) / len, y: (nearest.y - this.y) / len };
    } else if (move.x !== 0 || move.y !== 0) {
      const len = Math.hypot(move.x, move.y);
      this.facing = { x: move.x / len, y: move.y / len };
    }
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
        t.takeDamage(this.meleeDamage, this.x, this.y);
        this.hitTargets.add(t);
      }
    }
  }

  // --- Mejoras del altar ---
  applyStats() {
    this.maxHp = BASE_HP + (this.levels.vigor - 1) * GROWTH.hp;
    this.maxMana = BASE_MANA + (this.levels.magic - 1) * GROWTH.mana;
  }

  get meleeDamage() {
    return ATTACK.damage + (this.levels.strength - 1) * GROWTH.melee;
  }

  get spellPower() {
    return 1 + (this.levels.magic - 1) * GROWTH.spell;
  }

  // Datos que se guardan en el navegador
  serialize() {
    return { levels: { ...this.levels }, souls: this.souls };
  }

  // Carga datos guardados, revisando que sean números válidos
  loadState(data) {
    if (!data) return;

    for (const id of Object.keys(this.levels)) {
      const level = Math.floor(Number(data.levels && data.levels[id]));
      if (Number.isFinite(level) && level >= 1 && level <= 99) this.levels[id] = level;
    }

    const souls = Math.floor(Number(data.souls));
    if (Number.isFinite(souls) && souls >= 0) this.souls = souls;

    this.applyStats();
    this.rest();
  }

  upgradeCost(id) {
    return 20 + (this.levels[id] - 1) * 15;
  }

  // Gasta almas para subir un nivel. Devuelve true si alcanzó.
  upgrade(id) {
    const cost = this.upgradeCost(id);
    if (this.souls < cost) return false;

    this.souls -= cost;
    this.levels[id] += 1;
    this.applyStats();
    this.rest();
    sfx('upgrade');
    return true;
  }

  // Descansar en el altar: vida y maná al máximo
  rest() {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.shieldTimer = 0;
  }

  // Gasta maná si alcanza; si no, avisa y devuelve false
  spendMana(cost) {
    if (this.mana < cost) {
      this.noManaTimer = 0.35;
      sfx('nomana');
      return false;
    }
    this.mana -= cost;
    return true;
  }

  activateShield(duration) {
    this.shieldTimer = duration;
    sfx('shield');
  }

  addSouls(amount) {
    this.souls += amount;
    sfx('soul');
  }

  // Devuelve true si el daño entró (no entra si está rodando o con invulnerabilidad)
  takeDamage(amount) {
    if (this.invulnerable) return false;

    // El escudo absorbe el golpe completo
    if (this.shieldTimer > 0) {
      this.shieldTimer = 0;
      this.invulnTimer = 0.3;
      sfx('shieldBreak');
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = HIT_INVULN;
    sfx('hurt');
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
    this.mana = this.maxMana;
    this.shieldTimer = 0;
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);
    const half = this.size / 2;

    // Arco del golpe
    if (this.isAttacking) {
      const arcAlpha = 0.4 * (this.attackTimer / ATTACK.duration);
      ctx.fillStyle = `rgba(255, 255, 255, ${arcAlpha})`;
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

    // Semitransparente al rodar, parpadea al recibir daño
    let alpha = 1;
    if (this.isRolling) {
      alpha = 0.6;
    } else if (this.invulnTimer > 0) {
      alpha = Math.floor(this.invulnTimer * 20) % 2 === 0 ? 0.35 : 1;
    }

    if (hasSprite('player')) {
      drawShadow(ctx, cx, cy + 13, 11, 4);

      if (this.isRolling) {
        // Fila 3 de la hoja: 4 cuadros de la bola rodando
        const progress = 1 - this.rollTimer / ROLL.duration;
        drawFrame(ctx, 'player', Math.min(3, Math.floor(progress * 4)), 3, cx, cy, { alpha });
      } else {
        // Fila 0 = abajo, 1 = arriba, 2 = izquierda (la derecha es la izquierda reflejada)
        const f = this.facing;
        let row = f.y < 0 ? 1 : 0;
        let flip = false;
        if (Math.abs(f.x) >= Math.abs(f.y)) {
          row = 2;
          flip = f.x > 0;
        }
        const step = this.moving ? Math.floor(this.animTime * 8) % 4 : 0;
        drawFrame(ctx, 'player', step, row, cx, cy, { flip, alpha });
      }
    } else {
      // Sin sprites: cuadro simple con una marca de hacia dónde mira
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.fillRect(cx - half, cy - half, this.size, this.size);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#d8344d';
      ctx.fillRect(
        Math.round(cx + this.facing.x * half) - 3,
        Math.round(cy + this.facing.y * half) - 3,
        6,
        6
      );
    }

    // Escudo: parpadea cuando está por acabarse
    if (this.shieldTimer > 0) {
      const blink = this.shieldTimer < 1 && Math.floor(this.shieldTimer * 8) % 2 === 0;
      if (!blink) {
        ctx.strokeStyle = '#5fe0c0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, half + 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}