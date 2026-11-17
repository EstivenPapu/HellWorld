// Guardado en el navegador (localStorage). Si el navegador lo bloquea
// (modo privado, por ejemplo), el juego sigue funcionando sin guardar.
const KEY = 'hellworld-save-v1';
const VERSION = 1;

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.version === VERSION ? data : null;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...data }));
  } catch {
    // sin guardado
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que borrar
  }
}