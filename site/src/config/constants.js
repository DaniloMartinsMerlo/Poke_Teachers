// Nomes compartilhados entre componentes. Centralizar evita "strings
// mágicas" espalhadas e erros de digitação silenciosos.

export const GRABBABLE_CLASS = "grabbable";
export const GRABBABLE_SELECTOR = `.${GRABBABLE_CLASS}`;

// Atributo que marca um objeto como "na mão de alguém".
export const HELD_ATTRIBUTE = "data-held";

// Entidades com esta classe bloqueiam a passagem do jogador.
export const PLAYER_OBSTACLE_CLASS = "player-obstacle";
export const PLAYER_OBSTACLE_SELECTOR = `.${PLAYER_OBSTACLE_CLASS}`;

export const MOUSE_CURSOR_ID = "mouse-cursor";

export const HANDS = Object.freeze(["left", "right"]);

// Como cada mão está sendo usada no momento.
export const INPUT_MODE = Object.freeze({
  NONE: "none",
  HAND: "hand", // rastreamento de mãos (pinça)
  CONTROLLER: "controller", // controle físico (gatilho / grip)
});

export const EVENTS = Object.freeze({
  INPUT_MODE_CHANGED: "inputmodechanged",
  GAME_RESET: "gamereset",
  // Pokébola pousou em uma superfície (detail.surface = nome do material).
  BALL_LANDED: "balllanded",
  // Pokébola saiu do chão: foi pega ou resetada.
  BALL_TAKEOFF: "balltakeoff",
  // Um objeto acabou de ser solto (sobe da bola até a cena).
  GRAB_RELEASED: "grabreleased",
});

// Quadros muito longos (aba em segundo plano) não podem gerar saltos.
export const MAX_FRAME_MS = 50;
