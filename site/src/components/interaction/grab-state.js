import { EVENTS, GRABBABLE_SELECTOR, HELD_ATTRIBUTE } from "../../config/constants.js";
import { findNearest } from "../../domain/nearest.js";

// Estado "segurado" compartilhado por todos os pegadores (pinça, controle
// e mouse): um objeto só pode estar em uma mão por vez.

export const isHeld = (el) => el.hasAttribute(HELD_ATTRIBUTE);
export const markHeld = (el) => el.setAttribute(HELD_ATTRIBUTE, "true");
// Solta e avisa a cena (o evento sobe até ela): o suporte usa isso para
// encaixar a bola. Quem solta deve chamar isto depois de devolver o objeto
// à cena, com a posição de mundo final.
export function clearHeld(el) {
  el.removeAttribute(HELD_ATTRIBUTE);
  el.emit(EVENTS.GRAB_RELEASED, null, true);
}

/** O controle (entidade com "controller-grabber") está segurando algo? */
export const isControllerHolding = (el) => Boolean(el.components["controller-grabber"]?.heldObject);

/**
 * Muda a distância de um objeto filho até o pai (controle ou câmera),
 * ao longo da linha entre os dois. Sem direção definida, usa a frente (-z).
 */
export function moveAlongHoldLine(object3D, distance) {
  const position = object3D.position;
  if (position.lengthSq() < 1e-8) {
    position.set(0, 0, -1);
  }
  position.setLength(distance);
}

export const isFreeGrabbable = (el) => el.matches(GRABBABLE_SELECTOR) && !isHeld(el);

export function freeGrabbables(sceneEl) {
  return [...sceneEl.querySelectorAll(GRABBABLE_SELECTOR)].filter((el) => !isHeld(el));
}

/** Objeto livre mais próximo de `origin` (posição de mundo), ou null. */
export function nearestFreeGrabbable(sceneEl, origin, maxDistance) {
  const position = new THREE.Vector3();
  return findNearest(
    freeGrabbables(sceneEl),
    origin,
    maxDistance,
    (el) => el.object3D.getWorldPosition(position),
  );
}
