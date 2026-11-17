import { EVENTS } from "../../config/constants.js";

// Texto do placar: escuta "scorechanged" e pisca em verde a cada cesta.
AFRAME.registerComponent("score-display", {
  schema: {
    label: { default: "Cestas" },
    color: { default: "#202020" },
    flashColor: { default: "#1a7f37" },
    flashMs: { default: 600 },
  },

  init() {
    this.onScoreChanged = (event) => this.show(event.detail.score);
    this.el.sceneEl.addEventListener(EVENTS.SCORE_CHANGED, this.onScoreChanged);
    this.show(0, false);
  },

  show(score, flash = true) {
    this.el.setAttribute("value", `${this.data.label}: ${score}`);
    if (!flash) {
      this.el.setAttribute("color", this.data.color);
      return;
    }
    this.el.setAttribute("color", this.data.flashColor);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.el.setAttribute("color", this.data.color), this.data.flashMs);
  },

  remove() {
    clearTimeout(this.flashTimer);
    this.el.sceneEl.removeEventListener(EVENTS.SCORE_CHANGED, this.onScoreChanged);
  },
});
