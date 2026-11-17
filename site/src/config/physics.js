// Parâmetros do mundo físico (cannon.js).

export const GRAVITY = -9.82;
export const FIXED_TIME_STEP = 1 / 90;
export const MAX_SUB_STEPS = 6;
export const SOLVER_ITERATIONS = 12;

export const MATERIALS = Object.freeze(["ball", "wood", "ground"]);

// [materialA, materialB, atrito, restituição (quique)]
export const CONTACTS = Object.freeze([
  ["ball", "ball", 0.3, 0.7],
  ["ball", "wood", 0.4, 0.55],
  ["ball", "ground", 0.6, 0.45],
  ["wood", "ground", 0.5, 0.05],
  ["wood", "wood", 0.5, 0.05],
]);

export const SLEEP_SPEED_LIMIT = 0.08;
export const SLEEP_TIME_LIMIT = 0.6;

// Arremesso: limite de velocidade ao soltar um objeto.
export const MAX_THROW_SPEED = 8;

// Abaixo desta altura o objeto "caiu do mundo" e volta ao lugar inicial.
export const FALL_RESET_HEIGHT = -20;
