import { EVENTS, GRABBABLE_SELECTOR } from "../../config/constants.js";
import { isBasket } from "../../domain/scoring.js";
import { isHeld } from "../interaction/grab-state.js";

// Conta as cestas: vai no centro do aro e emite "scorechanged" a cada
// bola que passa por dentro dele, de cima para baixo.
AFRAME.registerComponent("hoop-score", {
  schema: {
    radius: { default: 0.28 },
  },

  init() {
    this.score = 0;
    this.center = new THREE.Vector3();
    this.ballPosition = new THREE.Vector3();
    this.previousY = new WeakMap();
  },

  tick() {
    this.el.object3D.getWorldPosition(this.center);
    this.el.sceneEl.querySelectorAll(GRABBABLE_SELECTOR).forEach((ball) => {
      ball.object3D.getWorldPosition(this.ballPosition);
      const previousY = this.previousY.get(ball);
      this.previousY.set(ball, this.ballPosition.y);

      if (previousY === undefined || isHeld(ball)) {
        return;
      }
      if (isBasket(previousY, this.ballPosition, this.center, this.data.radius)) {
        this.score += 1;
        this.el.emit(EVENTS.SCORE_CHANGED, { score: this.score });
      }
    });
  },
});
