import { EVENTS, INPUT_MODE } from "../../config/constants.js";
import { clearHeld, markHeld, nearestFreeGrabbable } from "./grab-state.js";

// Rastreamento de mãos: a pinça pega o objeto mais próximo e ele segue o
// ponto da pinça (evento "pinchmoved"); desfazer a pinça solta.
AFRAME.registerComponent("hand-grabber", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
    grabDistance: { default: 0.3 },
  },

  init() {
    this.heldObject = null;
    this.offset = new THREE.Vector3();
    this.onPinchStart = (event) => this.grab(event);
    this.onPinchMove = (event) => this.move(event);
    this.onPinchEnd = () => this.release();
    this.onInputModeChanged = (event) => this.handleInputModeChange(event.detail);

    this.el.addEventListener("pinchstarted", this.onPinchStart);
    this.el.addEventListener("pinchmoved", this.onPinchMove);
    this.el.addEventListener("pinchended", this.onPinchEnd);
    this.el.sceneEl.addEventListener(EVENTS.INPUT_MODE_CHANGED, this.onInputModeChanged);
  },

  // O A-Frame entrega a posição da pinça no espaço do rastreamento, ou
  // seja, relativa ao rig do jogador. Convertemos para coordenadas de
  // mundo; sem isso a pinça erra as bolas quando o rig sai da origem.
  pinchWorldPosition(event) {
    const position = new THREE.Vector3();
    if (event.detail && event.detail.position) {
      this.el.object3D.updateMatrixWorld();
      return position.copy(event.detail.position).applyMatrix4(this.el.object3D.matrixWorld);
    }
    return this.el.object3D.getWorldPosition(position);
  },

  grab(event) {
    if (this.heldObject) {
      return;
    }
    const pinch = this.pinchWorldPosition(event);
    const target = nearestFreeGrabbable(this.el.sceneEl, pinch, this.data.grabDistance);
    if (!target) {
      return;
    }
    this.heldObject = target;
    this.offset.copy(target.object3D.position).sub(pinch);
    markHeld(target);
  },

  move(event) {
    if (this.heldObject) {
      this.heldObject.object3D.position.copy(this.pinchWorldPosition(event)).add(this.offset);
    }
  },

  release() {
    if (!this.heldObject) {
      return;
    }
    clearHeld(this.heldObject);
    this.heldObject = null;
  },

  // Largou o rastreamento (pegou o controle, mão saiu da vista): o
  // "pinchended" pode nunca chegar, então soltamos aqui.
  handleInputModeChange({ hand, mode }) {
    if (hand === this.data.hand && mode !== INPUT_MODE.HAND) {
      this.release();
    }
  },

  remove() {
    this.release();
    this.el.removeEventListener("pinchstarted", this.onPinchStart);
    this.el.removeEventListener("pinchmoved", this.onPinchMove);
    this.el.removeEventListener("pinchended", this.onPinchEnd);
    this.el.sceneEl.removeEventListener(EVENTS.INPUT_MODE_CHANGED, this.onInputModeChanged);
  },
});
