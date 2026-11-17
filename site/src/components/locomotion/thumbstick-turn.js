import { frameSeconds } from "../../utils/time.js";
import { isControllerHolding } from "../interaction/grab-state.js";
import { findPlayerRig } from "./player-rig.js";

// Analógico: gira a visão de forma contínua; quanto mais inclinado, mais
// rápido gira (até smoothSpeed graus/s).
// Use "snap: true" para girar em saltos de snapAngle (causa menos enjoo).
AFRAME.registerComponent("thumbstick-turn", {
  schema: {
    hand: { default: "right", oneOf: ["left", "right"] },
    snap: { default: false },
    snapAngle: { default: 30 },
    smoothSpeed: { default: 90 },
    deadZone: { default: 0.15 },
  },

  init() {
    this.inputMode = this.el.sceneEl.systems["input-mode"];
    this.x = 0;
    this.snapReady = true;
    this.onThumbstickMoved = (event) => {
      this.x = (event.detail && event.detail.x) || 0;
    };
    this.el.addEventListener("thumbstickmoved", this.onThumbstickMoved);
  },

  tick(time, delta) {
    const rig = findPlayerRig(this.el);
    if (!rig || !this.inputMode.usesController(this.data.hand)
      || isControllerHolding(this.el)) {
      return;
    }
    const degrees = this.data.snap ? this.snapDegrees() : this.smoothDegrees(delta);
    if (degrees) {
      rig.rotateAroundHead(THREE.MathUtils.degToRad(degrees));
    }
  },

  snapDegrees() {
    if (this.snapReady && Math.abs(this.x) > 0.7) {
      this.snapReady = false;
      return this.x > 0 ? -this.data.snapAngle : this.data.snapAngle;
    }
    if (Math.abs(this.x) < 0.3) {
      this.snapReady = true;
    }
    return 0;
  },

  smoothDegrees(delta) {
    if (Math.abs(this.x) <= this.data.deadZone) {
      return 0;
    }
    return -this.x * this.data.smoothSpeed * frameSeconds(delta);
  },

  remove() {
    this.el.removeEventListener("thumbstickmoved", this.onThumbstickMoved);
  },
});
