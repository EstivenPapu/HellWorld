// Proyectil de un hechizo: vuela recto, golpea al primer demonio que toca
// y desaparece (o desaparece al llegar a su alcance máximo).
export class Projectile {
  constructor(x, y, dirX, dirY, stats) {
    this.dx = dirX;
    this.dy = dirY;
    this.x = x + dirX * 20; // sale un poco por delante del jugador
    this.y = y + dirY * 20;

    this.speed = stats.speed;
    this.range = stats.range;
    this.damage = stats.damage;
    this.radius = stats.radius;

    this.travelled = 0;
    this.alive = true;
  }

  update(dt, enemies, world) {
    const step = this.speed * dt;
    this.x += this.dx * step;
    this.y += this.dy * step;
    this.travelled += step;

    const outOfWorld =
      this.x < 0 || this.y < 0 || this.x > world.width || this.y > world.height;
    if (this.travelled >= this.range || outOfWorld) {
      this.alive = false;
      return;
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) <= e.radius + this.radius) {
        e.takeDamage(this.damage, this.x - this.dx * 10, this.y - this.dy * 10);
        this.alive = false;
        break;
      }
    }
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    // Estela
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = `rgba(255, 138, 61, ${0.14 * (4 - i)})`;
      ctx.beginPath();
      ctx.arc(cx - this.dx * i * 9, cy - this.dy * i * 9, this.radius - i, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}