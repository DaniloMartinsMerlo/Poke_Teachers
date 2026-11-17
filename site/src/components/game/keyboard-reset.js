import { EVENTS } from "../../config/constants.js";

// Computador: tecla R reseta o jogo (vai na <a-scene>).
AFRAME.registerComponent("keyboard-reset", {
  schema: {
    key: { default: "KeyR" },
  },

  init() {
    this.onKeyDown = (event) => {
      if (event.code === this.data.key) {
        this.el.sceneEl.emit(EVENTS.GAME_RESET, null, false);
      }
    };
    window.addEventListener("keydown", this.onKeyDown);
  },

  remove() {
    window.removeEventListener("keydown", this.onKeyDown);
  },
});
