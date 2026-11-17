import { frameSeconds } from "../../utils/time.js";
import { findPlayerRig } from "./player-rig.js";

// Analógico: anda para onde você está olhando.
AFRAME.registerComponent("thumbstick-movement", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
    speed: { default: 1.5 },
    deadZone: { default: 0.15 },
  },

  init() {
    this.inputMode = this.el.sceneEl.systems["input-mode"];
    this.axis = { x: 0, y: 0 };
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.onThumbstickMoved = (event) => {
      const detail = event.detail || {};
      this.axis = { x: detail.x || 0, y: detail.y || 0 };
    };
    this.el.addEventListener("thumbstickmoved", this.onThumbstickMoved);
  },

  tick(time, delta) {
    const camera = this.el.sceneEl.camera;
    const rig = findPlayerRig(this.el);
    if (!camera || !rig || !this.inputMode.usesController(this.data.hand)) {
      return;
    }
    const { x, y } = this.axis;
    if (Math.abs(x) < this.data.deadZone && Math.abs(y) < this.data.deadZone) {
      return;
    }

    // Em VR a pose da cabeça vem do WebXR; a direção real do olhar só é
    // confiável pela matriz de mundo da câmera do three.js.
    camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) {
      return;
    }
    this.forward.normalize();
    this.right.set(-this.forward.z, 0, this.forward.x);

    const distance = this.data.speed * frameSeconds(delta);
    this.offset.set(0, 0, 0)
      .addScaledVector(this.forward, -y * distance)
      .addScaledVector(this.right, x * distance);
    rig.translate(this.offset);
  },

  remove() {
    this.el.removeEventListener("thumbstickmoved", this.onThumbstickMoved);
  },
});
