// Menu de batalha (HUD) que acompanha o jogador pelo lado esquerdo.
// Textos sem acento: a fonte padrão do A-Frame não tem esses caracteres.

// Posição relativa à cabeça: ângulo para a esquerda (graus), distância
// horizontal e quanto fica abaixo dos olhos (m).
export const HUD_ANGLE_DEG = 38;
export const HUD_DISTANCE = 0.75;
export const HUD_DROP = 0.3;
// Rapidez com que o HUD alcança a cabeça (1/s); maior = mais "grudado".
export const HUD_FOLLOW_RATE = 6;

// Tamanho dos botões (m) e espaço entre eles.
export const HUD_BUTTON = Object.freeze({ width: 0.2, height: 0.075, gap: 0.015 });
// Painel (m): margem em volta, faixas do título e do status e a linha
// colorida do jogador no topo.
export const HUD_LAYOUT = Object.freeze({ padding: 0.012, title: 0.045, status: 0.035, stripe: 0.006 });
// Distância máxima da pinça até o botão para apertá-lo (mão rastreada).
export const HUD_PINCH_REACH = 0.05;
// Quanto tempo a mensagem de status fica na tela (ms).
export const HUD_STATUS_MS = 2500;

export const HUD_COLORS = Object.freeze({
  panel: "#1d2533",
  button: "#3a4a63",
  buttonHover: "#ffd23f",
  text: "#ffffff",
  textHover: "#1d1d1d",
  disabled: "#5b5f66",
});

export const HUD_PAGES = Object.freeze({ MAIN: "main", ATTACK: "attack", POWERUP: "powerup" });

export const HUD_ACTIONS = Object.freeze({
  ATTACK: "attack",
  POWERUP: "powerup",
  SWITCH: "switch",
  GIVE_UP: "giveup",
  BACK: "back",
});

export const MAIN_OPTIONS = Object.freeze([
  { action: HUD_ACTIONS.ATTACK, label: "Ataque" },
  { action: HUD_ACTIONS.POWERUP, label: "PowerUps" },
  { action: HUD_ACTIONS.SWITCH, label: "Trocar PokeProf" },
  { action: HUD_ACTIONS.GIVE_UP, label: "Desistir" },
]);

// Ataques e power-ups (por enquanto só nomes; o efeito vem depois).
export const ATTACKS = Object.freeze([
  { id: "prova-surpresa", label: "Prova Surpresa" },
  { id: "chamada-oral", label: "Chamada Oral" },
  { id: "trabalho-em-grupo", label: "Trabalho em Grupo" },
  { id: "reprovacao", label: "Reprovar" },
]);

export const POWERUPS = Object.freeze([
  { id: "ponto-extra", label: "Ponto Extra" },
  { id: "intervalo", label: "Intervalo" },
  { id: "cola-liberada", label: "Cola Liberada" },
  { id: "feriado", label: "Feriado" },
]);
