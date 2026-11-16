// Muñeco de práctica: sirve para probar el golpe. Reaparece solo.
// En el hito 3 el demonio enemigo se construye sobre esta misma idea.
export class Dummy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.maxHp = 50;
    this.hp = this.maxHp;
    this.hitFlash = 0;
    this.respawnTimer = 0;
  }

  get alive() {
    return this.hp > 0;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.12;
    if (this.hp === 0) this.respawnTimer = 2;
  }

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.hp = this.maxHp;
    }
  }

  draw(ctx, camera) {
    if (!this.alive) return;

    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#b3263e';
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Barra de vida
    const w = 44;
    ctx.fillStyle = '#2a0f14';
    ctx.fillRect(cx - w / 2, cy - this.radius - 14, w, 6);
    ctx.fillStyle = '#d8344d';
    ctx.fillRect(cx - w / 2, cy - this.radius - 14, w * (this.hp / this.maxHp), 6);
  }
}