import { EVENTS } from "../../config/constants.js";
import { HOLD_MAX_DISTANCE, HOLD_MIN_DISTANCE, REEL_DEAD_ZONE, REEL_SPEED } from "../../config/grab.js";
import { reelAlongRay, thumbstickReel } from "../../domain/reel.js";
import { frameSeconds } from "../../utils/time.js";
import {
  clearHeld, isFreeGrabbable, markHeld, nearestFreeGrabbable,
} from "./grab-state.js";

const GRAB_EVENTS = ["gripdown", "triggerdown"];
const RELEASE_EVENTS = ["gripup", "triggerup"];

// Controle físico: segure gatilho ou grip com o controle encostado na
// bola (até grabDistance) ou apontando o laser para ela.
// Só age quando aquela mão está de fato com um controle; com a mão
// rastreada, quem pega é o "hand-grabber".
// Segurando, o analógico dessa mão vira carretilha: para frente afasta a
// bola, para trás puxa (a locomoção dessa mão pausa enquanto segura).
// A bola anda paralela ao laser (origem e direção do "raycaster", que o
// laser-controls ajusta ao modelo do controle), e não na linha centro do
// controle → bola, que no Quest diverge do laser.
AFRAME.registerComponent("controller-grabber", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
    grabDistance: { default: 0.2 },
  },

  init() {
    this.inputMode = this.el.sceneEl.systems["input-mode"];
    this.heldObject = null;
    this.controllerPosition = new THREE.Vector3();
    this.rayDirection = new THREE.Vector3();
    this.stickY = 0;
    this.onThumbstick = (event) => {
      this.stickY = (event.detail && event.detail.y) || 0;
    };
    this.el.addEventListener("thumbstickmoved", this.onThumbstick);
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

  tick(time, delta) {
    if (!this.heldObject) {
      return;
    }
    const change = thumbstickReel(this.stickY, REEL_SPEED, frameSeconds(delta), REEL_DEAD_ZONE);
    if (change) {
      const { origin, direction } = this.laserRay();
      const position = this.heldObject.object3D.position;
      const next = reelAlongRay(position, origin, direction, change, HOLD_MIN_DISTANCE, HOLD_MAX_DISTANCE);
      position.set(next.x, next.y, next.z);
    }
  },

  // Raio do laser no espaço do controle (o mesmo da bola segurada).
  laserRay() {
    const raycaster = this.el.getAttribute("raycaster") || {};
    const origin = raycaster.origin || { x: 0, y: 0, z: 0 };
    this.rayDirection.copy(raycaster.direction || { x: 0, y: 0, z: -1 });
    if (this.rayDirection.lengthSq() < 1e-8) {
      this.rayDirection.set(0, 0, -1);
    }
    return { origin, direction: this.rayDirection.normalize() };
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
    this.el.removeEventListener("thumbstickmoved", this.onThumbstick);
  },
});
