import { EVENTS } from "../../config/constants.js";

// Botões B (direito) e Y (esquerdo) dos controles do Quest resetam o jogo.
const RESET_BUTTON_EVENTS = ["bbuttondown", "ybuttondown"];

AFRAME.registerComponent("controller-reset", {
  init() {
    this.onReset = () => this.el.sceneEl.emit(EVENTS.GAME_RESET, null, false);
    RESET_BUTTON_EVENTS.forEach((name) => this.el.addEventListener(name, this.onReset));
  },

  remove() {
    RESET_BUTTON_EVENTS.forEach((name) => this.el.removeEventListener(name, this.onReset));
  },
});
