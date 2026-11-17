import { STATS } from '../entities/player.js';
import { audio } from '../core/audio.js';

// Menú del altar (HTML encima del canvas): gastar almas en mejoras,
// activar o quitar el sonido y empezar una partida nueva.
export class AltarMenu {
  constructor(player, { onClose, onChange, onReset }) {
    this.player = player;
    this.onClose = onClose;
    this.onChange = onChange;

    this.root = document.getElementById('altar-menu');
    this.soulsEl = document.getElementById('menu-souls');
    this.statsEl = document.getElementById('menu-stats');
    this.soundButton = document.getElementById('menu-sound');

    document.getElementById('menu-close').addEventListener('click', () => this.close());

    this.soundButton.addEventListener('click', () => {
      audio.toggleMute();
      this.renderSound();
      this.onChange();
    });

    document.getElementById('menu-reset').addEventListener('click', () => {
      if (confirm('¿Borrar tu progreso y empezar una partida nueva?')) onReset();
    });

    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  open() {
    this.render();
    this.root.classList.remove('hidden');
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    this.onClose();
  }

  renderSound() {
    this.soundButton.textContent = `Sonido: ${audio.muted ? 'apagado' : 'activado'}`;
  }

  render() {
    this.soulsEl.textContent = this.player.souls;
    this.statsEl.innerHTML = '';
    this.renderSound();

    for (const stat of STATS) {
      const level = this.player.levels[stat.id];
      const cost = this.player.upgradeCost(stat.id);

      const row = document.createElement('div');
      row.className = 'stat-row';

      const info = document.createElement('div');
      info.className = 'stat-info';
      info.innerHTML =
        `<strong>${stat.name}</strong> <span>nivel ${level}</span>` +
        `<small>${stat.label}: ${stat.value(level)} → ${stat.value(level + 1)}</small>`;

      const button = document.createElement('button');
      button.textContent = `Mejorar · ${cost}`;
      button.disabled = this.player.souls < cost;
      button.addEventListener('click', () => {
        if (this.player.upgrade(stat.id)) {
          this.render();
          this.onChange();
        }
      });

      row.append(info, button);
      this.statsEl.appendChild(row);
    }
  }
}