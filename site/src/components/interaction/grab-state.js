import { GRABBABLE_SELECTOR, HELD_ATTRIBUTE } from "../../config/constants.js";
import { findNearest } from "../../domain/nearest.js";

// Estado "segurado" compartilhado por todos os pegadores (pinça, controle
// e mouse): um objeto só pode estar em uma mão por vez.

export const isHeld = (el) => el.hasAttribute(HELD_ATTRIBUTE);
export const markHeld = (el) => el.setAttribute(HELD_ATTRIBUTE, "true");
export const clearHeld = (el) => el.removeAttribute(HELD_ATTRIBUTE);

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
