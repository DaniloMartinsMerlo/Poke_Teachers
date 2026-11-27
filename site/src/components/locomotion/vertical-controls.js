import { frameSeconds } from "../../utils/time.js";
import { findPlayerRig } from "./player-rig.js";

const KEY_BINDINGS = Object.freeze({
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyD: "right",
  ArrowRight: "right",
  KeyA: "left",
  ArrowLeft: "left",
  Space: "up",
  ShiftLeft: "down",
  ShiftRight: "down",
});

// Computador: WASD / setas andam na direção para onde a câmera está
// olhando (incluindo o giro do mouse no look-controls e o giro do rig no
// J2); Espaço sobe e Shift desce. Substitui o `wasd-controls` padrão do
// A-Frame, que lia só a rotação do rig e ignorava o giro da câmera.
AFRAME.registerComponent("vertical-controls", {
  schema: {
    moveSpeed: { default: 3 },
    speed: { default: 1.5 },
  },

  init() {
    this.keys = {
      forward: false, backward: false, left: false, right: false, up: false, down: false,
    };
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.onKeyDown = (event) => this.setKey(event.code, true);
    this.onKeyUp = (event) => this.setKey(event.code, false);
    this.onBlur = () => this.clearKeys();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  },

  setKey(code, pressed) {
    const action = KEY_BINDINGS[code];
    if (action) {
      this.keys[action] = pressed;
    }
  },

  clearKeys() {
    Object.keys(this.keys).forEach((key) => {
      this.keys[key] = false;
    });
  },

  tick(time, delta) {
    const dt = frameSeconds(delta);
    if (!dt) {
      return;
    }
    const moveZ = Number(this.keys.forward) - Number(this.keys.backward);
    const moveX = Number(this.keys.right) - Number(this.keys.left);
    const camera = this.el.sceneEl.camera;
    if ((moveZ || moveX) && camera) {
      camera.getWorldDirection(this.forward);
      this.forward.y = 0;
      if (this.forward.lengthSq() >= 1e-6) {
        this.forward.normalize();
        this.right.set(-this.forward.z, 0, this.forward.x);
        const norm = Math.hypot(moveX, moveZ);
        const step = (this.data.moveSpeed * dt) / norm;
        this.offset.set(0, 0, 0)
          .addScaledVector(this.forward, moveZ * step)
          .addScaledVector(this.right, moveX * step);
        const rig = findPlayerRig(this.el);
        if (rig) {
          rig.translate(this.offset);
        } else {
          this.el.object3D.position.add(this.offset);
        }
      }
    }
    const vertical = Number(this.keys.up) - Number(this.keys.down);
    if (vertical) {
      this.el.object3D.position.y += vertical * this.data.speed * dt;
    }
  },

  remove() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  },
});
