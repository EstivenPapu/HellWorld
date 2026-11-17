// Misión secundaria de prueba: "La reliquia perdida".
// available -> active -> ready -> done
export const QUEST = {
  name: 'La reliquia perdida',
  reward: 80,
  relic: { x: 450, y: 2650 }, // suroeste del reino
};

const STATES = ['available', 'active', 'ready', 'done'];

export class Quest {
  constructor() {
    this.state = 'available';
  }

  serialize() {
    return { state: this.state };
  }

  load(data) {
    if (data && STATES.includes(data.state)) this.state = data.state;
  }

  accept() {
    if (this.state === 'available') this.state = 'active';
  }

  collect() {
    if (this.state === 'active') this.state = 'ready';
  }

  complete() {
    if (this.state === 'ready') this.state = 'done';
  }

  // Texto de objetivo que se ve en pantalla
  get objective() {
    if (this.state === 'active') return 'Misión: encuentra la reliquia (suroeste)';
    if (this.state === 'ready') return 'Misión: vuelve con el Peregrino';
    return '';
  }

  // Lo que dice el Peregrino según el estado de la misión
  dialog() {
    switch (this.state) {
      case 'available':
        return {
          text: 'Viajero... un fragmento de mi alma quedó atrapado en las ruinas del suroeste. Tráelo y te recompensaré.',
          button: 'Aceptar',
          action: 'accept',
        };
      case 'active':
        return {
          text: 'Las ruinas están al suroeste, lejos del altar. Busca una luz violeta en el suelo.',
          button: 'Entendido',
          action: null,
        };
      case 'ready':
        return {
          text: 'Lo trajiste... siento que mi memoria vuelve. Toma estas almas, te las has ganado.',
          button: `Recibir ${QUEST.reward} almas`,
          action: 'reward',
        };
      default:
        return { text: 'Que la luz te guíe, viajero.', button: 'Adiós', action: null };
    }
  }
}