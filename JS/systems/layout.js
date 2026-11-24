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
    { x: 1800, y: 4800, count: 3 },
    { x: 2900, y: 5600, count: 2 },
    { x: 1300, y: 4200, count: 3 },
    { x: 2400, y: 3700, count: 3 },
    { x: 3700, y: 4300, count: 3 },
    { x: 4300, y: 5700, count: 3 },
    { x: 5600, y: 5200, count: 2 },
    { x: 5700, y: 3500, count: 3 },
    { x: 4400, y: 2700, count: 3 },
    { x: 3300, y: 1800, count: 3 },
    { x: 2500, y: 2300, count: 3 },
    { x: 900, y: 1600, count: 2 },
    { x: 4200, y: 1500, count: 3 },
    { x: 5000, y: 2300, count: 3 },
  ],

  // Zonas que hacen daño (alineadas al piso de 32 px)
  hazards: [{ x: 704, y: 5568, w: 192, h: 192, damage: 15 }],
};