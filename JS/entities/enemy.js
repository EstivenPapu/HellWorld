// Demonio menor: se queda quieto hasta que te ve, te persigue y te ataca
// con un aviso. Si lo golpeas mientras prepara el ataque, se lo interrumpes.
// Estados: idle -> chase -> windup (aviso) -> recover (descanso) -> chase
export class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 18;

    this.maxHp = 30;
    this.hp = this.maxHp;
    this.speed = 110;
    this.souls = 10; // almas que suelta al morir

    this.aggroRange = 300;  // a qué distancia te detecta
    this.loseRange = 620;   // a qué distancia te pierde
    this.attackRange = 52;  // a qué distancia empieza a atacar
    this.strikeRange = 70;  // alcance real del golpe
    this.damage = 10;
    this.windupTime = 0.45; // tiempo de aviso antes del golpe
    this.recoverTime = 0.9; // descanso después del golpe

    this.state = 'idle';
    this.stateTimer = 0;
    this.hitFlash = 0;
    this.kbx = 0; // empuje al recibir un golpe
    this.kby = 0;
  }

  get alive() {
    return this.hp > 0;
  }

  takeDamage(amount, fromX, fromY, force = 260) {
    if (!this.alive) return;

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.12;

    // Empuje en dirección contraria a quien golpeó
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.kbx = (dx / len) * force;
    this.kby = (dy / len) * force;

    if (this.state === 'idle') this.state = 'chase';

    // Un golpe interrumpe su ataque
    if (this.state === 'windup') {
      this.state = 'recover';
      this.stateTimer = 0.4;
    }
  }

  update(dt, player, world) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.stateTimer -= dt;

    // Empuje que se va apagando
    this.x += this.kbx * dt;
    this.y += this.kby * dt;
    const decay = Math.max(0, 1 - 8 * dt);
    this.kbx *= decay;
    this.kby *= decay;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    switch (this.state) {
      case 'idle':
        if (dist <= this.aggroRange) this.state = 'chase';
        break;

      case 'chase':
        if (dist > this.loseRange) {
          this.state = 'idle';
        } else if (dist <= this.attackRange) {
          this.state = 'windup';
          this.stateTimer = this.windupTime;
        } else {
          this.x += (dx / dist) * this.speed * dt;
          this.y += (dy / dist) * this.speed * dt;
        }
        break;

      case 'windup':
        if (this.stateTimer <= 0) {
          // Si rodaste, takeDamage no hace nada
          if (dist <= this.strikeRange) player.takeDamage(this.damage);
          this.state = 'recover';
          this.stateTimer = this.recoverTime;
        }
        break;

      case 'recover':
        if (this.stateTimer <= 0) this.state = 'chase';
        break;
    }

    // No salirse del mundo
    this.x = Math.min(Math.max(this.x, this.radius), world.width - this.radius);
    this.y = Math.min(Math.max(this.y, this.radius), world.height - this.radius);
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    // Aviso del ataque: el círculo rojo crece hasta el alcance del golpe
    if (this.state === 'windup') {
      const progress = 1 - Math.max(0, this.stateTimer) / this.windupTime;
      ctx.fillStyle = `rgba(255, 90, 60, ${0.15 + 0.25 * progress})`;
      ctx.beginPath();
      ctx.arc(cx, cy, this.strikeRange, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cuernos
    ctx.fillStyle = '#5a1020';
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 8);
    ctx.lineTo(cx - 8, cy - 26);
    ctx.lineTo(cx - 2, cy - 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 13, cy - 8);
    ctx.lineTo(cx + 8, cy - 26);
    ctx.lineTo(cx + 2, cy - 12);
    ctx.fill();

    // Cuerpo
    let color = '#a32339';
    if (this.state === 'windup') color = '#ff7a45';
    if (this.hitFlash > 0) color = '#ffffff';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Barra de vida (solo si ya recibió daño)
    if (this.hp < this.maxHp) {
      const w = 40;
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