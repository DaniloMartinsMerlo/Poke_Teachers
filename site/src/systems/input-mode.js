import { EVENTS, HANDS, INPUT_MODE } from "../config/constants.js";

// ----------------------------------------------------------------------
// Sistema "input-mode": sabe, para cada mão, se o jogador está usando o
// rastreamento de mãos (pinça) ou um controle físico.
//
// Por que isso é necessário: no A-Frame o "laser-controls" também aceita
// a mão rastreada como um "controle genérico" (perfil "generic-hand").
// Sem esta separação, a pinça dispara ao mesmo tempo o "pinchstarted" da
// mão e o "triggerdown" do laser, e os dois pegadores disputam a bola.
// O Quest troca entre mãos e controles a qualquer momento; o WebXR avisa
// pelo evento "inputsourceschange", que o A-Frame repassa como
// "controllersupdated".
// ----------------------------------------------------------------------
AFRAME.registerSystem("input-mode", {
  init() {
    this.modes = Object.fromEntries(HANDS.map((hand) => [hand, INPUT_MODE.NONE]));
    this.onControllersUpdated = () => this.refresh();
    this.el.addEventListener("controllersupdated", this.onControllersUpdated);
  },

  modeOf(hand) {
    return this.modes[hand] || INPUT_MODE.NONE;
  },

  usesController(hand) {
    return this.modeOf(hand) === INPUT_MODE.CONTROLLER;
  },

  usesHandTracking(hand) {
    return this.modeOf(hand) === INPUT_MODE.HAND;
  },

  refresh() {
    const trackedControls = this.el.systems["tracked-controls"];
    const sources = Array.from((trackedControls && trackedControls.controllers) || []);
    const next = Object.fromEntries(HANDS.map((hand) => [hand, INPUT_MODE.NONE]));

    sources.forEach((source) => {
      if (source.handedness in next) {
        next[source.handedness] = source.hand ? INPUT_MODE.HAND : INPUT_MODE.CONTROLLER;
      }
    });

    HANDS.forEach((hand) => {
      if (next[hand] !== this.modes[hand]) {
        this.modes[hand] = next[hand];
        this.el.emit(EVENTS.INPUT_MODE_CHANGED, { hand, mode: next[hand] }, false);
      }
    });
  },

  remove() {
    this.el.removeEventListener("controllersupdated", this.onControllersUpdated);
  },
});
