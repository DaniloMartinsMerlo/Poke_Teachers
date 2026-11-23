// Medidas e cores da arena. Campo de 10 x 16 m centrado na origem; o
// jogador começa perto de z = +7 olhando para -z (lado do adversário).

export const COLORS = Object.freeze({
  grass: "#5c9c55",
  apron: "#7fc06c",
  dirt: "#d8b47a",
  line: "#ffffff",
  emblemRed: "#e3350d",
  emblemWhite: "#f4f4f4",
  emblemBlack: "#222222",
  wall: "#2f6db5",
  wallTrim: "#ffffff",
  pole: "#6b6b6b",
  concrete: "#8e9aa6",
});

export const GROUND_SIZE = 60;
export const APRON = Object.freeze({ width: 14, length: 20 });
export const FIELD = Object.freeze({ width: 10, length: 16 });
export const LINE_WIDTH = 0.1;
export const TRAINER_BOX_Z = 6.9;

// Cada camada desenhada no chão sobe alguns milímetros para não "piscar"
// (z-fighting) com a de baixo.
export const FLOOR_LAYER = 0.002;

// Muretas: o lado de dentro fica em x = ±7 e z = ±10.
export const WALL = Object.freeze({
  innerHalfWidth: 7,
  innerHalfLength: 10,
  thickness: 0.3,
  height: 0.8,
  trimHeight: 0.05,
});

// Limite da arena para as pokébolas: o lado de dentro das muretas. Bola
// solta além disto (arquibancada, em cima da mureta, fora do estádio) não
// solta o PokeProf e volta voando para o suporte (ver ball-rack).
export const ARENA_BOUNDS = Object.freeze({
  halfWidth: WALL.innerHalfWidth,
  halfLength: WALL.innerHalfLength,
});

export const BLEACHERS = Object.freeze({
  firstStepX: 7.8,
  stepWidth: 0.9,
  stepHeights: [0.9, 1.4, 1.9, 2.4],
  length: 18,
  backWall: { x: 11.2, width: 0.5, height: 3.2 },
  colors: {
    left: ["#c0392b", "#e74c3c"],
    right: ["#2463a6", "#3a86d4"],
  },
});

export const LIGHT_TOWERS = Object.freeze({
  halfX: 12,
  halfZ: 11,
  height: 8,
});
