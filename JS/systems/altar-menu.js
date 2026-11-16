import { STATS } from '../entities/player.js';

// Menú del altar (HTML encima del canvas): gastar almas en mejoras.
export class AltarMenu {
  constructor(player, onClose) {
    this.player = player;
    this.onClose = onClose;

    this.root = document.getElementById('altar-menu');
    this.soulsEl = document.getElementById('menu-souls');
    this.statsEl = document.getElementById('menu-stats');

    document.getElementById('menu-close').addEventListener('click', () => this.close());
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

  render() {
    this.soulsEl.textContent = this.player.souls;
    this.statsEl.innerHTML = '';

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
        if (this.player.upgrade(stat.id)) this.render();
      });

      row.append(info, button);
      this.statsEl.appendChild(row);
    }
  }
}