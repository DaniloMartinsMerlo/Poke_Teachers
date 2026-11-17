import { EVENTS } from "../../config/constants.js";

// Liga o laser e o modelo do controle só quando aquela mão está com um
// controle físico. Com a mão rastreada o "laser-controls" também se
// conecta (perfil "generic-hand"), e o laser saindo da mão confunde.
AFRAME.registerComponent("controller-input-gate", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
  },

  init() {
    this.inputMode = this.el.sceneEl.systems["input-mode"];
    this.apply = this.apply.bind(this);
    this.onInputModeChanged = (event) => {
      if (event.detail.hand === this.data.hand) {
        this.apply();
      }
    };
    this.el.sceneEl.addEventListener(EVENTS.INPUT_MODE_CHANGED, this.onInputModeChanged);
    // O laser-controls recria o raio ao conectar; reaplicamos depois dele.
    this.el.addEventListener("controllerconnected", this.apply);
    this.apply();
  },

  apply() {
    const active = this.inputMode.usesController(this.data.hand);
    this.el.object3D.visible = active;
    if (this.el.components.raycaster) {
      this.el.setAttribute("raycaster", "enabled", active);
    }
  },

  remove() {
    this.el.sceneEl.removeEventListener(EVENTS.INPUT_MODE_CHANGED, this.onInputModeChanged);
    this.el.removeEventListener("controllerconnected", this.apply);
  },
});
