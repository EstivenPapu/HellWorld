// Lee los controles y los traduce a órdenes simples para el juego.
// Más adelante el joystick y los botones del celular llenarán estos mismos
// datos (movimiento, ataque, rodar), así el resto del juego no se entera
// de qué control se usa.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: window.innerWidth / 2 + 100, y: window.innerHeight / 2 };
    this._attack = false;
    this._roll = false;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this._roll = true;
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this._attack = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getMove() {
    let x = 0;
    let y = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    // Normalizar para que ir en diagonal no sea más rápido
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  // Posición del mouse dentro del mundo (no de la pantalla)
  getAimWorld(camera) {
    return { x: this.mouse.x + camera.x, y: this.mouse.y + camera.y };
  }

  // Devuelven true una sola vez por cada pulsación
  consumeAttack() {
    const pressed = this._attack;
    this._attack = false;
    return pressed;
  }

  consumeRoll() {
    const pressed = this._roll;
    this._roll = false;
    return pressed;
  }
}