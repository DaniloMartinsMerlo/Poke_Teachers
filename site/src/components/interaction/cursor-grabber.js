import { MOUSE_CURSOR_ID } from "../../config/constants.js";
import { HOLD_MAX_DISTANCE, HOLD_MIN_DISTANCE, WHEEL_METERS_PER_UNIT } from "../../config/grab.js";
import { reelDistance } from "../../domain/reel.js";
import { clearHeld, isFreeGrabbable, markHeld, moveAlongHoldLine } from "./grab-state.js";

const THROW_SPEED = 4.5;
const THROW_LIFT = new THREE.Vector3(0, 1.2, 0);

// Computador: 1º clique pega (a bola vai junto com a câmera), 2º clique
// arremessa para frente. Só responde ao cursor do mouse, para não brigar
// com o laser dos controles. Segurando, a rodinha aproxima (para baixo)
// ou afasta (para cima) a bola.
AFRAME.registerComponent("cursor-grabber", {
  init() {
    this.isHolding = false;
    this.onClick = (event) => this.toggle(event);
    this.onWheel = (event) => this.reel(event);
    this.el.addEventListener("click", this.onClick);
    window.addEventListener("wheel", this.onWheel, { passive: true });
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
    if (!isFreeGrabbable(this.el) || !camera) {
      return;
    }
    camera.el.object3D.attach(this.el.object3D);
    markHeld(this.el);
    this.isHolding = true;
  },

  reel(event) {
    if (!this.isHolding) {
      return;
    }
    const object = this.el.object3D;
    moveAlongHoldLine(object, reelDistance(
      object.position.length(), -event.deltaY * WHEEL_METERS_PER_UNIT,
      HOLD_MIN_DISTANCE, HOLD_MAX_DISTANCE));
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
    window.removeEventListener("wheel", this.onWheel);
  },
});
