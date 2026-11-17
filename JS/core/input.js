// Lee los controles y los traduce a órdenes simples para el juego.
// El teclado y el mouse llenan estos datos; en el celular los llenan el
// joystick y los botones de touch-controls.js. Así el resto del juego no se
// entera de qué control se usa.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: window.innerWidth / 2 + 100, y: window.innerHeight / 2 };
    this._attack = false;
    this._roll = false;
    this._spells = [false, false, false]; // 0: Llama, 1: Nova, 2: Escudo
    this._interact = false;

    // Celular: la perilla del joystick escribe aquí
    const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    this.isTouch = Boolean(coarse && coarse.matches);
    this.touchMove = { x: 0, y: 0 };
    window.addEventListener('touchstart', () => {
      this.isTouch = true;
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (!e.repeat) {
        if (e.code === 'Space') {
          e.preventDefault();
          this._roll = true;
        }
        if (e.code === 'KeyQ') this._spells[1] = true;
        if (e.code === 'KeyE') this._spells[2] = true;
        if (e.code === 'KeyF') this._interact = true;
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    // En pantallas táctiles el navegador inventa eventos de mouse: se ignoran
    canvas.addEventListener('mousemove', (e) => {
      if (this.isTouch) return;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (this.isTouch) return;
      if (e.button === 0) this._attack = true;
      if (e.button === 2) this._spells[0] = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getMove() {
    // El joystick manda si se está usando
    if (this.isTouch && (this.touchMove.x !== 0 || this.touchMove.y !== 0)) {
      return { x: this.touchMove.x, y: this.touchMove.y };
    }

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

  // Botones de la pantalla táctil
  pressAttack() {
    this._attack = true;
  }

  pressRoll() {
    this._roll = true;
  }

  pressSpell(index) {
    this._spells[index] = true;
  }

  pressInteract() {
    this._interact = true;
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

  consumeInteract() {
    const pressed = this._interact;
    this._interact = false;
    return pressed;
  }

  // Descarta las órdenes pendientes (para cuando el juego está en pausa)
  clearActions() {
    this._attack = false;
    this._roll = false;
    this._interact = false;
    this._spells.fill(false);
  }

  consumeSpell(index) {
    const pressed = this._spells[index];
    this._spells[index] = false;
    return pressed;
  }
}