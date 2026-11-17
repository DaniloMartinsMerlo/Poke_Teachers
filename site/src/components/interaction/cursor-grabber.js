import { MOUSE_CURSOR_ID } from "../../config/constants.js";
import { clearHeld, isHeld, markHeld } from "./grab-state.js";

const THROW_SPEED = 2.5;
const THROW_LIFT = new THREE.Vector3(0, 0.75, 0);

// Computador: 1º clique pega (a bola vai junto com a câmera), 2º clique
// arremessa para frente. Só responde ao cursor do mouse, para não brigar
// com o laser dos controles.
AFRAME.registerComponent("cursor-grabber", {
  init() {
    this.isHolding = false;
    this.onClick = (event) => this.toggle(event);
    this.el.addEventListener("click", this.onClick);
  },

  toggle(event) {
    const cursorEl = event.detail && event.detail.cursorEl;
    if (!cursorEl || cursorEl.id !== MOUSE_CURSOR_ID) {
      return;
    }
    if (this.isHolding) {
      this.throw();
    } else {
      this.pickUp();
    }
  },

  pickUp() {
    const camera = this.el.sceneEl.camera;
    if (isHeld(this.el) || !camera) {
      return;
    }
    camera.el.object3D.attach(this.el.object3D);
    markHeld(this.el);
    this.isHolding = true;
  },

  throw() {
    this.el.sceneEl.object3D.attach(this.el.object3D);
    clearHeld(this.el);
    this.isHolding = false;

    const physics = this.el.components["physics-body"];
    const camera = this.el.sceneEl.camera;
    if (physics && camera) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      physics.addVelocity(direction.multiplyScalar(THROW_SPEED).add(THROW_LIFT));
    }
  },

  remove() {
    this.el.removeEventListener("click", this.onClick);
  },
});
