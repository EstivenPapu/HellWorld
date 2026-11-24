import { SPELLS } from './spells.js';

function make(className) {
  const el = document.createElement('div');
  el.className = className;
  return el;
}

// Joystick flotante a la izquierda y botones a la derecha. Solo "llenan"
// las mismas órdenes que el teclado, así el juego no cambia.
export class TouchControls {
  constructor(input) {
    this.input = input;
    this.buttons = {};

    this.root = make('');
    this.root.id = 'touch-controls';
    this.root.hidden = true;
    document.body.appendChild(this.root);

    this.buildJoystick();
    this.buildButtons();
  }

  buildJoystick() {
    const MAX = 55; // hasta dónde se mueve la perilla (px)

    const zone = make('touch-zone');
    const base = make('touch-stick-base');
    const knob = make('touch-stick-knob');
    base.appendChild(knob);
    zone.appendChild(base);
    this.root.appendChild(zone);

    let pointerId = null;
    let originX = 0;
    let originY = 0;

    const move = (e) => {
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;
      const len = Math.hypot(dx, dy) || 1;
      const k = len > MAX ? MAX / len : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;

      const strength = Math.min(1, len / MAX);
      if (strength < 0.15) {
        this.input.touchMove.x = 0;
        this.input.touchMove.y = 0;
      } else {
        const power = Math.min(1, strength * 1.25);
        this.input.touchMove.x = (dx / len) * power;
        this.input.touchMove.y = (dy / len) * power;
      }
    };

    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      base.classList.remove('active');
      knob.style.transform = '';
      this.input.touchMove.x = 0;
      this.input.touchMove.y = 0;
    };

    zone.addEventListener('pointerdown', (e) => {
      if (pointerId !== null) return;

      // Tocar el minimapa abre el mapa grande; con el mapa abierto, cualquier toque lo cierra
      const r = this.input.minimapRect;
      const onMinimap =
        r && e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h;
      if (this.input.mapOpen || onMinimap) {
        e.preventDefault();
        this.input.pressMap();
        return;
      }

      e.preventDefault();
      pointerId = e.pointerId;
      if (zone.setPointerCapture) zone.setPointerCapture(e.pointerId);
      originX = e.clientX;
      originY = e.clientY;
      base.style.left = `${originX}px`;
      base.style.top = `${originY}px`;
      base.classList.add('active');
      move(e);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointerId) move(e);
    });
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  buildButtons() {
    const holder = make('touch-buttons');
    this.root.appendChild(holder);

    const defs = [
      { id: 'attack', label: 'Golpe', color: '#d8344d', press: (i) => i.pressAttack() },
      { id: 'roll', label: 'Rodar', color: '#5fb3ff', press: (i) => i.pressRoll() },
      ...SPELLS.map((spell, index) => ({
        id: `spell${index}`,
        label: spell.name,
        color: spell.color,
        press: (i) => i.pressSpell(index),
      })),
      { id: 'interact', label: 'Usar', color: '#ffd27a', press: (i) => i.pressInteract() },
    ];

    for (const def of defs) {
      const el = make(`touch-btn btn-${def.id}`);
      el.style.borderColor = def.color;

      const cooldown = make('cd');
      const label = make('label');
      label.textContent = def.label;
      el.append(cooldown, label);

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('down');
        def.press(this.input);
      });
      const release = () => el.classList.remove('down');
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);

      holder.appendChild(el);
      this.buttons[def.id] = { el, cooldown, label };
    }
  }

  setCooldown(id, progress) {
    this.buttons[id].cooldown.style.height = `${Math.max(0, 1 - progress) * 100}%`;
  }

  // interactLabel: texto del botón "Usar" cuando hay algo cerca ('' = escondido)
  update({ player, spells, interactLabel }) {
    const visible = this.input.isTouch;
    this.root.hidden = !visible;
    if (!visible) return;

    this.setCooldown('roll', player.rollReadiness);

    SPELLS.forEach((spell, i) => {
      const id = `spell${i}`;
      this.setCooldown(id, spells.cooldownProgress(i));
      this.buttons[id].el.classList.toggle('nomana', player.mana < spell.cost);
    });

    const interact = this.buttons.interact;
    interact.el.classList.toggle('visible', Boolean(interactLabel));
    if (interactLabel) interact.label.textContent = interactLabel;
  }
}