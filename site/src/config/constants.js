// Nomes compartilhados entre componentes. Centralizar evita "strings
// mágicas" espalhadas e erros de digitação silenciosos.

export const GRABBABLE_CLASS = "grabbable";
export const GRABBABLE_SELECTOR = `.${GRABBABLE_CLASS}`;

// Atributo que marca um objeto como "na mão de alguém".
export const HELD_ATTRIBUTE = "data-held";

// Entidades com esta classe bloqueiam a passagem do jogador.
export const PLAYER_OBSTACLE_CLASS = "player-obstacle";
export const PLAYER_OBSTACLE_SELECTOR = `.${PLAYER_OBSTACLE_CLASS}`;

// Botões do HUD (alvos do mouse e do laser junto com as pokébolas).
export const HUD_BUTTON_CLASS = "hud-button";
export const POINTABLE_SELECTOR = `${GRABBABLE_SELECTOR}, .${HUD_BUTTON_CLASS}`;

// Bola voltando sozinha para o suporte: ninguém pode pegá-la no caminho.
export const RETURNING_ATTRIBUTE = "data-returning";

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
  // Batalha (detail.player = id do jogador, detail.ball = pokébola).
  POKEMON_RELEASED: "pokemonreleased",
  POKEMON_RECALLED: "pokemonrecalled",
  // A bola caiu no chão, mas não pode soltar o pokémon (detail.reason:
  // "one-at-a-time" = já há um em campo; "fainted" = ele desmaiou).
  SEND_OUT_BLOCKED: "sendoutblocked",
  // Pedido de trazer o pokémon em campo de volta ao suporte.
  RECALL_REQUESTED: "recallrequested",
  // Escolha no HUD (detail: player, action, id).
  HUD_ACTION: "hudaction",
  // Vida do PokeProf de uma bola mudou (emitido na própria bola).
  POKEPROF_CHANGED: "pokeprofchanged",
  // O PokeProf da bola chegou a 0 de vida (emitido na bola, sobe à cena).
  POKEPROF_FAINTED: "pokeproffainted",
  // Um ataque acertou (detail: attackerPlayer, defenderPlayer, attacker,
  // defender, attackLabel, damage, hp, fainted).
  POKEMON_DAMAGED: "pokemondamaged",
});

// Quadros muito longos (aba em segundo plano) não podem gerar saltos.
export const MAX_FRAME_MS = 50;
