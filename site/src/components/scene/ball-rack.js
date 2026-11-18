import { TRAINER_BOX_Z } from "../../config/arena.js";
import {
  EVENTS, GRABBABLE_CLASS, GRABBABLE_SELECTOR, HELD_ATTRIBUTE, MAX_FRAME_MS, RETURNING_ATTRIBUTE,
} from "../../config/constants.js";
import {
  BLOCKED_RETURN_DELAY, RETURN_ARC_HEIGHT, RETURN_DURATION, RETURN_SPINS,
  SLOT_OCCUPIED_DISTANCE, SLOT_SNAP_DISTANCE,
} from "../../config/grab.js";
import { playerInfo } from "../../config/players.js";
import { RECALL_DURATION } from "../../config/pokemon.js";
import { arcPoint, returnSlot } from "../../domain/battle.js";
import { findNearest } from "../../domain/nearest.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";

const SLOT_COLOR = "#ffffff";
const SLOT_ACTIVE_COLOR = "#ffd23f";

// Suporte das pokébolas. Monta o móvel e coloca uma pokébola de cada
// modelo em fila sobre o tampo (eixo x local do suporte). Se "pokemon"
// tiver um nome na mesma posição, a bola guarda aquele professor e
// mostra a prévia dele ao ser apontada. Toda bola solta um pokémon
// genérico ao cair no chão.
//
// As pokébolas são filhas da cena, e não do suporte: os pegadores e a
// física trabalham com objetos soltos no mundo.
//
// Encaixes: cada posição de bola tem uma marca no tampo. Soltar uma bola
// perto de um encaixe livre (SLOT_SNAP_DISTANCE) a trava ali, parada. A
// marca acende enquanto uma bola segurada está perto o bastante.
//
// Dono: "player" diz de quem é o suporte (cor da faixa do tampo e dos
// pokémons). Ao pedido de troca (RECALL_REQUESTED) ou quando uma segunda
// bola do mesmo jogador cai no chão (SEND_OUT_BLOCKED), a bola volta
// voando em arco até um encaixe livre.
AFRAME.registerComponent("ball-rack", {
  schema: {
    player: { default: "p1" },
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
    this.balls = [];
    // Voos em andamento: { ball, slot, from, elapsed, wait }.
    this.flights = [];
    this.buildStand();
    this.markers = this.buildSlotMarkers();
    const sceneEl = this.el.sceneEl;
    this.onReleased = (event) => this.trySnap(event.target);
    this.onRecallRequested = ({ detail }) => this.recallActive(detail.player);
    this.onSendOutBlocked = ({ detail }) => {
      if (this.balls.includes(detail.ball)) {
        this.sendHome(detail.ball, BLOCKED_RETURN_DELAY);
      }
    };
    this.onGameReset = () => this.finishFlights();
    sceneEl.addEventListener(EVENTS.GRAB_RELEASED, this.onReleased);
    sceneEl.addEventListener(EVENTS.RECALL_REQUESTED, this.onRecallRequested);
    sceneEl.addEventListener(EVENTS.SEND_OUT_BLOCKED, this.onSendOutBlocked);
    sceneEl.addEventListener(EVENTS.GAME_RESET, this.onGameReset);
    whenSceneLoaded(sceneEl, () => this.spawnBalls());
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
        color: playerInfo(this.data.player).color,
        "physics-body": "shape: box; mass: 0; material: wood",
      }),
    ].forEach((child) => this.el.appendChild(child));
  },

  spawnBalls() {
    const { models, pokemon, height, ballLift, ballScale, player } = this.data;
    this.el.object3D.updateMatrixWorld(true);
    // O pokémon solto olha para o box do treinador do outro lado do campo.
    const rackZ = this.el.object3D.getWorldPosition(new THREE.Vector3()).z;
    const facing = { x: 0, y: 0, z: rackZ >= 0 ? -TRAINER_BOX_Z : TRAINER_BOX_Z };

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
        "data-player": player,
      });
      // Atributos e vida antes da prévia, que os mostra.
      ball.setAttribute("pokeprof", { name: pokemon[index] || model });
      if (pokemon[index]) {
        ball.setAttribute("pokemon-preview", { name: pokemon[index] });
      }
      ball.setAttribute("pokemon-release", { name: pokemon[index] || model, facing, player });
      this.balls.push(ball);
      this.el.sceneEl.appendChild(ball);
    });
  },

  // Encaixe ocupado por outra bola parada nele ou voando para ele.
  isSlotTaken(slot, ignore) {
    if (this.flights.some((flight) => flight.slot === slot && flight.ball !== ignore)) {
      return true;
    }
    return [...this.el.sceneEl.querySelectorAll(GRABBABLE_SELECTOR)]
      .filter((el) => el !== ignore && !el.hasAttribute(HELD_ATTRIBUTE) && !el.hasAttribute(RETURNING_ATTRIBUTE))
      .some((el) => el.object3D.position.distanceTo(slot) < SLOT_OCCUPIED_DISTANCE);
  },

  // Encaixe livre mais perto de `ball` (ou null).
  freeSlotNear(ball) {
    const position = ball.object3D.getWorldPosition(new THREE.Vector3());
    const free = this.slots.filter((slot) => !this.isSlotTaken(slot, ball));
    return findNearest(free, position, SLOT_SNAP_DISTANCE, (slot) => slot);
  },

  // Trocar: recolhe o pokémon em campo deste jogador e traz a bola.
  recallActive(player) {
    if (player !== this.data.player) {
      return;
    }
    const ball = this.el.sceneEl.systems.battle.activeBall(player);
    if (!ball || !this.balls.includes(ball)) {
      return;
    }
    ball.components["pokemon-release"].recall(true);
    this.sendHome(ball, RECALL_DURATION);
  },

  // Faz `ball` voar em arco até o encaixe dela (ou outro livre), depois
  // de `wait` ms. Enquanto voa, ninguém a pega.
  sendHome(ball, wait = 0) {
    if (this.flights.some((flight) => flight.ball === ball) || ball.hasAttribute(HELD_ATTRIBUTE)) {
      return;
    }
    const home = this.balls.indexOf(ball);
    const occupied = this.slots.map((slot) => this.isSlotTaken(slot, ball));
    const slot = this.slots[returnSlot(home, occupied)];
    ball.setAttribute(RETURNING_ATTRIBUTE, "true");
    ball.components["physics-body"].beginScripted();
    this.flights.push({
      ball, slot, wait, elapsed: 0,
      from: ball.object3D.getWorldPosition(new THREE.Vector3()),
    });
  },

  advanceFlights(delta) {
    this.flights = this.flights.filter((flight) => {
      if (flight.wait > 0) {
        flight.wait -= delta;
        return true;
      }
      flight.elapsed += delta;
      const t = flight.elapsed / RETURN_DURATION;
      if (t >= 1) {
        this.land(flight);
        return false;
      }
      const object = flight.ball.object3D;
      const point = arcPoint(flight.from, flight.slot, t, RETURN_ARC_HEIGHT);
      object.position.set(point.x, point.y, point.z);
      object.rotation.set(t * Math.PI * 2 * RETURN_SPINS, 0, 0);
      return true;
    });
  },

  land(flight) {
    flight.ball.removeAttribute(RETURNING_ATTRIBUTE);
    flight.ball.components["physics-body"].placeAt(flight.slot);
  },

  // Reset no meio do voo: a física já devolveu as bolas ao início.
  finishFlights() {
    this.flights.forEach((flight) => flight.ball.removeAttribute(RETURNING_ATTRIBUTE));
    this.flights = [];
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
  tick(time, delta) {
    if (!this.slots.length) {
      return;
    }
    if (this.flights.length) {
      this.advanceFlights(Math.min(delta || 0, MAX_FRAME_MS));
    }
    const held = this.el.sceneEl.querySelectorAll(`${GRABBABLE_SELECTOR}[${HELD_ATTRIBUTE}]`);
    const targets = new Set([...held].map((ball) => this.freeSlotNear(ball)).filter(Boolean));
    this.flights.forEach((flight) => targets.add(flight.slot));
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
    const sceneEl = this.el.sceneEl;
    sceneEl.removeEventListener(EVENTS.GRAB_RELEASED, this.onReleased);
    sceneEl.removeEventListener(EVENTS.RECALL_REQUESTED, this.onRecallRequested);
    sceneEl.removeEventListener(EVENTS.SEND_OUT_BLOCKED, this.onSendOutBlocked);
    sceneEl.removeEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },
});
