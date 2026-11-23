import { MOUSE_CURSOR_ID, THROWN_ATTRIBUTE } from "../../config/constants.js";
import {
  HOLD_MAX_DISTANCE, HOLD_MIN_DISTANCE, MOUSE_DRAG_PIXELS, MOUSE_HOLD_OFFSET, MOUSE_THROW_LIFT,
  MOUSE_THROW_SPEED, WHEEL_METERS_PER_UNIT,
} from "../../config/grab.js";
import { isMouseDrag, mouseThrowVelocity } from "../../domain/mouse.js";
import { reelDistance } from "../../domain/reel.js";
import { clearHeld, isFreeGrabbable, markHeld, moveAlongHoldLine } from "./grab-state.js";

// Computador (mouse): clicar na bola a pega — ela vem para a "mão"
// (MOUSE_HOLD_OFFSET, à frente da câmera) e anda junto com a câmera;
// segurando, um clique em QUALQUER lugar arremessa na direção do ponteiro
// do mouse. Arrastar para girar a câmera (look-controls) não conta como
// clique (MOUSE_DRAG_PIXELS). A rodinha aproxima (para baixo) ou afasta
// (para cima) a bola segurada. Só responde ao cursor do mouse
// (MOUSE_CURSOR_ID), para não brigar com o laser dos controles.
AFRAME.registerComponent("cursor-grabber", {
  init() {
    this.isHolding = false;
    this.cursorEl = null;
    this.downAt = null;
    this.onClick = (event) => this.tryPickUp(event);
    this.onWheel = (event) => this.reel(event);
    this.onCanvasDown = (event) => { this.downAt = { x: event.clientX, y: event.clientY }; };
    this.onCanvasClick = (event) => this.tryThrow(event);
    this.el.addEventListener("click", this.onClick);
    window.addEventListener("wheel", this.onWheel, { passive: true });
  },

  // Clique do cursor do mouse na bola (evento do A-Frame, no mouseup).
  tryPickUp(event) {
    const cursorEl = event.detail && event.detail.cursorEl;
    if (this.isHolding || !cursorEl || cursorEl.id !== MOUSE_CURSOR_ID) {
      return;
    }
    const camera = this.el.sceneEl.camera;
    if (!isFreeGrabbable(this.el) || !camera) {
      return;
    }
    camera.el.object3D.attach(this.el.object3D);
    this.el.object3D.position.set(MOUSE_HOLD_OFFSET.x, MOUSE_HOLD_OFFSET.y, MOUSE_HOLD_OFFSET.z);
    markHeld(this.el);
    this.isHolding = true;
    this.cursorEl = cursorEl;
    // O "click" do navegador deste mesmo gesto ainda vai chegar: só
    // escuta o próximo clique depois dele.
    setTimeout(() => this.listenForThrow(true), 0);
  },

  listenForThrow(on) {
    const canvas = this.el.sceneEl.canvas;
    if (!canvas) {
      return;
    }
    const method = on ? "addEventListener" : "removeEventListener";
    canvas[method]("mousedown", this.onCanvasDown);
    canvas[method]("click", this.onCanvasClick);
    this.downAt = null;
  },

  // Clique em qualquer lugar da tela segurando a bola. Arrastar = girar a
  // câmera, não arremessa.
  tryThrow(event) {
    if (!this.isHolding) {
      return;
    }
    if (this.downAt && isMouseDrag(this.downAt, { x: event.clientX, y: event.clientY }, MOUSE_DRAG_PIXELS)) {
      this.downAt = null;
      return;
    }
    this.throw();
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

  // Direção do arremesso: o raio do mouse (para onde o ponteiro aponta);
  // sem ele, a frente da câmera.
  aimDirection() {
    const ray = this.cursorEl?.components.raycaster?.raycaster?.ray;
    if (ray && ray.direction.lengthSq() > 0) {
      return ray.direction.clone();
    }
    const direction = new THREE.Vector3();
    this.el.sceneEl.camera?.getWorldDirection(direction);
    return direction;
  },

  // Arremessada não é encaixada no suporte ao ser solta (THROWN_ATTRIBUTE).
  throw() {
    const direction = this.aimDirection();
    this.el.setAttribute(THROWN_ATTRIBUTE, "true");
    this.release();
    this.el.removeAttribute(THROWN_ATTRIBUTE);
    const physics = this.el.components["physics-body"];
    if (physics) {
      const v = mouseThrowVelocity(direction, MOUSE_THROW_SPEED, MOUSE_THROW_LIFT);
      physics.addVelocity(new THREE.Vector3(v.x, v.y, v.z));
    }
  },

  // Devolve a bola à cena, na posição de mundo atual.
  release() {
    this.listenForThrow(false);
    this.el.sceneEl.object3D.attach(this.el.object3D);
    clearHeld(this.el);
    this.isHolding = false;
    this.cursorEl = null;
  },

  remove() {
    if (this.isHolding) {
      this.release();
    }
    this.el.removeEventListener("click", this.onClick);
    window.removeEventListener("wheel", this.onWheel);
  },
});
