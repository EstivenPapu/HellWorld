// Orbe de sombra que lanza el jefe. Vuela recto y daña al jugador.
// Si estás rodando (invulnerable) lo atraviesas sin recibir daño.
export class BossOrb {
  constructor(x, y, dirX, dirY, speed, damage) {
    this.dx = dirX;
    this.dy = dirY;
    this.x = x + dirX * 50; // sale por delante del jefe
    this.y = y + dirY * 50;
    this.speed = speed;
    this.damage = damage;
    this.radius = 10;
    this.range = 800;
    this.travelled = 0;
    this.alive = true;
  }

  update(dt, player, world) {
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

    const hitDistance = player.size / 2 + this.radius;
    const touching = Math.hypot(player.x - this.x, player.y - this.y) <= hitDistance;
    if (touching && !player.invulnerable) {
      player.takeDamage(this.damage); // el escudo, si lo tienes, lo absorbe
      this.alive = false;
    }
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);

    ctx.fillStyle = 'rgba(139, 59, 209, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5a1a6b';
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d8344d';
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}