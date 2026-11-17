import { EVENTS, GRABBABLE_CLASS, GRABBABLE_SELECTOR, HELD_ATTRIBUTE } from "../../config/constants.js";
import { SLOT_OCCUPIED_DISTANCE, SLOT_SNAP_DISTANCE } from "../../config/grab.js";
import { findNearest } from "../../domain/nearest.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";

const SLOT_COLOR = "#ffffff";
const SLOT_ACTIVE_COLOR = "#ffd23f";

// Suporte das pokébolas. Monta o móvel e coloca uma pokébola de cada
// modelo em fila sobre o tampo (eixo x local do suporte). Se "pokemon"
// tiver um nome na mesma posição, a bola guarda aquele professor e
// mostra a prévia dele ao ser apontada.
//
// As pokébolas são filhas da cena, e não do suporte: os pegadores e a
// física trabalham com objetos soltos no mundo.
//
// Encaixes: cada posição de bola tem uma marca no tampo. Soltar uma bola
// perto de um encaixe livre (SLOT_SNAP_DISTANCE) a trava ali, parada. A
// marca acende enquanto uma bola segurada está perto o bastante.
AFRAME.registerComponent("ball-rack", {
  schema: {
    models: { type: "array", default: ["#pokeball-model", "#greatball-model", "#masterball-model"] },
    pokemon: { type: "array", default: [] },
    width: { default: 0.9 },
    height: { default: 0.9 },
    depth: { default: 0.35 },
    spacing: { default: 0.28 },
    ballScale: { default: 0.01 },
    // Altura do centro da bola acima do tampo.
    ballLift: { default: 0.11 },
  },

  init() {
    this.slots = [];
    this.buildStand();
    this.markers = this.buildSlotMarkers();
    this.onReleased = (event) => this.trySnap(event.target);
    this.el.sceneEl.addEventListener(EVENTS.GRAB_RELEASED, this.onReleased);
    whenSceneLoaded(this.el.sceneEl, () => this.spawnBalls());
  },

  slotX(index) {
    const { models, spacing } = this.data;
    return -spacing * (models.length - 1) / 2 + index * spacing;
  },

  buildSlotMarkers() {
    const { models, height } = this.data;
    return models.map((model, index) => {
      const marker = createEntity("a-ring", {
        class: "rack-slot",
        position: vec3(this.slotX(index), height + 0.022, 0),
        rotation: "-90 0 0",
        "radius-inner": 0.075,
        "radius-outer": 0.1,
        "segments-theta": 32,
        material: `color: ${SLOT_COLOR}; shader: flat; transparent: true; opacity: 0.55`,
      });
      this.el.appendChild(marker);
      return marker;
    });
  },

  buildStand() {
    const { width, height, depth } = this.data;
    [
      createEntity("a-box", {
        position: vec3(0, height / 2, 0),
        width, height, depth,
        color: "#f4f4f4",
        "physics-body": "shape: box; mass: 0; material: wood",
      }),
      createEntity("a-box", {
        position: vec3(0, height + 0.01, 0),
        width: width + 0.02, height: 0.02, depth: depth + 0.02,
        color: "#e3350d",
        "physics-body": "shape: box; mass: 0; material: wood",
      }),
    ].forEach((child) => this.el.appendChild(child));
  },

  spawnBalls() {
    const { models, pokemon, height, ballLift, ballScale } = this.data;
    this.el.object3D.updateMatrixWorld(true);

    models.forEach((model, index) => {
      const position = this.el.object3D.localToWorld(
        new THREE.Vector3(this.slotX(index), height + ballLift, 0));
      this.slots.push(position.clone());
      const ball = createEntity("a-entity", {
        class: GRABBABLE_CLASS,
        position: vec3(position.x, position.y, position.z),
        scale: vec3(ballScale, ballScale, ballScale),
        "gltf-model": model,
        "physics-body": "",
        "cursor-grabber": "",
      });
      if (pokemon[index]) {
        ball.setAttribute("pokemon-preview", { name: pokemon[index] });
      }
      this.el.sceneEl.appendChild(ball);
    });
  },

  // Encaixe livre mais perto de `ball` (ou null).
  freeSlotNear(ball) {
    const position = ball.object3D.getWorldPosition(new THREE.Vector3());
    const others = [...this.el.sceneEl.querySelectorAll(GRABBABLE_SELECTOR)]
      .filter((el) => el !== ball && !el.hasAttribute(HELD_ATTRIBUTE));
    const free = this.slots.filter((slot) =>
      !others.some((el) => el.object3D.position.distanceTo(slot) < SLOT_OCCUPIED_DISTANCE));
    return findNearest(free, position, SLOT_SNAP_DISTANCE, (slot) => slot);
  },

  trySnap(ball) {
    const physics = ball.components && ball.components["physics-body"];
    if (!physics || !ball.matches(GRABBABLE_SELECTOR)) {
      return;
    }
    const slot = this.freeSlotNear(ball);
    if (slot) {
      physics.placeAt(slot);
    }
  },

  // Acende a marca do encaixe para onde a bola segurada iria.
  tick() {
    if (!this.slots.length) {
      return;
    }
    const held = this.el.sceneEl.querySelectorAll(`${GRABBABLE_SELECTOR}[${HELD_ATTRIBUTE}]`);
    const targets = new Set([...held].map((ball) => this.freeSlotNear(ball)).filter(Boolean));
    this.slots.forEach((slot, index) => {
      const active = targets.has(slot);
      if (this.markers[index].dataset.active !== String(active)) {
        this.markers[index].dataset.active = String(active);
        this.markers[index].setAttribute("material", {
          color: active ? SLOT_ACTIVE_COLOR : SLOT_COLOR,
          opacity: active ? 0.95 : 0.55,
        });
      }
    });
  },

  remove() {
    this.el.sceneEl.removeEventListener(EVENTS.GRAB_RELEASED, this.onReleased);
  },
});
