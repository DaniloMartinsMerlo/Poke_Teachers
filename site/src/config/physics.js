// Parâmetros do mundo físico (cannon.js).

export const GRAVITY = -9.82;
export const FIXED_TIME_STEP = 1 / 90;
export const MAX_SUB_STEPS = 6;
export const SOLVER_ITERATIONS = 12;

export const MATERIALS = Object.freeze(["ball", "wood", "ground"]);

// [materialA, materialB, atrito, restituição (quique)]
export const CONTACTS = Object.freeze([
  ["ball", "ball", 0.3, 0.7],
  ["ball", "wood", 0.6, 0.35],
  ["ball", "ground", 0.8, 0.3],
  ["wood", "ground", 0.5, 0.05],
  ["wood", "wood", 0.5, 0.05],
]);

export const SLEEP_SPEED_LIMIT = 0.08;
export const SLEEP_TIME_LIMIT = 0.6;

// Arremesso: limite de velocidade ao soltar um objeto.
export const MAX_THROW_SPEED = 12;

// Abaixo desta altura o objeto "caiu do mundo" e volta ao lugar inicial.
export const FALL_RESET_HEIGHT = -20;

// Pouso: ao bater em cima de algo (normal com |y| >= LANDING_MIN_UP), a
// pokébola perde quase todo o movimento horizontal e o giro, e passa a
// ter amortecimento alto. Assim ela para onde caiu em vez de rolar.
export const LANDING_MIN_UP = 0.7;
export const LANDING_KEEP = 0.2;
export const LANDED_LINEAR_DAMPING = 0.9;
export const LANDED_ANGULAR_DAMPING = 0.99;
export const FLYING_LINEAR_DAMPING = 0.05;
export const FLYING_ANGULAR_DAMPING = 0.3;
