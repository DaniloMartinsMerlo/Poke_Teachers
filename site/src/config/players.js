// Jogadores da batalha. Cada suporte de pokébolas e cada HUD pertence a
// um jogador; a cor e o rótulo distinguem os pokémons de cada um no
// campo. "control" diz quem joga: "human" (pessoa) ou "cpu" (computador,
// ainda sem inteligência).

export const PLAYERS = Object.freeze({
  p1: Object.freeze({ label: "J1", color: "#2f80ed", control: "human" }),
  p2: Object.freeze({ label: "J2", color: "#e3350d", control: "human" }),
});

export const PLAYER_IDS = Object.freeze(Object.keys(PLAYERS));

/** Dados do jogador (cai no J1 se o id for desconhecido). */
export const playerInfo = (id) => PLAYERS[id] || PLAYERS.p1;
