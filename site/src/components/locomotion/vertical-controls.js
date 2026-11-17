import { frameSeconds } from "../../utils/time.js";

const UP_KEYS = ["Space"];
const DOWN_KEYS = ["ShiftLeft", "ShiftRight"];

// Computador: Espaço sobe e Shift desce.
AFRAME.registerComponent("vertical-controls", {
  schema: {
    speed: { default: 1.5 },
  },

  init() {
    this.keys = { up: false, down: false };
    this.onKeyDown = (event) => this.setKey(event.code, true);
    this.onKeyUp = (event) => this.setKey(event.code, false);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  },

  setKey(code, pressed) {
    if (UP_KEYS.includes(code)) this.keys.up = pressed;
    if (DOWN_KEYS.includes(code)) this.keys.down = pressed;
  },

  tick(time, delta) {
    const direction = Number(this.keys.up) - Number(this.keys.down);
    if (direction) {
      this.el.object3D.position.y += direction * this.data.speed * frameSeconds(delta);
    }
  },

  remove() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  },
});
