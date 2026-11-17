// Cuadro de diálogo (HTML encima del canvas). F o el botón aceptan; Esc cierra.
export class Dialog {
  constructor(onClose) {
    this.onClose = onClose;
    this.onConfirm = null;

    this.root = document.getElementById('dialog');
    this.nameEl = document.getElementById('dialog-name');
    this.textEl = document.getElementById('dialog-text');
    this.okButton = document.getElementById('dialog-ok');

    this.okButton.addEventListener('click', () => this.confirm());
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.cancel();
    });
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  open(name, text, buttonLabel, onConfirm) {
    this.nameEl.textContent = name;
    this.textEl.textContent = text;
    this.okButton.textContent = buttonLabel;
    this.onConfirm = onConfirm;
    this.root.classList.remove('hidden');
  }

  confirm() {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    const callback = this.onConfirm;
    this.onConfirm = null;
    if (callback) callback();
    this.onClose();
  }

  cancel() {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    this.onConfirm = null;
    this.onClose();
  }
}