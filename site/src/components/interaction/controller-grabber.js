import { EVENTS } from "../../config/constants.js";
import { clearHeld, isFreeGrabbable, markHeld, nearestFreeGrabbable } from "./grab-state.js";

const GRAB_EVENTS = ["gripdown", "triggerdown"];
const RELEASE_EVENTS = ["gripup", "triggerup"];

// Controle físico: segure gatilho ou grip com o controle encostado na
// bola (até grabDistance) ou apontando o laser para ela.
// Só age quando aquela mão está de fato com um controle; com a mão
// rastreada, quem pega é o "hand-grabber".
AFRAME.registerComponent("controller-grabber", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
    grabDistance: { default: 0.2 },
  },

  init() {
    this.inputMode = this.el.sceneEl.systems["input-mode"];
    this.heldObject = null;
    this.controllerPosition = new THREE.Vector3();
    this.onGrab = () => this.grab();
    this.onRelease = () => this.release();
    this.onInputModeChanged = (event) => this.handleInputModeChange(event.detail);

    GRAB_EVENTS.forEach((name) => this.el.addEventListener(name, this.onGrab));
    RELEASE_EVENTS.forEach((name) => this.el.addEventListener(name, this.onRelease));
    this.el.sceneEl.addEventListener(EVENTS.INPUT_MODE_CHANGED, this.onInputModeChanged);
  },

  grab() {
    if (this.heldObject || !this.inputMode.usesController(this.data.hand)) {
      return;
    }
    const target = this.objectInReach() || this.objectUnderLaser();
    if (!target) {
      return;
    }
    this.heldObject = target;
    this.el.object3D.attach(target.object3D);
    markHeld(target);
  },

  objectInReach() {
    this.el.object3D.getWorldPosition(this.controllerPosition);
    return nearestFreeGrabbable(this.el.sceneEl, this.controllerPosition, this.data.grabDistance);
  },

  objectUnderLaser() {
    const raycaster = this.el.components.raycaster;
    const hits = (raycaster && raycaster.intersectedEls) || [];
    return hits.find(isFreeGrabbable) || null;
  },

  release() {
    if (!this.heldObject) {
      return;
    }
    this.el.sceneEl.object3D.attach(this.heldObject.object3D);
    clearHeld(this.heldObject);
    this.heldObject = null;
  },

  // Soltou o controle no meio da pegada: a bola não pode ficar presa.
  handleInputModeChange({ hand }) {
    if (hand === this.data.hand && !this.inputMode.usesController(hand)) {
      this.release();
    }
  },

  remove() {
    this.release();
    GRAB_EVENTS.forEach((name) => this.el.removeEventListener(name, this.onGrab));
    RELEASE_EVENTS.forEach((name) => this.el.removeEventListener(name, this.onRelease));
    this.el.sceneEl.removeEventListener(EVENTS.INPUT_MODE_CHANGED, this.onInputModeChanged);
  },
});
