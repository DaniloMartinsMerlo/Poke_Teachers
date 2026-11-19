// Menu de batalha (HUD) que acompanha o jogador pelo lado esquerdo.
// Textos sem acento: a fonte padrão do A-Frame não tem esses caracteres.

// Posição relativa à cabeça: ângulo para a esquerda (graus), distância
// horizontal e quanto fica abaixo dos olhos (m).
export const HUD_ANGLE_DEG = 38;
export const HUD_DISTANCE = 0.75;
export const HUD_DROP = 0.3;
// O HUD segue o corpo (rig), não a cabeça: virar a cabeça para olhar o
// menu não o tira do lugar. Como o VR não sabe para onde o tronco aponta,
// se a cabeça ficar virada mais que HUD_RECENTER_DEG para o mesmo lado por
// HUD_RECENTER_DELAY_MS, entende-se que o corpo girou e o HUD vem junto,
// suavemente (HUD_RECENTER_RATE, 1/s).
export const HUD_RECENTER_DEG = 100;
export const HUD_RECENTER_DELAY_MS = 1200;
export const HUD_RECENTER_RATE = 5;
// Folga para movimentos da cabeça (m): inclinar até isto para alcançar um
// botão não move o HUD; andar de verdade além disso o arrasta junto.
export const HUD_POSITION_SLACK = 0.3;
export const HUD_HEIGHT_SLACK = 0.15;

// Tamanho dos botões (m) e espaço entre eles.
export const HUD_BUTTON = Object.freeze({ width: 0.2, height: 0.075, gap: 0.015 });
// Painel (m): margem em volta, faixas do título e do status e a linha
// colorida do jogador no topo.
export const HUD_LAYOUT = Object.freeze({ padding: 0.012, title: 0.045, status: 0.035, stripe: 0.006 });
// Espaço entre o painel e o cartão do PokeProf em campo, acima dele (m).
export const HUD_CARD_GAP = 0.015;
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

// Detalhe dos botões de ataque (poder e dano estimado) e badge dos
// power-ups (o que fazem), em uma linha menor embaixo do nome.
export const HUD_DETAIL = Object.freeze({ labelLift: 0.014, rowY: -0.019, badgeWidth: 0.13, badgeHeight: 0.022 });
export const HUD_BADGE_COLORS = Object.freeze({
  attack: "#e0533d",
  speed: "#d9a400",
  defense: "#3b7dd8",
  heal: "#2e9e4f",
});
export const HUD_DETAIL_COLOR = "#c9d6ea";

export const HUD_PAGES = Object.freeze({
  MAIN: "main", ATTACK: "attack", POWERUP: "powerup", GAME_OVER: "gameover",
});

export const HUD_ACTIONS = Object.freeze({
  ATTACK: "attack",
  POWERUP: "powerup",
  SWITCH: "switch",
  GIVE_UP: "giveup",
  BACK: "back",
  PLAY_AGAIN: "playagain",
});

export const MAIN_OPTIONS = Object.freeze([
  { action: HUD_ACTIONS.ATTACK, label: "Ataque" },
  { action: HUD_ACTIONS.POWERUP, label: "PowerUps" },
  { action: HUD_ACTIONS.SWITCH, label: "Trocar PokeProf" },
  { action: HUD_ACTIONS.GIVE_UP, label: "Desistir" },
]);

export const GAME_OVER_OPTIONS = Object.freeze([
  { action: HUD_ACTIONS.PLAY_AGAIN, label: "Jogar de novo" },
]);

export const HUD_TEXTS = Object.freeze({
  waiting: "Aguardando adversario...",
  resolving: "Resolvendo o turno...",
  win: "Voce venceu!",
  lose: "Voce perdeu!",
});
export const HUD_RESULT_COLORS = Object.freeze({ win: "#4cd964", lose: "#ff6b5e" });

// Ataques e power-ups do menu: config/battle.js.

// Registro de batalha: painel à direita do menu com as últimas ações.
export const HUD_LOG = Object.freeze({ width: 0.36, lines: 7, lineHeight: 0.03, gap: 0.015, wrapCount: 44 });
export const HUD_LOG_COLORS = Object.freeze({ p1: "#7fb6ff", p2: "#ff8a75", turn: "#9aa4b5" });

// Balões sobre os PokeProfs no campo, a cada ação do turno.
//   height: acima do chão (m); rise: quanto sobem enquanto somem;
//   duration (ms); scalePerMeter: crescem com a distância até a câmera
//   para continuar legíveis do outro lado do campo (mínimo 1).
export const FIELD_CALLOUT = Object.freeze({
  height: 1.1, noteOffset: 0.17, rise: 0.3, duration: 2200, scalePerMeter: 0.22,
  damageColor: "#ff5a4a", healColor: "#4cd964", noteColor: "#ffd23f",
});
