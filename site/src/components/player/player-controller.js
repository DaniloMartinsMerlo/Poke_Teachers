import { GRABBABLE_SELECTOR } from "../../config/constants.js";

const LOCOMOTION_COMPONENT = Object.freeze({
  move: "thumbstick-movement",
  turn: "thumbstick-turn",
});

// Controle físico (ex.: Quest Touch): laser, pegar com gatilho/grip,
// resetar com B/Y e uma função de locomoção no analógico.
AFRAME.registerComponent("player-controller", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
    locomotion: { default: "none", oneOf: ["move", "turn", "none"] },
    laserLength: { default: 3 },
  },

  init() {
    const { hand, locomotion, laserLength } = this.data;
    this.el.setAttribute("laser-controls", { hand });
    this.el.setAttribute("raycaster", { objects: GRABBABLE_SELECTOR, far: laserLength });
    this.el.setAttribute("controller-input-gate", { hand });
    this.el.setAttribute("controller-grabber", { hand });
    this.el.setAttribute("controller-reset", "");
    if (LOCOMOTION_COMPONENT[locomotion]) {
      this.el.setAttribute(LOCOMOTION_COMPONENT[locomotion], { hand });
    }
  },
});
