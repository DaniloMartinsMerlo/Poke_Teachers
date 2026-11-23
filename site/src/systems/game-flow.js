import { EVENTS } from "../config/constants.js";
import { HUD_ACTIONS } from "../config/hud.js";
import { GAME_MODES } from "../config/menu.js";

// ----------------------------------------------------------------------
// Sistema "game-flow": em que parte do jogo estamos.
//
//   menu  → tela inicial (componente "main-menu"). Nenhuma bola pode ser
//           pega, o HUD de batalha some e a CPU não joga.
//   match → partida contra `opponent` (OPPONENTS: "cpu"; "player" vem
//           com as salas online).
//
// Abrir a partida ou voltar ao menu reseta o jogo (GAME_RESET) e avisa
// GAME_MODE_CHANGED. O botão "Menu" do fim de jogo (HUD_ACTION "menu")
// volta para a tela inicial.
// ----------------------------------------------------------------------
AFRAME.registerSystem("game-flow", {
  init() {
    this.mode = GAME_MODES.MENU;
    this.opponent = null;
    this.onHudAction = ({ detail }) => {
      if (detail.action === HUD_ACTIONS.MENU) {
        this.openMenu();
      }
    };
    this.el.addEventListener(EVENTS.HUD_ACTION, this.onHudAction);
  },

  isMenu() {
    return this.mode === GAME_MODES.MENU;
  },

  /** Partida em andamento contra este adversário? */
  isPlayingAgainst(opponent) {
    return this.mode === GAME_MODES.MATCH && this.opponent === opponent;
  },

  /** Abre uma partida contra `opponent` (OPPONENTS). */
  startMatch(opponent) {
    this.setMode(GAME_MODES.MATCH, opponent);
  },

  openMenu() {
    this.setMode(GAME_MODES.MENU, null);
  },

  setMode(mode, opponent) {
    this.el.emit(EVENTS.GAME_RESET, null, false);
    this.mode = mode;
    this.opponent = opponent;
    this.el.emit(EVENTS.GAME_MODE_CHANGED, { mode, opponent }, false);
  },

  remove() {
    this.el.removeEventListener(EVENTS.HUD_ACTION, this.onHudAction);
  },
});
