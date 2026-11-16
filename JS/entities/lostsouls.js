// Las almas que llevabas al morir. Quedan en el lugar de tu muerte
// hasta que vuelvas por ellas. Si mueres otra vez con almas encima
// antes de recogerlas, estas se pierden para siempre.
export class LostSouls {
  constructor(x, y, amount) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.age = 0;
    this.collected = false;
  }

  update(dt, player) {
    this.age += dt;

    if (Math.hypot(player.x - this.x, player.y - this.y) <= 36) {
      this.collected = true;
      player.addSouls(this.amount);
    }
  }

  draw(ctx, camera) {
    const cx = Math.round(this.x - camera.x);
    const cy = Math.round(this.y - camera.y);
    const pulse = 1 + Math.sin(this.age * 3) * 0.12;

    ctx.fillStyle = 'rgba(143, 216, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, 24 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8fd8ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#8fd8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.amount), cx, cy - 34);
    ctx.textAlign = 'left';
  }
}