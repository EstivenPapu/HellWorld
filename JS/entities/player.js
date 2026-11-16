export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 32;
    this.speed = 220; // píxeles por segundo
    this.color = '#e8e8f0';
  }

  update(dt, input, world) {
    const move = input.getMove();

    this.x += move.x * this.speed * dt;
    this.y += move.y * this.speed * dt;

    // No salirse del mundo
    const half = this.size / 2;
    this.x = Math.min(Math.max(this.x, half), world.width - half);
    this.y = Math.min(Math.max(this.y, half), world.height - half);
  }

  draw(ctx, camera) {
    const half = this.size / 2;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      Math.round(this.x - half - camera.x),
      Math.round(this.y - half - camera.y),
      this.size,
      this.size
    );
  }
}