import { Projectile } from '../entities/projectile.js';

// Los 3 hechizos de la 0.1. Los números se ajustan aquí.
export const SPELLS = [
  { id: 'flame', name: 'Llama', keyLabel: 'Clic der.', cost: 12, cooldown: 0.35, color: '#ff8a3d' },
  { id: 'nova', name: 'Nova', keyLabel: 'Q', cost: 25, cooldown: 2.0, color: '#b48cff' },
  { id: 'shield', name: 'Escudo', keyLabel: 'E', cost: 20, cooldown: 6.0, color: '#5fe0c0' },
];

const FLAME = { speed: 560, range: 620, damage: 20, radius: 9 };
const NOVA = { radius: 140, damage: 18, force: 420, duration: 0.35 };
const SHIELD = { duration: 5 };

// Se encarga de lanzar los hechizos y de mover lo que lanzan
export class SpellSystem {
  constructor() {
    this.cooldowns = SPELLS.map(() => 0);
    this.projectiles = [];
    this.rings = [];
  }

  // 0 = recién lanzado, 1 = listo
  cooldownProgress(index) {
    return 1 - this.cooldowns[index] / SPELLS[index].cooldown;
  }

  // Limpia hechizos en vuelo y esperas (al morir o descansar)
  reset() {
    this.cooldowns = SPELLS.map(() => 0);
    this.projectiles = [];
    this.rings = [];
  }

  update(dt, player, input, camera, enemies, world) {
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - dt));

    for (let i = 0; i < SPELLS.length; i++) {
      if (!input.consumeSpell(i)) continue;
      if (player.isRolling) continue;
      if (this.cooldowns[i] > 0) continue;
      if (!player.spendMana(SPELLS[i].cost)) continue;

      this.cast(i, player, enemies);
      this.cooldowns[i] = SPELLS[i].cooldown;
    }

    for (const p of this.projectiles) p.update(dt, enemies, world);
    this.projectiles = this.projectiles.filter((p) => p.alive);

    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < NOVA.duration);
  }

  cast(index, player, enemies) {
    switch (SPELLS[index].id) {
      case 'flame':
        this.projectiles.push(
          new Projectile(player.x, player.y, player.facing.x, player.facing.y, {
            ...FLAME,
            damage: Math.round(FLAME.damage * player.spellPower),
          })
        );
        break;

      case 'nova':
        for (const e of enemies) {
          if (!e.alive) continue;
          const dist = Math.hypot(e.x - player.x, e.y - player.y);
          if (dist <= NOVA.radius + e.radius) {
            e.takeDamage(
              Math.round(NOVA.damage * player.spellPower),
              player.x,
              player.y,
              NOVA.force
            );
          }
        }
        this.rings.push({ x: player.x, y: player.y, age: 0 });
        break;

      case 'shield':
        player.activateShield(SHIELD.duration);
        break;
    }
  }

  draw(ctx, camera) {
    // Onda de la Nova
    for (const r of this.rings) {
      const p = r.age / NOVA.duration;
      const radius = NOVA.radius * (1 - Math.pow(1 - p, 2));
      const cx = Math.round(r.x - camera.x);
      const cy = Math.round(r.y - camera.y);

      ctx.fillStyle = `rgba(180, 140, 255, ${0.18 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(180, 140, 255, ${0.8 * (1 - p)})`;
      ctx.lineWidth = 2 + 5 * (1 - p);
      ctx.stroke();
    }

    for (const p of this.projectiles) p.draw(ctx, camera);
  }
}