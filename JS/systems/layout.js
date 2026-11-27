// Posiciones importantes del primer reino (en píxeles), todas en un solo lugar
// para poder mover cosas fácilmente. Las medidas de muros y ruinas se dan en
// cuadros de 32 px.
//
// El mapa: el altar está en la esquina suroeste, el castillo del jefe en la
// noreste, y las ruinas (futuras guaridas de los guardianes) en el medio.
export const WORLD_SIZE = 6400;

export const LAYOUT = {
  altar: { x: 1024, y: 5472 },
  npc: { x: 1216, y: 5440 },
  relic: { x: 1120, y: 3296 }, // dentro de las Ruinas del Norte
  boss: { x: 5312, y: 1056 },  // centro del castillo
  castle: { half: 256 },       // medio lado del cuadrado de muros (8 cuadros)

  // x, y = centro; w, h = tamaño en cuadros
  ruins: [
    { name: 'Ruinas del Norte', x: 1120, y: 3296, w: 13, h: 11 },
    { name: 'Plaza Central', x: 3200, y: 3200, w: 17, h: 13 },
    { name: 'Ruinas del Noroeste', x: 1728, y: 1312, w: 15, h: 13 },
    { name: 'Ruinas del Sureste', x: 4800, y: 4608, w: 15, h: 13 },
  ],

  // Campamentos de demonios: x, y = centro; count = cuántos
  camps: [
    { x: 1800, y: 4800, types: ['menor', 'menor', 'menor'] },
    { x: 2900, y: 5600, types: ['menor', 'veloz'] },
    { x: 1300, y: 4200, types: ['menor', 'menor', 'lanzador'] },
    { x: 2400, y: 3700, types: ['menor', 'veloz', 'lanzador'] },
    { x: 3700, y: 4300, types: ['menor', 'menor', 'invocador'] },
    { x: 4300, y: 5700, types: ['veloz', 'veloz', 'menor'] },
    { x: 5600, y: 5200, types: ['tanque', 'menor'] },
    { x: 5700, y: 3500, types: ['lanzador', 'lanzador', 'menor'] },
    { x: 4400, y: 2700, types: ['tanque', 'veloz', 'lanzador'] },
    { x: 3300, y: 1800, types: ['invocador', 'menor', 'menor'] },
    { x: 2500, y: 2300, types: ['tanque', 'lanzador', 'menor'] },
    { x: 900, y: 1600, types: ['invocador', 'veloz'] },
    { x: 4200, y: 1500, types: ['tanque', 'invocador', 'lanzador'] },
    { x: 5000, y: 2300, types: ['veloz', 'lanzador', 'menor'] },
  ],

  // Brasas: grupos de cuadros que hacen daño si los pisas (los demonios no les temen).
  // Se reparten al azar por el mapa (siempre en los mismos lugares); la mitad queda cerca de
  // campamentos de demonios. minSize y maxSize son el tamaño del grupo en cuadros.
  hazardPatches: { count: 20, minSize: 2, maxSize: 4, damage: 8 },
};